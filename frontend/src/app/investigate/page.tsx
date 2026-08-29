"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useCase } from "@/context/CaseContext";

import GraphEditorControls from "@/components/GraphEditorControls";
import { EntityModal, RelationshipModal, ConfirmDeleteModal } from "@/components/GraphModals";

const NetworkScene = dynamic(() => import("../../three/NetworkScene"), { ssr: false });

export default function InvestigatePage() {
  const { activeCaseId, activeCase } = useCase();
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  // Graph Editor State
  const [isEditMode, setIsEditMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [draggedPositions, setDraggedPositions] = useState<Record<string, { x: number, y: number, z: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Undo / Redo
  const [undoStack, setUndoStack] = useState<Record<string, any>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, any>[]>([]);

  // Modals
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSavingModal, setIsSavingModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    person: true,
    organization: true,
    location: true,
    phone: true,
    highRisk: false
  });
  const [minRisk, setMinRisk] = useState(0.0);

  // Selection
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<any | null>(null);
  const [selectedEntityRels, setSelectedEntityRels] = useState<any[]>([]);

  // Bottom Tabs
  const [activeTab, setActiveTab] = useState<"EXPLORER" | "WKW" | "STORY">("EXPLORER");

  // Connection Explorer
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [tracingPath, setTracingPath] = useState(false);
  const [pathResult, setPathResult] = useState<any>(null);

  // Who Killed Who
  const [wkwVictimId, setWkwVictimId] = useState("");
  const [wkwPredicting, setWkwPredicting] = useState(false);
  const [wkwResult, setWkwResult] = useState("");

  // Case Story
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyNarrative, setStoryNarrative] = useState("");

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
      const entRes = await fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } });
      let ents: any[] = [];
      if (entRes.ok) ents = await entRes.json();
      setEntities(ents);

      const relRes = await fetch(getApiUrl(`/api/relationships/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } });
      let rels: any[] = [];
      if (relRes.ok) rels = await relRes.json();
      setRelationships(rels);

      const graphRes = await fetch(getApiUrl(`/api/network/${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } });
      if (graphRes.ok) {
        const gData = await graphRes.json();
        setGraphData(gData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => { fetchWorkspaceData(); }, [fetchWorkspaceData]);

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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT")) {
        return; // do not interfere with typing
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, redoStack, draggedPositions]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, draggedPositions]);
    setDraggedPositions(previousState);
    setUndoStack(prev => prev.slice(0, -1));
    setUnsavedChanges(true);
  }, [undoStack, draggedPositions]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, draggedPositions]);
    setDraggedPositions(nextState);
    setRedoStack(prev => prev.slice(0, -1));
    setUnsavedChanges(true);
  }, [redoStack, draggedPositions]);

  const handleNodeDragEnd = useCallback((id: string, x: number, y: number, z: number) => {
    setUndoStack(prev => [...prev, draggedPositions]);
    setRedoStack([]);
    setDraggedPositions(prev => ({ ...prev, [id]: { x, y, z } }));
    setUnsavedChanges(true);
  }, [draggedPositions]);

  const handleSaveEntity = async (data: any) => {
    setIsSavingModal(true);
    const token = localStorage.getItem("token");
    try {
      const isEdit = isEntityModalOpen && selectedEntity;
      const url = getApiUrl(isEdit ? `/api/entities/${selectedEntity._id}?case_id=${activeCaseId}` : "/api/entities/");
      const method = isEdit ? "PUT" : "POST";
      const payload = { ...data, case_id: activeCaseId };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsEntityModalOpen(false);
        fetchWorkspaceData();
      } else {
        alert("Failed to save entity.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving entity.");
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleSaveRelationship = async (data: any) => {
    setIsSavingModal(true);
    const token = localStorage.getItem("token");
    try {
      const url = getApiUrl(selectedRelationship ? `/api/relationships/${selectedRelationship._id}` : "/api/relationships/");
      const method = selectedRelationship ? "PUT" : "POST";
      const payload = { ...data, case_id: activeCaseId };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsRelModalOpen(false);
        fetchWorkspaceData();
      } else {
        alert("Failed to save relationship.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving relationship.");
    } finally {
      setIsSavingModal(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedEntity && !selectedRelationship) return;
    setIsSavingModal(true);
    const token = localStorage.getItem("token");
    try {
      if (selectedEntity) {
        const res = await fetch(getApiUrl(`/api/entities/${selectedEntity._id}?case_id=${activeCaseId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setIsDeleteModalOpen(false);
          setSelectedEntity(null);
          fetchWorkspaceData();
        } else {
          alert("Failed to delete entity.");
        }
      } else if (selectedRelationship) {
        const res = await fetch(getApiUrl(`/api/relationships/${selectedRelationship._id}?case_id=${activeCaseId}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setIsDeleteModalOpen(false);
          setSelectedRelationship(null);
          fetchWorkspaceData();
        } else {
          alert("Failed to delete relationship.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting.");
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleSaveLayout = async () => {
    if (!activeCaseId) return;
    setIsSaving(true);
    const token = localStorage.getItem("token");
    
    const positions = Object.entries(draggedPositions).map(([entity_id, pos]) => ({
      entity_id,
      position: pos
    }));

    try {
      const res = await fetch(getApiUrl(`/api/entities/bulk/positions`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ case_id: activeCaseId, positions })
      });
      if (res.ok) {
        setUnsavedChanges(false);
        setDraggedPositions({});
        fetchWorkspaceData();
      } else {
        alert("Failed to save layout.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving layout.");
    } finally {
      setIsSaving(false);
    }
  };

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

  const callAI = async (query: string, setter: any, loadingSetter: any) => {
    const token = localStorage.getItem("token");
    if (!token || !activeCaseId) return;
    loadingSetter(true);
    setter("");
    try {
      const res = await fetch(getApiUrl(`/api/chat/?query=${encodeURIComponent(query)}&case_id=${activeCaseId}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setter(data.answer || "No insights generated.");
      }
    } catch(err) {
      setter("Failed to reach AI Engine.");
    } finally {
      loadingSetter(false);
    }
  };

  const handlePredictSuspects = () => {
    const victim = entities.find(e => e._id === wkwVictimId);
    if (!victim) return;
    callAI(`Who killed ${victim.name}?`, setWkwResult, setWkwPredicting);
  };

  const handleGenerateStory = () => {
    callAI("Generate a chronological narrative of this case based on the relationships and events.", setStoryNarrative, setGeneratingStory);
  };

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
    const filteredLinks = rawLinks.filter((link: any) => nodeIds.has(link.source) && nodeIds.has(link.target));

    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, filters, minRisk, searchTerm, entities]);

  const timelineEvents = useMemo(() => {
    return relationships
      .filter((r) => r.properties && (r.properties.timestamp || r.properties.date))
      .map((r) => {
        const src = entities.find((e) => e._id === r.source_entity_id);
        const tgt = entities.find((e) => e._id === r.target_entity_id);
        return {
          id: r._id,
          date: new Date(r.properties.timestamp || r.properties.date),
          type: r.type,
          sourceName: src ? src.name : "Unknown",
          targetName: tgt ? tgt.name : "Unknown",
          properties: r.properties
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [relationships, entities]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full gap-4 relative overflow-hidden bg-[var(--background)]">
      
      {/* Upper Area */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden px-4 pt-4">
        
        {/* LEFT PANEL */}
        <aside className="w-80 bg-[var(--surface-primary)]/90 border border-[var(--border-primary)] p-5 rounded-2xl flex flex-col gap-5 backdrop-blur-md shrink-0 overflow-y-auto shadow-xl">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">WORKSPACE FILTERS</h2>
            <p className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase mt-1">
              {activeCase ? activeCase.name : "No Case Selected"}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <input 
              type="text" 
              placeholder="Search Entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-xs focus:outline-none focus:border-[var(--primary-accent)] text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Classification</label>
            <div className="space-y-2 bg-[var(--surface-secondary)]/50 p-3 border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-secondary)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.person} onChange={() => setFilters({ ...filters, person: !filters.person })} className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-[var(--primary-accent)] focus:ring-0" />
                <span><i className="fa-solid fa-user"></i> Persons</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.organization} onChange={() => setFilters({ ...filters, organization: !filters.organization })} className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-[var(--success)] focus:ring-0" />
                <span><i className="fa-solid fa-building"></i> Organizations</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.location} onChange={() => setFilters({ ...filters, location: !filters.location })} className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-[var(--warning)] focus:ring-0" />
                <span><i className="fa-solid fa-location-dot"></i> Locations</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.phone} onChange={() => setFilters({ ...filters, phone: !filters.phone })} className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-[var(--info)] focus:ring-0" />
                <span><i className="fa-solid fa-phone"></i> Communications</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
              <span>Min Risk Score</span>
              <span className="font-mono text-[var(--text-secondary)]">{minRisk.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0.0" max="1.0" step="0.05" value={minRisk} onChange={(e) => setMinRisk(parseFloat(e.target.value))}
              className="w-full cursor-pointer bg-[var(--surface-secondary)] rounded-lg appearance-none h-1"
            />
            <label className="flex items-center gap-2 cursor-pointer text-xs mt-2">
              <input type="checkbox" checked={filters.highRisk} onChange={() => setFilters({ ...filters, highRisk: !filters.highRisk })} className="rounded bg-[var(--surface-primary)] border-[var(--border-primary)] text-[var(--danger)] focus:ring-0" />
              <span className="text-[var(--danger)] font-semibold"><i className="fa-solid fa-triangle-exclamation"></i> Threat-Flagged Only</span>
            </label>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 block">Suspect Directory ({entities.length})</label>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs scrollbar-thin">
              {entities.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((e) => (
                <div 
                  key={e._id} onClick={() => setSelectedEntity(e)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                    selectedEntity?._id === e._id ? "bg-[var(--primary-accent)]/10 border-[var(--primary-accent)]/30 text-[var(--text-primary)] font-bold" : "bg-[var(--surface-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--primary-accent)]/50"
                  }`}
                >
                  <span className="truncate max-w-[160px]">{e.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${e.risk_score > 0.7 ? "bg-[var(--danger)]/15 text-[var(--danger)]" : e.risk_score > 0.4 ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}`}>
                    {(e.risk_score||0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER AREA */}
        <main className="flex-1 bg-black/60 border border-[var(--border-primary)] rounded-2xl relative overflow-hidden flex flex-col shadow-2xl">
          {activeCaseId && !loading && (
            <>
             <GraphEditorControls 
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
                unsavedChanges={unsavedChanges}
                onSaveLayout={handleSaveLayout}
                onAddEntity={() => { setSelectedEntity(null); setIsEntityModalOpen(true); }}
                onAddRelationship={() => { setSelectedRelationship(null); setIsRelModalOpen(true); }}
                onEditSelected={() => setIsEntityModalOpen(true)}
                onDeleteSelected={() => setIsDeleteModalOpen(true)}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                selectedEntity={selectedEntity}
                selectedRelationship={selectedRelationship}
                isSaving={isSaving}
             />
             
             <EntityModal 
                isOpen={isEntityModalOpen} 
                onClose={() => setIsEntityModalOpen(false)} 
                onSave={handleSaveEntity} 
                entity={selectedEntity} 
                isLoading={isSavingModal} 
             />
             
             <RelationshipModal 
                isOpen={isRelModalOpen} 
                onClose={() => setIsRelModalOpen(false)} 
                onSave={handleSaveRelationship} 
                entities={entities}
                relationship={selectedRelationship}
                isLoading={isSavingModal} 
             />
             
             <ConfirmDeleteModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={confirmDelete} 
                title={selectedEntity ? "Delete Entity" : "Delete Relationship"} 
                message={selectedEntity ? `Deleting "${selectedEntity?.name}" will also remove ${selectedEntityRels.length} directly connected relationships.` : `Deleting relationship type "${selectedRelationship?.type}"?`} 
                isLoading={isSavingModal} 
             />
            </>
          )}
          {!activeCaseId ? (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest">
              Please select a case
            </div>
          ) : loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary-accent)]"></div>
            </div>
          ) : (
            <NetworkScene 
              data={filteredGraphData} 
              onNodeClick={(n: any) => {
                const ent = entities.find(e => e._id === n.id);
                if (ent) setSelectedEntity(ent);
                setSelectedRelationship(null);
              }}
              onEdgeClick={(edge: any) => {
                const rel = relationships.find(r => String(r._id) === edge.id || String(r.id) === edge.id || String(r.rel_id) === edge.id);
                if (rel) setSelectedRelationship(rel);
                setSelectedEntity(null);
              }}
              highlightedPath={pathResult ? pathResult.path : []} 
              isEditMode={isEditMode}
              onNodeDragEnd={handleNodeDragEnd}
              draggedPositions={draggedPositions}
            />
          )}

          {activeCaseId && (
            <div className="absolute top-4 right-4 p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)]/80 backdrop-blur text-[10px] font-mono text-[var(--text-secondary)] space-y-1">
              <div className="flex justify-between gap-4"><span>Nodes:</span> <span className="font-bold text-[var(--text-primary)]">{filteredGraphData.nodes.length}</span></div>
              <div className="flex justify-between gap-4"><span>Edges:</span> <span className="font-bold text-[var(--text-primary)]">{filteredGraphData.links.length}</span></div>
            </div>
          )}
        </main>

        {/* RIGHT PANEL */}
        <aside className="w-80 bg-[var(--surface-primary)]/90 border border-[var(--border-primary)] p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-md shrink-0 overflow-y-auto shadow-xl">
          {selectedEntity ? (
            <>
              <div className="border-b border-[var(--border-primary)] pb-4 space-y-2">
                <span className="px-2 py-0.5 text-[8px] font-extrabold bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-full tracking-wider uppercase">
                  {selectedEntity.type}
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{selectedEntity.name}</h3>
                <div className="bg-[var(--surface-secondary)]/50 p-3 rounded-lg border border-[var(--border-primary)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase">Risk index</span>
                  <span className={`text-sm font-extrabold font-mono ${selectedEntity.risk_score > 0.7 ? "text-[var(--danger)] animate-pulse" : selectedEntity.risk_score > 0.4 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                    {selectedEntity.risk_score.toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Node Details</h4>
                <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1 scrollbar-thin">
                  {Object.entries(selectedEntity.properties || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-[11px] p-2 rounded bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)]">
                      <span className="text-[var(--text-secondary)] font-mono">{k}</span>
                      <span className="text-[var(--text-primary)] font-bold truncate max-w-[120px]">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
                <h4 className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 block">Direct Links ({selectedEntityRels.length})</h4>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {selectedEntityRels.map((rel, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] text-[11px] space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-[var(--text-primary)] truncate max-w-[110px]">{rel.targetName}</span>
                        <span className="text-[var(--primary-accent)] font-bold">{rel.type}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                        <span>Direction:</span>
                        <span>{rel.direction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6 text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">
              Select a node
            </div>
          )}
        </aside>
      </div>

      {/* LOWER PANEL WITH TABS */}
      <footer className="h-72 bg-[var(--surface-primary)]/90 border-t border-[var(--border-primary)] p-4 backdrop-blur-md flex flex-col shrink-0 z-10 shadow-2xl mx-4 mb-4 rounded-2xl">
        
        {/* TABS HEADER */}
        <div className="flex gap-4 border-b border-[var(--border-primary)] mb-4">
          <button onClick={() => setActiveTab("EXPLORER")} className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === "EXPLORER" ? "border-[var(--primary-accent)] text-[var(--primary-accent)]" : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}>
            <i className="fa-solid fa-link"></i> Connection Explorer
          </button>
          <button onClick={() => setActiveTab("WKW")} className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === "WKW" ? "border-[var(--danger)] text-[var(--danger)]" : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}>
            <i className="fa-solid fa-skull"></i> Who Killed Who
          </button>
          <button onClick={() => setActiveTab("STORY")} className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === "STORY" ? "border-[var(--info)] text-[var(--info)]" : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}>
            <i className="fa-solid fa-book-open"></i> Case Story
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 flex min-h-0">
          
          {/* CONNECTION EXPLORER */}
          {activeTab === "EXPLORER" && (
            <div className="flex w-full gap-6">
              <div className="w-1/3 flex flex-col border-r border-[var(--border-primary)] pr-6 overflow-hidden">
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[var(--text-secondary)] font-bold uppercase">Source Node</label>
                    <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-accent)]">
                      <option value="">-- Select --</option>
                      {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-[var(--text-secondary)] font-bold uppercase">Target Node</label>
                    <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-accent)]">
                      <option value="">-- Select --</option>
                      {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleTracePath} disabled={tracingPath || !sourceId || !targetId} className="w-full mt-4 p-2.5 bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] disabled:opacity-50 rounded-lg text-white text-xs font-bold transition-all shadow-md">
                  {tracingPath ? "Tracing Link Path..." : "Trace Connections"}
                </button>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden min-h-0 pl-2">
                <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Connection Chain</h3>
                <div className="flex-1 overflow-y-auto pr-1 text-xs scrollbar-thin">
                  {!pathResult ? (
                    <div className="h-full flex items-center justify-center text-[var(--text-tertiary)] italic">Configure Source & Target and run trace.</div>
                  ) : pathResult.path.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--danger)] italic">No connection path found.</div>
                  ) : (
                    <div className="flex flex-col gap-2 font-mono py-1">
                      {pathResult.entities.map((node: any, idx: number) => {
                        const isLast = idx === pathResult.entities.length - 1;
                        const rel = pathResult.relationships[idx];
                        return (
                          <React.Fragment key={idx}>
                            <div className="flex items-center gap-3 bg-[var(--surface-secondary)] p-2 rounded-lg border border-[var(--border-primary)]">
                              <span className="h-2 w-2 rounded-full bg-[var(--primary-accent)] shadow-[0_0_8px_var(--primary-accent)]" />
                              <span className="font-bold text-[var(--text-primary)]">{node.name}</span>
                              <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--background)] px-1.5 py-0.5 rounded">({node.type})</span>
                            </div>
                            {!isLast && rel && (
                              <div className="pl-5 py-1 flex items-center gap-2 text-[10px] text-[var(--primary-accent)]">
                                <span className="h-8 border-l-2 border-dashed border-[var(--primary-accent)]/50" />
                                <span className="px-2 py-1 bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/20 rounded-md font-bold">{rel.type}</span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WHO KILLED WHO */}
          {activeTab === "WKW" && (
            <div className="flex w-full gap-6">
              <div className="w-1/3 flex flex-col border-r border-[var(--border-primary)] pr-6 overflow-hidden">
                <p className="text-[10px] text-[var(--text-secondary)] mb-3 leading-relaxed">
                  Select a victim and let the NEXUS AI engine predict top suspects based on graph connections, threat anomalies, and evidence timeline.
                </p>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[var(--text-secondary)] font-bold uppercase">Victim / Target</label>
                  <select value={wkwVictimId} onChange={(e) => setWkwVictimId(e.target.value)} className="p-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--danger)]">
                    <option value="">-- Select Person --</option>
                    {entities.filter(e => e.type === "PERSON").map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                </div>
                <button onClick={handlePredictSuspects} disabled={wkwPredicting || !wkwVictimId} className="w-full mt-4 p-2.5 bg-gradient-to-r from-[var(--danger)] to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 rounded-lg text-white text-xs font-bold transition-all shadow-md shadow-red-500/20">
                  {wkwPredicting ? "Running Threat Heuristics..." : "Predict Suspects"}
                </button>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 pl-2">
                <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">AI Suspect Prediction</h3>
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                  {wkwPredicting ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--danger)]">
                      <div className="animate-spin h-6 w-6 border-2 border-t-[var(--danger)] border-[var(--danger)]/20 rounded-full"></div>
                      <span className="text-xs font-mono font-bold animate-pulse">ANALYZING GRAPH TOPOLOGY...</span>
                    </div>
                  ) : wkwResult ? (
                    <div className="bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] p-4 rounded-xl text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-mono">
                      {wkwResult}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-tertiary)] italic text-xs">
                      Awaiting target selection.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CASE STORY */}
          {activeTab === "STORY" && (
            <div className="flex w-full gap-6">
              <div className="w-1/2 flex flex-col border-r border-[var(--border-primary)] pr-6 overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Chronological Events</h3>
                  <span className="text-[10px] bg-[var(--surface-secondary)] px-2 py-0.5 rounded text-[var(--text-secondary)] font-mono">{timelineEvents.length} Events</span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                  {timelineEvents.map((evt, idx) => (
                    <div key={idx} className="p-2.5 bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] rounded-xl text-[11px] font-mono flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-[var(--info)] font-bold">{evt.date.toLocaleDateString()}</span>
                        <span className="text-[var(--text-secondary)]">{evt.type}</span>
                      </div>
                      <p className="text-[var(--text-primary)] truncate">
                        {evt.sourceName} &rarr; {evt.targetName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 pl-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">AI Narrative Generation</h3>
                  <button onClick={handleGenerateStory} disabled={generatingStory} className="px-3 py-1 bg-[var(--info)] hover:bg-blue-600 disabled:opacity-50 text-white rounded text-[10px] font-bold shadow-md transition-colors">
                    {generatingStory ? "Generating..." : "Generate Story"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                  {generatingStory ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--info)]">
                      <div className="animate-spin h-6 w-6 border-2 border-t-[var(--info)] border-[var(--info)]/20 rounded-full"></div>
                      <span className="text-xs font-mono font-bold animate-pulse">SYNTHESIZING EVENTS...</span>
                    </div>
                  ) : storyNarrative ? (
                    <div className="bg-[var(--surface-secondary)]/50 border border-[var(--border-primary)] p-4 rounded-xl text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {storyNarrative}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-tertiary)] italic text-xs">
                      Generate an AI-driven chronological narrative of this case.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </footer>
    </div>
  );
}
