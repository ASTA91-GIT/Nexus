"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useCase } from "@/context/CaseContext";
import { useTheme } from "@/context/ThemeContext";

export default function TopBar() {
  const { activeCase, logout } = useCase();
  const { theme, setTheme } = useTheme();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between px-4 z-40 relative shadow-md">
      {/* Left: Active Case & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online"></div>
          <span className="text-xs font-bold text-slate-400 tracking-wider">NEXUS SECURE</span>
        </div>
        <div className="h-4 w-px bg-[#243047]"></div>
        <div className="text-sm font-semibold flex items-center gap-2 text-slate-200">
          <span className="text-slate-500">Case //</span>
          {activeCase ? activeCase.name : "NO ACTIVE CASE"}
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-md mx-4">
        <button 
          className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-[var(--secondary-bg)] border border-[var(--border)] text-slate-400 rounded-md hover:border-blue-500 hover:text-slate-200 transition-all shadow-inner"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          }}
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass"></i> Global Search...
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[var(--card-bg)] text-[10px] font-mono font-bold border border-[var(--border)]">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* AI Shortcut */}
        <button 
          className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-sm border border-blue-500/50"
          title="Ask NEXUS AI"
        >
          <i className="fa-solid fa-robot"></i> AI
        </button>

        <div className="h-4 w-px bg-[#243047]"></div>

         {/* Theme Toggle */}
          <div className="flex items-center bg-[var(--secondary-bg)] border border-[var(--border)] rounded-lg p-1">
            {(["light", "dark", "system"] as const).map((t) => {
              const active = theme === t;
              const icons = { 
                light: <i className="fa-solid fa-sun"></i>, 
                dark: <i className="fa-solid fa-moon"></i>, 
                system: <i className="fa-solid fa-desktop"></i> 
              } as const;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  aria-label={`Theme: ${t}`}
                  className={`p-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-300 hover:bg-[var(--card-bg)]"
                  }`}
                  title={`Switch to ${t} mode`}
                >
                  {icons[t]}
                </button>
              );
            })}
          </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-1.5 rounded hover:bg-[var(--card-bg)] text-slate-400 hover:text-slate-200 transition-colors relative"
          >
            <i className="fa-solid fa-bell"></i>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#070B14]"></span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[var(--border)] flex justify-between items-center">
                <span className="font-bold text-sm text-slate-200">Notifications</span>
                <button className="text-[10px] text-blue-400 hover:underline">Mark all read</button>
              </div>
              <div className="px-4 py-3 text-xs text-slate-400 hover:bg-[var(--secondary-bg)] cursor-pointer">
                <p className="font-semibold text-slate-200">New high-risk entity detected</p>
                <p className="mt-0.5">Network analysis flagged a suspect with threat &gt; 0.9</p>
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
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-[#070B14] outline outline-1 outline-[#243047]">
              <i className="fa-solid fa-user"></i>
            </div>
          </button>
          
          {profileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-3 border-b border-[var(--border)] mb-2">
                <p className="font-bold text-sm text-slate-200">Authenticated User</p>
                <div className="mt-2 text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                  <i className="fa-solid fa-circle text-[8px]"></i> ACTIVE
                </div>
              </div>
              
              <Link href="/profile" className="block px-4 py-2 text-sm text-slate-400 hover:bg-[var(--secondary-bg)] hover:text-slate-200">
                <i className="fa-solid fa-user-shield w-5"></i> View Profile
              </Link>
              <Link href="/settings" className="block px-4 py-2 text-sm text-slate-400 hover:bg-[var(--secondary-bg)] hover:text-slate-200">
                <i className="fa-solid fa-gear w-5"></i> Preferences
              </Link>
              <div className="border-t border-[var(--border)] my-1"></div>
              <button 
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--secondary-bg)] font-semibold flex items-center gap-2"
              >
                <i className="fa-solid fa-right-from-bracket"></i> Secure Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
