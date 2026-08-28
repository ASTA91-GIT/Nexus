"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCase } from "@/context/CaseContext";

const navGroups = [
  {
    title: "Command",
    items: [
      { name: "Command Center", path: "/dashboard", icon: "📊" },
      { name: "Investigate", path: "/investigate", icon: "🔍" },
    ]
  },
  {
    title: "Case Intelligence",
    items: [
      { name: "Cases", path: "/cases", icon: "📁" },
      { name: "Entities", path: "/entities", icon: "👥" },
      { name: "Global Link Map", path: "/global-network", icon: "🌌" },
      { name: "Evidence Explorer", path: "/evidence", icon: "📥" },
      { name: "Timeline", path: "/timeline", icon: "⏳" },
      { name: "Geographic Intel", path: "/locations", icon: "📍" },
    ]
  },
  {
    title: "Analysis",
    items: [
      { name: "Analytics", path: "/analytics", icon: "📈" },
      { name: "Risk Analysis", path: "/risk", icon: "⚠️" },
      { name: "Anomalies", path: "/anomalies", icon: "⚡" },
      { name: "Alert Center", path: "/alerts", icon: "🚨" },
    ]
  },
  {
    title: "AI",
    items: [
      { name: "NEXUS AI", path: "/ai-investigator", icon: "🤖" },
      { name: "AI History", path: "/ai-history", icon: "🕰️" },
    ]
  },
  {
    title: "Output",
    items: [
      { name: "Reports", path: "/reports", icon: "📄" },
    ]
  },
  {
    title: "System",
    items: [
      { name: "Admin Portal", path: "/admin", icon: "🛡️" },
      { name: "Settings", path: "/settings", icon: "⚙️" },
    ]
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { cases, activeCaseId, setActiveCaseId, logout } = useCase();
  const [userEmail, setUserEmail] = useState("investigator@nexus.gov");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload && payload.sub) {
          setUserEmail(payload.sub);
        }
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }
  }, []);

  return (
    <aside 
      className={`border-r border-[var(--border-primary)] bg-[var(--surface-primary)] flex flex-col z-20 shrink-0 transition-all duration-300 relative ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-6 -right-3 h-6 w-6 rounded-full border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs cursor-pointer shadow-lg active:scale-95 z-50"
      >
        {collapsed ? "→" : "←"}
      </button>

      <div className="p-6 border-b border-[var(--border-primary)] flex items-center gap-3 overflow-hidden">
        <div className="h-8 w-8 rounded-lg bg-[var(--primary-accent)] flex items-center justify-center font-bold text-base text-white shrink-0">
          N
        </div>
        {!collapsed && (
          <span className="font-extrabold text-lg tracking-tight text-[var(--text-primary)] truncate">
            NEXUS OS
          </span>
        )}
      </div>

      <div className="p-4 border-b border-[var(--border-primary)] overflow-hidden">
        {!collapsed && (
          <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Active Case File
          </label>
        )}
        {cases.length === 0 ? (
          !collapsed && <p className="text-[var(--text-secondary)] text-xs italic">No cases created.</p>
        ) : (
          <select 
            value={activeCaseId} 
            onChange={(e) => setActiveCaseId(e.target.value)}
            className={`w-full p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-xs focus:outline-none focus:border-[var(--primary-accent)] ${
              collapsed ? "text-center px-1" : ""
            }`}
          >
            {cases.map((c) => (
              <option key={c._id} value={c._id}>
                {collapsed ? c.name.slice(0, 3).toUpperCase() : `${c.name} (${c.status})`}
              </option>
            ))}
          </select>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3.5 mb-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            {collapsed && <div className="h-4 border-b border-[var(--border-primary)] mb-4"></div>}
            {group.items.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group relative ${
                    isActive 
                      ? "bg-[var(--primary-accent)] text-white shadow-md shadow-[var(--primary-accent)]/20" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] border border-transparent"
                  }`}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.name}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2 py-1 bg-[var(--surface-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Remove User Profile Footer since we moved it to TopBar */}
    </aside>
  );
}
