"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCase } from "@/context/CaseContext";

const navItems = [
  { name: "Command Center", path: "/dashboard", icon: "📊" },
  { name: "Cases", path: "/cases", icon: "📁" },
  { name: "Investigate", path: "/investigate", icon: "🔍" },
  { name: "3D Link Map", path: "/network", icon: "🌐" },
  { name: "Entities", path: "/entities", icon: "👥" },
  { name: "Evidence Explorer", path: "/evidence", icon: "📥" },
  { name: "Timeline", path: "/timeline", icon: "⏳" },
  { name: "Geographic Intel", path: "/locations", icon: "📍" },
  { name: "Alert Center", path: "/alerts", icon: "🚨" },
  { name: "Analytics", path: "/analytics", icon: "📈" },
  { name: "AI Investigator", path: "/ai-investigator", icon: "🤖" },
  { name: "Reports", path: "/reports", icon: "📄" },
  { name: "Admin Portal", path: "/admin", icon: "🛡️" },
  { name: "Settings", path: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { cases, activeCaseId, setActiveCaseId, logout } = useCase();
  const [userEmail, setUserEmail] = useState("investigator@nexus.gov");

  useEffect(() => {
    // Attempt to decode email from JWT token in localStorage
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
      className={`border-r border-white/5 bg-zinc-950 flex flex-col z-20 shrink-0 transition-all duration-300 relative ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-6 -right-3 h-6 w-6 rounded-full border border-white/10 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white text-xs cursor-pointer shadow-lg active:scale-95"
      >
        {collapsed ? "→" : "←"}
      </button>

      {/* Brand Logo */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3 overflow-hidden">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-base text-white shrink-0">
          N
        </div>
        {!collapsed && (
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent truncate">
            NEXUS Engine
          </span>
        )}
      </div>

      {/* Active Case Selector */}
      <div className="p-4 border-b border-white/5 overflow-hidden">
        {!collapsed && (
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Active Case File
          </label>
        )}
        {cases.length === 0 ? (
          !collapsed && <p className="text-zinc-600 text-xs italic">No cases created.</p>
        ) : (
          <select 
            value={activeCaseId} 
            onChange={(e) => setActiveCaseId(e.target.value)}
            className={`w-full p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 text-xs focus:outline-none focus:border-blue-500 ${
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

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group relative ${
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/15" 
                  : "text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.name}</span>}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-white/10 text-white rounded text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status & User Profile Footer */}
      <div className="p-4 border-t border-white/5 space-y-4 shrink-0 overflow-hidden">
        {/* Status Indicators */}
        {!collapsed && (
          <div className="space-y-2 bg-zinc-900/40 p-3 border border-white/5 rounded-xl text-[10px] font-mono text-zinc-500">
            <div className="flex justify-between items-center">
              <span>DATABASE (27018)</span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>API SERVER</span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
              </span>
            </div>
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center justify-between gap-3 bg-zinc-900/20 p-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-zinc-300 text-sm shrink-0">
              👤
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">Investigator</p>
                <p className="text-[10px] text-zinc-500 truncate">{userEmail}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button 
              onClick={logout}
              title="Logout Session"
              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer text-xs"
            >
              🚪
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
