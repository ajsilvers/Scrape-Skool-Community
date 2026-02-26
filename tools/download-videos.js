#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YT_DLP = '/opt/homebrew/bin/yt-dlp';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const MAX_CONCURRENT = 4;

// -- Helpers ------------------------------------------------------------------

function sanitize(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function resolveVideoUrl(video) {
  // Support all formats: { src, type }, { url, platform }, Mux format
  const url = video.url || video.src;
  if (url) {
    if (url.includes('loom.com/embed/')) return url.replace('/embed/', '/share/');
    if (url.includes('player.vimeo.com/video/')) {
      const id = url.match(/video\/(\d+)/)?.[1];
      if (id) return `https://vimeo.com/${id}`;
    }
    return url;
  }
  if (video.embedUrl) {
    if (video.embedUrl.includes('loom.com/embed/')) return video.embedUrl.replace('/embed/', '/share/');
    if (video.embedUrl.includes('player.vimeo.com/video/')) {
      const id = video.embedUrl.match(/video\/(\d+)/)?.[1];
      if (id) return `https://vimeo.com/${id}`;
    }
    return video.embedUrl;
  }
  return null;
}

function buildYtDlpArgs(url, outputPath, platform, flags) {
  const args = [
    '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format', 'mp4',
    '-o', outputPath,
    '--no-warnings',
    '--progress',
    '--no-part',
  ];

  // Mux HLS streams need special handling
  if (platform === 'mux') {
    args.splice(args.indexOf('-f'), 2); // remove -f format selector for HLS
    args.push('--no-check-certificates');
  } else if (platform === 'loom') {
    // Loom serves HLS-only; request explicit video+audio format IDs
    args.splice(args.indexOf('-f'), 2);
    args.push('-f', 'hls-raw-1500+hls-raw-audio-audio/hls-cdn-100+hls-cdn-audio-audio/best');
  }

  if (flags.cookiesFromBrowser && platform !== 'loom') {
    args.push('--cookies-from-browser', flags.cookiesFromBrowser);
  }

  args.push(url);
  return args;
}

function downloadWithYtDlp(url, outputPath, platform, flags) {
  return new Promise((resolve, reject) => {
    const args = buildYtDlpArgs(url, outputPath, platform, flags);
    const proc = spawn(YT_DLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.stdout.on('data', () => {}); // drain

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim()}`));
    });
    proc.on('error', reject);
  });
}

function downloadWithFfmpeg(url, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-headers', 'Referer: https://www.skool.com/\r\n',
      '-i', url,
      '-c', 'copy',
      '-y',
      outputPath,
    ];
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

// -- Concurrency limiter ------------------------------------------------------

function createPool(limit) {
  let running = 0;
  const queue = [];

  function next() {
    if (queue.length === 0 || running >= limit) return;
    running++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      running--;
      next();
    });
  }

  return function run(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

// -- Gather all videos from classroom data ------------------------------------

function collectVideos(data, moduleFilter = null) {
  const videos = [];
  for (const mod of data.modules || []) {
    if (moduleFilter && mod.title !== moduleFilter) continue;
    const moduleName = sanitize(mod.title || 'Untitled Module');
    for (const lesson of mod.lessons || []) {
      const lessonName = sanitize(lesson.title || 'Untitled Lesson');
      for (let i = 0; i < (lesson.videos || []).length; i++) {
        const v = lesson.videos[i];
        const url = resolveVideoUrl(v);
        if (!url) continue;
        const filename = lesson.videos.length === 1
          ? 'video.mp4'
          : `video-${i + 1}.mp4`;
        videos.push({ moduleName, lessonName, platform: (v.platform || v.type || 'unknown').toLowerCase(), url, filename });
      }
    }
  }
  return videos;
}

// -- Main ---------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter(a => !a.startsWith('--'));
  const community = positional[0];

  if (!community) {
    console.error(chalk.red('Usage: node tools/download-videos.js <community-name> [--skip-existing] [--cookies-from-browser <browser>]'));
    process.exit(1);
  }

  const skipExisting = args.includes('--skip-existing');
  let cookiesFromBrowser = null;
  const cookiesIdx = args.indexOf('--cookies-from-browser');
  if (cookiesIdx !== -1 && args[cookiesIdx + 1]) {
    cookiesFromBrowser = args[cookiesIdx + 1];
  }
  let moduleFilter = null;
  const moduleIdx = args.indexOf('--module');
  if (moduleIdx !== -1 && args[moduleIdx + 1]) {
    moduleFilter = args[moduleIdx + 1];
  }
  let concurrency = MAX_CONCURRENT;
  const concurrencyIdx = args.indexOf('--concurrency');
  if (concurrencyIdx !== -1 && args[concurrencyIdx + 1]) {
    concurrency = parseInt(args[concurrencyIdx + 1], 10) || MAX_CONCURRENT;
  }
  const flags = { cookiesFromBrowser };

  const projectRoot = path.resolve(__dirname, '..');
  const outputBase = process.env.SKOOL_OUTPUT_DIR || path.join(projectRoot, 'output');
  const dataPath = path.join(outputBase, community, 'classroom-data.json');

  if (!await fs.pathExists(dataPath)) {
    console.error(chalk.red(`Classroom data not found: ${dataPath}`));
    process.exit(1);
  }

  const data = await fs.readJson(dataPath);
  const videos = collectVideos(data, moduleFilter);

  if (videos.length === 0) {
    console.log(chalk.yellow('No videos found in classroom data.'));
    process.exit(0);
  }

  console.log(chalk.cyan(`Found ${videos.length} video(s) across ${(data.modules || []).length} module(s)\n`));

  const baseDir = path.join(outputBase, community, 'videos');
  const report = {
    community,
    startedAt: new Date().toISOString(),
    totalVideos: videos.length,
    results: [],
  };

  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Load manifest of previously downloaded files (to skip files moved to cloud)
  const manifestPath = path.join(outputBase, community, 'downloaded-videos-manifest.txt');
  const manifestSet = new Set();
  if (await fs.pathExists(manifestPath)) {
    const lines = (await fs.readFile(manifestPath, 'utf8')).split('\n').filter(Boolean);
    for (const line of lines) manifestSet.add(line.trim());
    console.log(chalk.gray(`Loaded manifest: ${manifestSet.size} previously downloaded videos\n`));
  }

  const pool = createPool(concurrency);

  const tasks = videos.map((video) => {
    return pool(async () => {
      const dir = path.join(baseDir, video.moduleName, video.lessonName);
      const outputPath = path.join(dir, video.filename);
      const idx = ++completed;
      const label = `[${idx}/${videos.length}]`;

      // Skip if file exists on disk
      if (await fs.pathExists(outputPath)) {
        const stat = await fs.stat(outputPath);
        if (stat.size > 0) {
          skipped++;
          console.log(chalk.gray(`${label} SKIP (exists) ${video.moduleName} / ${video.lessonName}`));
          report.results.push({
            module: video.moduleName, lesson: video.lessonName, platform: video.platform,
            url: video.url, outputPath, status: 'skipped',
          });
          return;
        }
      }

      // Skip if in manifest (previously downloaded, moved to cloud)
      if (manifestSet.has(outputPath)) {
        skipped++;
        console.log(chalk.gray(`${label} SKIP (manifest) ${video.moduleName} / ${video.lessonName}`));
        report.results.push({
          module: video.moduleName, lesson: video.lessonName, platform: video.platform,
          url: video.url, outputPath, status: 'skipped',
        });
        return;
      }

      await fs.ensureDir(dir);
      console.log(chalk.blue(`${label} Downloading [${video.platform}] ${video.moduleName} / ${video.lessonName}`));
      console.log(chalk.gray(`     URL: ${video.url}`));

      try {
        if (video.platform === 'mux') {
          await downloadWithFfmpeg(video.url, outputPath);
        } else {
          await downloadWithYtDlp(video.url, outputPath, video.platform, flags);
        }
        succeeded++;
        console.log(chalk.green(`${label} OK  ${video.moduleName} / ${video.lessonName}`));
        report.results.push({
          module: video.moduleName, lesson: video.lessonName, platform: video.platform,
          url: video.url, outputPath, status: 'success',
        });
        // Append to manifest
        await fs.appendFile(manifestPath, outputPath + '\n');
      } catch (err) {
        failed++;
        console.error(chalk.red(`${label} FAIL ${video.moduleName} / ${video.lessonName}`));
        console.error(chalk.red(`     ${err.message}`));
        report.results.push({
          module: video.moduleName, lesson: video.lessonName, platform: video.platform,
          url: video.url, outputPath, status: 'failed', error: err.message,
        });
      }
    });
  });

  await Promise.all(tasks);

  report.finishedAt = new Date().toISOString();
  report.succeeded = succeeded;
  report.failed = failed;
  report.skipped = skipped;
  const reportPath = path.join(outputBase, community, 'download-report.json');
  await fs.writeJson(reportPath, report, { spaces: 2 });

  console.log('');
  console.log(chalk.cyan('--- Download Summary ---'));
  console.log(chalk.green(`  Succeeded: ${succeeded}`));
  if (skipped > 0) console.log(chalk.gray(`  Skipped:   ${skipped}`));
  if (failed > 0) console.log(chalk.red(`  Failed:    ${failed}`));
  console.log(chalk.cyan(`  Report:    ${reportPath}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
