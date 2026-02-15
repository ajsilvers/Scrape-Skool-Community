---
name: skool-community-scraper
description: >
  Scrapes entire Skool.com communities - downloads all classroom courses,
  video lessons (Mux/Loom), resources, and text content as organized markdown
  files. Use when the user wants to "scrape skool", "download skool community",
  "backup skool content", "save skool courses before canceling", "extract
  skool classroom", or mentions downloading educational content from Skool.
  Requires Playwright, ffmpeg, and yt-dlp. Handles Skool's Next.js SPA
  architecture and Mux HLS video streams.
metadata:
  author: JangoAI
  version: 1.0.0
---

# Skool Community Scraper

Autonomous scraping agent that downloads all educational content from Skool.com communities. Built to handle Skool's Next.js/React SPA architecture where content is embedded in `__NEXT_DATA__` script tags.

## How It Works

Skool uses Next.js with server-rendered data. The scraper:
1. Authenticates via browser cookies (exported from your browser)
2. Navigates to the classroom page and extracts course structure from `__NEXT_DATA__`
3. Visits each lesson page to extract full content, video metadata, and resources
4. Downloads Mux videos via ffmpeg (with Referer header) and Loom videos via yt-dlp
5. Saves everything as organized markdown files + video files + resources

## Prerequisites Check

Before starting, verify all tools are installed:

```bash
node --version       # Need 18+
ffmpeg -version      # For Mux HLS video downloads
yt-dlp --version     # For Loom video downloads
```

If missing:
- **ffmpeg**: `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux)
- **yt-dlp**: `brew install yt-dlp` or `pip install yt-dlp`
- **Playwright browsers**: Run `npx playwright install chromium` after npm install

## Step 1: Project Setup

Initialize the project and install dependencies:

```bash
npm init -y
npm install playwright fs-extra chalk ora yt-dlp-wrap
```

Set ES modules in package.json: `"type": "module"`

## Step 2: Cookie Authentication

Skool requires authentication. The user must export cookies from their browser:

1. Log into Skool in Chrome/Firefox
2. Install the **Cookie-Editor** browser extension
3. Navigate to any Skool page, click Cookie-Editor, click **Export** (JSON)
4. Save as `cookies.json` in the project root

Run `scripts/validate-cookies.js` to verify. Critical cookies: `auth_token` (JWT) and `client_id`.

The cookies work for ALL communities the user is subscribed to - one export covers everything.

## Step 3: Scrape Classroom Content

Run the scraper for each community:

```bash
node scripts/scrape-classroom.js <community-slug>
```

The slug is the URL path segment (e.g., for `skool.com/my-community`, the slug is `my-community`).

### What the scraper does:
1. Loads cookies and navigates to `/community-slug/classroom`
2. Extracts `__NEXT_DATA__` JSON containing the `allCourses` array
3. For each course, navigates to the course page and extracts sidebar lessons
4. For each lesson, extracts:
   - Text content from `metadata.desc` (ProseMirror JSON format with `[v2]` prefix)
   - Video data (Mux playbackId + signed JWT token, or Loom embed URL)
   - Resource links and attachments
5. Saves `classroom-data.json` + individual `.md` files per lesson

### Important technical details:
- Uses `domcontentloaded` + 3s sleep instead of `networkidle` because Mux video players keep network connections open indefinitely, causing Playwright timeouts
- Content is in ProseMirror format: `[v2][{"type":"paragraph","content":[...]}]` - the scraper converts this to markdown
- Mux tokens include `playback_restriction_id` enforcing referrer-based access

## Step 4: Download Videos

```bash
node scripts/download-videos.js <community-slug> [--skip-existing]
```

### Video platform handling:
- **Mux videos**: Downloaded via ffmpeg with `Referer: https://www.skool.com/` header. Uses `-c copy` for stream copy (no re-encoding). Mux tokens expire in ~24 hours.
- **Loom videos**: Downloaded via yt-dlp with format `hls-raw-1500+hls-raw-audio-audio` because Loom only serves HLS, not direct MP4.

Concurrency: 2 parallel downloads to avoid rate limiting.

### If Mux downloads fail with 403/400:
- Tokens have expired. Re-run the scraper (Step 3) to get fresh tokens
- If token shows as `undefined`, the video player wasn't loaded when the page was scraped - re-scrape that specific community

## Step 5: Download Resources

```bash
node scripts/download-resources.js <community-slug>
```

Downloads attached files, PDFs, and linked resources. Most Skool lessons link to external tools (not downloadable files), so resource counts are typically low.

## Output Structure

```
output/<community-slug>/
  classroom-data.json          # Full structured data
  modules/
    <course-name>/
      <lesson-name>.md         # Lesson content as markdown
  videos/
    <course-name>/
      <lesson-name>/
        video.mp4              # Downloaded video
  resources/
    <course-name>/
      <lesson-name>/
        <filename>             # Downloaded attachments
```

## Full Pipeline (All Steps at Once)

```bash
node scripts/orchestrator.js <url1> <url2> [--scrape-only] [--download-only] [--skip-existing]
```

Pass full Skool URLs: `https://www.skool.com/community-name`

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Found 0 courses" | CSS selectors failed | This scraper uses `__NEXT_DATA__` extraction - check if Skool changed their page structure |
| `networkidle` timeout | Mux video player keeps connections open | Already handled - scraper uses `domcontentloaded` + sleep |
| Mux 403 Forbidden | Token expired or missing Referer | Re-scrape for fresh tokens. ffmpeg needs `Referer: https://www.skool.com/` header |
| Loom "format not available" | Default format selector incompatible | Uses explicit HLS format IDs: `hls-raw-1500+hls-raw-audio-audio` |
| `token=undefined` | Video wasn't loaded on page visit | Re-scrape the community - the lesson page needs to render the video player |
| Empty lesson content | Content in `__NEXT_DATA__` but not in `metadata.desc` | Scraper has 3 fallback layers: course data -> lesson page data -> DOM extraction |

## Example Session

```
$ node scripts/scrape-classroom.js aiautomationsbyjack

[12:08:49 PM] Community: aiautomationsbyjack
[12:08:49 PM] Loaded 7 cookies
[12:08:52 PM] Authenticated.
[12:08:52 PM] Found 13 courses

[1/13] AI Foundations
  Sidebar: 10 lessons
  [1/10] Welcome
    -> Content: 1172 chars, Videos: 1 (382s), Resources: 0
  [2/10] Roadmap
    -> Content: 2343 chars, Videos: 0, Resources: 0
  ...

--- SCRAPE SUMMARY ---
Community:  aiautomationsbyjack
Courses:    13
Lessons:    66
Videos:     15 (84 min total)
```
