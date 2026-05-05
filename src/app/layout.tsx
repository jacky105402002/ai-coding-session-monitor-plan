import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Coding Session Monitor",
  description: "Monitor AI coding CLI sessions from a small mobile-friendly dashboard."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
