"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCase } from "@/context/CaseContext";

export default function AlertsPage() {
  const { activeCaseId } = useCase();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "REVIEWED" | "RESOLVED" | "ALL">("ACTIVE");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchAlertsAndEntities = useCallback(async () => {
    if (!activeCaseId) {
      setAlerts([]);
      setEntities([]);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      // Fetch Entities for profiling references
      const entRes = await fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (entRes.ok) {
        const entData = await entRes.ok ? await entRes.json() : [];
        setEntities(entData);
      }

      // Fetch Alerts
      const res = await fetch(getApiUrl(`/api/alerts/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchAlertsAndEntities();
  }, [fetchAlertsAndEntities]);

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/alerts/${alertId}/status?status=${newStatus}`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ text: `Alert marked as ${newStatus}.`, isError: false });
        // Refresh alert list
        fetchAlertsAndEntities();
      } else {
        setMessage({ text: "Failed to update alert status.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Connection error.", isError: true });
    }
  };

  const filteredAlerts = alerts.filter((alert: any) => {
    const status = alert.status || "ACTIVE";
    if (activeTab === "ALL") return true;
    return status === activeTab;
  });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Case Threat Alerts Center</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Triage anomalous activities, high-risk centrality flags, and direct security risks.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm flex justify-between items-center ${
          message.isError ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:opacity-80">Close</button>
        </div>
      )}

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600">
          Please select an active Case File from the sidebar to view generated threat alerts.
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-zinc-500">Retrieving case threat logs...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Tabs bar */}
          <div className="flex border-b border-white/5 text-xs font-bold uppercase tracking-wider font-mono">
            {(["ACTIVE", "REVIEWED", "RESOLVED", "ALL"] as const).map((tab) => {
              const count = tab === "ALL" ? alerts.length : alerts.filter((a) => (a.status || "ACTIVE") === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 border-b-2 font-extrabold transition-all relative ${
                    activeTab === tab 
                      ? "border-blue-500 text-blue-400" 
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Results list */}
          {filteredAlerts.length === 0 ? (
            <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600">
              No threat alerts found in this category.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert: any) => {
                const entityMatch = entities.find((e) => e._id === alert.entity_id);
                return (
                  <div 
                    key={alert._id} 
                    className="p-5 bg-zinc-900/10 border border-white/5 hover:border-white/10 rounded-2xl flex gap-5 items-start transition-all"
                  >
                    {/* Severity marker */}
                    <span className={`h-3 w-3 rounded-full mt-1.5 shrink-0 shadow-lg ${
                      alert.severity === "HIGH" 
                        ? "bg-red-500 shadow-red-500/30 animate-pulse" 
                        : "bg-yellow-500 shadow-yellow-500/30"
                    }`} />

                    <div className="flex-1">
                      {/* Top metadata line */}
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex gap-2.5 items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                            alert.severity === "HIGH" 
                              ? "bg-red-500/10 border-red-500/15 text-red-400" 
                              : "bg-yellow-500/10 border-yellow-500/15 text-yellow-400"
                          }`}>
                            {alert.type}
                          </span>
                          {entityMatch && (
                            <span className="text-[11px] font-bold text-zinc-300">
                              Target Suspect: <span className="text-white underline">{entityMatch.name}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Main Message */}
                      <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{alert.message}</p>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-white/5 justify-end">
                        {alert.status !== "REVIEWED" && alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert._id, "REVIEWED")}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 text-xs rounded-xl font-bold transition-all"
                          >
                            Mark Reviewed
                          </button>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert._id, "RESOLVED")}
                            className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/15 hover:border-transparent text-xs rounded-xl font-bold transition-all"
                          >
                            Mark Resolved
                          </button>
                        )}
                        {alert.status === "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert._id, "ACTIVE")}
                            className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/15 hover:border-transparent text-xs rounded-xl font-bold transition-all"
                          >
                            Re-Open Alert
                          </button>
                        )}
                      </div>
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
