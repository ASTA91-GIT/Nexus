"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCase } from "@/context/CaseContext";
import { useTheme } from "@/context/ThemeContext";

export default function TopBar() {
  const { activeCase, cases, activeCaseId, setActiveCaseId, logout } = useCase();
  const { theme, setTheme } = useTheme();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
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

  // Synchronously compute the current case from the cases array to prevent async UI desync
  const currentCase = cases.find(c => c._id === activeCaseId) || activeCase;

  return (
    <header className="h-14 border-b border-[var(--border-primary)] bg-[var(--surface-primary)] flex items-center justify-between px-4 z-40 relative shadow-md">
      {/* Left: Active Case & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2 py-1 border border-transparent rounded-md hover:bg-[var(--surface-secondary)] hover:border-[var(--border-primary)] transition-all duration-200 cursor-default">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" title="System Online"></div>
          <span className="text-xs font-bold text-[var(--text-secondary)] tracking-wider">NEXUS SECURE</span>
        </div>
        <div className="h-4 w-px bg-[var(--border-secondary)]"></div>
        <div className="relative">
          <div 
            onClick={() => setCaseDropdownOpen(!caseDropdownOpen)}
            className="text-sm font-semibold flex items-center gap-2 text-[var(--text-primary)] px-2 py-1 border border-transparent rounded-md hover:bg-[var(--surface-secondary)] hover:border-[var(--border-primary)] transition-all duration-200 cursor-pointer group"
          >
            <i className="fa-regular fa-folder text-[var(--text-muted)] group-hover:text-[var(--accent-secondary)] transition-colors"></i>
            <span className="text-[var(--text-muted)] font-medium">Case</span>
            <span className="text-[var(--border-secondary)] mx-1 select-none">•</span>
            <span className="font-bold tracking-wide group-hover:text-[var(--accent-secondary)] transition-colors">{currentCase ? currentCase.name : "NO ACTIVE CASE"}</span>
            <i className={`fa-solid fa-chevron-down text-[10px] ml-1 transition-opacity ${caseDropdownOpen ? 'opacity-100 text-[var(--accent-secondary)]' : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100'}`}></i>
          </div>

          {caseDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg shadow-xl py-2 z-50 max-h-64 overflow-y-auto">
              <div className="px-4 py-2 border-b border-[var(--border-primary)] mb-2">
                <span className="font-bold text-sm text-[var(--text-primary)]">Select Investigation</span>
              </div>
              {cases.length > 0 ? cases.map((c: any) => (
                <button
                  key={c._id}
                  onClick={() => {
                    setActiveCaseId(c._id);
                    setCaseDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeCaseId === c._id ? 'bg-[var(--surface-secondary)] text-[var(--accent-secondary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  <div className="font-medium truncate">{c.name}</div>
                </button>
              )) : (
                <div className="px-4 py-2 text-sm text-[var(--text-muted)]">No cases available</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-md mx-4">
        <button 
          className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-md hover:border-[var(--border-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all duration-200 shadow-inner group"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          }}
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass group-hover:text-[var(--accent-secondary)] transition-colors"></i> Global Search...
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[var(--surface-primary)] text-[10px] font-mono font-bold border border-[var(--border-primary)] group-hover:border-[var(--border-secondary)] transition-colors">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* AI Shortcut */}
        <button 
          className="px-3 py-1.5 text-xs font-bold bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-secondary)] hover:shadow-[0_0_8px_rgba(20,200,235,0.4)] focus:ring-2 focus:ring-[var(--accent-secondary)] focus:ring-offset-1 focus:ring-offset-[var(--surface-primary)] active:scale-95 transition-all duration-200 flex items-center gap-2 border border-[var(--accent-primary)]"
          title="Ask NEXUS AI"
        >
          <i className="fa-solid fa-robot"></i> AI
        </button>

        <div className="h-4 w-px bg-[var(--border-secondary)]"></div>

         {/* Theme Toggle */}
          <div className="flex items-center gap-1 bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-lg p-1 hover:border-[var(--border-secondary)] transition-colors duration-200">
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
                  className={`p-1.5 rounded-md text-sm transition-all duration-200 ${
                    active
                      ? "bg-[var(--surface-primary)] text-[var(--accent-secondary)] shadow-sm border border-[var(--border-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
                  } active:scale-95`}
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
            className="p-1.5 rounded-md border border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 relative active:scale-95"
            title="Notifications"
          >
            <i className="fa-solid fa-bell"></i>
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--danger)] rounded-full border border-[var(--surface-primary)] shadow-sm"></span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-[320px] bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--surface-primary)]">
                <span className="font-semibold text-[15px] text-[var(--text-primary)]">Notifications</span>
                <button className="text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors">Mark all read</button>
              </div>
              <div className="px-4 py-4 hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors">
                <p className="font-semibold text-[14px] text-[var(--text-primary)]">New high-risk entity detected</p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-snug">Network analysis flagged a suspect<br/>with threat &gt; 0.9</p>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative ml-1">
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-secondary)] hover:text-[var(--accent-secondary)] transition-all duration-200 shadow-sm overflow-hidden group active:scale-95"
            title="User Profile"
          >
            {avatarDataUrl && avatarDataUrl !== "null" && avatarDataUrl !== "undefined" ? (
              <img src={avatarDataUrl} alt="Avatar" className="w-full h-full object-cover group-hover:brightness-110 transition-all" />
            ) : (
              <i className="fa-solid fa-user"></i>
            )}
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
