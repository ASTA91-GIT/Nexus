"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCase } from "@/context/CaseContext";

export default function TimelinePage() {
  const { activeCaseId } = useCase();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

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
            <div className="flex gap-4 items-center w-full">
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

          </div>

          {/* Main Content Area */}
          <div className="flex-grow border border-[var(--border-primary)] bg-[var(--surface-primary)] rounded-2xl relative overflow-hidden shadow-sm">
            {filteredEvents.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center text-[var(--text-muted)] bg-[var(--surface-secondary)]">
                <i className="fa-regular fa-clock text-4xl mb-3 opacity-50"></i>
                <p>No chronological events could be extracted from the current case evidence.</p>
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
