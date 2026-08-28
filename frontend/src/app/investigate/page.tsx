"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useCase } from "@/context/CaseContext";

// Dynamically import Three.js scene to avoid SSR issues
const NetworkScene = dynamic(() => import("../../three/NetworkScene"), { ssr: false });

export default function InvestigatePage() {
  const { activeCaseId, activeCase } = useCase();
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    person: true,
    organization: true,
    location: true,
    phone: true,
    highRisk: false
  });
  const [minRisk, setMinRisk] = useState(0.0);

  // Selected Entity detail state
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedEntityRels, setSelectedEntityRels] = useState<any[]>([]);

  // Connection explorer state
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [tracingPath, setTracingPath] = useState(false);
  const [pathResult, setPathResult] = useState<any>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchWorkspaceData = useCallback(async () => {
    if (!activeCaseId) {
      setEntities([]);
      setRelationships([]);
      setGraphData({ nodes: [], links: [] });
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      // Fetch Entities
      const entRes = await fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      let ents: any[] = [];
      if (entRes.ok) {
        ents = await entRes.json();
        setEntities(ents);
      }

      // Fetch Relationships
      const relRes = await fetch(getApiUrl(`/api/relationships/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      let rels: any[] = [];
      if (relRes.ok) {
        rels = await relRes.json();
        setRelationships(rels);
      }

      // Fetch Graph representations
      const graphRes = await fetch(getApiUrl(`/api/network/${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (graphRes.ok) {
        const gData = await graphRes.json();
        setGraphData(gData);
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // Fetch relations for selected profile
  useEffect(() => {
    if (!selectedEntity) {
      setSelectedEntityRels([]);
      return;
    }
    const filtered = relationships.filter((r) => 
      r.source_entity_id === selectedEntity._id || 
      r.target_entity_id === selectedEntity._id
    ).map((r) => {
      const isSrc = r.source_entity_id === selectedEntity._id;
      const targetNodeId = isSrc ? r.target_entity_id : r.source_entity_id;
      const tEnt = entities.find((e) => e._id === targetNodeId);
      return {
        ...r,
        targetName: tEnt ? tEnt.name : `ID: ${targetNodeId.slice(0, 6)}...`,
        direction: isSrc ? "Outgoing" : "Incoming"
      };
    });
    setSelectedEntityRels(filtered);
  }, [selectedEntity, relationships, entities]);

  // Trace Path Connection Explorer
  const handleTracePath = async () => {
    if (!activeCaseId || !sourceId || !targetId) return;
    setTracingPath(true);
    setPathResult(null);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/network/${activeCaseId}/path?source=${sourceId}&target=${targetId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPathResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTracingPath(false);
    }
  };

  // Filter nodes & links for R3F 3D link map representation
  const filteredGraphData = useMemo(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], links: [] };

    const filteredNodes = graphData.nodes.filter((node: any) => {
      const type = (node.type || "").toLowerCase();
      const risk = node.risk_score || 0.0;

      if (type === "person" && !filters.person) return false;
      if (type === "organization" && !filters.organization) return false;
      if (type === "location" && !filters.location) return false;
      if (type === "phone" && !filters.phone) return false;
      
      if (filters.highRisk && risk <= 0.7) return false;
      if (risk < minRisk) return false;

      const entMatch = entities.find(e => e._id === node.id);
      if (entMatch && searchTerm) {
        return entMatch.name.toLowerCase().includes(searchTerm.toLowerCase());
      }

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
  }, [graphData, filters, minRisk, searchTerm, entities]);

  // Combined timeline of relationships events
  const timelineEvents = useMemo(() => {
    const events = relationships
      .filter((r) => r.properties && (r.properties.timestamp || r.properties.date))
      .map((r) => {
        const src = entities.find((e) => e._id === r.source_entity_id);
        const tgt = entities.find((e) => e._id === r.target_entity_id);
        const dateStr = r.properties.timestamp || r.properties.date;
        return {
          id: r._id,
          date: new Date(dateStr),
          type: r.type,
          sourceName: src ? src.name : "Unknown",
          targetName: tgt ? tgt.name : "Unknown",
          properties: r.properties
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return events;
  }, [relationships, entities]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full gap-4 relative overflow-hidden">
      
      {/* Upper Area containing Left, Center, Right panels */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        
        {/* LEFT PANEL: Filters and Search */}
        <aside className="w-80 border border-white/5 bg-zinc-900/10 p-5 rounded-2xl flex flex-col gap-5 backdrop-blur-sm shrink-0 overflow-y-auto">
          <div>
            <h2 className="text-base font-extrabold text-white">WORKSPACE FILTERS</h2>
            <p className="text-[10px] text-zinc-500 font-semibold font-mono mt-1 uppercase">
              {activeCase ? activeCase.name : "No Case Selected"}
            </p>
          </div>

          {/* Search bar */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Search Node Name</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/10 text-xs focus:outline-none focus:border-blue-500 text-white placeholder-zinc-700"
            />
          </div>

          {/* Entity Category Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Node Classification</label>
            <div className="space-y-2 bg-zinc-950/40 p-3 border border-white/5 rounded-xl text-xs text-zinc-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.person} 
                  onChange={() => setFilters({ ...filters, person: !filters.person })}
                  className="rounded bg-zinc-950 border-white/10 text-blue-500 focus:ring-0 focus:ring-offset-0" 
                />
                <span>👤 Persons</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.organization} 
                  onChange={() => setFilters({ ...filters, organization: !filters.organization })}
                  className="rounded bg-zinc-950 border-white/10 text-emerald-500 focus:ring-0" 
                />
                <span>🏢 Organizations</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.location} 
                  onChange={() => setFilters({ ...filters, location: !filters.location })}
                  className="rounded bg-zinc-950 border-white/10 text-amber-500 focus:ring-0" 
                />
                <span>📍 Locations</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={filters.phone} 
                  onChange={() => setFilters({ ...filters, phone: !filters.phone })}
                  className="rounded bg-zinc-950 border-white/10 text-violet-500 focus:ring-0" 
                />
                <span>📞 Communications</span>
              </label>
            </div>
          </div>

          {/* Risk Range Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Min Risk Score</span>
              <span className="font-mono text-zinc-300">{minRisk.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.05"
              value={minRisk}
              onChange={(e) => setMinRisk(parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer bg-zinc-800 rounded-lg appearance-none h-1"
            />
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300 mt-2">
              <input 
                type="checkbox" 
                checked={filters.highRisk} 
                onChange={() => setFilters({ ...filters, highRisk: !filters.highRisk })}
                className="rounded bg-zinc-950 border-white/10 text-red-500 focus:ring-0" 
              />
              <span className="text-red-400 font-semibold">🚨 Threat-Flagged Only (&gt;0.70)</span>
            </label>
          </div>

          {/* Suspect list quick selector */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Suspect Directory ({entities.length})</label>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {entities.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((e) => (
                <div 
                  key={e._id}
                  onClick={() => setSelectedEntity(e)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                    selectedEntity?._id === e._id 
                      ? "bg-blue-600/10 border-blue-500/20 text-white font-bold" 
                      : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="truncate max-w-[160px]">{e.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    e.risk_score > 0.7 ? "bg-red-500/15 text-red-400" : e.risk_score > 0.4 ? "bg-yellow-500/15 text-yellow-400" : "bg-blue-500/15 text-blue-400"
                  }`}>
                    {e.risk_score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER AREA: 3D Link Map representation */}
        <main className="flex-1 bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden flex flex-col">
          {!activeCaseId ? (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm italic">
              Please select a case to render the 3D network visualization.
            </div>
          ) : loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-xs text-zinc-500">Compiling 3D network nodes...</span>
            </div>
          ) : (
            <NetworkScene data={filteredGraphData} />
          )}

          {/* Metrics overlay */}
          {activeCaseId && (
            <div className="absolute top-4 right-4 p-4 rounded-xl border border-white/5 bg-zinc-900/80 backdrop-blur text-[10px] font-mono text-zinc-400 pointer-events-none space-y-1">
              <div className="flex justify-between gap-4"><span>Nodes visible:</span> <span className="font-bold text-white">{filteredGraphData.nodes.length}</span></div>
              <div className="flex justify-between gap-4"><span>Edges visible:</span> <span className="font-bold text-white">{filteredGraphData.links.length}</span></div>
            </div>
          )}
        </main>

        {/* RIGHT PANEL: Selected Entity details */}
        <aside className="w-80 border border-white/5 bg-zinc-900/10 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-sm shrink-0 overflow-y-auto">
          {selectedEntity ? (
            <>
              {/* Profile details */}
              <div className="border-b border-white/5 pb-4 space-y-2">
                <span className="px-2 py-0.5 text-[8px] font-extrabold bg-zinc-950 border border-white/10 text-zinc-400 rounded-full tracking-wider uppercase">
                  {selectedEntity.type}
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">{selectedEntity.name}</h3>
                
                {/* Risk scoring */}
                <div className="bg-zinc-950/60 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Risk index</span>
                  <span className={`text-sm font-extrabold font-mono ${
                    selectedEntity.risk_score > 0.7 ? "text-red-400 animate-pulse" : selectedEntity.risk_score > 0.4 ? "text-yellow-400" : "text-blue-400"
                  }`}>
                    {selectedEntity.risk_score.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Attributes list */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Node Details</h4>
                {Object.keys(selectedEntity.properties || {}).length === 0 ? (
                  <p className="text-zinc-600 text-xs italic">No attributes recorded.</p>
                ) : (
                  <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                    {Object.entries(selectedEntity.properties).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-[11px] p-2 rounded bg-zinc-950/20 border border-white/5">
                        <span className="text-zinc-500 font-mono">{k}</span>
                        <span className="text-zinc-300 font-bold truncate max-w-[120px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connection links list */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Direct Links ({selectedEntityRels.length})</h4>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {selectedEntityRels.map((rel, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 text-[11px] space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-zinc-300 truncate max-w-[110px]">{rel.targetName}</span>
                        <span className="text-blue-400 font-bold">{rel.type}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Direction:</span>
                        <span>{rel.direction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6 text-zinc-600 text-xs italic">
              Select a node in the graph or the left suspect list to view full profile details.
            </div>
          )}
        </aside>
      </div>

      {/* LOWER PANEL: Collapsible Connection Explorer and Event Timeline */}
      <footer className="h-56 bg-zinc-900/10 border border-white/5 rounded-2xl p-5 backdrop-blur-sm flex gap-6 shrink-0 z-10 overflow-hidden">
        
        {/* Connection Explorer Widget */}
        <div className="w-1/3 flex flex-col border-r border-white/5 pr-6 overflow-hidden">
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Link Connection Explorer</h3>
            <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">Trace shortest connections between two nodes.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-zinc-500 font-bold uppercase">Source Node</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="p-2.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="">-- Select --</option>
                {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-zinc-500 font-bold uppercase">Target Node</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="p-2.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="">-- Select --</option>
                {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleTracePath}
            disabled={tracingPath || !sourceId || !targetId}
            className="w-full mt-3 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
          >
            {tracingPath ? "Tracing Link Path..." : "Trace Connections"}
          </button>
        </div>

        {/* Traced Connection Path Display */}
        <div className="w-1/3 flex flex-col border-r border-white/5 pr-6 overflow-hidden min-h-0">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Connection Chain</h3>
          <div className="flex-1 overflow-y-auto pr-1 text-xs">
            {!pathResult ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic text-center">
                Configure Source & Target and run trace.
              </div>
            ) : pathResult.path.length === 0 ? (
              <div className="h-full flex items-center justify-center text-red-400/80 text-xs italic text-center">
                No connection path found between these nodes.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 font-mono py-1">
                {pathResult.entities.map((node: any, idx: number) => {
                  const isLast = idx === pathResult.entities.length - 1;
                  const rel = pathResult.relationships[idx];
                  return (
                    <React.Fragment key={idx}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="font-bold text-white text-xs">{node.name}</span>
                        <span className="text-[10px] text-zinc-500">({node.type})</span>
                      </div>
                      {!isLast && rel && (
                        <div className="pl-6 py-0.5 border-l border-dashed border-white/10 flex items-center gap-2 text-[10px] text-blue-400">
                          <span>&darr;</span>
                          <span className="px-1.5 py-0.5 bg-blue-600/10 border border-blue-500/10 rounded font-bold">{rel.type}</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Event Timeline Widget */}
        <div className="w-1/3 flex flex-col overflow-hidden min-h-0">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Operational Event Logs</h3>
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {timelineEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                No chronological logs available.
              </div>
            ) : (
              timelineEvents.map((evt, idx) => (
                <div key={idx} className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl text-[11px] font-mono flex items-start gap-2.5">
                  <span className="text-zinc-600 text-[10px] mt-0.5">{evt.date.toLocaleDateString()}</span>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-zinc-300 font-bold truncate">
                      {evt.sourceName} <span className="text-blue-400 font-semibold">{evt.type}</span> {evt.targetName}
                    </p>
                    {evt.properties.amount && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">Amount: ${evt.properties.amount}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </footer>
    </div>
  );
}
