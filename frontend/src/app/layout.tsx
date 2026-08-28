import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { CaseProvider } from "@/context/CaseContext";
import AppShell from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXUS | AI-Powered Intelligence & Investigation Platform",
  description: "Advanced intelligence platform featuring 3D network graphs, risk scoring, and evidence management.",
};

import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground transition-colors duration-300 antialiased font-sans">
        <ThemeProvider>
          <CaseProvider>
            <AppShell>
              {children}
            </AppShell>
          </CaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
