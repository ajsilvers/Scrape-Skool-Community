#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_CONCURRENT = 4;
const MAX_REDIRECTS = 5;

// -- Helpers ------------------------------------------------------------------

function sanitize(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

function filenameFromUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const base = path.basename(parsed.pathname);
    const clean = decodeURIComponent(base).replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
    if (clean && clean !== '/' && clean.length > 0) return clean;
  } catch {}
  return null;
}

function filenameFromHeaders(headers) {
  const cd = headers['content-disposition'];
  if (!cd) return null;
  const matchStar = cd.match(/filename\*=(?:UTF-8''|utf-8'')(.+)/i);
  if (matchStar) return decodeURIComponent(matchStar[1]).replace(/[<>:"/\\|?*]/g, '');
  const matchQuoted = cd.match(/filename="(.+?)"/);
  if (matchQuoted) return matchQuoted[1].replace(/[<>:"/\\|?*]/g, '');
  const matchPlain = cd.match(/filename=([^\s;]+)/);
  if (matchPlain) return matchPlain[1].replace(/[<>:"/\\|?*]/g, '');
  return null;
}

function downloadFile(urlStr, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('Too many redirects'));
    }

    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch {
      return reject(new Error(`Invalid URL: ${urlStr}`));
    }

    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, urlStr).href;
        res.resume();
        return downloadFile(redirectUrl, destPath, redirectCount + 1).then(resolve, reject);
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`));
      }

      // If destPath is a directory (ends with /), derive filename from response
      let finalPath = destPath;
      if (destPath.endsWith('/')) {
        const nameFromHeaders = filenameFromHeaders(res.headers);
        const nameFromUrl = filenameFromUrl(urlStr);
        const name = nameFromHeaders || nameFromUrl || 'download';
        finalPath = path.join(destPath, name);
      }

      const dir = path.dirname(finalPath);
      fs.ensureDirSync(dir);

      const file = fs.createWriteStream(finalPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(finalPath);
      });
      file.on('error', (err) => {
        fs.removeSync(finalPath);
        reject(err);
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out'));
    });
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

// -- Gather download items from classroom data --------------------------------

function collectItems(data) {
  const resources = [];
  const images = [];

  for (const mod of data.modules || []) {
    const moduleName = sanitize(mod.title || 'Untitled Module');
    for (const lesson of mod.lessons || []) {
      const lessonName = sanitize(lesson.title || 'Untitled Lesson');

      for (const res of lesson.resources || []) {
        // Support both formats: { url, title, type } and { href, text, isDownload }
        const resUrl = res.url || res.href;
        if (!resUrl) continue;
        const ext = res.type ? `.${res.type}` : '';
        const baseName = sanitize(res.title || res.text || filenameFromUrl(resUrl) || 'resource');
        let filename = baseName;
        if (ext && !baseName.toLowerCase().endsWith(ext.toLowerCase())) {
          filename = baseName + ext;
        }
        resources.push({ moduleName, lessonName, url: resUrl, filename, kind: 'resource' });
      }

      for (let i = 0; i < (lesson.images || []).length; i++) {
        const img = lesson.images[i];
        if (!img) continue;
        // Support both string URLs and { src, alt } objects
        const imgUrl = typeof img === 'string' ? img : img.src;
        if (!imgUrl) continue;
        const urlName = filenameFromUrl(imgUrl);
        const filename = urlName || `image-${i + 1}.jpg`;
        images.push({ moduleName, lessonName, url: imgUrl, filename, kind: 'image' });
      }
    }
  }

  return { resources, images };
}

// -- Main ---------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter(a => !a.startsWith('--'));
  const community = positional[0];

  if (!community) {
    console.error(chalk.red('Usage: node tools/download-resources.js <community-name> [--force]'));
    process.exit(1);
  }

  const forceRedownload = args.includes('--force');
  const projectRoot = path.resolve(__dirname, '..');
  const dataPath = path.join(projectRoot, 'output', community, 'classroom-data.json');

  if (!await fs.pathExists(dataPath)) {
    console.error(chalk.red(`Classroom data not found: ${dataPath}`));
    process.exit(1);
  }

  const data = await fs.readJson(dataPath);
  const { resources, images } = collectItems(data);

  const totalItems = resources.length + images.length;
  if (totalItems === 0) {
    console.log(chalk.yellow('No resources or images found in classroom data.'));
    process.exit(0);
  }

  console.log(chalk.cyan(`Found ${resources.length} resource(s) and ${images.length} image(s)\n`));

  const resourcesBase = path.join(projectRoot, 'output', community, 'resources');
  const imagesBase = path.join(projectRoot, 'output', community, 'images');

  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  const pool = createPool(MAX_CONCURRENT);

  async function processItem(item) {
    const baseDir = item.kind === 'resource' ? resourcesBase : imagesBase;
    const dir = path.join(baseDir, item.moduleName, item.lessonName);
    const outputPath = path.join(dir, item.filename);
    const idx = ++completed;
    const label = `[${idx}/${totalItems}]`;

    if (!forceRedownload && await fs.pathExists(outputPath)) {
      const stat = await fs.stat(outputPath);
      if (stat.size > 0) {
        skipped++;
        console.log(chalk.gray(`${label} SKIP (exists) ${item.kind}: ${item.moduleName} / ${item.lessonName} / ${item.filename}`));
        return;
      }
    }

    await fs.ensureDir(dir);
    console.log(chalk.blue(`${label} Downloading ${item.kind}: ${item.moduleName} / ${item.lessonName} / ${item.filename}`));

    try {
      await downloadFile(item.url, outputPath);
      succeeded++;
      console.log(chalk.green(`${label} OK  ${item.filename}`));
    } catch (err) {
      failed++;
      console.error(chalk.red(`${label} FAIL ${item.filename}: ${err.message}`));
    }
  }

  const allItems = [...resources, ...images];
  const tasks = allItems.map((item) => pool(() => processItem(item)));
  await Promise.all(tasks);

  console.log('');
  console.log(chalk.cyan('--- Resources Download Summary ---'));
  console.log(chalk.green(`  Succeeded: ${succeeded}`));
  if (skipped > 0) console.log(chalk.gray(`  Skipped:   ${skipped}`));
  if (failed > 0) console.log(chalk.red(`  Failed:    ${failed}`));
  console.log(chalk.cyan(`  Total:     ${totalItems}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
