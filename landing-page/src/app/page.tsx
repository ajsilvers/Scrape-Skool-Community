"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Icon components (inline SVGs to avoid external dependencies)      */
/* ------------------------------------------------------------------ */

function IconBook() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" />
      <path d="M8 11h8" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: <IconBook />,
    title: "Scrape Full Courses",
    description:
      "Crawls every module and lesson in your Skool classroom. Titles, descriptions, and structured content - all preserved.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: <IconVideo />,
    title: "Download Mux & Loom Videos",
    description:
      "Detects embedded Mux streams and Loom recordings, then downloads them in full quality using yt-dlp and ffmpeg.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: <IconFileText />,
    title: "Extract as Markdown",
    description:
      "Every lesson is saved as clean Markdown with proper hierarchy. Your content, your format, ready for Obsidian or Notion.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: <IconDownload />,
    title: "Save All Resources",
    description:
      "Attachments, PDFs, images, links - nothing gets left behind. The scraper grabs every resource attached to every lesson.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: <IconTerminal />,
    title: "Claude Code Agent",
    description:
      "Runs as an intelligent Claude Code agent. It reads the workflow, makes decisions, handles errors, and adapts on the fly.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: <IconSparkles />,
    title: "Smart & Resilient",
    description:
      'Handles pagination, lazy loading, auth cookies, and rate limits. If something fails, it retries. If it can\'t retry, it logs why.',
    gradient: "from-indigo-500 to-violet-500",
  },
];

const STATS = [
  { value: "2", label: "Communities Tested" },
  { value: "30", label: "Courses Scraped" },
  { value: "269", label: "Lessons Extracted" },
  { value: "62", label: "Videos Downloaded" },
  { value: "256", label: "Minutes of Content" },
];

const TECH_STACK = [
  { name: "Playwright", color: "from-green-400 to-emerald-500" },
  { name: "ffmpeg", color: "from-orange-400 to-red-500" },
  { name: "yt-dlp", color: "from-red-400 to-pink-500" },
  { name: "Node.js", color: "from-green-500 to-lime-400" },
  { name: "Claude Code", color: "from-violet-400 to-purple-500" },
  { name: "JavaScript", color: "from-yellow-400 to-yellow-600" },
];

const WITTY_MESSAGES = [
  "Nice try! This tool is open source - just clone the repo.",
  "Coupons? Where we're going, we don't need coupons. It's free.",
  "That's not a valid-- just kidding. It's open source. Go clone it.",
  "COUPON_ACCEPTED... just kidding. git clone and you're good.",
  "Error 402: Payment not required. It's free, friend.",
  "Ah yes, the legendary discount code. Too bad it's already free.",
];

const GITHUB_URL = "https://github.com/MaorZ19/Scrape-Skool-Community";

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="font-semibold text-white text-sm sm:text-base">
            Skool Scraper
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#features"
            className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
          >
            Features
          </a>
          <a
            href="#stats"
            className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
          >
            Stats
          </a>
          <a
            href="#download"
            className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
          >
            Download
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full glass glass-hover text-sm text-white transition-all duration-300 hover:scale-105"
          >
            <IconGithub />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "4s" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs sm:text-sm text-zinc-300 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Powered by Claude Code &middot; Open Source
        </div>

        {/* Title */}
        <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
          <span className="text-white">Skool Community</span>
          <br />
          <span className="gradient-text">Scraper</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up delay-200 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          Download your entire Skool classroom before you hit{" "}
          <span className="text-white font-medium">Cancel Subscription</span>.
          Courses, videos, resources - everything saved locally.
        </p>
        <p className="animate-fade-in-up delay-300 text-sm text-zinc-500 mb-10">
          Because &quot;I&apos;ll come back to it later&quot; is the biggest lie
          we tell ourselves.
        </p>

        {/* CTA buttons */}
        <div className="animate-fade-in-up delay-400 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative px-8 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-105 flex items-center gap-2"
          >
            <IconGithub />
            Clone the Repo
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
          </a>
          <a
            href="#features"
            className="px-8 py-3.5 rounded-full glass glass-hover text-white font-medium transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            See How It Works
            <IconChevronDown />
          </a>
        </div>

        {/* Terminal preview */}
        <div className="animate-fade-in-up delay-500 mt-16 max-w-2xl mx-auto">
          <TerminalPreview />
        </div>
      </div>
    </section>
  );
}

function TerminalPreview() {
  const [copied, setCopied] = useState(false);
  const command = "git clone https://github.com/MaorZ19/Scrape-Skool-Community.git";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass rounded-xl overflow-hidden text-left animate-pulse-glow">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-2 text-xs text-zinc-500 font-mono">terminal</span>
      </div>
      {/* Content */}
      <div className="p-4 sm:p-6 font-mono text-sm">
        <div className="flex items-center gap-2 group">
          <span className="text-green-400">$</span>
          <span className="text-zinc-300 break-all">{command}</span>
          <button
            onClick={handleCopy}
            className="ml-auto text-zinc-500 hover:text-white transition-colors flex-shrink-0 p-1"
            aria-label="Copy command"
          >
            {copied ? (
              <span className="text-green-400">
                <IconCheck />
              </span>
            ) : (
              <IconCopy />
            )}
          </button>
        </div>
        <div className="mt-3 text-zinc-500">
          <p>Cloning into &apos;Scrape-Skool-Community&apos;...</p>
          <p className="text-zinc-400">
            remote: Enumerating objects: 142, done.
          </p>
          <p className="text-green-400/80">
            Resolving deltas: 100% (87/87), done.
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-green-400">$</span>
          <span className="text-zinc-300">claude</span>
          <span className="text-zinc-500">
            &quot;scrape the School of Hard Knocks community&quot;
          </span>
        </div>
        <div className="mt-2 text-violet-400">
          Agent: Reading workflow... Found 30 courses, 269 lessons. Starting
          scrape.
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-4">
            FEATURES
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
            Everything you need to{" "}
            <span className="gradient-text">save your content</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            One agent. One command. Every piece of content from your Skool
            community, downloaded and organized.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="group glass glass-hover rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section id="stats" className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-600/5 to-transparent" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            BATTLE TESTED
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
            Real numbers from{" "}
            <span className="gradient-text">real scrapes</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            We didn&apos;t just build it and hope for the best. Here&apos;s what
            the scraper has actually processed.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-6 text-center transition-all duration-300 hover:border-violet-500/30"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-zinc-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Subtext */}
        <p className="text-center text-sm text-zinc-500 mt-8">
          ...and counting. Every community you scrape adds to the legend.
        </p>
      </div>
    </section>
  );
}

function TechStackSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            TECH STACK
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Built with tools that{" "}
            <span className="gradient-text">actually work</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {TECH_STACK.map((tech) => (
            <div
              key={tech.name}
              className="group glass glass-hover rounded-full px-5 py-2.5 flex items-center gap-2 transition-all duration-300 hover:scale-110"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${tech.color}`}
              />
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                {tech.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Clone & Configure",
      description:
        "Clone the repo, add your Skool auth cookie to .env, and make sure you have Claude Code installed.",
      code: "git clone https://github.com/MaorZ19/Scrape-Skool-Community.git",
    },
    {
      step: "02",
      title: "Run the Agent",
      description:
        'Fire up Claude Code and tell it what to scrape. The agent reads the workflow, picks the right tools, and gets to work.',
      code: 'claude "scrape the XYZ community"',
    },
    {
      step: "03",
      title: "Grab Your Content",
      description:
        "Find everything neatly organized in .tmp/ - Markdown files, downloaded videos, extracted resources. All yours.",
      code: "ls .tmp/courses/",
    },
  ];

  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">
            Three steps to{" "}
            <span className="gradient-text">content freedom</span>
          </h2>
        </div>

        <div className="space-y-8">
          {steps.map((item, i) => (
            <div
              key={item.step}
              className={`glass glass-hover rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 ${
                i % 2 === 0 ? "animate-slide-in-left" : "animate-slide-in-right"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <span className="text-4xl font-bold gradient-text flex-shrink-0">
                  {item.step}
                </span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-zinc-400 mb-4 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="glass rounded-lg px-4 py-2.5 font-mono text-sm">
                    <span className="text-green-400">$ </span>
                    <span className="text-zinc-300">{item.code}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadSection() {
  const [couponCode, setCouponCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wittyMessage, setWittyMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const randomMsg =
      WITTY_MESSAGES[Math.floor(Math.random() * WITTY_MESSAGES.length)];
    setWittyMessage(randomMsg);
    setSubmitted(true);
  };

  const handleReset = () => {
    setCouponCode("");
    setSubmitted(false);
    setWittyMessage("");
  };

  return (
    <section id="download" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-600/5 to-transparent" />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
        <div className="glass rounded-3xl p-8 sm:p-12 text-center animate-pulse-glow">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
            <IconDownload />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Get the Scraper
          </h2>
          <p className="text-zinc-400 mb-8">
            Enter your exclusive coupon code to unlock the premium download.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code..."
                  className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all duration-300 text-center text-lg font-mono tracking-wider"
                />
              </div>
              <button
                type="submit"
                className="w-full px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                Redeem Code
              </button>
              <p className="text-xs text-zinc-600">
                * Definitely a real coupon system. Trust us.
              </p>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-in-up">
              <div className="glass rounded-xl p-6">
                <p className="text-lg text-white font-medium mb-2">
                  {wittyMessage}
                </p>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <IconGithub />
                  github.com/jangoai/Scrape-Skool-Community
                </a>
              </div>

              <div className="glass rounded-xl p-4 font-mono text-sm text-left">
                <p className="text-zinc-500 mb-1"># The real &quot;download&quot;:</p>
                <p>
                  <span className="text-green-400">$ </span>
                  <span className="text-zinc-300">
                    git clone https://github.com/MaorZ19/Scrape-Skool-Community.git
                  </span>
                </p>
                <p>
                  <span className="text-green-400">$ </span>
                  <span className="text-zinc-300">cd Scrape-Skool-Community</span>
                </p>
                <p>
                  <span className="text-green-400">$ </span>
                  <span className="text-zinc-300">claude</span>
                </p>
              </div>

              <button
                onClick={handleReset}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
              >
                Try another code (it still won&apos;t work)
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="text-sm text-zinc-400">
              Skool Community Scraper
            </span>
          </div>

          {/* Center */}
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Built with</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium text-xs">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              Claude Code
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <IconGithub />
            </a>
            <span className="text-xs text-zinc-600">
              {new Date().getFullYear()} &middot; Open Source
            </span>
          </div>
        </div>

        {/* Cheeky bottom text */}
        <p className="text-center text-xs text-zinc-700 mt-8">
          Built by{" "}
          <span className="text-zinc-500 font-medium">JangoAI</span>
          {" "}&middot;{" "}
          No Skool communities were harmed in the making of this tool.
          <br />
          We just... backed up their content. Aggressively.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <TechStackSection />
      <HowItWorksSection />
      <DownloadSection />
      <Footer />
    </div>
  );
}
