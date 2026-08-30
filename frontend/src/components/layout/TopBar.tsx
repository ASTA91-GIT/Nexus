"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCase } from "@/context/CaseContext";
import { useTheme } from "@/context/ThemeContext";

export default function TopBar() {
  const { activeCase, logout } = useCase();
  const { theme, setTheme } = useTheme();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  const loadAvatar = () => {
    const savedAvatar = localStorage.getItem("user_avatar");
    if (savedAvatar) setAvatarDataUrl(savedAvatar);
  };

  useEffect(() => {
    loadAvatar();
    window.addEventListener("avatar-updated", loadAvatar);
    return () => window.removeEventListener("avatar-updated", loadAvatar);
  }, []);

  return (
    <header className="h-14 border-b border-[var(--border-primary)] bg-[var(--surface-primary)] flex items-center justify-between px-4 z-40 relative shadow-md">
      {/* Left: Active Case & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" title="System Online"></div>
          <span className="text-xs font-bold text-[var(--text-secondary)] tracking-wider">NEXUS SECURE</span>
        </div>
        <div className="h-4 w-px bg-[var(--border-secondary)]"></div>
        <div className="text-sm font-semibold flex items-center gap-2 text-[var(--text-primary)]">
          <span className="text-[var(--text-muted)]">Case //</span>
          {activeCase ? activeCase.name : "NO ACTIVE CASE"}
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-md mx-4">
        <button 
          className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-md hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-all shadow-inner"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          }}
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass"></i> Global Search...
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[var(--surface-primary)] text-[10px] font-mono font-bold border border-[var(--border-primary)]">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* AI Shortcut */}
        <button 
          className="px-3 py-1.5 text-xs font-bold bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-secondary)] transition-colors flex items-center gap-2 shadow-sm border border-[var(--accent-primary)]"
          title="Ask NEXUS AI"
        >
          <i className="fa-solid fa-robot"></i> AI
        </button>

        <div className="h-4 w-px bg-[var(--border-secondary)]"></div>

         {/* Theme Toggle */}
          <div className="flex items-center bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-lg p-1">
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
                      ? "bg-[var(--accent-primary)] text-white shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]"
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
            className="p-1.5 rounded hover:bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative"
          >
            <i className="fa-solid fa-bell"></i>
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--danger)] rounded-full border border-[var(--surface-primary)]"></span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[var(--border-primary)] flex justify-between items-center">
                <span className="font-bold text-sm text-[var(--text-primary)]">Notifications</span>
                <button className="text-[10px] text-[var(--accent-secondary)] hover:underline">Mark all read</button>
              </div>
              <div className="px-4 py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer">
                <p className="font-semibold text-[var(--text-primary)]">New high-risk entity detected</p>
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
            <div className="w-8 h-8 rounded bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-[var(--app-background)] outline outline-1 outline-[var(--border-primary)] overflow-hidden">
              {avatarDataUrl && avatarDataUrl !== "null" && avatarDataUrl !== "undefined" ? (
                <img src={avatarDataUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <i className="fa-solid fa-user"></i>
              )}
            </div>
          </button>
          
          {profileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-3 border-b border-[var(--border-primary)] mb-2">
                <p className="font-bold text-sm text-[var(--text-primary)]">Authenticated User</p>
                <div className="mt-2 text-[10px] uppercase font-bold tracking-wider text-[var(--success)] flex items-center gap-1">
                  <i className="fa-solid fa-circle text-[8px]"></i> ACTIVE
                </div>
              </div>
              
              <Link href="/profile" className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]">
                <i className="fa-solid fa-user-shield w-5"></i> View Profile
              </Link>
              <Link href="/settings" className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]">
                <i className="fa-solid fa-gear w-5"></i> Preferences
              </Link>
              <div className="border-t border-[var(--border-primary)] my-1"></div>
              <button 
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--surface-secondary)] font-semibold flex items-center gap-2"
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
