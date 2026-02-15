#!/usr/bin/env node

/**
 * Skool.com Classroom Scraper v2
 *
 * Extracts all classroom content by reading __NEXT_DATA__ from each page.
 * Handles Mux video streams, structured content (ProseMirror), and resources.
 *
 * Usage:
 *   node tools/scrape-classroom.js https://www.skool.com/community-slug
 *   node tools/scrape-classroom.js https://www.skool.com/community-slug --headed
 */

import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DELAY_MS = 2000;
const TIMEOUT_MS = 45000;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const COOKIES_PATH = path.join(PROJECT_ROOT, 'cookies.json');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function logError(msg) {
  console.error(`[${new Date().toLocaleTimeString()}] ERROR: ${msg}`);
}

function normalizeCookies(raw) {
  return raw.map(c => ({
    name: c.name || c.Name,
    value: c.value || c.Value,
    domain: c.domain || c.Domain || '.skool.com',
    path: c.path || c.Path || '/',
    secure: c.secure !== undefined ? c.secure : true,
    httpOnly: c.httpOnly !== undefined ? c.httpOnly : false,
    sameSite: c.sameSite || c.SameSite || 'Lax',
  })).filter(c => c.name && c.value);
}

// ---------------------------------------------------------------------------
// Parse Skool's ProseMirror-style content to markdown
// ---------------------------------------------------------------------------

function proseMirrorToMarkdown(nodes) {
  if (!Array.isArray(nodes)) return '';
  let md = '';

  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph':
        md += inlineContent(node.content) + '\n\n';
        break;
      case 'heading': {
        const level = node.attrs?.level || 1;
        md += '#'.repeat(level) + ' ' + inlineContent(node.content) + '\n\n';
        break;
      }
      case 'bulletList':
        md += listItems(node.content, '- ') + '\n';
        break;
      case 'orderedList':
        md += listItems(node.content, null, true) + '\n';
        break;
      case 'listItem':
        md += inlineContent(node.content);
        break;
      case 'blockquote':
        md += proseMirrorToMarkdown(node.content).split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
        break;
      case 'codeBlock':
        md += '```\n' + inlineContent(node.content) + '\n```\n\n';
        break;
      case 'horizontalRule':
        md += '---\n\n';
        break;
      case 'image':
        md += `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})\n\n`;
        break;
      case 'embed':
        if (node.attrs?.src) md += `[Embed](${node.attrs.src})\n\n`;
        break;
      default:
        if (node.content) md += proseMirrorToMarkdown(node.content);
        break;
    }
  }
  return md;
}

function inlineContent(content) {
  if (!content) return '';
  if (!Array.isArray(content)) {
    if (content.type === 'paragraph') return inlineContent(content.content);
    if (content.text) return content.text;
    return '';
  }
  return content.map(node => {
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `**${text}**`;
          else if (mark.type === 'italic') text = `*${text}*`;
          else if (mark.type === 'code') text = `\`${text}\``;
          else if (mark.type === 'link') text = `[${text}](${mark.attrs?.href || ''})`;
        }
      }
      return text;
    }
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'image') return `![${node.attrs?.alt || ''}](${node.attrs?.src || ''})`;
    if (node.type === 'paragraph') return inlineContent(node.content);
    if (node.type === 'listItem') return inlineContent(node.content);
    if (node.content) return inlineContent(node.content);
    return '';
  }).join('');
}

function listItems(content, prefix, ordered = false) {
  if (!Array.isArray(content)) return '';
  return content.map((item, i) => {
    const p = ordered ? `${i + 1}. ` : prefix;
    return p + inlineContent(item.content);
  }).join('\n');
}

// ---------------------------------------------------------------------------
// Parse Skool metadata.desc to markdown
// ---------------------------------------------------------------------------

function parseDesc(desc) {
  if (!desc) return '';
  if (typeof desc !== 'string') return '';

  // Skool v2 format: "[v2]" prefix followed by JSON array
  if (desc.startsWith('[v2]')) {
    try {
      const jsonStr = desc.slice(4);
      const nodes = JSON.parse(jsonStr);
      return proseMirrorToMarkdown(nodes);
    } catch {
      return desc.slice(4);
    }
  }

  // Plain text or HTML
  return desc;
}

// ---------------------------------------------------------------------------
// Extract __NEXT_DATA__ from page
// ---------------------------------------------------------------------------

async function getNextData(page) {
  return page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch { return null; }
  });
}

// ---------------------------------------------------------------------------
// Extract lesson sidebar titles from DOM
// ---------------------------------------------------------------------------

async function getSidebarLessons(page, communitySlug) {
  return page.evaluate((slug) => {
    const lessons = [];
    const seen = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href || '';
      if (href.includes(`/${slug}/classroom/`) && href.includes('md=') && !seen.has(href)) {
        seen.add(href);
        // Extract the md parameter
        const url = new URL(href);
        const md = url.searchParams.get('md');
        lessons.push({
          title: a.textContent.trim(),
          url: href,
          lessonId: md,
        });
      }
    });
    return lessons;
  }, communitySlug);
}

// ---------------------------------------------------------------------------
// Build Mux video URL from pageProps.video
// ---------------------------------------------------------------------------

function buildMuxVideoInfo(videoData) {
  if (!videoData || !videoData.playbackId) return null;
  return {
    src: `https://stream.mux.com/${videoData.playbackId}.m3u8?token=${videoData.playbackToken}`,
    type: 'mux',
    playbackId: videoData.playbackId,
    duration: videoData.duration, // milliseconds
    aspectRatio: videoData.aspectRatio,
    thumbnailUrl: videoData.thumbnailToken
      ? `https://image.mux.com/${videoData.playbackId}/thumbnail.jpg?token=${videoData.thumbnailToken}`
      : null,
  };
}

// ---------------------------------------------------------------------------
// Also check DOM for additional embedded videos (Loom, YouTube, etc.)
// ---------------------------------------------------------------------------

async function extractDomVideos(page) {
  return page.evaluate(() => {
    const videos = [];
    const seen = new Set();

    function add(src, type) {
      if (!src || seen.has(src)) return;
      seen.add(src);
      videos.push({ src, type });
    }

    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src || '';
      if (src.includes('stripe.com') || src.includes('google')) return; // skip non-video iframes
      if (src.includes('loom.com')) add(src, 'loom');
      else if (src.includes('vimeo.com')) add(src, 'vimeo');
      else if (src.includes('youtube.com') || src.includes('youtu.be')) add(src, 'youtube');
      else if (src.includes('wistia')) add(src, 'wistia');
      else if (src) add(src, 'iframe');
    });

    document.querySelectorAll('video').forEach(v => {
      const src = v.src || '';
      if (src) add(src, 'native');
    });

    return videos;
  });
}

// ---------------------------------------------------------------------------
// Extract resource links from lesson content
// ---------------------------------------------------------------------------

function extractResourcesFromDesc(desc) {
  if (!desc) return [];
  const resources = [];
  const seen = new Set();

  // Find URLs in the parsed desc that look like resources
  const urlRegex = /https?:\/\/[^\s"'<>)]+/g;
  const matches = desc.match(urlRegex) || [];
  for (const url of matches) {
    if (seen.has(url)) continue;
    if (url.includes('skool.com')) continue; // skip internal links
    seen.add(url);
    resources.push({ href: url, text: url, isDownload: false });
  }

  return resources;
}

// ---------------------------------------------------------------------------
// Main scraping logic
// ---------------------------------------------------------------------------

async function scrapeClassroom(communityUrl, options = {}) {
  const { headed = false } = options;

  const urlObj = new URL(communityUrl);
  const communitySlug = urlObj.pathname.replace(/^\//, '').replace(/\/.*$/, '');
  if (!communitySlug) throw new Error(`Could not parse community slug: ${communityUrl}`);

  log(`Community: ${communitySlug}`);
  const classroomUrl = `https://www.skool.com/${communitySlug}/classroom`;

  if (!await fs.pathExists(COOKIES_PATH)) {
    throw new Error(`cookies.json not found. Export your Skool cookies first.`);
  }
  const rawCookies = await fs.readJson(COOKIES_PATH);
  const cookies = normalizeCookies(rawCookies);
  log(`Loaded ${cookies.length} cookies`);

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  const result = {
    community: communitySlug,
    classroomUrl,
    scrapedAt: new Date().toISOString(),
    modules: [],
  };

  try {
    // ===== Step 1: Get all courses from classroom page =====
    log(`Navigating to ${classroomUrl}`);
    await page.goto(classroomUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await sleep(2000);

    const isLogin = await page.evaluate(() => {
      const t = document.body.textContent || '';
      return t.includes('Log in') && t.includes('Sign up') && !t.includes('Classroom');
    });
    if (isLogin) throw new Error('Not authenticated. Re-export your cookies.');

    log('Authenticated.');
    const classroomData = await getNextData(page);
    const allCourses = classroomData?.props?.pageProps?.allCourses || [];
    log(`Found ${allCourses.length} courses`);

    // ===== Step 2: For each course, navigate and extract structure =====
    for (let ci = 0; ci < allCourses.length; ci++) {
      const courseInfo = allCourses[ci];
      const courseMeta = typeof courseInfo.metadata === 'object' ? courseInfo.metadata : {};
      const courseTitle = courseMeta.title || courseInfo.name || `Course ${ci + 1}`;
      const courseSlug = courseInfo.name;

      log(`\n[${ci + 1}/${allCourses.length}] ${courseTitle}`);

      const courseUrl = `https://www.skool.com/${communitySlug}/classroom/${courseSlug}`;
      try {
        await page.goto(courseUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await sleep(DELAY_MS);
      } catch (err) {
        logError(`Failed to load course: ${err.message}`);
        result.modules.push({ title: courseTitle, courseId: courseInfo.id, error: err.message, lessons: [] });
        continue;
      }

      // Get lesson titles from sidebar DOM
      const sidebarLessons = await getSidebarLessons(page, communitySlug);
      log(`  Sidebar: ${sidebarLessons.length} lessons`);

      // Also get structure from __NEXT_DATA__
      const courseNextData = await getNextData(page);
      const coursePageProps = courseNextData?.props?.pageProps || {};
      const courseObj = coursePageProps.course;

      // Build a map: lessonId -> metadata from __NEXT_DATA__
      const lessonMetaMap = new Map();
      if (courseObj?.children) {
        for (const section of courseObj.children) {
          const sectionCourse = section.course || {};
          const sectionMeta = typeof sectionCourse.metadata === 'object' ? sectionCourse.metadata : {};
          const sectionTitle = sectionMeta.title || 'Section';

          for (const lessonItem of (section.children || [])) {
            const lCourse = lessonItem.course || {};
            const lMeta = typeof lCourse.metadata === 'object' ? lCourse.metadata : {};
            lessonMetaMap.set(lCourse.id, {
              title: lMeta.title,
              desc: lMeta.desc,
              sectionTitle,
              name: lCourse.name,
            });
          }
        }
      }

      // Build module data
      const moduleData = {
        title: courseTitle,
        courseId: courseInfo.id,
        courseSlug,
        lessons: [],
      };

      // ===== Step 3: Extract content from course data, then visit each lesson for video =====

      // First: build all lesson data from course page's __NEXT_DATA__ (content is here)
      for (let li = 0; li < sidebarLessons.length; li++) {
        const sl = sidebarLessons[li];
        const metaInfo = lessonMetaMap.get(sl.lessonId);
        const contentMarkdown = metaInfo?.desc ? parseDesc(metaInfo.desc) : '';
        const resources = extractResourcesFromDesc(contentMarkdown);

        moduleData.lessons.push({
          title: sl.title,
          url: sl.url,
          lessonId: sl.lessonId,
          module: courseTitle,
          sectionTitle: metaInfo?.sectionTitle || '',
          content: { markdown: contentMarkdown },
          videos: [],
          images: [],
          resources,
        });
      }

      log(`  Extracted content for ${moduleData.lessons.length} lessons from course data`);

      // Second: navigate to each lesson to get video data and DOM extras
      for (let li = 0; li < moduleData.lessons.length; li++) {
        const lesson = moduleData.lessons[li];
        log(`  [${li + 1}/${moduleData.lessons.length}] ${lesson.title}`);

        try {
          await page.goto(lesson.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
          await sleep(3000); // Wait for React hydration

          const lessonNextData = await getNextData(page);
          const lessonProps = lessonNextData?.props?.pageProps || {};

          // Video from pageProps (Mux)
          const videoInfo = buildMuxVideoInfo(lessonProps.video);
          if (videoInfo) lesson.videos.push(videoInfo);

          // Check DOM for additional embedded videos (Loom, YouTube, etc.)
          const domVideos = await extractDomVideos(page);
          for (const dv of domVideos) {
            if (!lesson.videos.some(v => v.src === dv.src)) {
              lesson.videos.push(dv);
            }
          }

          // DOM resources and images
          const domExtras = await page.evaluate(() => {
            const resources = [];
            const images = [];
            const seen = new Set();
            const area = document.querySelector('.ql-editor, article, main');
            if (!area) return { resources, images };

            area.querySelectorAll('a[href]').forEach(a => {
              const href = a.href || '';
              if (!href || seen.has(href) || href.startsWith('javascript:') || href === '#') return;
              if (href.includes('skool.com') && !href.includes('/download') && !href.includes('/file')) return;
              seen.add(href);
              resources.push({ href, text: a.textContent.trim() || href, isDownload: a.hasAttribute('download') });
            });

            area.querySelectorAll('img').forEach(img => {
              const src = img.src || '';
              if (src && !seen.has(src) && !src.includes('avatar') && !src.includes('favicon') && !src.includes('emoji')) {
                seen.add(src);
                images.push({ src, alt: img.alt || '' });
              }
            });

            return { resources, images };
          });

          for (const dr of domExtras.resources) {
            if (!lesson.resources.some(r => r.href === dr.href)) {
              lesson.resources.push(dr);
            }
          }
          lesson.images = domExtras.images;

          // If content was empty from course-level metadata, extract from lesson page
          if (!lesson.content.markdown || lesson.content.markdown.length < 20) {
            // Try lesson page's __NEXT_DATA__ (has full desc for current lesson)
            if (lessonProps.course?.children) {
              for (const section of lessonProps.course.children) {
                for (const item of (section.children || [])) {
                  if (item.course?.id === lesson.lessonId) {
                    const m = typeof item.course.metadata === 'object' ? item.course.metadata : {};
                    if (m.desc) {
                      const parsed = parseDesc(m.desc);
                      if (parsed.length > (lesson.content.markdown?.length || 0)) {
                        lesson.content.markdown = parsed;
                      }
                    }
                  }
                }
              }
            }
          }

          // Final fallback: extract text from DOM
          if (!lesson.content.markdown || lesson.content.markdown.length < 20) {
            const domContent = await page.evaluate(() => {
              // Try the lesson content area specifically
              const ql = document.querySelector('.ql-editor');
              if (ql && ql.textContent.trim().length > 20) return ql.textContent.trim();

              // Look for the main content area (right panel)
              const contentDivs = document.querySelectorAll('[class*="styled__Content"], [class*="ContentWrapper"], [class*="lesson-body"]');
              for (const div of contentDivs) {
                const text = div.textContent.trim();
                if (text.length > 20) return text;
              }

              // Last resort: get the right side content
              const main = document.querySelector('main');
              if (main) {
                // Skip sidebar (left) and get content (right)
                const allText = main.textContent.trim();
                if (allText.length > 100) return allText;
              }
              return '';
            });
            if (domContent.length > (lesson.content.markdown?.length || 0)) {
              lesson.content.markdown = domContent;
            }
          }

          const durationStr = lesson.videos[0]?.duration ? ` (${Math.round(lesson.videos[0].duration / 1000)}s)` : '';
          log(`    -> Content: ${lesson.content.markdown.length} chars, Videos: ${lesson.videos.length}${durationStr}, Resources: ${lesson.resources.length}`);

        } catch (err) {
          logError(`    Failed to get video: ${err.message}`);
          lesson.error = err.message;
        }
      }

      result.modules.push(moduleData);
    }

    // ===== Step 4: Save output =====
    const communityOutputDir = path.join(OUTPUT_DIR, communitySlug);
    const modulesDir = path.join(communityOutputDir, 'modules');
    await fs.ensureDir(modulesDir);

    await fs.writeJson(path.join(communityOutputDir, 'classroom-data.json'), result, { spaces: 2 });
    log(`\nSaved JSON to output/${communitySlug}/classroom-data.json`);

    let lessonCount = 0;
    for (const mod of result.modules) {
      const moduleDir = path.join(modulesDir, slugify(mod.title));
      await fs.ensureDir(moduleDir);

      for (let i = 0; i < mod.lessons.length; i++) {
        const lesson = mod.lessons[i];
        const filename = `${String(i + 1).padStart(2, '0')}-${slugify(lesson.title)}.md`;
        const mdPath = path.join(moduleDir, filename);

        let md = `# ${lesson.title}\n\n`;
        md += `**Module:** ${mod.title}\n`;
        md += `**URL:** ${lesson.url}\n\n`;

        if (lesson.error) md += `> **Error:** ${lesson.error}\n\n`;

        if (lesson.videos?.length > 0) {
          md += `## Videos\n\n`;
          for (const v of lesson.videos) {
            if (v.type === 'mux') {
              md += `- Mux Video (${Math.round((v.duration || 0) / 1000)}s): \`${v.playbackId}\`\n`;
              md += `  Stream: ${v.src}\n`;
              if (v.thumbnailUrl) md += `  Thumbnail: ${v.thumbnailUrl}\n`;
            } else {
              md += `- [${v.type}](${v.src})\n`;
            }
          }
          md += '\n';
        }

        if (lesson.content?.markdown) {
          md += `## Content\n\n${lesson.content.markdown}\n\n`;
        }

        if (lesson.images?.length > 0) {
          md += `## Images\n\n`;
          for (const img of lesson.images) md += `![${img.alt || ''}](${img.src})\n\n`;
        }

        if (lesson.resources?.length > 0) {
          md += `## Resources\n\n`;
          for (const r of lesson.resources) md += `- [${r.text}](${r.href})\n`;
          md += '\n';
        }

        await fs.writeFile(mdPath, md);
        lessonCount++;
      }
    }

    log(`Saved ${lessonCount} lesson files`);

    // Summary
    const totalLessons = result.modules.reduce((s, m) => s + m.lessons.length, 0);
    const totalVideos = result.modules.reduce((s, m) => s + m.lessons.reduce((ls, l) => ls + (l.videos?.length || 0), 0), 0);
    const totalDuration = result.modules.reduce((s, m) => s + m.lessons.reduce((ls, l) => {
      return ls + (l.videos || []).reduce((vs, v) => vs + (v.duration || 0), 0);
    }, 0), 0);

    console.log('\n--- SCRAPE SUMMARY ---');
    console.log(`Community:  ${communitySlug}`);
    console.log(`Courses:    ${result.modules.length}`);
    console.log(`Lessons:    ${totalLessons}`);
    console.log(`Videos:     ${totalVideos} (${Math.round(totalDuration / 60000)} min total)`);
    console.log(`Output:     ${communityOutputDir}`);
    console.log('----------------------\n');

  } finally {
    await browser.close();
  }

  return result;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Skool Classroom Scraper v2

Usage:
  node tools/scrape-classroom.js <community-url> [--headed]

Examples:
  node tools/scrape-classroom.js https://www.skool.com/aiautomationsbyjack
  node tools/scrape-classroom.js https://www.skool.com/ai-automation-society-plus --headed
`);
    process.exit(0);
  }

  const communityUrl = args.find(a => a.startsWith('http'));
  if (!communityUrl) {
    console.error('Error: Provide a valid Skool community URL');
    process.exit(1);
  }

  await fs.ensureDir(path.join(PROJECT_ROOT, '.tmp'));

  try {
    await scrapeClassroom(communityUrl, { headed: args.includes('--headed') });
  } catch (err) {
    logError(err.message);
    process.exit(1);
  }
}

main();
