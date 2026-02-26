#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputBase = process.env.SKOOL_OUTPUT_DIR || path.join(__dirname, '..', 'output');
const community = process.argv[2] || 'six-figure-creators';

const base = path.join(outputBase, community, 'videos');
const manifestPath = path.join(outputBase, community, 'downloaded-videos-manifest.txt');
const dataPath = path.join(outputBase, community, 'classroom-data.json');

const manifest = new Set(
  fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean)
);
const data = fs.readJsonSync(dataPath);

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

let cleaned = 0;
for (const m of data.modules) {
  for (const l of m.lessons || []) {
    if (l.videos && l.videos.length > 0) {
      const p = path.join(base, sanitize(m.title), sanitize(l.title), 'video.mp4');
      if (fs.existsSync(p) && !manifest.has(p)) {
        const stat = fs.statSync(p);
        console.log(`REMOVING partial: ${sanitize(m.title)} / ${sanitize(l.title)} (${(stat.size / 1024 / 1024).toFixed(0)}MB)`);
        fs.unlinkSync(p);
        cleaned++;
      }
    }
  }
}
console.log(`\nCleaned ${cleaned} partial files`);
