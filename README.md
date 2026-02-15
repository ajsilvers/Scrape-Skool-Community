# Skool Community Scraper

Download your entire Skool.com classroom before you hit **Cancel Subscription**. Courses, videos, resources - everything saved locally.

Built by **JangoAI** with [Claude Code](https://claude.ai/code).

## What It Does

- Scrapes all modules, lessons, and text content from any Skool classroom
- Downloads Mux-hosted and Loom videos in full quality
- Saves resources, attachments, and images
- Exports lesson content as clean Markdown files
- Runs as an intelligent Claude Code agent that handles errors and adapts

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`brew install yt-dlp`)
- [ffmpeg](https://ffmpeg.org/) (`brew install ffmpeg`)
- [Playwright](https://playwright.dev/) (installed automatically via `npm run setup`)

### 1. Clone & Install

```bash
git clone https://github.com/MaorZ19/Scrape-Skool-Community.git
cd Scrape-Skool-Community
npm run setup
```

### 2. Export Your Cookies

You need your Skool authentication cookies. Use the [Cookie-Editor](https://cookie-editor.com/) browser extension:

1. Log into Skool in your browser
2. Click the Cookie-Editor icon
3. Click **Export** (JSON format)
4. Save as `cookies.json` in the project root

### 3. Run It

**Option A: Claude Code Agent (recommended)**

```bash
claude "scrape https://www.skool.com/your-community"
```

The agent reads the workflow, picks tools, handles errors, and downloads everything.

**Option B: Direct CLI**

```bash
# Full pipeline - scrape + download videos + download resources
node index.js https://www.skool.com/your-community

# Multiple communities
node index.js https://www.skool.com/community1 https://www.skool.com/community2

# Scrape only (no downloads)
node index.js --scrape-only https://www.skool.com/your-community

# Resume interrupted downloads
node index.js --skip-existing https://www.skool.com/your-community
```

## Output Structure

```
output/
└── your-community/
    ├── classroom-data.json    # Full structured data
    ├── modules/
    │   ├── 01-Module-Name/
    │   │   ├── 01-Lesson-Title.md
    │   │   ├── 02-Another-Lesson.md
    │   │   └── ...
    │   └── ...
    ├── videos/
    │   ├── Module-Name/
    │   │   └── Lesson-Title/
    │   │       └── video.mp4
    │   └── ...
    ├── resources/
    │   └── ...
    └── download-report.json
```

## How It Works

1. **Authentication** - Loads your exported Skool cookies into a Playwright browser
2. **Discovery** - Parses the `__NEXT_DATA__` JSON embedded in Skool's Next.js pages to find all courses and lessons
3. **Content Extraction** - Visits each lesson page, extracts text content (ProseMirror JSON), video URLs, and resource links
4. **Video Download** - Routes Mux videos through `ffmpeg` (with Referer header) and Loom/YouTube through `yt-dlp`
5. **Resource Download** - Downloads attached files and images via HTTP

## Tech Stack

| Tool | Purpose |
|------|---------|
| **Playwright** | Browser automation & page scraping |
| **ffmpeg** | Mux HLS video stream download |
| **yt-dlp** | Loom, YouTube, Vimeo video download |
| **Node.js** | Runtime & orchestration |
| **Claude Code** | AI agent for intelligent execution |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `cookies.json not found` | Export cookies from Cookie-Editor extension |
| `0 modules found` | Cookies may be expired - re-export them |
| Mux video 403 error | Token expired - re-run the scraper to get fresh tokens |
| Loom format error | yt-dlp may need updating: `brew upgrade yt-dlp` |
| Content-dripped lesson | Video is time-gated by the community - can't download until unlocked |

## Distributable Package

Want to share this with others? A portable skill package is included:

```bash
# The zip is ready to distribute
ls skool-community-scraper.zip

# Or build it fresh
cd skool-community-scraper && npm run setup
```

## Disclaimer

This tool is for personal backup of content you have legitimate access to. Respect the content creators and the communities you're part of. Don't redistribute scraped content without permission.

## License

MIT - Built by [JangoAI](https://github.com/MaorZ19)
