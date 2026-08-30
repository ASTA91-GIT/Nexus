"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useCase } from "@/context/CaseContext";
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Marker, Popup, MapRef } from 'react-map-gl/maplibre';

const ESRI_MAP_STYLE = {
  version: 8 as const,
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    }
  },
  layers: [
    {
      id: 'simple-tiles',
      type: 'raster',
      source: 'raster-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export default function LocationsPage() {
  const { activeCaseId, activeCase } = useCase();
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const mapRef = React.useRef<MapRef>(null);

  useEffect(() => {
    if (selectedLocation && selectedLocation.hasCoords && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 14,
        duration: 1500
      });
    }
  }, [selectedLocation]);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchLocationsData = useCallback(async () => {
    if (!activeCaseId) {
      setEntities([]);
      setRelationships([]);
      setEvidenceList([]);
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
      if (entRes.ok) ents = await entRes.json();

      // Fetch Relationships
      const relRes = await fetch(getApiUrl(`/api/relationships/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      let rels: any[] = [];
      if (relRes.ok) rels = await relRes.json();
      
      // Fetch Evidence
      const evRes = await fetch(getApiUrl(`/api/evidence/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      let evs: any[] = [];
      if (evRes.ok) evs = await evRes.json();

      setEntities(ents);
      setRelationships(rels);
      setEvidenceList(evs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchLocationsData();
  }, [fetchLocationsData]);

  // Try to geocode locations that lack coordinates using OpenStreetMap Nominatim
  const [geocodedLocations, setGeocodedLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  
  useEffect(() => {
    const geocodeLocations = async () => {
      const locsToGeocode = entities.filter(ent => ent.type === "LOCATION" && (!ent.properties?.lat && !ent.properties?.latitude));
      if (locsToGeocode.length === 0) return;
      
      const newGeocoded: Record<string, { lat: number; lng: number }> = {};
      
      for (const loc of locsToGeocode) {
        if (geocodedLocations[loc._id]) continue; // Already geocoded or tried
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.name)}&format=json&limit=1`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              newGeocoded[loc._id] = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
          }
          // Sleep to respect Nominatim API rate limit (1 req/sec)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch(e) {
          console.error(`Failed to geocode ${loc.name}`, e);
        }
      }
      
      if (Object.keys(newGeocoded).length > 0) {
        setGeocodedLocations(prev => ({ ...prev, ...newGeocoded }));
      }
    };
    
    geocodeLocations();
  }, [entities]);

  // Compute final locations
  const locations = useMemo(() => {
    return entities.filter((ent: any) => {
      const props = ent.properties || {};
      const hasPropsCoords = props.latitude !== undefined || props.lat !== undefined;
      const hasGeoCoords = !!geocodedLocations[ent._id];
      return ent.type === "LOCATION" || hasPropsCoords || hasGeoCoords;
    }).map((ent: any) => {
      const props = ent.properties || {};
      let lat = null;
      let lng = null;
      let hasCoords = false;
      
      if (props.latitude !== undefined || props.lat !== undefined) {
        lat = parseFloat(props.latitude || props.lat);
        lng = parseFloat(props.longitude || props.lng);
        hasCoords = true;
      } else if (geocodedLocations[ent._id]) {
        lat = geocodedLocations[ent._id].lat;
        lng = geocodedLocations[ent._id].lng;
        hasCoords = true;
      }
      
      const associated = relationships
        .filter((rel: any) => rel.source_entity_id === ent._id || rel.target_entity_id === ent._id)
        .map((rel: any) => {
          const otherId = rel.source_entity_id === ent._id ? rel.target_entity_id : rel.source_entity_id;
          return {
            entity: entities.find(e => e._id === otherId),
            type: rel.type
          };
        })
        .filter(item => item.entity);
        
      const relatedEvidence = relationships
        .filter((rel: any) => (rel.source_entity_id === ent._id || rel.target_entity_id === ent._id) && rel.evidence_ids && rel.evidence_ids.length > 0)
        .flatMap((rel: any) => rel.evidence_ids)
        .map(evId => evidenceList.find(ev => ev._id === evId))
        .filter(Boolean);

      return {
        ...ent,
        lat,
        lng,
        hasCoords,
        associatedEntities: associated,
        relatedEvidence: [...new Set(relatedEvidence)]
      };
    });
  }, [entities, relationships, evidenceList, geocodedLocations]);

  const mapCenter = useMemo(() => {
    if (selectedLocation && selectedLocation.hasCoords) {
      return { longitude: selectedLocation.lng, latitude: selectedLocation.lat, zoom: 14 };
    }
    const validLocs = locations.filter(l => l.hasCoords);
    if (validLocs.length > 0) {
      return { longitude: validLocs[0].lng, latitude: validLocs[0].lat, zoom: 3 };
    }
    return { longitude: 0, latitude: 0, zoom: 2 }; // Default to equator if nothing is found
  }, [locations, selectedLocation]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full gap-4 relative overflow-hidden pb-4">
      {/* Header */}
      <div className="border-b border-[var(--border-primary)] pb-4 shrink-0 px-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Geographic Intelligence Mapping</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Coordinate tracking of flagged operational activity clusters and suspect movement channels.
        </p>
      </div>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)] m-2 flex-grow flex items-center justify-center">
          <div>
            <i className="fa-solid fa-map-location-dot text-4xl mb-3 opacity-50"></i>
            <p>Please select an active Case File from the sidebar to load geographic intelligence.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 flex-grow bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl m-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
          <span className="text-xs text-[var(--text-secondary)]">Processing case coordinates data...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden px-2">
          
          {/* Left panel: Locations list directory */}
          <aside className="w-full md:w-80 border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5 rounded-2xl flex flex-col gap-4 shadow-sm shrink-0 overflow-y-auto">
            <div className="border-b border-[var(--border-primary)] pb-3">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <i className="fa-solid fa-map-location-dot text-[var(--accent-primary)]"></i> Flagged Coordinates
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1 uppercase tracking-wider">Case Locations Directory</p>
            </div>

            {locations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] text-xs italic bg-[var(--surface-secondary)] rounded-xl border border-dashed border-[var(--border-primary)]">
                <i className="fa-solid fa-globe text-3xl mb-2 opacity-50"></i>
                No locations or coordinate properties detected in this case.
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                {locations.map((loc) => (
                  <div
                    key={loc._id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 shadow-sm ${
                      selectedLocation?._id === loc._id
                        ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40 ring-1 ring-[var(--accent-primary)]/20"
                        : "bg-[var(--surface-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate" title={loc.name}>{loc.name}</p>
                      {loc.risk_score > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${loc.risk_score > 7 ? 'bg-[var(--danger)]/20 text-[var(--danger)]' : 'bg-[var(--warning)]/20 text-[var(--warning)]'}`}>
                          Risk: {loc.risk_score}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      {loc.hasCoords ? (
                        <span className="text-[var(--text-secondary)]">
                          <i className="fa-solid fa-location-crosshairs mr-1"></i>
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-[var(--warning)]">
                          <i className="fa-solid fa-triangle-exclamation mr-1"></i> Coordinates unavailable
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Center Map Grid Visualization */}
          <main className="flex-1 border border-[var(--border-primary)] bg-[var(--surface-primary)] rounded-2xl relative overflow-hidden flex flex-col shadow-sm">
            {locations.filter(l => l.hasCoords).length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[var(--surface-secondary)]">
                <i className="fa-solid fa-map text-5xl mb-4 text-[var(--text-muted)]"></i>
                <p className="text-[var(--text-primary)] font-bold text-lg">No Location Records With Coordinates Available</p>
                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md leading-relaxed">
                  Ingest evidence files with location entities to automatically geocode and plot them, or ensure coordinate keys are present.
                </p>
                <div className="mt-6 p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-xl max-w-sm">
                  <p className="text-[12px] font-bold text-[var(--warning)] uppercase tracking-wider mb-1">
                    <i className="fa-solid fa-satellite-dish mr-1"></i> Real-time tracking status
                  </p>
                  <p className="text-[11px] text-[var(--warning)]">No live location tracking data is available for this case.</p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 z-0">
                <Map
                  ref={mapRef}
                  initialViewState={mapCenter}
                  mapStyle={ESRI_MAP_STYLE}
                  style={{ width: '100%', height: '100%' }}
                  attributionControl={false}
                >
                  {locations.filter(l => l.hasCoords).map((loc) => (
                    <Marker 
                      key={`marker-${loc._id}`} 
                      longitude={loc.lng}
                      latitude={loc.lat}
                      onClick={e => {
                        e.originalEvent.stopPropagation();
                        setSelectedLocation(loc);
                      }}
                      color="var(--accent-primary)"
                    />
                  ))}
                  
                  {selectedLocation && selectedLocation.hasCoords && (
                    <Popup
                      longitude={selectedLocation.lng}
                      latitude={selectedLocation.lat}
                      anchor="bottom"
                      onClose={() => setSelectedLocation(null)}
                      closeOnClick={false}
                      className="custom-popup"
                      offset={30}
                    >
                      <div className="flex flex-col gap-3 min-w-[200px] max-w-[300px] text-black">
                        <div className="border-b border-gray-200 pb-2">
                          <h3 className="font-bold text-gray-900 text-base">{selectedLocation.name}</h3>
                          <p className="text-xs text-gray-500 font-mono mt-1">{selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}</p>
                        </div>
                        
                        {selectedLocation.associatedEntities && selectedLocation.associatedEntities.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Connected Entities</p>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {selectedLocation.associatedEntities.map((ae: any, i: number) => (
                                <div key={i} className="text-xs text-gray-700 flex justify-between">
                                  <span>• {ae.entity.name}</span>
                                  <span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500">{ae.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedLocation.relatedEvidence && selectedLocation.relatedEvidence.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Related Evidence</p>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {selectedLocation.relatedEvidence.map((ev: any, i: number) => (
                                <div key={i} className="text-xs text-blue-600 truncate" title={ev.title}>
                                  <i className="fa-solid fa-file-shield mr-1"></i> {ev.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedLocation.risk_score > 0 && (
                          <div className="mt-1 pt-2 border-t border-gray-200">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${selectedLocation.risk_score > 7 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              Risk Index: {selectedLocation.risk_score}
                            </span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  )}
                </Map>

                {/* Tracking status overlay */}
                <div className="absolute bottom-4 right-4 z-[400] pointer-events-none">
                  <div className="px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg shadow-lg flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Static Coordinates Mode</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
