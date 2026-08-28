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
      if (type === "person" && !filters.person) return false;
      if (type === "organization" && !filters.organization) return false;
      if (type === "location" && !filters.location) return false;
      if (type === "phone" && !filters.phone) return false;
      
      // If risk score is high, check alert filter
      if (node.risk_score > 0.7 && !filters.alerts) return false;
      
      return true;
    });

    const nodeIds = new Set(filteredNodes.map((n: any) => n.id));
    const rawLinks = graphData.links || graphData.edges || [];
    const filteredLinks = rawLinks.filter((link: any) => {
      return nodeIds.has(link.source) && nodeIds.has(link.target);
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graphData, filters]);

  return (
    <div className="flex h-full w-full bg-zinc-950/20 text-white font-sans relative gap-6">
      
      {/* Sidebar Controls */}
      <aside className="w-80 border border-white/5 bg-zinc-900/10 p-6 flex flex-col z-10 rounded-2xl backdrop-blur-sm">
        
        {/* Back Link */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
          &larr; Back to Dashboard
        </Link>

        {/* Title */}
        <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-6">
          3D LINK MAP
        </h1>

        {/* Category Filters */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Filter Nodes</h2>
          <div className="space-y-3 bg-zinc-900/30 p-4 border border-white/5 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-zinc-300">
              <input 
                type="checkbox" 
                checked={filters.person} 
                onChange={() => handleFilterToggle("person")}
                className="rounded bg-zinc-950 border-white/10 text-blue-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Persons</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-zinc-300">
              <input 
                type="checkbox" 
                checked={filters.organization} 
                onChange={() => handleFilterToggle("organization")}
                className="rounded bg-zinc-950 border-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Organizations</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-zinc-300">
              <input 
                type="checkbox" 
                checked={filters.location} 
                onChange={() => handleFilterToggle("location")}
                className="rounded bg-zinc-950 border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Locations</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-zinc-300">
              <input 
                type="checkbox" 
                checked={filters.phone} 
                onChange={() => handleFilterToggle("phone")}
                className="rounded bg-zinc-950 border-white/10 text-violet-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500"></span> Communication</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-zinc-300">
              <input 
                type="checkbox" 
                checked={filters.alerts} 
                onChange={() => handleFilterToggle("alerts")}
                className="rounded bg-zinc-950 border-white/10 text-red-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"></span> High Risk Flagged</span>
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-auto p-4 rounded-xl border border-white/5 bg-zinc-900/10 text-xs text-zinc-500 leading-relaxed">
          <p className="font-semibold text-zinc-400 mb-2">Navigation Instructions:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>Left Click + Drag: Rotate scene camera.</li>
            <li>Right Click + Drag: Pan camera.</li>
            <li>Scroll: Zoom network in/out.</li>
          </ul>
        </div>
      </aside>

      {/* 3D Canvas Visualizer */}
      <main className="flex-1 relative bg-black/80">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-sm text-zinc-500">Rendering 3D graph structures...</span>
          </div>
        ) : (
          <NetworkScene data={filteredGraphData} />
        )}
        
        {/* Overlay Stats Card */}
        {activeCase && (
          <div className="absolute top-6 right-6 p-5 rounded-2xl border border-white/5 bg-zinc-900/80 backdrop-blur-md pointer-events-none z-10 w-64 shadow-xl">
            <h3 className="font-extrabold text-sm text-zinc-300 mb-3 tracking-wide uppercase">Link Metrics</h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <p className="flex justify-between"><span>Nodes visible:</span> <span className="font-semibold text-white">{filteredGraphData.nodes.length}</span></p>
              <p className="flex justify-between"><span>Edges visible:</span> <span className="font-semibold text-white">{filteredGraphData.links.length}</span></p>
              <p className="flex justify-between mt-4 pt-3 border-t border-white/5">
                <span>Density index:</span> 
                <span className={`font-semibold ${filteredGraphData.nodes.length > 5 ? "text-amber-400" : "text-emerald-400"}`}>
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
