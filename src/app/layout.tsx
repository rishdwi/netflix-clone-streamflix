import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter stands in for the proprietary "Netflix Sans" — clean, geometric, readable.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "StreamFlix — Watch Films & TV",
  description:
    "A full-stack Netflix clone: JWT auth, HLS adaptive streaming, watchlist, continue watching and an admin CMS. BCA final-year project.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
