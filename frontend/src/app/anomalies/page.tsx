"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCase } from "@/context/CaseContext";
import Link from "next/link";
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

export default function AnomaliesDashboard() {
  const { activeCaseId, activeCase } = useCase();

  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"LIST" | "GRAPH">("LIST");
  
  // React Flow state
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchCaseData = useCallback(async () => {
    if (!activeCaseId) {
      setEntities([]);
      setRelationships([]);
      setEvidenceList([]);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const [entRes, relRes, evRes] = await Promise.all([
        fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl(`/api/relationships/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl(`/api/evidence/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (entRes.ok) setEntities(await entRes.json());
      if (relRes.ok) setRelationships(await relRes.json());
      if (evRes.ok) setEvidenceList(await evRes.json());
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchCaseData();
    // Reset anomalies when case changes
    setAnomalies([]);
    setLastScanned(null);
  }, [fetchCaseData, activeCaseId]);

  const runDeterministicScan = () => {
    setScanning(true);
    
    // Simulate scan delay for UX
    setTimeout(() => {
      const results: any[] = [];
      
      // RULE 1: High Centrality (Entity with > 3 relationships)
      const relCounts: Record<string, number> = {};
      relationships.forEach(r => {
        relCounts[r.source_entity_id] = (relCounts[r.source_entity_id] || 0) + 1;
        relCounts[r.target_entity_id] = (relCounts[r.target_entity_id] || 0) + 1;
      });

      // RULE 2: Isolated Entities (0 relationships)
      const isolated = entities.filter(e => !relCounts[e._id]);
      isolated.forEach(e => {
        results.push({
          severity: "LOW",
          category: "ISOLATED CLUSTER",
          entity: e.name,
          reason: "This entity is completely isolated and has no connections to any other entity in the network.",
          evidence: [],
          timestamp: new Date().toISOString()
        });
      });

      // High Centrality mapping
      Object.entries(relCounts).forEach(([entId, count]) => {
        if (count > 3) {
          const ent = entities.find(e => e._id === entId);
          if (ent) {
            results.push({
              severity: "HIGH",
              category: "HIGH CONNECTIVITY",
              entity: ent.name,
              reason: `Entity acts as a central hub, appearing in ${count} separate relationships. High risk of orchestration.`,
              evidence: [],
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      // RULE 3: Unmapped Locations (Location type but no coordinates)
      const locations = entities.filter(e => e.type === "LOCATION");
      locations.forEach(loc => {
        if (!loc.properties?.lat && !loc.properties?.latitude) {
          results.push({
            severity: "MEDIUM",
            category: "UNMAPPED LOCATION",
            entity: loc.name,
            reason: "Location entity is missing coordinate properties (lat/lng). Cannot be plotted on geographic intelligence.",
            evidence: [],
            timestamp: new Date().toISOString()
          });
        }
      });

      // RULE 4: Threat Links
      relationships.forEach(rel => {
        if (["KILLED", "FINANCED", "ORDERED"].includes(rel.type?.toUpperCase())) {
          const source = entities.find(e => e._id === rel.source_entity_id);
          const target = entities.find(e => e._id === rel.target_entity_id);
          if (source && target) {
            results.push({
              severity: "HIGH",
              category: "DIRECT THREAT",
              entity: source.name,
              reason: `Direct threat link established: ${source.name} [${rel.type}] ${target.name}.`,
              evidence: rel.evidence_ids ? evidenceList.filter(ev => rel.evidence_ids.includes(ev._id)).map(e => e.title) : [],
              timestamp: rel.created_at || new Date().toISOString()
            });
          }
        }
      });

      setAnomalies(results.sort((a, b) => {
        if (a.severity === "HIGH" && b.severity !== "HIGH") return -1;
        if (b.severity === "HIGH" && a.severity !== "HIGH") return 1;
        return 0;
      }));
      
      setLastScanned(new Date().toLocaleString());
      setScanning(false);
      
      // Build Graph
      buildGraph(results);
    }, 1200);
  };

  const buildGraph = (anomalyResults: any[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 150 });

    const anomalyNames = anomalyResults.map(a => a.entity);
    const newNodes = entities.map((ent, idx) => {
      const isAnomaly = anomalyNames.includes(ent.name);
      const isHighRisk = anomalyResults.find(a => a.entity === ent.name && a.severity === "HIGH");
      
      let bgColor = isHighRisk ? "#450a0a" : isAnomaly ? "#422006" : "var(--surface-primary)";
      let borderColor = isHighRisk ? "#ef4444" : isAnomaly ? "#f59e0b" : "var(--border-secondary)";
      let textColor = "var(--text-primary)";

      const node = {
        id: ent._id,
        position: { x: 0, y: 0 },
        data: {
          label: (
            <div className="flex flex-col gap-1 p-2 text-center w-32">
              <span className="font-bold text-xs truncate" title={ent.name}>{ent.name}</span>
              <span className="text-[9px] px-1 py-0.5 rounded border uppercase w-min mx-auto" style={{ borderColor }}>{ent.type}</span>
              {isAnomaly && <span className="text-[10px] text-red-500 font-bold mt-1">ANOMALY</span>}
            </div>
          )
        },
        style: {
          background: bgColor,
          color: textColor,
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
        }
      };
      dagreGraph.setNode(node.id, { width: 140, height: 80 });
      return node;
    });

    const newEdges = relationships.map((rel, i) => {
      dagreGraph.setEdge(rel.source_entity_id, rel.target_entity_id);
      return {
        id: `e-${rel.source_entity_id}-${rel.target_entity_id}-${i}`,
        source: rel.source_entity_id,
        target: rel.target_entity_id,
        animated: true,
        style: { stroke: 'var(--border-secondary)', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--border-secondary)' },
      };
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = newNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.position = {
        x: nodeWithPosition.x - 70,
        y: nodeWithPosition.y - 40,
      };
      return node;
    });

    setFlowNodes(layoutedNodes);
    setFlowEdges(newEdges);
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">
      <header className="border-b border-[var(--border-primary)] pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <i className="fa-solid fa-bolt text-[var(--warning)]"></i> Deterministic Anomaly Detection
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Run rule-based checks for high connectivity hubs, isolated clusters, and unmapped locations.
          </p>
        </div>
        
        {lastScanned && (
          <div className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--surface-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)] shadow-sm">
            Total Anomalies: <span className="text-[var(--danger)]">{anomalies.length}</span> | Last Scan: {lastScanned}
          </div>
        )}
      </header>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)] mx-2">
          <i className="fa-solid fa-radar text-4xl mb-3 opacity-50"></i>
          <p>Please select an active Case File to scan for anomalies.</p>
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 border border-[var(--border-primary)] rounded-2xl bg-[var(--surface-primary)] mx-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
          <span className="text-xs text-[var(--text-secondary)]">Retrieving case elements...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-2">
          
          {/* Scanning Control Panel */}
          <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1">
                <h2 className="font-bold text-[var(--text-primary)] text-lg mb-2">Rule-Based Integrity Scanner</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <i className="fa-solid fa-circle-check text-[var(--success)]"></i> High Connectivity Hubs
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <i className="fa-solid fa-circle-check text-[var(--success)]"></i> Isolated Clusters
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <i className="fa-solid fa-circle-check text-[var(--success)]"></i> Unmapped Locations
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <i className="fa-solid fa-circle-check text-[var(--success)]"></i> Critical Threat Links
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 w-full md:w-auto">
                <button 
                  onClick={runDeterministicScan}
                  disabled={scanning}
                  className="w-full md:w-auto px-6 py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-3"
                >
                  {scanning ? (
                    <><i className="fa-solid fa-radar fa-spin"></i> Scanning {entities.length} Entities...</>
                  ) : (
                    <><i className="fa-solid fa-play"></i> Execute Anomaly Scan</>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {lastScanned && anomalies.length > 0 && (
            <div className="flex bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg p-1 w-fit mx-auto mb-2">
              <button
                onClick={() => setViewMode("LIST")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  viewMode === "LIST" 
                    ? "bg-[var(--accent-primary)] text-white shadow-sm" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <i className="fa-solid fa-list-ul mr-1.5"></i> List View
              </button>
              <button
                onClick={() => setViewMode("GRAPH")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  viewMode === "GRAPH" 
                    ? "bg-[var(--accent-primary)] text-white shadow-sm" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <i className="fa-solid fa-diagram-project mr-1.5"></i> Anomaly Graph
              </button>
            </div>
          )}

          {/* Results Area */}
          {!lastScanned && !scanning ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 border border-dashed border-[var(--border-primary)] rounded-2xl bg-[var(--surface-secondary)] text-center text-[var(--text-muted)]">
              <i className="fa-solid fa-shield-halved text-4xl opacity-50 mb-2"></i>
              <p className="text-sm font-bold">System Ready</p>
              <span className="text-xs max-w-md mt-1">
                Execute the scan above to run deterministic rule checks against the {entities.length} entities and {relationships.length} relationships currently registered in the database.
              </span>
            </div>
          ) : anomalies.length === 0 && !scanning ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 border border-dashed border-[var(--success)]/30 rounded-2xl bg-[var(--success)]/5 text-center">
              <i className="fa-solid fa-shield-check text-4xl text-[var(--success)] opacity-80 mb-2"></i>
              <p className="text-sm font-bold text-[var(--success)]">No Anomalies Detected</p>
              <span className="text-xs text-[var(--success)]/80 max-w-md mt-1">
                The active case does not currently contain any structural patterns that trigger the deterministic anomaly rules.
              </span>
            </div>
          ) : viewMode === "LIST" ? (
            <div className="grid grid-cols-1 gap-4">
              {anomalies.map((anom, idx) => (
                <div key={idx} className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-5 rounded-2xl shadow-sm hover:border-[var(--border-secondary)] hover:bg-[var(--surface-hover)] transition-all flex flex-col sm:flex-row gap-5 items-start">
                  
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        anom.severity === "HIGH" ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20 shadow-[0_0_8px_var(--danger)]/20" : 
                        anom.severity === "MEDIUM" ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" : 
                        "bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]"
                      }`}>
                        {anom.severity} SEVERITY
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                        <i className="fa-solid fa-tag mr-1"></i> {anom.category}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] ml-auto sm:ml-0">
                        {new Date(anom.timestamp).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        Subject: <span className="px-1 py-0.5 rounded bg-[var(--surface-tertiary)]">{anom.entity}</span>
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                        {anom.reason}
                      </p>
                    </div>
                    
                    {anom.evidence && anom.evidence.length > 0 && (
                      <div className="pt-2 flex gap-2 flex-wrap border-t border-[var(--border-primary)]">
                        {anom.evidence.map((ev: string, i: number) => (
                          <span key={i} className="text-[10px] font-mono bg-[var(--surface-secondary)] text-[var(--text-muted)] px-2 py-1 rounded border border-[var(--border-primary)] truncate max-w-[200px]" title={ev}>
                            <i className="fa-solid fa-paperclip mr-1"></i> {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                    <Link href="/graph" className="flex-1 sm:flex-none text-center px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                      View in Graph
                    </Link>
                  </div>
                  
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-[var(--border-primary)] bg-[var(--surface-primary)] rounded-2xl relative overflow-hidden shadow-sm h-[600px] w-full">
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
          )}
        </div>
      )}
    </div>
  );
}
