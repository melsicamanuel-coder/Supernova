import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SUPERNOVA",
  description: "Autonomous Multi-Agent Intelligence Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex h-full min-h-screen bg-background text-foreground">
        <Suspense>
          <Sidebar />
        </Suspense>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Suspense>
            <Header />
          </Suspense>
          <main className="flex-1 overflow-y-auto bg-grid px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
        <Suspense>
          <CommandPalette />
        </Suspense>
      </body>
    </html>
  );
}
