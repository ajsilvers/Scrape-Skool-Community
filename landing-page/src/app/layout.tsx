import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skool Community Scraper | Save Your Learning Content",
  description:
    "Download all your Skool.com classroom content before you cancel. Courses, videos, resources - everything saved locally. Powered by Claude Code.",
  keywords: [
    "skool",
    "scraper",
    "community",
    "courses",
    "download",
    "claude code",
    "playwright",
  ],
  openGraph: {
    title: "Skool Community Scraper",
    description:
      "Download your entire Skool classroom before you hit Cancel. Courses, videos, resources - everything. Free & open source. By JangoAI.",
    type: "website",
    url: "https://skool-community-scraper.vercel.app",
    siteName: "Skool Community Scraper",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skool Community Scraper",
    description:
      "Download your entire Skool classroom before you cancel. Free & open source tool by JangoAI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased noise-bg`}
      >
        {children}
      </body>
    </html>
  );
}
