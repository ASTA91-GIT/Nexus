"use client";
import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useCase } from "@/context/CaseContext";
import Link from "next/link";

const NetworkScene = dynamic(() => import("../../three/NetworkScene"), { ssr: false });

export default function Dashboard() {
  const { cases, activeCaseId, activeCase } = useCase();
  
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [highRiskEntities, setHighRiskEntities] = useState<any[]>([]);
  
  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchCommandCenterData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      setLoading(true);
      
      // 1. Fetch Global or Active Case Network
      const networkEndpoint = activeCaseId 
        ? `/api/network/${activeCaseId}` 
        : `/api/network/global`;
        
      const netRes = await fetch(getApiUrl(networkEndpoint), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (netRes.ok) {
        const netData = await netRes.json();
        setGraphData(netData);
        
        // Extract top entities from nodes
        const nodes = netData.nodes || [];
        const sorted = [...nodes].sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0));
        setHighRiskEntities(sorted.slice(0, 10));
      }

      // 2. Fetch Alerts
      if (activeCaseId) {
        const altRes = await fetch(getApiUrl(`/api/alerts/?case_id=${activeCaseId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (altRes.ok) {
          const altData = await altRes.json();
          setAlerts(altData);
        }
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchCommandCenterData();
  }, [fetchCommandCenterData]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[var(--app-background)] overflow-hidden">
      
      {/* BACKGROUND 3D GRAPH (CENTERPIECE) */}
      <div className="absolute inset-0 z-0">
        {!loading && (graphData.nodes?.length || 0) > 0 ? (
          <NetworkScene data={graphData} onNodeClick={() => {}} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black/10">
            {loading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-[var(--primary-accent)] border-[var(--border-primary)]" />
            ) : (
              <p className="text-[var(--text-secondary)] font-mono text-sm tracking-widest uppercase">NO NETWORK DATA</p>
            )}
          </div>
        )}
      </div>
      
      {/* OVERLAY GRADIENTS FOR SPATIAL DEPTH */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[var(--app-background)] via-transparent to-[var(--app-background)] opacity-60" />
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-[var(--app-background)] via-transparent to-[var(--app-background)] opacity-40" />

      {/* FLOATING PANELS */}
      <div className="absolute inset-0 z-20 p-6 flex flex-col justify-between pointer-events-none">
        
        {/* TOP ROW */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-2xl">
            <h1 className="text-xl font-black tracking-tighter bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-tertiary)] bg-clip-text text-transparent">
              COMMAND CENTER
            </h1>
            <div className="text-[10px] font-mono font-bold text-[var(--success)] mt-1 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" /> 
              SYSTEM ONLINE
            </div>
          </div>
          
          <div className="bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-2xl text-right">
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Active Case Status</p>
            <p className="font-mono text-sm font-bold text-[var(--text-primary)]">
              {activeCase ? `${activeCase.name} [${activeCase.status}]` : "GLOBAL DB OVERVIEW"}
            </p>
          </div>
        </div>

        {/* MIDDLE ROW (LEFT AND RIGHT PANELS) */}
        <div className="flex justify-between items-stretch flex-1 py-6">
          
          {/* LEFT PANEL */}
          <div className="w-80 flex flex-col gap-4 pointer-events-auto">
            {/* Active Cases */}
            <div className="bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl flex flex-col gap-3 max-h-64 overflow-hidden hover:border-[var(--border-secondary)] transition-colors">
              <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider flex justify-between">
                <span>Active Cases</span>
                <span>{cases.length}</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {cases.map(c => (
                  <Link href="/investigate" key={c._id} className="block p-2 rounded-lg bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-tertiary)] border border-transparent hover:border-[var(--border-primary)] transition-all">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">{c.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">{c.status}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* High Risk Entities */}
            <div className="flex-1 bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl flex flex-col gap-3 min-h-0">
              <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider flex justify-between">
                <span>High Risk Targets</span>
                <span className="text-[var(--danger)]">{highRiskEntities.filter(e => e.risk_score > 0.7).length} CRITICAL</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {highRiskEntities.map(ent => (
                  <div key={ent.id} className="p-2.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] flex items-center justify-between group cursor-pointer hover:border-[var(--danger)] transition-colors">
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{ent.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{ent.type}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ent.risk_score > 0.7 ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20' : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20'}`}>
                      {(ent.risk_score || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* RIGHT PANEL */}
          <div className="w-80 flex flex-col gap-4 pointer-events-auto items-end">
            {/* Network Statistics */}
            <div className="w-full bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl hover:border-[var(--border-secondary)] transition-colors">
              <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Network Topology</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--surface-secondary)]/50 p-2.5 rounded-lg border border-[var(--border-primary)] text-center">
                  <p className="text-xl font-black text-[var(--text-primary)]">{graphData.nodes?.length || 0}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mt-1">Nodes</p>
                </div>
                <div className="bg-[var(--surface-secondary)]/50 p-2.5 rounded-lg border border-[var(--border-primary)] text-center">
                  <p className="text-xl font-black text-[var(--text-primary)]">{graphData.links?.length || graphData.edges?.length || 0}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mt-1">Edges</p>
                </div>
              </div>
            </div>

            {/* Case Alerts */}
            <div className="w-full flex-1 bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl flex flex-col gap-3 min-h-0">
              <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider flex justify-between">
                <span>Recent Alerts</span>
                <span>{alerts.length}</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {alerts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                    No active alerts
                  </div>
                ) : (
                  alerts.slice(0, 8).map(alert => (
                    <div key={alert._id} className="p-2.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] border-l-2 border-l-[var(--danger)]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">{alert.type}</span>
                        <span className="text-[9px] text-[var(--text-tertiary)]">{new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-xs text-[var(--text-primary)] leading-tight">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="flex justify-center pointer-events-auto">
          <div className="bg-[var(--surface-primary)]/90 backdrop-blur-md border border-[var(--border-primary)] rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6">
            <Link href="/investigate" className="flex flex-col items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--primary-accent)] transition-colors">
              <i className="fa-solid fa-magnifying-glass text-xl"></i>
              <span className="text-[10px] font-bold uppercase tracking-wider">Investigate</span>
            </Link>
            <div className="w-px h-8 bg-[var(--border-primary)]"></div>
            <Link href="/reports" className="flex flex-col items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <i className="fa-solid fa-chart-column text-xl"></i>
              <span className="text-[10px] font-bold uppercase tracking-wider">Reports</span>
            </Link>
            <div className="w-px h-8 bg-[var(--border-primary)]"></div>
            <Link href="/risk" className="flex flex-col items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors">
              <i className="fa-solid fa-triangle-exclamation text-xl"></i>
              <span className="text-[10px] font-bold uppercase tracking-wider">Risk Dash</span>
            </Link>
            <div className="w-px h-8 bg-[var(--border-primary)]"></div>
            <button className="flex items-center gap-3 bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] text-white px-6 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 ml-4">
              <span className="font-bold text-sm tracking-wide">Command Palette</span>
              <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">Ctrl K</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
