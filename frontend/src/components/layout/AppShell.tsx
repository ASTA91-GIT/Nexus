"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { useCase } from "@/context/CaseContext";

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
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white font-mono text-sm tracking-widest uppercase">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 rounded-full border-2 border-t-blue-500 border-white/5 animate-spin" />
          <span>Securing Core Context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-white overflow-hidden font-sans relative">
      {/* Dynamic Collapsible Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto relative flex flex-col">
        {/* Glow Ambient background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none z-0" />
        
        {/* Layout content wrapper */}
        <div className="flex-1 p-8 z-10 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
