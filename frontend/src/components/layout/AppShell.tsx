"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";
import { useCase } from "@/context/CaseContext";
import GlobalChatbot from "./GlobalChatbot";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loadingCases } = useCase();

  // Pages that don't need a sidebar wrapper
  const isPublicPage = pathname === "/" || pathname === "/login";

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (loadingCases) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-background)] text-[var(--text-primary)] font-mono text-sm tracking-widest uppercase">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 rounded-full border-2 border-t-[var(--accent-primary)] border-[var(--border-primary)] animate-spin" />
          <span>Securing Core Context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[var(--app-background)] text-[var(--text-primary)] overflow-hidden font-sans relative">
      <CommandPalette />
      
      {/* Dynamic Collapsible Sidebar */}
      <div className="print:hidden h-full flex flex-col z-20 relative"><Sidebar /></div>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        {/* Glow Ambient background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent-primary)] opacity-5 rounded-full blur-3xl pointer-events-none z-0" />
        
        <div className="print:hidden z-20 relative"><TopBar /></div>

        {/* Layout content wrapper */}
        <div className="flex-1 overflow-y-auto p-8 z-10 relative">
          {children}
        </div>

        {/* Persistent Floating Chatbot */}
        <div className="print:hidden"><GlobalChatbot /></div>
      </main>
    </div>
  );
}
