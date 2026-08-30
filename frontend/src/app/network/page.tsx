"use client";
import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCase } from "@/context/CaseContext";

// Dynamically import the 3D scene to prevent SSR issues with Three.js
const NetworkScene = dynamic(() => import("../../three/NetworkScene"), { ssr: false });

export default function NetworkPage() {
  const { cases, activeCaseId, activeCase, refreshCases } = useCase();
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    person: true,
    organization: true,
    location: true,
    phone: true,
    vehicle: true,
    account: true,
    email: true,
    event: true,
    alerts: true,
  });
  const router = useRouter();

  // API helper
  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const getToken = useCallback(() => {
    return localStorage.getItem("token");
  }, []);



  // Fetch graph data for the active case
  const fetchGraphData = useCallback(async (caseId: string) => {
    if (!caseId) return;
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      // Fetch Network Graph representation
      const res = await fetch(getApiUrl(`/api/network/${caseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (err) {
      console.error("Failed to load network graph:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);



  useEffect(() => {
    if (activeCaseId) {
      fetchGraphData(activeCaseId);
    }
  }, [activeCaseId, fetchGraphData]);



  const handleFilterToggle = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter nodes & links before passing to the 3D scene
  const filteredGraphData = React.useMemo(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], links: [] };

    const filteredNodes = graphData.nodes.filter((node: any) => {
      const type = (node.type || "").toLowerCase();
      
      // Filter by category
      if (type === "person" && !filters.person) return false;
      if (type === "organization" && !filters.organization) return false;
      if (type === "location" && !filters.location) return false;
      if (type === "phone_number" && !filters.phone) return false;
      if (type === "phone" && !filters.phone) return false;
      if (type === "communication" && !filters.phone) return false;
      if (type === "vehicle" && !filters.vehicle) return false;
      if (type === "account" && !filters.account) return false;
      if (type === "email" && !filters.email) return false;
      if (type === "event" && !filters.event) return false;
      
      // Hide high risk nodes if alerts filter is off
      if (node.risk_score > 0.7 && !filters.alerts) return false;
      
      return true;
    });

    const nodeIds = new Set(filteredNodes.map((n: any) => String(n.id || n._id || "")));
    const rawLinks = graphData.links || graphData.edges || [];
    const filteredLinks = rawLinks.filter((link: any) => {
      const getLinkId = (val: any) => typeof val === "object" && val ? String(val.id || val._id || "") : String(val || "");
      const sId = getLinkId(link.source);
      const tId = getLinkId(link.target);
      return nodeIds.has(sId) && nodeIds.has(tId);
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graphData, filters]);

  return (
    <div className="flex h-full w-full bg-[var(--app-background)] text-[var(--text-primary)] font-sans relative gap-6">
      
      {/* Sidebar Controls */}
      <aside className="w-80 border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6 flex flex-col z-10 rounded-2xl shadow-sm">
        
        {/* Back Link */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6">
          &larr; Back to Dashboard
        </Link>

        {/* Title */}
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] mb-6">
          3D LINK MAP
        </h1>

        {/* Category Filters */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Filter Nodes</h2>
          <div className="space-y-3 bg-[var(--surface-secondary)] p-4 border border-[var(--border-primary)] rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.person} 
                onChange={() => handleFilterToggle("person")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-blue-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Persons</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.organization} 
                onChange={() => handleFilterToggle("organization")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-emerald-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Organizations</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.location} 
                onChange={() => handleFilterToggle("location")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-amber-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Locations</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.vehicle} 
                onChange={() => handleFilterToggle("vehicle")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-orange-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"></span> Vehicles</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.account} 
                onChange={() => handleFilterToggle("account")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-cyan-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-500"></span> Accounts</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.email} 
                onChange={() => handleFilterToggle("email")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-pink-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pink-500"></span> Emails</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.event} 
                onChange={() => handleFilterToggle("event")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-yellow-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500"></span> Events</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)]">
              <input 
                type="checkbox" 
                checked={filters.phone} 
                onChange={() => handleFilterToggle("phone")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-violet-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500"></span> Communications</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[var(--text-primary)] border-t border-[var(--border-primary)] pt-2 mt-2">
              <input 
                type="checkbox" 
                checked={filters.alerts} 
                onChange={() => handleFilterToggle("alerts")}
                className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-red-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"></span> High Risk Flagged</span>
            </label>
          </div>
          <button 
            onClick={() => setFilters({
              person: true,
              organization: true,
              location: true,
              phone: true,
              vehicle: true,
              account: true,
              email: true,
              event: true,
              alerts: true,
            })}
            className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mt-3 block w-full text-center transition-colors"
          >
            Reset All Filters
          </button>
        </div>

        {/* Legend */}
        <div className="mt-auto p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-xs text-[var(--text-secondary)] leading-relaxed">
          <p className="font-semibold text-[var(--text-primary)] mb-2">Navigation Instructions:</p>
          <ul className="list-disc pl-4 space-y-1.5 mb-3">
            <li>Left Click + Drag: Rotate scene camera.</li>
            <li>Right Click + Drag: Pan camera.</li>
            <li>Scroll: Zoom network in/out.</li>
          </ul>
          <p className="font-semibold text-[var(--text-primary)] mb-2 mt-4 pt-4 border-t border-[var(--border-primary)]">Graph Legend:</p>
          <ul className="list-none space-y-1.5">
            <li>→ Relationship direction: Source → Target</li>
          </ul>
        </div>
      </aside>

      {/* 3D Canvas Visualizer */}
      <main className="flex-1 relative bg-[var(--surface-secondary)] rounded-2xl overflow-hidden border border-[var(--border-primary)] shadow-inner">
        {!activeCaseId ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--text-secondary)] text-sm italic z-20 bg-[var(--surface-primary)]">
            Please select an active Case File from the sidebar to visualize the 3D network topology.
          </div>
        ) : loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--surface-primary)]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--primary)]"></div>
            <span className="text-sm text-[var(--text-secondary)]">Rendering 3D graph structures...</span>
          </div>
        ) : (
          <NetworkScene data={filteredGraphData} />
        )}
        
        {/* Overlay Stats Card */}
        {activeCase && (
          <div className="absolute top-6 right-6 p-5 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-primary)]/90 backdrop-blur-md pointer-events-none z-10 w-64 shadow-lg">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] mb-3 tracking-wide uppercase">Link Metrics</h3>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="flex justify-between"><span>Nodes visible:</span> <span className="font-semibold text-[var(--text-primary)]">{filteredGraphData.nodes.length}</span></p>
              <p className="flex justify-between"><span>Edges visible:</span> <span className="font-semibold text-[var(--text-primary)]">{filteredGraphData.links.length}</span></p>
              <p className="flex justify-between mt-4 pt-3 border-t border-[var(--border-primary)]">
                <span>Density index:</span> 
                <span className={`font-semibold ${filteredGraphData.nodes.length > 5 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                  {filteredGraphData.nodes.length > 5 ? "Medium" : "Low"}
                </span>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
