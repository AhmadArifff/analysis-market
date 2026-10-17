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
  title: "ANALYSIS-MARKET // Quantitative Institutional Terminal",
  description: "Algorithmic Multi-Timeframe Exhaustion, Retail Liquidity Sweeps, and Automated Journal Exporter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#090A0F] text-[#E2E8F0] font-sans selection:bg-[#202636] selection:text-[#38BDF8]">
        {children}
      </body>
    </html>
  );
}
