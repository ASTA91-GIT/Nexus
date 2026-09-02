"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useCase } from "@/context/CaseContext";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faShieldHalved, faServer, faProjectDiagram, faLink, faChartPie, 
  faCircleExclamation, faUser, faBuilding, faMapMarkerAlt, faCar, 
  faMagnifyingGlass, faChartColumn, faTriangleExclamation, faTimes, faChevronDown, faChevronUp,
  faPlus, faMinus, faExpand, faCrosshairs, faRotateRight,
  faFileInvoice, faFileLines, faPuzzlePiece, faChevronRight, faDatabase,
  faCircleCheck, faArrowRight
} from "@fortawesome/free-solid-svg-icons";

const NetworkScene = dynamic(() => import("../../three/NetworkScene"), { ssr: false });

export default function Dashboard() {
  const { cases, activeCaseId, activeCase } = useCase();
  
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [highRiskEntities, setHighRiskEntities] = useState<any[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [isFocusPanelMinimized, setIsFocusPanelMinimized] = useState(false);
  
  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchCommandCenterData = useCallback(async () => {
    if (activeCaseId === null && cases.length > 0) {
      // Wait for case selection if cases exist
      return;
    }


    const token = localStorage.getItem("token");
    if (!token) return;
    
    // Clear graph to prevent stale rendering during case switch
    setGraphData({ nodes: [], links: [] });
    setAlerts([]);
    
    try {
      setLoading(true);
      
      // Fetch Network and Alerts in parallel
      const networkEndpoint = activeCaseId 
        ? `/api/network/${activeCaseId}` 
        : `/api/network/global`;
        
      const [netRes, altRes] = await Promise.all([
        fetch(getApiUrl(networkEndpoint), { headers: { Authorization: `Bearer ${token}` } }),
        activeCaseId 
          ? fetch(getApiUrl(`/api/alerts/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve(null)
      ]);

      if (netRes && netRes.ok) {
        const netData = await netRes.json();
        setGraphData(netData);
        
        // Extract top entities from nodes
        const nodes = netData.nodes || [];
        const sorted = [...nodes].sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0));
        setHighRiskEntities(sorted.slice(0, 10));
      }

      if (altRes && altRes.ok) {
        const altData = await altRes.json();
        setAlerts(altData);
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

  // Derived metrics for UI
  const { density, components, maxRiskNode, mostConnectedNode } = useMemo(() => {
    const nodes = graphData?.nodes || [];
    const links = graphData?.links || graphData?.edges || [];
    
    const nodeCount = nodes.length;
    const edgeCount = links.length;
    
    let density = 0;
    if (nodeCount > 1) {
      density = (2 * edgeCount) / (nodeCount * (nodeCount - 1));
    }
    
    const degreeMap: Record<string, number> = {};
    links.forEach((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degreeMap[s] = (degreeMap[s] || 0) + 1;
      degreeMap[t] = (degreeMap[t] || 0) + 1;
    });
    
    let maxDegree = -1;
    let mostConnectedNode: any = null;
    let maxRiskNode: any = null;
    
    nodes.forEach((n: any) => {
      const id = String(n.id || n._id || "");
      if ((degreeMap[id] || 0) > maxDegree) {
        maxDegree = degreeMap[id] || 0;
        mostConnectedNode = { ...n, degree: maxDegree };
      }
      if (!maxRiskNode || (n.risk_score || 0) > (maxRiskNode.risk_score || 0)) {
        maxRiskNode = n;
      }
    });

    const adj: Record<string, string[]> = {};
    nodes.forEach((n: any) => adj[String(n.id || n._id)] = []);
    links.forEach((l: any) => {
      const s = String(typeof l.source === 'object' ? l.source.id : l.source);
      const t = String(typeof l.target === 'object' ? l.target.id : l.target);
      if (adj[s] && adj[t]) {
        adj[s].push(t);
        adj[t].push(s);
      }
    });
    const visited = new Set<string>();
    let components = 0;
    nodes.forEach((n: any) => {
      const id = String(n.id || n._id);
      if (!visited.has(id)) {
        components++;
        const q = [id];
        while(q.length > 0) {
          const curr = q.shift()!;
          if (!visited.has(curr)) {
            visited.add(curr);
            (adj[curr] || []).forEach(neighbor => {
              if (!visited.has(neighbor)) q.push(neighbor);
            });
          }
        }
      }
    });
    
    return { density, components, maxRiskNode, mostConnectedNode };
  }, [graphData]);

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return "just now";
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    } catch {
      return "";
    }
  };

  const getAlertStyle = (severity: string) => {
    const s = (severity || "").toUpperCase();
    if (s === "CRITICAL") return { color: "text-[var(--danger)]", bg: "bg-[var(--danger)]", border: "border-[var(--danger)]", lightBg: "bg-[var(--danger)]/10" };
    if (s === "HIGH") return { color: "text-orange-500", bg: "bg-orange-500", border: "border-orange-500", lightBg: "bg-orange-500/10" };
    if (s === "MEDIUM") return { color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-500", lightBg: "bg-amber-500/10" };
    if (s === "LOW") return { color: "text-blue-400", bg: "bg-blue-400", border: "border-blue-400", lightBg: "bg-blue-400/10" };
    return { color: "text-cyan-400", bg: "bg-cyan-400", border: "border-cyan-400", lightBg: "bg-cyan-400/10" }; // Informational
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[var(--app-background)] overflow-hidden">
      
      {/* BACKGROUND 3D GRAPH (CENTERPIECE) */}
      <div className="absolute inset-0 z-0">
        {!loading && (graphData.nodes?.length || 0) > 0 ? (
          <NetworkScene 
            data={graphData} 
            onNodeClick={(n) => { setSelectedNode(n); setSelectedEdge(null); setIsFocusPanelMinimized(false); }} 
            onEdgeClick={(e) => { setSelectedEdge(e); setSelectedNode(null); setIsFocusPanelMinimized(false); }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black/10">
            {loading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-[var(--primary-accent)] border-[var(--border-primary)]" />
            ) : (
              <div className="text-center p-8 bg-[var(--surface-primary)]/80 backdrop-blur-md rounded-xl border border-[var(--border-primary)] shadow-2xl">
                <i className="fa-solid fa-folder-open text-4xl text-[var(--text-muted)] mb-4"></i>
                <p className="text-[var(--text-secondary)] font-mono text-sm tracking-widest uppercase font-bold">No active investigation is available.</p>
                <p className="text-xs text-[var(--text-muted)] mt-2 max-w-md">Please select a case from the top navigation menu or create a new investigation to begin analysis.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* OVERLAY GRADIENTS FOR SPATIAL DEPTH (Removed due to transparent interpolation bug) */}

      {/* FLOATING PANELS */}
      <div className="absolute inset-0 z-20 p-6 flex flex-col justify-between pointer-events-none">
        
        {/* TOP ROW */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex gap-4 items-start">
            <div className="bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-2xl flex items-center gap-4 hover:border-[var(--border-secondary)] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/20 flex items-center justify-center text-[var(--primary-accent)] shadow-inner">
                <FontAwesomeIcon icon={faShieldHalved} className="text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter text-[var(--text-primary)] drop-shadow-sm">
                  COMMAND CENTER
                </h1>
                <div className="text-[10px] font-mono font-bold text-[var(--success)] mt-0.5 tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_8px_var(--success)]" /> 
                  SYSTEM ONLINE
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-2xl flex items-center gap-4 hover:border-[var(--border-secondary)] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-secondary)] shadow-inner">
              <FontAwesomeIcon icon={faDatabase} className="text-lg" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Active Case Status</p>
              <p className="font-mono text-sm font-bold text-[var(--text-primary)]">
                {activeCase ? `${activeCase.name} [${activeCase.status}]` : "GLOBAL DB OVERVIEW"}
              </p>
            </div>
          </div>
        </div>

        {/* FLOATING CENTER CONTROLS */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-auto bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-1.5 shadow-2xl hover:border-[var(--border-secondary)] transition-colors">
          <button onClick={() => window.dispatchEvent(new CustomEvent('network:zoomIn'))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95" title="Zoom In"><FontAwesomeIcon icon={faPlus} /></button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('network:zoomOut'))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95" title="Zoom Out"><FontAwesomeIcon icon={faMinus} /></button>
          <div className="w-px h-6 bg-[var(--border-primary)] mx-1"></div>
          <button onClick={() => window.dispatchEvent(new CustomEvent('network:reset'))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95" title="Fit Network"><FontAwesomeIcon icon={faCrosshairs} /></button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('network:reset'))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95" title="Reset Camera"><FontAwesomeIcon icon={faRotateRight} /></button>
          <div className="w-px h-6 bg-[var(--border-primary)] mx-1"></div>
          <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95" title="Fullscreen"><FontAwesomeIcon icon={faExpand} /></button>
        </div>


        {/* MIDDLE ROW (LEFT AND RIGHT PANELS) */}
        <div className="flex justify-between items-stretch flex-1 py-6 gap-6 min-h-0 overflow-hidden">
          
          {/* LEFT PANEL */}
          <div className="w-[320px] flex flex-col gap-4 pointer-events-auto h-full min-h-0">
            {/* Active Cases */}
            <div className="bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl flex flex-col gap-3 max-h-[300px] hover:border-[var(--border-secondary)] transition-colors">
              <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-2"><FontAwesomeIcon icon={faServer} className="opacity-70" /> Active Cases</span>
                <span className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full border border-[var(--border-primary)]">{cases.length}</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {cases.map(c => {
                  const isActive = c._id === activeCaseId;
                  return (
                    <Link href="/investigate" key={c._id} className={`block p-3 rounded-xl border transition-all group ${isActive ? 'bg-[var(--primary-accent)]/10 border-[var(--primary-accent)]/50 shadow-[0_0_15px_rgba(20,200,235,0.1)]' : 'bg-[var(--surface-secondary)]/50 border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--surface-tertiary)]'}`}>
                      <div className="flex items-start justify-between">
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-[var(--primary-accent)]' : 'text-[var(--text-primary)] group-hover:text-[var(--text-primary)]'}`}>{c.name}</p>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-accent)] shadow-[0_0_6px_var(--primary-accent)] mt-1 shrink-0" />}
                      </div>
                      <p className="text-[9px] text-[var(--text-secondary)] font-mono mt-1.5 uppercase tracking-wider font-bold opacity-80">
                        {c.status} {c.entity_count !== undefined ? `• ${c.entity_count} ENTITIES` : ""} {c.evidence_count !== undefined ? `• ${c.evidence_count} EVIDENCE` : ""}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* High Risk Targets */}
            <div className="flex-1 bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl flex flex-col gap-3 min-h-0 hover:border-[var(--border-secondary)] transition-colors">
              <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest flex items-center justify-between mb-1">
                <span className="flex items-center gap-2"><FontAwesomeIcon icon={faCrosshairs} className="opacity-70" /> High Risk Targets</span>
                {highRiskEntities.filter(e => e.risk_score > 0.7).length > 0 && (
                  <span className="text-[var(--danger)] bg-[var(--danger)]/10 px-2 py-0.5 rounded border border-[var(--danger)]/20 animate-pulse">{highRiskEntities.filter(e => e.risk_score > 0.7).length} CRITICAL</span>
                )}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {highRiskEntities.map((ent, index) => {
                  const isCritical = ent.risk_score > 0.75;
                  const isHigh = ent.risk_score > 0.6 && !isCritical;
                  const color = isCritical ? 'bg-[var(--danger)]' : isHigh ? 'bg-orange-500' : 'bg-yellow-500';
                  const textColor = isCritical ? 'text-[var(--danger)]' : isHigh ? 'text-orange-500' : 'text-yellow-500';
                  const bgLight = isCritical ? 'bg-[var(--danger)]/10 border-[var(--danger)]/20' : isHigh ? 'bg-orange-500/10 border-orange-500/20' : 'bg-yellow-500/10 border-yellow-500/20';

                  return (
                    <div key={ent.id} className="p-2.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] flex flex-col group cursor-pointer hover:bg-[var(--surface-tertiary)] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[9px] font-mono text-[var(--text-tertiary)] bg-[var(--surface-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border-primary)] shrink-0">
                            #{index + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary-accent)] transition-colors">{ent.name}</p>
                            <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold truncate opacity-80">{ent.type}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${bgLight} ${textColor} shrink-0`}>
                          {(ent.risk_score || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-[var(--surface-primary)] rounded-full overflow-hidden border border-[var(--border-primary)]">
                        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, ent.risk_score * 100))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/entities" className="text-[10px] uppercase font-bold text-[var(--primary-accent)] hover:text-white mt-2 block w-full text-center transition-colors flex items-center justify-center gap-1.5 group">
                View All Targets <FontAwesomeIcon icon={faChevronRight} className="text-[9px] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          
          {/* RIGHT PANEL */}
          <div className="w-[320px] flex flex-col gap-4 pointer-events-auto h-full min-h-0">
            {/* Network Topology */}
            <div className="w-full bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl hover:border-[var(--border-secondary)] transition-colors">
              <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faProjectDiagram} className="opacity-70" /> Network Topology
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[var(--surface-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)] flex flex-col items-center justify-center text-center hover:border-[var(--primary-accent)]/30 hover:bg-[var(--surface-tertiary)] transition-colors group">
                  <FontAwesomeIcon icon={faProjectDiagram} className="text-[var(--text-muted)] mb-2 group-hover:text-[var(--primary-accent)] transition-colors" />
                  <p className="text-xl font-black text-[var(--text-primary)]">{graphData.nodes?.length || 0}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mt-0.5">Nodes</p>
                </div>
                <div className="bg-[var(--surface-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)] flex flex-col items-center justify-center text-center hover:border-[var(--primary-accent)]/30 hover:bg-[var(--surface-tertiary)] transition-colors group">
                  <FontAwesomeIcon icon={faLink} className="text-[var(--text-muted)] mb-2 group-hover:text-[var(--primary-accent)] transition-colors" />
                  <p className="text-xl font-black text-[var(--text-primary)]">{graphData.links?.length || graphData.edges?.length || 0}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mt-0.5">Edges</p>
                </div>
                <div className="bg-[var(--surface-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)] flex flex-col items-center justify-center text-center hover:border-[var(--primary-accent)]/30 hover:bg-[var(--surface-tertiary)] transition-colors group">
                  <FontAwesomeIcon icon={faCrosshairs} className="text-[var(--text-muted)] mb-2 group-hover:text-[var(--primary-accent)] transition-colors" />
                  <p className="text-xl font-black text-[var(--text-primary)]">{density.toFixed(2)}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mt-0.5">Density</p>
                </div>
                <div className="bg-[var(--surface-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)] flex flex-col items-center justify-center text-center hover:border-[var(--primary-accent)]/30 hover:bg-[var(--surface-tertiary)] transition-colors group">
                  <FontAwesomeIcon icon={faPuzzlePiece} className="text-[var(--text-muted)] mb-2 group-hover:text-[var(--primary-accent)] transition-colors" />
                  <p className="text-xl font-black text-[var(--text-primary)]">{components}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold mt-0.5">Components</p>
                </div>
              </div>
              <div className="mt-3 bg-[var(--surface-secondary)]/50 p-3 rounded-xl border border-[var(--border-primary)] flex items-center justify-between shadow-inner">
                <span className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">Highest Risk Score</span>
                <span className="text-sm font-black text-[var(--danger)] font-mono">{(maxRiskNode?.risk_score || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Case Alerts */}
            <div className="w-full flex-1 bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl flex flex-col gap-3 hover:border-[var(--border-secondary)] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest flex items-center gap-2">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="opacity-70" /> Recent Alerts
                </h3>
                <span className="bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full border border-[var(--border-primary)] text-[10px] font-black">{alerts.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                    <div className="w-12 h-12 rounded-full border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center mb-3 text-[var(--success)]">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-2xl" />
                    </div>
                    <p className="text-[11px] text-[var(--text-primary)] uppercase font-black tracking-widest mb-1.5">No Active Alerts</p>
                    <p className="text-[10px] text-[var(--text-secondary)] max-w-[200px] leading-relaxed mb-4">The investigation is currently operating within normal thresholds.</p>
                    <div className="text-[9px] font-mono font-bold text-[var(--success)] flex items-center gap-1.5 bg-[var(--success)]/10 px-2.5 py-1 rounded-full border border-[var(--success)]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_5px_var(--success)]" /> MONITORING ACTIVE
                    </div>
                  </div>
                ) : (
                  alerts.map(alert => {
                    const style = getAlertStyle(alert.severity);
                    const className = `block p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] hover:border-white/20 hover:bg-[var(--surface-tertiary)] hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm group`;
                    const content = (
                        <div className="flex gap-3">
                          <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${style.lightBg} ${style.border}/30 ${style.color}`}>
                            <span className={`w-2 h-2 rounded-full ${style.bg} shadow-[0_0_8px_currentColor]`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <span className={`text-[9px] font-black uppercase tracking-widest ${style.color}`}>{alert.type || alert.severity || "ALERT"}</span>
                              <span className="text-[9px] font-mono text-[var(--text-tertiary)] shrink-0 ml-2">{alert.created_at ? formatRelativeTime(alert.created_at) : 'recently'}</span>
                            </div>
                            <p className="text-xs text-[var(--text-primary)] font-bold truncate mb-1 group-hover:text-white transition-colors">{alert.title || (alert.entity_id ? `Alert on Entity ${alert.entity_id.substring(0,6)}` : alert.type)}</p>
                            <p className="text-[10px] text-[var(--text-secondary)] leading-snug line-clamp-2">{alert.message}</p>
                          </div>
                        </div>
                    );
                    
                    if (alert.entity_id) {
                      return <Link key={alert._id || Math.random().toString()} href={`/entities?id=${alert.entity_id}`} className={className}>{content}</Link>;
                    }
                    return <div key={alert._id || Math.random().toString()} className={className}>{content}</div>;
                  })
                )}
              </div>
              
              {alerts.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-primary)]">
                  <Link href="/alerts" className="text-[10px] uppercase font-bold text-[var(--text-secondary)] hover:text-white block w-full text-center transition-colors flex items-center justify-center gap-1.5 group">
                    VIEW ALL ALERTS <FontAwesomeIcon icon={faArrowRight} className="text-[9px] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </div>

            {/* Investigation Snapshot */}
            <div className="w-full bg-[var(--surface-primary)]/80 backdrop-blur-md border border-[var(--border-primary)] rounded-xl p-4 shadow-xl hover:border-[var(--border-secondary)] transition-colors">
              <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faChartPie} className="opacity-70" /> Investigation Snapshot
              </h3>
              {graphData.nodes?.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {mostConnectedNode && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                        <FontAwesomeIcon icon={faUser} />
                      </div>
                      <div className="truncate">
                        <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Most Connected</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate" title={mostConnectedNode.name}>{mostConnectedNode.name}</p>
                        <p className="text-[9px] text-[var(--text-secondary)]">{mostConnectedNode.degree} relationships</p>
                      </div>
                    </div>
                  )}
                  {maxRiskNode && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--danger)]/10 border border-[var(--danger)]/20 flex items-center justify-center text-[var(--danger)] shrink-0">
                        <FontAwesomeIcon icon={faBuilding} />
                      </div>
                      <div className="truncate">
                        <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Highest Risk</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate" title={maxRiskNode.name}>{maxRiskNode.name}</p>
                        <p className="text-[9px] text-[var(--text-secondary)] font-mono">Risk Score: {(maxRiskNode.risk_score || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                  {activeCase?.evidence_count !== undefined && (
                    <div className="flex items-start gap-3 col-span-2 mt-1 pt-3 border-t border-[var(--border-primary)]">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
                        <FontAwesomeIcon icon={faFileLines} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Total Evidence</p>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {activeCase.evidence_count} <span className="text-[10px] text-[var(--text-secondary)] font-normal ml-1">items collected</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center justify-center text-center opacity-60">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">No investigation insights available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="flex justify-center pointer-events-auto">
          <div className="bg-[var(--surface-primary)]/90 backdrop-blur-md border border-[var(--border-primary)] rounded-2xl px-8 py-4 shadow-2xl flex items-center gap-8 hover:border-[var(--border-secondary)] transition-colors">
            <Link href="/investigate" className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--primary-accent)] transition-colors group">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center group-hover:bg-[var(--primary-accent)]/10 transition-colors border border-transparent group-hover:border-[var(--primary-accent)]/30">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-lg" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest">Investigate</span>
            </Link>
            <div className="w-px h-10 bg-[var(--border-primary)]"></div>
            <Link href="/reports" className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center group-hover:bg-[var(--surface-tertiary)] transition-colors border border-transparent group-hover:border-[var(--border-primary)]">
                <FontAwesomeIcon icon={faChartColumn} className="text-lg" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest">Reports</span>
            </Link>
            <div className="w-px h-10 bg-[var(--border-primary)]"></div>
            <Link href="/risk" className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors group">
              <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center group-hover:bg-[var(--danger)]/10 transition-colors border border-transparent group-hover:border-[var(--danger)]/30">
                <FontAwesomeIcon icon={faTriangleExclamation} className="text-lg" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest">Risk Dash</span>
            </Link>
            <div className="w-px h-10 bg-[var(--border-primary)] ml-2 mr-2"></div>
            <button className="flex items-center gap-3 bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] text-white px-8 py-3 rounded-xl shadow-[0_4px_14px_0_rgba(20,200,235,0.39)] transition-all active:scale-95 hover:-translate-y-0.5">
              <span className="font-black text-xs tracking-widest uppercase">Command Palette</span>
              <span className="text-[10px] bg-black/20 border border-black/10 px-2 py-0.5 rounded font-mono shadow-inner">Ctrl K</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
