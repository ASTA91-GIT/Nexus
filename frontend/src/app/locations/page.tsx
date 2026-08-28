"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCase } from "@/context/CaseContext";

export default function LocationsPage() {
  const { activeCaseId } = useCase();
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchLocationsData = useCallback(async () => {
    if (!activeCaseId) {
      setEntities([]);
      setRelationships([]);
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
      if (relRes.ok) {
        const rels = await relRes.json();
        setRelationships(rels);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchLocationsData();
  }, [fetchLocationsData]);

  // Extract locations from entities containing coordinates
  const locations = useMemo(() => {
    return entities.filter((ent: any) => {
      const props = ent.properties || {};
      const hasLat = props.latitude !== undefined || props.lat !== undefined;
      const hasLng = props.longitude !== undefined || props.lng !== undefined;
      return ent.type === "LOCATION" || (hasLat && hasLng);
    }).map((ent: any) => {
      const props = ent.properties || {};
      const lat = parseFloat(props.latitude || props.lat || 0.0);
      const lng = parseFloat(props.longitude || props.lng || 0.0);
      return {
        ...ent,
        lat: lat,
        lng: lng,
      };
    });
  }, [entities]);

  // Find connections between locations
  const locationTracks = useMemo(() => {
    if (locations.length === 0) return [];
    
    // Map relationships that link these locations
    const tracks: any[] = [];
    relationships.forEach((rel) => {
      const srcLoc = locations.find((l) => l._id === rel.source_entity_id);
      const tgtLoc = locations.find((l) => l._id === rel.target_entity_id);
      if (srcLoc && tgtLoc) {
        tracks.push({
          id: rel._id,
          type: rel.type,
          from: srcLoc,
          to: tgtLoc
        });
      }
    });
    return tracks;
  }, [relationships, locations]);

  // Calculate coordinates bounds for rendering coordinate grid
  const bounds = useMemo(() => {
    if (locations.length === 0) {
      return { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };
    }
    const lats = locations.map(l => l.lat);
    const lngs = locations.map(l => l.lng);
    const minLat = Math.min(...lats) - 1;
    const maxLat = Math.max(...lats) + 1;
    const minLng = Math.min(...lngs) - 1;
    const maxLng = Math.max(...lngs) + 1;
    return { minLat, maxLat, minLng, maxLng };
  }, [locations]);

  // Convert lat/lng to SVG pixel percentages
  const getCoordinates = useCallback((lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    const latSpan = maxLat - minLat || 1;
    const lngSpan = maxLng - minLng || 1;
    
    // In SVG, Y-axis goes from top to bottom
    const y = 100 - ((lat - minLat) / latSpan) * 100;
    const x = ((lng - minLng) / lngSpan) * 100;
    
    return { x: `${x}%`, y: `${y}%` };
  }, [bounds]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full gap-4 relative overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 pb-4 shrink-0">
        <h1 className="text-2xl font-extrabold tracking-tight">Geographic Intelligence Mapping</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Coordinate tracking of flagged operational activity clusters and suspect movement channels.
        </p>
      </div>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600 flex-grow">
          Please select an active Case File from the sidebar to load geographic intelligence.
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 flex-grow">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-zinc-500">Processing case coordinates data...</span>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          
          {/* Left panel: Locations list directory */}
          <aside className="w-80 border border-white/5 bg-zinc-900/10 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-sm shrink-0 overflow-y-auto">
            <div>
              <h2 className="text-sm font-bold text-zinc-300">📍 Flagged Coordinates</h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">CASE LOCATIONS DIRECTORY</p>
            </div>

            {locations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6 text-zinc-600 text-xs italic">
                No coordinate properties (latitude/longitude) detected on suspect entities in this case.
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                {locations.map((loc) => (
                  <div
                    key={loc._id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                      selectedLocation?._id === loc._id
                        ? "bg-blue-600/10 border-blue-500/20 text-white"
                        : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <p className="font-bold text-sm truncate">{loc.name}</p>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span>Lat: {loc.lat.toFixed(4)}</span>
                      <span>Lng: {loc.lng.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Center Map Grid Visualization */}
          <main className="flex-1 border border-white/5 bg-zinc-950/60 rounded-2xl relative overflow-hidden flex flex-col">
            {locations.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <span className="text-3xl mb-3">📍</span>
                <p className="text-zinc-500 text-sm">No Location Records Available</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm leading-relaxed">
                  Ingest evidence files with latitude (or lat) and longitude (or lng) keys to plot active coordinate points.
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 p-8 flex flex-col">
                {/* Visual grid backdrop */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                {/* SVG Coordinate Grid Map */}
                <div className="flex-1 w-full relative border border-white/5 rounded-xl bg-zinc-950/40 p-4">
                  <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    {/* Draw Connection Tracks */}
                    {locationTracks.map((tr) => {
                      const fromPos = getCoordinates(tr.from.lat, tr.from.lng);
                      const toPos = getCoordinates(tr.to.lat, tr.to.lng);
                      return (
                        <g key={tr.id}>
                          <line
                            x1={fromPos.x}
                            y1={fromPos.y}
                            x2={toPos.x}
                            y2={toPos.y}
                            stroke="rgba(59, 130, 246, 0.4)"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                          />
                          {/* Animated arrow head indicator */}
                          <circle
                            r="3"
                            fill="#3b82f6"
                            className="animate-pulse"
                          >
                            <animateMotion
                              path={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`}
                              dur="3s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Render coordinate dots */}
                  {locations.map((loc) => {
                    const pos = getCoordinates(loc.lat, loc.lng);
                    const isSelected = selectedLocation?._id === loc._id;
                    return (
                      <button
                        key={loc._id}
                        onClick={() => setSelectedLocation(loc)}
                        className="absolute h-4 w-4 transform -translate-x-1/2 -translate-y-1/2 group"
                        style={{ left: pos.x, top: pos.y }}
                      >
                        {/* Glowing Ring */}
                        <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                          isSelected ? "bg-red-500" : "bg-blue-500"
                        }`} />
                        {/* Center Dot */}
                        <span className={`absolute inset-0.5 rounded-full border border-white/20 shadow-lg ${
                          isSelected ? "bg-red-500" : "bg-blue-500"
                        }`} />
                        {/* Tooltip on hover */}
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-white/10 text-white text-[9px] font-bold rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                          {loc.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </main>

        </div>
      )}
    </div>
  );
}
