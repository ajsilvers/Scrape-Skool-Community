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
      "Save your Skool.com learning content before canceling. Courses, Mux/Loom videos, resources - all downloaded locally.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skool Community Scraper",
    description:
      "Save your Skool.com learning content before canceling.",
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
