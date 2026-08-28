"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useCase } from "@/context/CaseContext";
import { useTheme } from "@/context/ThemeContext";

export default function TopBar() {
  const { activeCase } = useCase();
  const { theme, setTheme } = useTheme();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const themeIcon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻";

  return (
    <header className="h-14 border-b border-[var(--border-primary)] bg-[var(--surface-primary)] flex items-center justify-between px-4 z-40 relative">
      {/* Left: Active Case & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="System Online"></div>
          <span className="text-xs font-bold text-[var(--text-secondary)] tracking-wider">NEXUS SECURE</span>
        </div>
        <div className="h-4 w-px bg-[var(--border-primary)]"></div>
        <div className="text-sm font-semibold flex items-center gap-2 text-[var(--text-primary)]">
          <span className="text-[var(--text-tertiary)]">Case //</span>
          {activeCase ? activeCase.name : "NO ACTIVE CASE"}
        </div>
      </div>

      {/* Center: Global Search (Visual cue for Command Palette) */}
      <div className="flex-1 max-w-md mx-4">
        <button 
          className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-md hover:border-[var(--primary-accent)] hover:text-[var(--text-primary)] transition-all"
          onClick={() => {
            // Dispatch a custom event to open command palette
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          }}
        >
          <span className="flex items-center gap-2">
            <span>🔍</span> Global Search...
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[var(--surface-tertiary)] text-[10px] font-mono font-bold">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* AI Shortcut */}
        <button 
          className="px-3 py-1.5 text-xs font-bold bg-[var(--primary-accent)] text-white rounded hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-2 shadow-sm"
          title="Ask NEXUS AI"
        >
          <span>🧠</span> AI
        </button>

        <div className="h-4 w-px bg-[var(--border-primary)]"></div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-1.5 rounded hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] transition-colors"
          title={`Theme: ${theme}`}
        >
          {themeIcon}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-1.5 rounded hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] transition-colors relative"
          >
            🔔
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[var(--surface-primary)]"></span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[var(--border-primary)] flex justify-between items-center">
                <span className="font-bold text-sm text-[var(--text-primary)]">Notifications</span>
                <button className="text-[10px] text-[var(--primary-accent)] hover:underline">Mark all read</button>
              </div>
              <div className="px-4 py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer">
                <p className="font-semibold text-[var(--text-primary)]">New high-risk entity detected</p>
                <p className="mt-0.5">Network analysis flagged a suspect with threat &gt; 0.9</p>
              </div>
              <div className="px-4 py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer border-t border-[var(--border-primary)]">
                <p className="font-semibold text-[var(--text-primary)]">Evidence upload complete</p>
                <p className="mt-0.5">Transaction logs successfully ingested.</p>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative ml-2">
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[var(--primary-accent)] to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-[var(--surface-primary)] outline outline-1 outline-[var(--border-primary)]">
              AD
            </div>
          </button>
          
          {profileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-3 border-b border-[var(--border-primary)] mb-2">
                <p className="font-bold text-sm text-[var(--text-primary)]">Admin Investigator</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">admin@nexus-intel.local</p>
                <div className="mt-2 text-[10px] uppercase font-bold tracking-wider text-[var(--success)]">
                  ● ACTIVE
                </div>
              </div>
              
              <Link href="/profile" className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]">
                View Profile
              </Link>
              <Link href="/settings" className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]">
                Preferences
              </Link>
              <div className="border-t border-[var(--border-primary)] my-1"></div>
              <button className="w-full text-left px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--surface-secondary)] font-semibold">
                Secure Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
