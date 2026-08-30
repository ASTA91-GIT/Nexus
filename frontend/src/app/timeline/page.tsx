"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCase } from "@/context/CaseContext";
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

export default function TimelinePage() {
  const { activeCaseId } = useCase();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL"); 
  const [viewMode, setViewMode] = useState<"CHRONOLOGICAL" | "FLOW">("CHRONOLOGICAL");

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchTimeline = useCallback(async () => {
    if (!activeCaseId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(`/api/timeline/${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Ensure sorted by timestamp ascending for the flow chart
        data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to load timeline events:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Filters & Search
  const filteredEvents = useMemo(() => {
    return events.filter((evt: any) => {
      const matchSearch = evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          evt.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          JSON.stringify(evt.properties || {}).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = categoryFilter === "ALL" || evt.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [events, searchTerm, categoryFilter]);

  // React Flow setup
  const { nodes, edges } = useMemo(() => {
    if (viewMode !== "FLOW" || filteredEvents.length === 0) return { nodes: [], edges: [] };
    
    const newNodes = filteredEvents.map((evt, idx) => {
      let bgColor = "#1e293b"; // surface-primary
      let borderColor = "#334155"; // border-primary
      let textColor = "#f8fafc";
      
      if (evt.category === "ENTITY") {
        bgColor = "#0f172a";
        borderColor = "#3b82f6";
      } else if (evt.category === "RELATIONSHIP") {
        bgColor = "#0f172a";
        borderColor = "#8b5cf6";
      } else if (evt.category === "EVIDENCE") {
        bgColor = "#0f172a";
        borderColor = "#10b981";
      }

      return {
        id: `node-${idx}`,
        position: { x: 250, y: idx * 180 },
        data: {
          label: (
            <div className="flex flex-col gap-1 p-1 text-left min-w-[200px] max-w-[250px]">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-xs truncate" title={evt.title} style={{ color: textColor }}>{evt.title}</span>
                <span className="text-[8px] px-1 py-0.5 rounded border opacity-80 uppercase" style={{ borderColor }}>{evt.category}</span>
              </div>
              <span className="text-[9px] font-mono opacity-70" style={{ color: textColor }}>
                {new Date(evt.timestamp).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
              <p className="text-[10px] mt-1 line-clamp-2 opacity-90" style={{ color: textColor }}>
                {evt.message}
              </p>
            </div>
          )
        },
        style: {
          background: bgColor,
          color: textColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }
      };
    });

    const newEdges = [];
    for (let i = 0; i < filteredEvents.length - 1; i++) {
      newEdges.push({
        id: `e-${i}-${i+1}`,
        source: `node-${i}`,
        target: `node-${i+1}`,
        animated: true,
        style: { stroke: 'var(--border-secondary)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--border-secondary)',
        },
      });
    }

    // Apply Dagre layout
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 250, nodesep: 150 });

    newNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 250, height: 120 });
    });
    newEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });
    dagre.layout(dagreGraph);

    const layoutedNodes = newNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.position = {
        x: nodeWithPosition.x - 125,
        y: nodeWithPosition.y - 60,
      };
      return node;
    });

    return { nodes: layoutedNodes, edges: newEdges };
  }, [filteredEvents, viewMode]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [nodes, edges, setFlowNodes, setFlowEdges]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full h-[calc(100vh-4rem)] pb-4">
      {/* Header */}
      <div className="border-b border-[var(--border-primary)] pb-4 shrink-0 px-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Investigation Timeline</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Chronological record of suspect registrations, relationship links, calls, and evidence ingestion.
        </p>
      </div>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)] mx-2 flex-grow flex items-center justify-center">
          <div>
            <i className="fa-solid fa-timeline text-4xl mb-3 opacity-50"></i>
            <p>Please select an active Case File from the sidebar to view the operational timeline.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 flex-grow border border-[var(--border-primary)] rounded-2xl bg-[var(--surface-primary)] mx-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
          <span className="text-xs text-[var(--text-secondary)]">Compiling case chronology...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-grow min-h-0 overflow-hidden px-2">
          {/* Controls Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-[var(--surface-secondary)] p-4 border border-[var(--border-primary)] rounded-xl shrink-0 shadow-sm">
            <div className="flex gap-4 items-center w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Search event logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full md:w-64"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field"
              >
                <option value="ALL">All Categories</option>
                <option value="ENTITY">Suspect Identified</option>
                <option value="RELATIONSHIP">Link Mapped</option>
                <option value="EVIDENCE">Evidence Ingested</option>
              </select>
            </div>
            
            <div className="flex bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg p-1">
              <button
                onClick={() => setViewMode("CHRONOLOGICAL")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  viewMode === "CHRONOLOGICAL" 
                    ? "bg-[var(--accent-primary)] text-white shadow-sm" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <i className="fa-solid fa-list-ul mr-1.5"></i> Chronological
              </button>
              <button
                onClick={() => setViewMode("FLOW")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  viewMode === "FLOW" 
                    ? "bg-[var(--accent-primary)] text-white shadow-sm" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <i className="fa-solid fa-diagram-project mr-1.5"></i> Flow View
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-grow border border-[var(--border-primary)] bg-[var(--surface-primary)] rounded-2xl relative overflow-hidden shadow-sm">
            {filteredEvents.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center text-[var(--text-muted)] bg-[var(--surface-secondary)]">
                <i className="fa-regular fa-clock text-4xl mb-3 opacity-50"></i>
                <p>No chronological events could be extracted from the current case evidence.</p>
              </div>
            ) : viewMode === "FLOW" ? (
              <div className="absolute inset-0 z-0">
                <ReactFlow 
                  nodes={flowNodes}
                  edges={flowEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView
                  attributionPosition="bottom-right"
                  className="bg-[var(--surface-tertiary)]"
                >
                  <Background color="var(--border-secondary)" gap={20} />
                  <Controls className="bg-[var(--surface-primary)] border-[var(--border-primary)] fill-[var(--text-secondary)]" />
                  <MiniMap 
                    nodeColor={(n) => n.style?.background as string || '#334155'}
                    maskColor="var(--surface-tertiary)"
                    className="bg-[var(--surface-primary)] border-[var(--border-primary)] opacity-80" 
                  />
                </ReactFlow>
              </div>
            ) : (
              <div className="absolute inset-0 overflow-x-auto overflow-y-hidden p-6 scrollbar-thin flex items-center">
                <div className="flex flex-row items-center space-x-12 relative min-w-max px-8 w-full h-[500px]">
                  {/* Central Axis Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-[var(--border-secondary)] -translate-y-1/2 z-0"></div>
                  
                  {filteredEvents.map((evt, idx) => {
                    const isTop = idx % 2 === 0;
                    
                    // Color mapping
                    let badgeColor = "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white";
                    let emoji = "👥";
                    if (evt.category === "RELATIONSHIP") {
                      badgeColor = "bg-[var(--warning)] border-[var(--warning)] text-white";
                      emoji = "🔗";
                    } else if (evt.category === "EVIDENCE") {
                      badgeColor = "bg-[var(--success)] border-[var(--success)] text-white";
                      emoji = "📥";
                    }

                    return (
                      <div key={idx} className={`relative group animate-fade-in w-80 shrink-0 flex flex-col ${isTop ? 'justify-end pb-[260px]' : 'justify-start pt-[260px]'} h-full items-center`}>
                        {/* Circle Node Badge on the center line */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center text-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] border-[3px] border-[var(--surface-primary)] z-10 ${badgeColor} transition-transform group-hover:scale-125`}>
                          {emoji}
                        </div>
                        
                        {/* Connecting Line to Card */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-0.5 bg-[var(--border-secondary)] z-0 ${isTop ? 'bottom-1/2 h-[60px]' : 'top-1/2 h-[60px]'}`}></div>

                        {/* Timeline card bubble */}
                        <div className={`bg-[var(--surface-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)] p-5 rounded-2xl transition-all relative shadow-xl w-full z-20 ${isTop ? 'mb-4' : 'mt-4'}`}>
                          
                          {/* Triangle Pointer */}
                          <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--surface-secondary)] border-[var(--border-primary)] transform rotate-45 z-10 ${isTop ? 'bottom-[-9px] border-b border-r' : 'top-[-9px] border-t border-l'} group-hover:bg-[var(--surface-hover)] group-hover:border-[var(--accent-primary)]`}></div>
                          
                          <div className="flex justify-between items-start gap-4 flex-wrap relative z-20">
                            <div>
                              <h3 className="font-bold text-[var(--text-primary)] tracking-wide text-sm flex items-center gap-2">
                                {evt.title}
                              </h3>
                              <p className="text-[var(--text-secondary)] text-[10px] font-mono mt-1">
                                {new Date(evt.timestamp).toLocaleString(undefined, {
                                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                              evt.category === "RELATIONSHIP" ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" :
                              evt.category === "EVIDENCE" ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" :
                              "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20"
                            }`}>
                              {evt.category}
                            </span>
                          </div>

                          <p className="text-[var(--text-secondary)] text-xs mt-3 leading-relaxed relative z-20">{evt.message}</p>

                          {/* Properties detail drawer */}
                          {Object.keys(evt.properties || {}).length > 0 && (
                            <div className="mt-4 pt-3 border-t border-[var(--border-primary)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 text-[10px] font-mono text-[var(--text-muted)] relative z-20">
                              {Object.entries(evt.properties).map(([k, v]) => (
                                <div key={k} className="truncate bg-[var(--surface-primary)] p-2 rounded border border-[var(--border-primary)]">
                                  <span className="font-bold uppercase mr-1 block text-[8px] mb-0.5">{k}</span>
                                  <span className="text-[var(--text-primary)]" title={String(v)}>{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
