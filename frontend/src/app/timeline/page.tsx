"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCase } from "@/context/CaseContext";

export default function TimelinePage() {
  const { activeCaseId, activeCase } = useCase();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL"); // ALL, ENTITY, RELATIONSHIP, EVIDENCE

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
  const filteredEvents = events.filter((evt: any) => {
    const matchSearch = evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        evt.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        JSON.stringify(evt.properties || {}).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCategory = categoryFilter === "ALL" || evt.category === categoryFilter;

    return matchSearch && matchCategory;
  });

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Case Event Chronology</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Chronological record of suspect registrations, relationship links, calls, and evidence ingestion.
        </p>
      </div>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600">
          Please select an active Case File from the sidebar to view the operational timeline.
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-zinc-500">Compiling case chronology...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-zinc-900/10 p-4 border border-white/5 rounded-2xl">
            <input 
              type="text" 
              placeholder="Search event logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600 text-white w-72"
            />
            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-xs text-zinc-400 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Categories</option>
                <option value="ENTITY">Suspect Identified</option>
                <option value="RELATIONSHIP">Link Mapped</option>
                <option value="EVIDENCE">Evidence Ingested</option>
              </select>
            </div>
          </div>

          {/* Timeline Event list */}
          {filteredEvents.length === 0 ? (
            <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600">
              No timeline events match the search parameters.
            </div>
          ) : (
            <div className="relative pl-8 border-l border-white/5 space-y-8 ml-4 py-2">
              {filteredEvents.map((evt, idx) => {
                // Color mapping
                let badgeColor = "bg-blue-500 border-blue-400/20 text-blue-400";
                let emoji = "👥";
                if (evt.category === "RELATIONSHIP") {
                  badgeColor = "bg-indigo-500 border-indigo-400/20 text-indigo-400";
                  emoji = "🔗";
                } else if (evt.category === "EVIDENCE") {
                  badgeColor = "bg-emerald-500 border-emerald-400/20 text-emerald-400";
                  emoji = "📥";
                }

                return (
                  <div key={idx} className="relative group animate-fade-in">
                    {/* Circle Node Badge on border-l line */}
                    <div className={`absolute -left-[44px] top-1 h-8 w-8 rounded-full border flex items-center justify-center text-sm bg-zinc-950 shadow-md ${badgeColor.split(" ")[1]} z-10`}>
                      {emoji}
                    </div>

                    {/* Timeline card bubble */}
                    <div className="bg-zinc-900/10 border border-white/5 hover:border-white/10 p-5 rounded-2xl transition-all relative">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                          <h3 className="font-bold text-white tracking-wide text-sm flex items-center gap-2">
                            {evt.title}
                          </h3>
                          <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{new Date(evt.timestamp).toLocaleString()}</p>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeColor.split(" ").slice(1).join(" ")} bg-white/5`}>
                          {evt.category}
                        </span>
                      </div>

                      <p className="text-zinc-400 text-xs mt-3 leading-relaxed">{evt.message}</p>

                      {/* Properties detail drawer */}
                      {Object.keys(evt.properties || {}).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono text-zinc-500">
                          {Object.entries(evt.properties).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-zinc-600 font-bold uppercase mr-1">{k}:</span>
                              <span className="text-zinc-400">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
