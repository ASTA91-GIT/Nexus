"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery("");
    }
  }, [open]);

  if (!open) return null;

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const groups = [
    {
      title: "Navigation",
      items: [
        { name: "Command Center", icon: "🏢", path: "/dashboard" },
        { name: "Investigation Workspace", icon: "🔍", path: "/investigate" },
        { name: "NEXUS AI", icon: "🧠", path: "/ai-history" },
        { name: "Risk Dashboard", icon: "⚠️", path: "/risk" },
        { name: "Alerts Center", icon: "🚨", path: "/alerts" },
        { name: "Anomalies", icon: "⚡", path: "/anomalies" },
        { name: "Settings & Preferences", icon: "⚙️", path: "/settings" },
      ]
    },
    {
      title: "Actions",
      items: [
        { name: "Create New Case", icon: "📁", action: () => alert("Create case modal triggered") },
        { name: "Import Evidence", icon: "📄", action: () => alert("Upload evidence triggered") },
        { name: "Generate Report", icon: "📊", path: "/reports" },
      ]
    }
  ];

  // Filter items by query
  const filteredGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
  })).filter(group => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-xl bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-primary)] gap-3">
          <span className="text-[var(--text-secondary)]">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="Search commands, cases, or entities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="text-[10px] text-[var(--text-tertiary)] font-mono border border-[var(--border-primary)] px-1.5 py-0.5 rounded bg-[var(--surface-secondary)]">
            ESC
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {filteredGroups.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
              No results found for "{query}".
            </div>
          ) : (
            filteredGroups.map((group, gIdx) => (
              <div key={gIdx} className="mb-2">
                <div className="px-4 py-1 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  {group.title}
                </div>
                {group.items.map((item, iIdx) => (
                  <button
                    key={iIdx}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--primary-accent)] hover:text-white transition-colors group text-left"
                    onClick={() => {
                      if (item.path) navigate(item.path);
                      else if (item.action) item.action();
                    }}
                  >
                    <span className="opacity-70 group-hover:opacity-100">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-[var(--border-primary)] bg-[var(--surface-secondary)] flex justify-between items-center text-[10px] text-[var(--text-tertiary)]">
          <span>Search global database directly to find suspects or cases.</span>
          <span className="font-bold">NEXUS COMMAND OS</span>
        </div>
      </div>
    </div>
  );
}
