#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Constants ───────────────────────────────────────────────────────────────

const COOKIES_PATH = path.join(__dirname, 'cookies.json');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output');
const TOOLS_DIR = path.join(__dirname, 'tools');

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    urls: [],
    slugs: [],
    scrapeOnly: false,
    downloadOnly: false,
    skipExisting: false,
    outputDir: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--scrape-only') {
      options.scrapeOnly = true;
    } else if (arg === '--download-only') {
      options.downloadOnly = true;
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (arg === '--output-dir' && i + 1 < args.length) {
      options.outputDir = path.resolve(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('http://') || arg.startsWith('https://')) {
      options.urls.push(arg);
    } else if (!arg.startsWith('-')) {
      // Treat as a slug for --download-only mode
      options.slugs.push(arg);
    }
  }

  return options;
}

function printUsage() {
  console.log(`
${chalk.bold.cyan('Skool Community Scraper')}
${chalk.dim('Download entire Skool classrooms - lessons, videos, and resources.')}

${chalk.yellow('Usage:')}
  node index.js [options] <url|slug> [<url|slug> ...]

${chalk.yellow('Examples:')}
  ${chalk.dim('# Full pipeline for one community')}
  node index.js https://www.skool.com/aiautomationsbyjack

  ${chalk.dim('# Full pipeline for multiple communities')}
  node index.js https://www.skool.com/community1 https://www.skool.com/community2

  ${chalk.dim('# Only scrape (no downloads)')}
  node index.js --scrape-only https://www.skool.com/aiautomationsbyjack

  ${chalk.dim('# Only download (assumes scraping is done, pass slug names)')}
  node index.js --download-only aiautomationsbyjack

  ${chalk.dim('# Skip videos that already exist locally')}
  node index.js --skip-existing https://www.skool.com/aiautomationsbyjack

  ${chalk.dim('# Save output to a different drive')}
  node index.js --output-dir /Volumes/KINGSTON/skool-output https://www.skool.com/aiautomationsbyjack

${chalk.yellow('Options:')}
  --scrape-only     Only scrape classroom structure (skip downloads)
  --download-only   Only download media (requires prior scrape data)
  --skip-existing   Skip videos/resources that are already downloaded
  --output-dir DIR  Save output to DIR instead of ./output
  -h, --help        Show this help message
`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractSlug(url) {
  try {
    const parsed = new URL(url);
    // URL like https://www.skool.com/aiautomationsbyjack or /aiautomationsbyjack/classroom
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[0] || null;
  } catch {
    return null;
  }
}

function runTool(scriptPath, args = [], extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      cwd: __dirname,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1', ...extraEnv },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Process exited with code ${code}\n${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Forward SIGINT to child
    const sigintHandler = () => {
      child.kill('SIGINT');
    };
    process.on('SIGINT', sigintHandler);
    child.on('close', () => {
      process.removeListener('SIGINT', sigintHandler);
    });
  });
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remaining}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${remaining}s`;
}

async function checkCookies() {
  if (!await fs.pathExists(COOKIES_PATH)) {
    return { exists: false };
  }

  try {
    const data = await fs.readJson(COOKIES_PATH);
    if (!Array.isArray(data) || data.length === 0) {
      return { exists: true, valid: false, reason: 'Cookie file is empty or not an array' };
    }

    const hasSkoolCookies = data.some(c =>
      c.domain && (c.domain.includes('skool.com'))
    );
    if (!hasSkoolCookies) {
      return { exists: true, valid: false, reason: 'No skool.com cookies found' };
    }

    const expiredCount = data.filter(c => {
      const exp = c.expires || c.expirationDate;
      return exp && exp > 0 && exp < Date.now() / 1000;
    }).length;

    return {
      exists: true,
      valid: true,
      cookieCount: data.length,
      expiredCount,
    };
  } catch (err) {
    return { exists: true, valid: false, reason: `Failed to parse: ${err.message}` };
  }
}

async function loadScrapedData(slug, outputDir) {
  const dataPath = path.join(outputDir, slug, 'classroom-data.json');
  if (!await fs.pathExists(dataPath)) {
    return null;
  }
  try {
    return await fs.readJson(dataPath);
  } catch {
    return null;
  }
}

function countItems(data) {
  let modules = 0;
  let lessons = 0;
  let videos = 0;
  let resources = 0;

  if (data && data.modules) {
    modules = data.modules.length;
    for (const mod of data.modules) {
      if (mod.lessons) {
        lessons += mod.lessons.length;
        for (const lesson of mod.lessons) {
          if (lesson.videos && lesson.videos.length > 0) {
            videos += lesson.videos.length;
          }
          if (lesson.resources && lesson.resources.length > 0) {
            resources += lesson.resources.length;
          }
          if (lesson.images && lesson.images.length > 0) {
            resources += lesson.images.length;
          }
        }
      }
    }
  }

  return { modules, lessons, videos, resources };
}

// ─── Pipeline Steps ──────────────────────────────────────────────────────────

async function scrape(slug, url, env = {}) {
  const scriptPath = path.join(TOOLS_DIR, 'scrape-classroom.js');
  if (!await fs.pathExists(scriptPath)) {
    throw new Error(`Scraper not found at ${scriptPath}`);
  }

  console.log(chalk.cyan(`\n  Scraping classroom: ${chalk.bold(slug)}`));
  console.log(chalk.dim(`  URL: ${url}\n`));

  await runTool(scriptPath, [url], env);
}

async function downloadVideos(slug, options = {}, env = {}) {
  const scriptPath = path.join(TOOLS_DIR, 'download-videos.js');
  if (!await fs.pathExists(scriptPath)) {
    throw new Error(`Video downloader not found at ${scriptPath}`);
  }

  const args = [slug];
  if (options.skipExisting) args.push('--skip-existing');

  console.log(chalk.cyan(`\n  Downloading videos for: ${chalk.bold(slug)}`));
  await runTool(scriptPath, args, env);
}

async function downloadResources(slug, options = {}, env = {}) {
  const scriptPath = path.join(TOOLS_DIR, 'download-resources.js');
  if (!await fs.pathExists(scriptPath)) {
    throw new Error(`Resource downloader not found at ${scriptPath}`);
  }

  const args = [slug];
  if (options.skipExisting) args.push('--skip-existing');

  console.log(chalk.cyan(`\n  Downloading resources for: ${chalk.bold(slug)}`));
  await runTool(scriptPath, args, env);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs(process.argv);

  // Header
  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║    Skool Community Scraper v1.0     ║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════════╝'));
  console.log('');

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  // Build the list of communities to process
  const communities = []; // { slug, url }

  if (options.downloadOnly) {
    // In download-only mode, accept slugs or URLs
    for (const item of [...options.slugs, ...options.urls]) {
      const slug = item.startsWith('http') ? extractSlug(item) : item;
      if (!slug) {
        console.log(chalk.red(`  Could not extract slug from: ${item}`));
        continue;
      }
      communities.push({ slug, url: null });
    }
  } else {
    // In normal or scrape-only mode, require URLs
    for (const url of options.urls) {
      const slug = extractSlug(url);
      if (!slug) {
        console.log(chalk.red(`  Invalid Skool URL: ${url}`));
        continue;
      }
      communities.push({ slug, url });
    }
  }

  if (communities.length === 0) {
    console.log(chalk.red('  No communities specified.\n'));
    printUsage();
    process.exit(1);
  }

  // Check cookies
  if (!options.downloadOnly) {
    const spinner = ora({ text: 'Checking cookies...', indent: 2 }).start();
    const cookieStatus = await checkCookies();

    if (!cookieStatus.exists) {
      spinner.fail('cookies.json not found');
      console.log('');
      console.log(chalk.yellow('  You need to export your Skool cookies first.'));
      console.log(chalk.dim('  Run: ') + chalk.white('node tools/export-cookies-guide.js'));
      console.log('');
      process.exit(1);
    }

    if (!cookieStatus.valid) {
      spinner.fail(`Invalid cookies: ${cookieStatus.reason}`);
      console.log('');
      console.log(chalk.yellow('  Your cookies.json appears to be invalid.'));
      console.log(chalk.dim('  Run: ') + chalk.white('node tools/export-cookies-guide.js --validate'));
      console.log('');
      process.exit(1);
    }

    const expiredMsg = cookieStatus.expiredCount > 0
      ? chalk.yellow(` (${cookieStatus.expiredCount} expired)`)
      : '';
    spinner.succeed(`Cookies loaded: ${cookieStatus.cookieCount} cookies${expiredMsg}`);
  }

  // Resolve output directory
  const OUTPUT_DIR = options.outputDir || DEFAULT_OUTPUT_DIR;
  const toolEnv = options.outputDir ? { SKOOL_OUTPUT_DIR: OUTPUT_DIR } : {};

  if (options.outputDir) {
    await fs.ensureDir(OUTPUT_DIR);
    console.log(chalk.cyan(`\n  Output directory: ${OUTPUT_DIR}`));
  }

  // Show plan
  console.log('');
  console.log(chalk.bold('  Pipeline Plan:'));
  for (const { slug } of communities) {
    const steps = [];
    if (!options.downloadOnly) steps.push('Scrape');
    if (!options.scrapeOnly) steps.push('Videos', 'Resources');
    console.log(chalk.dim(`    ${slug}: ${steps.join(' -> ')}`));
  }
  console.log('');

  // Run pipeline
  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < communities.length; i++) {
    const { slug, url } = communities[i];
    const communityResult = {
      slug,
      success: true,
      scrapeSuccess: null,
      videosSuccess: null,
      resourcesSuccess: null,
      counts: null,
      errors: [],
    };

    console.log(chalk.bold.white(`\n  [${ i + 1}/${communities.length}] Processing: ${slug}`));
    console.log(chalk.dim('  ' + '─'.repeat(50)));

    // Step 1: Scrape
    if (!options.downloadOnly) {
      const scrapeSpinner = ora({ text: `Scraping ${slug}...`, indent: 2 }).start();
      try {
        scrapeSpinner.stop();
        await scrape(slug, url, toolEnv);
        communityResult.scrapeSuccess = true;
        console.log(chalk.green(`\n  Scraping complete for ${slug}`));
      } catch (err) {
        scrapeSpinner.stop();
        communityResult.scrapeSuccess = false;
        communityResult.success = false;
        communityResult.errors.push(`Scrape failed: ${err.message}`);
        console.log(chalk.red(`\n  Scraping failed for ${slug}: ${err.message}`));
        // Skip downloads if scraping failed
        results.push(communityResult);
        continue;
      }
    }

    // Load scraped data for counts
    const data = await loadScrapedData(slug, OUTPUT_DIR);
    if (data) {
      communityResult.counts = countItems(data);
      console.log(chalk.dim(
        `\n  Found: ${communityResult.counts.modules} modules, ` +
        `${communityResult.counts.lessons} lessons, ` +
        `${communityResult.counts.videos} videos, ` +
        `${communityResult.counts.resources} resources`
      ));
    } else if (options.downloadOnly) {
      console.log(chalk.yellow(`\n  No scraped data found for ${slug}. Run scraping first.`));
      communityResult.success = false;
      communityResult.errors.push('No scraped data found');
      results.push(communityResult);
      continue;
    }

    // Step 2: Download videos
    if (!options.scrapeOnly) {
      try {
        await downloadVideos(slug, { skipExisting: options.skipExisting }, toolEnv);
        communityResult.videosSuccess = true;
        console.log(chalk.green(`\n  Video downloads complete for ${slug}`));
      } catch (err) {
        communityResult.videosSuccess = false;
        communityResult.errors.push(`Video download failed: ${err.message}`);
        console.log(chalk.red(`\n  Video download failed for ${slug}: ${err.message}`));
      }

      // Step 3: Download resources
      try {
        await downloadResources(slug, { skipExisting: options.skipExisting }, toolEnv);
        communityResult.resourcesSuccess = true;
        console.log(chalk.green(`\n  Resource downloads complete for ${slug}`));
      } catch (err) {
        communityResult.resourcesSuccess = false;
        communityResult.errors.push(`Resource download failed: ${err.message}`);
        console.log(chalk.red(`\n  Resource download failed for ${slug}: ${err.message}`));
      }

      if (!communityResult.videosSuccess || !communityResult.resourcesSuccess) {
        communityResult.success = false;
      }
    }

    results.push(communityResult);
  }

  // ─── Final Summary ───────────────────────────────────────────────────────

  const elapsed = Date.now() - startTime;

  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║            Final Summary             ║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════════╝'));
  console.log('');

  let totalModules = 0;
  let totalLessons = 0;
  let totalVideos = 0;
  let totalResources = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const result of results) {
    const statusIcon = result.success ? chalk.green('OK') : chalk.red('FAIL');
    console.log(chalk.bold(`  [${statusIcon}] ${result.slug}`));

    if (result.counts) {
      totalModules += result.counts.modules;
      totalLessons += result.counts.lessons;
      totalVideos += result.counts.videos;
      totalResources += result.counts.resources;

      console.log(chalk.dim(
        `       ${result.counts.modules} modules, ` +
        `${result.counts.lessons} lessons, ` +
        `${result.counts.videos} videos, ` +
        `${result.counts.resources} resources`
      ));
    }

    if (result.scrapeSuccess !== null) {
      const icon = result.scrapeSuccess ? chalk.green('done') : chalk.red('failed');
      console.log(`       Scrape: ${icon}`);
    }
    if (result.videosSuccess !== null) {
      const icon = result.videosSuccess ? chalk.green('done') : chalk.red('failed');
      console.log(`       Videos: ${icon}`);
    }
    if (result.resourcesSuccess !== null) {
      const icon = result.resourcesSuccess ? chalk.green('done') : chalk.red('failed');
      console.log(`       Resources: ${icon}`);
    }

    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.log(chalk.red(`       Error: ${err}`));
      }
    }

    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  console.log('');
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log(`  Communities: ${chalk.green(totalSuccess + ' succeeded')}${totalFailed > 0 ? ', ' + chalk.red(totalFailed + ' failed') : ''}`);
  console.log(`  Total scraped: ${totalModules} modules, ${totalLessons} lessons`);
  console.log(`  Total media: ${totalVideos} videos, ${totalResources} resources`);
  console.log(`  Duration: ${chalk.cyan(formatDuration(elapsed))}`);
  console.log('');

  // Exit with error code if any community failed
  if (totalFailed > 0) {
    process.exit(1);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

let isShuttingDown = false;

process.on('SIGINT', () => {
  if (isShuttingDown) {
    console.log(chalk.red('\n  Force exit.'));
    process.exit(1);
  }
  isShuttingDown = true;
  console.log(chalk.yellow('\n\n  Shutting down gracefully... (press Ctrl+C again to force)'));
});

// Run
main().catch((err) => {
  console.error(chalk.red(`\n  Fatal error: ${err.message}\n`));
  process.exit(1);
});
