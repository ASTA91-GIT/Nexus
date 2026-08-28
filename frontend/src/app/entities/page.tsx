"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCase } from "@/context/CaseContext";

export default function EntitiesPage() {
  const { activeCaseId } = useCase();
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL"); // ALL, HIGH (>0.7), MEDIUM (0.4-0.7), LOW (<0.4)
  
  // Selected entity profile state
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileRelationships, setProfileRelationships] = useState<any[]>([]);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchEntities = useCallback(async () => {
    if (!activeCaseId) {
      setEntities([]);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEntities(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Load detailed profile relationships when selectedEntity changes
  useEffect(() => {
    const fetchProfileRelationships = async () => {
      if (!selectedEntity || !activeCaseId) {
        setProfileRelationships([]);
        return;
      }
      setLoadingProfile(true);
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(getApiUrl(`/api/relationships/?case_id=${activeCaseId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter relationships involving this entity
          const related = data.filter((rel: any) => 
            rel.source_entity_id === selectedEntity._id || 
            rel.target_entity_id === selectedEntity._id
          );
          // Map target names
          const mapped = related.map((rel: any) => {
            const isSource = rel.source_entity_id === selectedEntity._id;
            const targetId = isSource ? rel.target_entity_id : rel.source_entity_id;
            const targetEntity = entities.find((e) => e._id === targetId);
            return {
              ...rel,
              targetName: targetEntity ? targetEntity.name : `Entity ID: ${targetId.slice(0, 8)}...`,
              direction: isSource ? "Outgoing" : "Incoming"
            };
          });
          setProfileRelationships(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfileRelationships();
  }, [selectedEntity, activeCaseId, entities]);

  // Filters & Search
  const filteredEntities = entities.filter((ent: any) => {
    const matchSearch = ent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        JSON.stringify(ent.properties || {}).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = typeFilter === "ALL" || ent.type === typeFilter;
    
    let matchRisk = true;
    if (riskFilter === "HIGH") matchRisk = ent.risk_score > 0.7;
    else if (riskFilter === "MEDIUM") matchRisk = ent.risk_score >= 0.4 && ent.risk_score <= 0.7;
    else if (riskFilter === "LOW") matchRisk = ent.risk_score < 0.4;

    return matchSearch && matchType && matchRisk;
  });

  return (
    <div className="flex h-full w-full bg-zinc-950/20 text-white font-sans relative gap-6">
      
      {/* Directory Table Area */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/5 pb-5">
          <h1 className="text-2xl font-extrabold tracking-tight">Investigated Entity Directory</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Access, index, and triage network nodes across communication channels, locations, and suspect lists.
          </p>
        </div>

        {/* Filters control bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-zinc-900/10 p-4 border border-white/5 rounded-2xl">
          <input 
            type="text" 
            placeholder="Search entities by name or attributes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600 text-white w-80"
          />
          <div className="flex gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-xs text-zinc-400 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="PERSON">Persons</option>
              <option value="ORGANIZATION">Organizations</option>
              <option value="LOCATION">Locations</option>
              <option value="PHONE">Communication (Phones)</option>
              <option value="VEHICLE">Vehicles</option>
              <option value="ACCOUNT">Financial Accounts</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-xs text-zinc-400 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Risk Indices</option>
              <option value="HIGH">High Risk (&gt;0.7)</option>
              <option value="MEDIUM">Medium Risk (0.4-0.7)</option>
              <option value="LOW">Low Risk (&lt;0.4)</option>
            </select>
          </div>
        </div>

        {/* Directory Results */}
        {!activeCaseId ? (
          <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600">
            Please select an active Case File from the sidebar to list investigated entities.
          </div>
        ) : loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-xs text-zinc-500">Retrieving case entity directory...</span>
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600">
            No entities found matching search filters. Upload evidence files to populate case directory.
          </div>
        ) : (
          <div className="overflow-y-auto pr-1 flex-1">
            <div className="overflow-x-auto border border-white/5 rounded-2xl bg-zinc-900/10">
              <table className="w-full border-collapse text-left text-sm text-zinc-400">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 text-xs font-semibold uppercase tracking-wider bg-zinc-950/20">
                    <th className="py-4 px-6">Entity Profile Name</th>
                    <th className="py-4 px-6">Classification</th>
                    <th className="py-4 px-6 text-center">Threat Risk Index</th>
                    <th className="py-4 px-6">Attributes</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEntities.map((ent) => (
                    <tr 
                      key={ent._id} 
                      className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${
                        selectedEntity?._id === ent._id ? "bg-blue-600/5 hover:bg-blue-600/5" : ""
                      }`}
                      onClick={() => setSelectedEntity(ent)}
                    >
                      <td className="py-4 px-6 font-bold text-white text-base">{ent.name}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 text-xs rounded-full bg-zinc-900 border border-white/10 text-zinc-400 font-semibold">
                          {ent.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                          ent.risk_score > 0.7 
                            ? "bg-red-500/10 border-red-500/20 text-red-400 font-extrabold" 
                            : ent.risk_score > 0.4 
                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                          {(ent.risk_score || 0.0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs max-w-sm truncate text-zinc-500">
                        {JSON.stringify(ent.properties || {})}
                      </td>
                      <td className="py-4 px-6">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntity(ent);
                          }}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/15 hover:border-transparent text-xs rounded-lg transition-all font-bold active:scale-[0.97]"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Entity Profile Side Panel */}
      {selectedEntity && (
        <aside className="w-96 border border-white/5 bg-zinc-900/40 p-6 rounded-2xl flex flex-col gap-6 backdrop-blur-md overflow-y-auto max-h-full shrink-0 shadow-2xl relative animate-fade-in">
          {/* Close button */}
          <button 
            onClick={() => setSelectedEntity(null)}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bold text-xs"
          >
            ✕ Close
          </button>

          {/* Profile Header */}
          <div className="space-y-3 pb-5 border-b border-white/5">
            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-zinc-950 border border-white/10 text-zinc-400 rounded-full tracking-wider uppercase">
              {selectedEntity.type}
            </span>
            <h2 className="text-xl font-extrabold text-white">{selectedEntity.name}</h2>
            
            {/* Risk gauge */}
            <div className="flex items-center gap-3 bg-zinc-950/40 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-zinc-500 font-semibold uppercase">Risk Score</span>
              <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    selectedEntity.risk_score > 0.7 ? "bg-red-500" : selectedEntity.risk_score > 0.4 ? "bg-yellow-500" : "bg-blue-500"
                  }`} 
                  style={{ width: `${Math.min((selectedEntity.risk_score || 0.0) * 100, 100)}%` }} 
                />
              </div>
              <span className={`text-xs font-bold font-mono ${
                selectedEntity.risk_score > 0.7 ? "text-red-400" : selectedEntity.risk_score > 0.4 ? "text-yellow-400" : "text-blue-400"
              }`}>
                {(selectedEntity.risk_score || 0.0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Properties List */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entity Details</h3>
            {Object.keys(selectedEntity.properties || {}).length === 0 ? (
              <p className="text-zinc-600 text-xs italic">No attributes recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(selectedEntity.properties).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-start text-xs p-2 rounded-lg bg-zinc-950/20 border border-white/5">
                    <span className="text-zinc-500 font-mono">{key}</span>
                    <span className="text-zinc-300 font-bold max-w-[180px] text-right break-all">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links / Connections Section */}
          <div className="space-y-3 flex-1 flex flex-col overflow-hidden min-h-[200px]">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Direct Network Links ({profileRelationships.length})</h3>
            
            {loadingProfile ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                <span className="text-[10px] text-zinc-500 font-mono">Loading relationships...</span>
              </div>
            ) : profileRelationships.length === 0 ? (
              <p className="text-zinc-600 text-xs italic flex-1 flex items-center justify-center">No connections mapped.</p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {profileRelationships.map((rel, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-300 truncate max-w-[180px]">{rel.targetName}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-400 font-semibold">
                        {rel.type}
                      </span>
                    </div>
                    {Object.keys(rel.properties || {}).length > 0 && (
                      <div className="text-[10px] text-zinc-500 font-mono border-t border-white/5 pt-2">
                        {Object.entries(rel.properties).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span>{k}:</span>
                            <span className="text-zinc-400">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

    </div>
  );
}
