"use client";
import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCase } from "@/context/CaseContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faUser, faBuilding, faMapMarkerAlt, faCar, faFileInvoice, faEnvelope, faCalendarAlt, faPhone, faShieldHalved, faRotateRight, faMouse, faArrowsUpDownLeftRight, faArrowPointer, faNetworkWired } from "@fortawesome/free-solid-svg-icons";

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

  // Count entities from graphData
  const counts = React.useMemo(() => {
    const counts = {
      person: 0,
      organization: 0,
      location: 0,
      phone: 0,
      vehicle: 0,
      account: 0,
      email: 0,
      event: 0,
      alerts: 0,
    };
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach((node: any) => {
        const type = (node.type || "").toLowerCase();
        if (type === "person") counts.person++;
        else if (type === "organization") counts.organization++;
        else if (type === "location") counts.location++;
        else if (type === "phone" || type === "phone_number" || type === "communication") counts.phone++;
        else if (type === "vehicle") counts.vehicle++;
        else if (type === "account") counts.account++;
        else if (type === "email") counts.email++;
        else if (type === "event") counts.event++;
        
        if (node.risk_score > 0.7) counts.alerts++;
      });
    }
    return counts;
  }, [graphData]);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const totalFilters = Object.keys(filters).length;

  return (
    <div className="flex h-full w-full bg-[var(--app-background)] text-[var(--text-primary)] font-sans relative gap-6">
      
      {/* Sidebar Controls */}
      <aside className="w-[340px] shrink-0 overflow-y-auto custom-scrollbar border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5 flex flex-col z-10 rounded-2xl shadow-xl flex-none gap-6">
        
        {/* HEADER */}
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--primary-accent)] transition-colors mb-4">
            &larr; Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] shadow-inner">
              <FontAwesomeIcon icon={faNetworkWired} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
              3D LINK MAP
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Explore entities and relationships in an interactive investigation network.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest flex items-center gap-2">
              <FontAwesomeIcon icon={faFilter} className="opacity-70" /> FILTER NODES
            </h2>
            <span className="text-[9px] font-mono text-[var(--text-secondary)] bg-[var(--surface-secondary)] px-2 py-0.5 rounded-full border border-[var(--border-primary)]">
              {activeFiltersCount} / {totalFilters} Selected
            </span>
          </div>

          <div className="space-y-2">
            {[
              { id: 'person', label: 'Persons', color: 'bg-blue-500', icon: faUser },
              { id: 'organization', label: 'Organizations', color: 'bg-emerald-500', icon: faBuilding },
              { id: 'location', label: 'Locations', color: 'bg-amber-500', icon: faMapMarkerAlt },
              { id: 'vehicle', label: 'Vehicles', color: 'bg-orange-500', icon: faCar },
              { id: 'account', label: 'Accounts', color: 'bg-cyan-500', icon: faFileInvoice },
              { id: 'email', label: 'Emails', color: 'bg-pink-500', icon: faEnvelope },
              { id: 'event', label: 'Events', color: 'bg-yellow-500', icon: faCalendarAlt },
              { id: 'phone', label: 'Communications', color: 'bg-violet-500', icon: faPhone },
            ].map((f) => (
              <label 
                key={f.id} 
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group ${filters[f.id as keyof typeof filters] ? 'bg-[var(--surface-secondary)]/50 border-[var(--border-primary)] hover:border-[var(--primary-accent)]/50 hover:bg-[var(--surface-hover)]' : 'bg-[var(--surface-primary)] border-transparent opacity-60 hover:opacity-100 hover:bg-[var(--surface-secondary)]/30'}`}
              >
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={filters[f.id as keyof typeof filters]} 
                    onChange={() => handleFilterToggle(f.id as keyof typeof filters)}
                    className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-[var(--primary-accent)] focus:ring-0 focus:ring-offset-0 h-4 w-4 transition-colors"
                  />
                  <div className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-primary)]">
                    <span className={`h-2 w-2 rounded-full ${f.color} shadow-sm`}></span>
                    <FontAwesomeIcon icon={f.icon} className="text-[var(--text-muted)] text-[10px] w-3" />
                    {f.label}
                  </div>
                </div>
                {counts[f.id as keyof typeof counts] > 0 && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--app-background)] px-1.5 py-0.5 rounded border border-[var(--border-primary)] shadow-sm">
                    {counts[f.id as keyof typeof counts]}
                  </span>
                )}
              </label>
            ))}

            {/* High Risk Separator */}
            <div className="h-px w-full bg-[var(--border-primary)] my-3"></div>

            <label 
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group ${filters.alerts ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'bg-[var(--surface-primary)] border-transparent opacity-60 hover:opacity-100 hover:bg-red-500/5'}`}
            >
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={filters.alerts} 
                  onChange={() => handleFilterToggle("alerts")}
                  className="rounded bg-[var(--surface-primary)] border-red-500/50 text-red-500 focus:ring-0 focus:ring-offset-0 h-4 w-4" 
                />
                <div className={`flex items-center gap-2.5 text-sm font-bold transition-colors ${filters.alerts ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                  <span className={`h-2 w-2 rounded-full transition-colors ${filters.alerts ? 'bg-red-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <FontAwesomeIcon icon={faShieldHalved} className={filters.alerts ? 'text-red-500 text-[10px] w-3 transition-colors' : 'text-[var(--text-muted)] text-[10px] w-3 transition-colors'} />
                  High Risk Flagged
                </div>
              </div>
              {counts.alerts > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shadow-sm transition-colors ${filters.alerts ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-[var(--text-muted)] bg-[var(--app-background)] border-[var(--border-primary)]'}`}>
                  {counts.alerts}
                </span>
              )}
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
            className="w-full flex items-center justify-center gap-2 mt-2 p-2.5 rounded-xl border border-[var(--primary-accent)]/30 text-[var(--primary-accent)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--primary-accent)] hover:text-white transition-all shadow-sm hover:shadow-[0_0_15px_rgba(20,200,235,0.3)] active:scale-95 group"
          >
            <FontAwesomeIcon icon={faRotateRight} className="group-hover:-rotate-180 transition-transform duration-500" />
            Reset All Filters
          </button>
        </div>

        {/* Footer info area */}
        <div className="mt-auto space-y-4 pt-4">
          <div className="bg-[var(--surface-secondary)]/50 rounded-xl border border-[var(--border-primary)] p-4 flex flex-col gap-3 shadow-inner">
            <h3 className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Navigation</h3>
            
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] bg-[var(--surface-primary)] p-2 rounded-lg border border-[var(--border-primary)] shadow-sm">
              <div className="w-6 h-6 rounded bg-[var(--app-background)] flex items-center justify-center text-[var(--accent-primary)]">
                <FontAwesomeIcon icon={faArrowPointer} className="text-[10px]" />
              </div>
              <div>
                <span className="font-bold text-[var(--text-primary)] block text-[10px]">Left Click + Drag</span>
                <span className="text-[9px] opacity-80">Rotate the scene</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] bg-[var(--surface-primary)] p-2 rounded-lg border border-[var(--border-primary)] shadow-sm">
              <div className="w-6 h-6 rounded bg-[var(--app-background)] flex items-center justify-center text-[var(--accent-primary)]">
                <FontAwesomeIcon icon={faArrowsUpDownLeftRight} className="text-[10px]" />
              </div>
              <div>
                <span className="font-bold text-[var(--text-primary)] block text-[10px]">Right Click + Drag</span>
                <span className="text-[9px] opacity-80">Pan the camera</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] bg-[var(--surface-primary)] p-2 rounded-lg border border-[var(--border-primary)] shadow-sm">
              <div className="w-6 h-6 rounded bg-[var(--app-background)] flex items-center justify-center text-[var(--accent-primary)]">
                <FontAwesomeIcon icon={faMouse} className="text-[10px]" />
              </div>
              <div>
                <span className="font-bold text-[var(--text-primary)] block text-[10px]">Scroll</span>
                <span className="text-[9px] opacity-80">Zoom the network in/out</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-secondary)]/50 rounded-xl border border-[var(--border-primary)] p-4 shadow-inner">
            <h3 className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Graph Legend</h3>
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-[var(--text-secondary)]"></span> Source</span>
              <span className="text-[var(--accent-primary)] font-black tracking-tighter drop-shadow-[0_0_8px_rgba(20,200,235,0.4)]">─────&gt;</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-[var(--text-secondary)]"></span> Target</span>
            </div>
          </div>
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
