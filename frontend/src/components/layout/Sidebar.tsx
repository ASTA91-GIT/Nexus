"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCase } from "@/context/CaseContext";

const navGroups = [
  {
    title: "Command",
    items: [
      { name: "Command Center", path: "/dashboard", icon: <i className="fa-solid fa-gauge-high"></i> },
      { name: "Investigate", path: "/investigate", icon: <i className="fa-solid fa-magnifying-glass"></i> },
    ]
  },
  {
    title: "Case Intelligence",
    items: [
      { name: "Upload Case Files", path: "/cases", icon: <i className="fa-solid fa-folder-open"></i> },
      { name: "Entities", path: "/entities", icon: <i className="fa-solid fa-users"></i> },
      { name: "3D Link Map", path: "/network", icon: <i className="fa-solid fa-diagram-project"></i> },
      { name: "Evidence Intelligence", path: "/evidence", icon: <i className="fa-solid fa-file-shield"></i> },
      { name: "Timeline", path: "/timeline", icon: <i className="fa-solid fa-timeline"></i> },
      { name: "Geographic Intel", path: "/locations", icon: <i className="fa-solid fa-location-dot"></i> },
    ]
  },
  {
    title: "Analysis",
    items: [
      { name: "Risk Analysis", path: "/risk", icon: <i className="fa-solid fa-triangle-exclamation"></i> },
      { name: "Anomalies", path: "/anomalies", icon: <i className="fa-solid fa-bolt"></i> },
      { name: "Alert Center", path: "/alerts", icon: <i className="fa-solid fa-bell"></i> },
    ]
  },
  {
    title: "AI",
    items: [
      { name: "NEXUS AI", path: "/ai-investigator", icon: <i className="fa-solid fa-robot"></i> },
      { name: "AI History", path: "/ai-history", icon: <i className="fa-solid fa-clock-rotate-left"></i> },
    ]
  },
  {
    title: "Output",
    items: [
      { name: "Reports", path: "/reports", icon: <i className="fa-solid fa-file-invoice"></i> },
    ]
  },
  {
    title: "System",
    items: [
      { name: "Admin Portal", path: "/admin", icon: <i className="fa-solid fa-user-shield"></i> },
      { name: "Settings", path: "/settings", icon: <i className="fa-solid fa-gear"></i> },
    ]
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { cases, activeCaseId, setActiveCaseId, logout } = useCase();
  const [userEmail, setUserEmail] = useState("investigator@nexus-intel.gov");
  const [userRole, setUserRole] = useState("USER");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload && payload.sub) {
          setUserEmail(payload.sub);
          setUserRole(payload.role || "USER");
        }
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }
  }, []);

  return (
    <aside 
      className={`h-full border-r border-[var(--border-primary)] bg-[var(--surface-primary)] flex flex-col z-20 shrink-0 transition-all duration-300 relative ${
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
        <div className="h-8 w-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center font-bold text-base text-white shrink-0">
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
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Active Case File
          </label>
        )}
        {cases.length === 0 ? (
          !collapsed && <p className="text-[var(--text-secondary)] text-xs italic">No cases created.</p>
        ) : (
          <select 
            value={activeCaseId} 
            onChange={(e) => setActiveCaseId(e.target.value)}
            className={`w-full p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-xs focus:outline-none focus:border-[var(--accent-primary)] ${
              collapsed ? "text-center px-1" : ""
            }`}
          >
            {cases.map((c) => (
              <option key={c._id} value={c._id}>
                {collapsed ? c.name.slice(0, 3).toUpperCase() : c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {navGroups.map((group, idx) => {
          if (group.title === "System" && userRole !== "ADMIN") return null;
          return (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3.5 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
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
                  className={`sidebar-nav-item ${isActive ? 'active' : 'inactive'} group`}
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
          );
        })}
      </nav>

      {/* Remove User Profile Footer since we moved it to TopBar */}
    </aside>
  );
}
