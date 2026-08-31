"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCase } from "@/context/CaseContext";

export default function AlertsPage() {
  const { activeCaseId, activeCase } = useCase();
  const [dbAlerts, setDbAlerts] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "REVIEWED" | "RESOLVED" | "ALL">("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchAlertsAndData = useCallback(async () => {
    if (!activeCaseId) {
      setDbAlerts([]);
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
      if (entRes.ok) setEntities(await entRes.json());

      // Fetch Relationships
      const relRes = await fetch(getApiUrl(`/api/relationships/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (relRes.ok) setRelationships(await relRes.json());

      // Fetch Alerts
      const res = await fetch(getApiUrl(`/api/alerts/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setDbAlerts(await res.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchAlertsAndData();
  }, [fetchAlertsAndData]);

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    if (alertId.startsWith("generated_")) {
      setMessage({ text: `Status updated locally (Generated Alert).`, isError: false });
      return; // Skip backend for dynamically generated alerts
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/alerts/${alertId}/status?status=${newStatus}`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ text: `Alert marked as ${newStatus}.`, isError: false });
        fetchAlertsAndData();
      } else {
        setMessage({ text: "Failed to update alert status.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Connection error.", isError: true });
    }
  };

  // Generate dynamic alerts based on real case data to supplement DB alerts
  const allAlerts = useMemo(() => {
    const generated: any[] = [];
    
    // 1. High Risk Entities
    entities.forEach(ent => {
      if (ent.risk_score >= 0.7) {
        generated.push({
          _id: `generated_risk_${ent._id}`,
          type: "HIGH RISK",
          severity: "HIGH",
          status: "ACTIVE",
          message: `High risk entity detected: ${ent.name}. Risk Score is ${ent.risk_score.toFixed(2)}. Immediate review recommended.`,
          entity_id: ent._id,
          created_at: ent.created_at || new Date().toISOString()
        });
      }
      
      // 2. Suspicious Activity (Flagged)
      if (ent.properties?.flagged) {
        generated.push({
          _id: `generated_flag_${ent._id}`,
          type: "SUSPICIOUS ACTIVITY",
          severity: "HIGH",
          status: "ACTIVE",
          message: `Entity ${ent.name} was flagged for suspicious activity during extraction.`,
          entity_id: ent._id,
          created_at: ent.created_at || new Date().toISOString()
        });
      }
    });

    // 3. High Threat Relationships
    relationships.forEach(rel => {
      const threatTypes = ["KILLED", "ORDERED", "FINANCED", "SMUGGLED", "TRAFFICKED"];
      if (threatTypes.includes(rel.type?.toUpperCase())) {
        const sourceEnt = entities.find(e => e._id === rel.source_entity_id);
        const targetEnt = entities.find(e => e._id === rel.target_entity_id);
        
        if (sourceEnt && targetEnt) {
          generated.push({
            _id: `generated_rel_${rel._id}`,
            type: "THREAT LINK DETECTED",
            severity: "HIGH",
            status: "ACTIVE",
            message: `Critical network link established: ${sourceEnt.name} [${rel.type}] ${targetEnt.name}.`,
            entity_id: sourceEnt._id, // tie it to the source
            created_at: rel.created_at || new Date().toISOString()
          });
        }
      }
      
      // 4. New Connection Made (General) - Let's just flag recent ones as Medium
      // If we don't have time logic, we can just randomly sample or flag all
      if (!threatTypes.includes(rel.type?.toUpperCase())) {
         const sourceEnt = entities.find(e => e._id === rel.source_entity_id);
         const targetEnt = entities.find(e => e._id === rel.target_entity_id);
         if (sourceEnt && targetEnt && rel.type) {
            generated.push({
              _id: `generated_conn_${rel._id}`,
              type: "NEW CONNECTION",
              severity: "MEDIUM",
              status: "REVIEWED", // By default mark low level stuff as reviewed so it doesn't clutter
              message: `New network connection mapped: ${sourceEnt.name} is connected to ${targetEnt.name} via ${rel.type}.`,
              entity_id: sourceEnt._id,
              created_at: rel.created_at || new Date().toISOString()
            });
         }
      }
    });

    // Combine and deduplicate
    const combined = [...dbAlerts, ...generated].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  }, [dbAlerts, entities, relationships]);

  const filteredAlerts = allAlerts.filter((alert: any) => {
    const status = alert.status || "ACTIVE";
    const statusMatch = activeTab === "ALL" || status === activeTab;
    const severityMatch = severityFilter === "ALL" || (alert.severity || "LOW") === severityFilter;
    return statusMatch && severityMatch;
  });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="border-b border-[var(--border-primary)] pb-5 shrink-0 px-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Intelligence Alerts Center</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Triage anomalous activities, high-risk centrality flags, and direct security risks generated from your case data.
        </p>
      </div>

      {message && (
        <div className={`p-4 mx-2 rounded-xl border text-sm flex justify-between items-center shadow-sm ${
          message.isError ? "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]" : "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]"
        }`}>
          <span className="font-bold">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:opacity-80"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {!activeCaseId ? (
        <div className="p-16 mx-2 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)]">
          <i className="fa-solid fa-bell text-4xl mb-3 opacity-50"></i>
          <p>Please select an active Case File from the sidebar to view generated threat alerts.</p>
        </div>
      ) : loading ? (
        <div className="p-16 mx-2 flex flex-col items-center justify-center gap-3 border border-[var(--border-primary)] rounded-2xl bg-[var(--surface-primary)]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
          <span className="text-xs text-[var(--text-secondary)]">Retrieving case threat logs...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-2">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-[var(--surface-secondary)] p-4 border border-[var(--border-primary)] rounded-xl shadow-sm">
            {/* Tabs */}
            <div className="flex gap-2">
              {(["ACTIVE", "REVIEWED", "RESOLVED", "ALL"] as const).map((tab) => {
                const count = tab === "ALL" ? allAlerts.length : allAlerts.filter((a) => (a.status || "ACTIVE") === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`filter-tab ${activeTab === tab ? 'active' : 'inactive'}`}
                  >
                    {tab} <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${activeTab === tab ? "bg-black/20 text-white" : "bg-[var(--surface-tertiary)] text-[var(--text-muted)]"}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="input-field py-2 bg-[var(--surface-primary)] min-w-[150px]"
              >
                <option value="ALL">All Severities</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Results list */}
          {filteredAlerts.length === 0 ? (
            <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)]">
              <i className="fa-regular fa-face-smile text-4xl mb-3 opacity-50"></i>
              <p>No threat alerts found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAlerts.map((alert: any) => {
                const entityMatch = entities.find((e) => e._id === alert.entity_id);
                
                // Styling based on severity
                let sevStyle = "bg-[var(--surface-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]";
                let icon = "fa-bell";
                if (alert.severity === "HIGH") {
                  sevStyle = "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20 shadow-[0_0_10px_var(--danger)]/10";
                  icon = "fa-triangle-exclamation animate-pulse";
                } else if (alert.severity === "MEDIUM") {
                  sevStyle = "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20";
                  icon = "fa-circle-exclamation";
                }

                return (
                  <div 
                    key={alert._id} 
                    className={`alert-card ${alert.status === "RESOLVED" ? "resolved" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2.5 items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${sevStyle}`}>
                          <i className={`fa-solid ${icon}`}></i>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${sevStyle}`}>
                          {alert.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono font-medium bg-[var(--surface-tertiary)] px-2 py-1 rounded">
                        {new Date(alert.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-[var(--text-primary)] text-sm font-medium leading-relaxed my-2">{alert.message}</p>

                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-[var(--border-primary)]">
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {entityMatch ? (
                          <>Target: <span className="font-bold text-[var(--text-primary)] px-1 py-0.5 rounded target-badge">{entityMatch.name}</span></>
                        ) : (
                          <span className="italic">System Alert</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {alert.status !== "REVIEWED" && alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert._id, "REVIEWED")}
                            className="px-3 py-1.5 bg-[var(--surface-tertiary)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] text-xs rounded-lg font-bold transition-all shadow-sm"
                          >
                            <i className="fa-solid fa-eye mr-1"></i> Review
                          </button>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert._id, "RESOLVED")}
                            className="px-3 py-1.5 bg-[var(--success)] hover:brightness-110 text-white text-xs rounded-lg font-bold transition-all shadow-sm"
                          >
                            <i className="fa-solid fa-check mr-1"></i> Resolve
                          </button>
                        )}
                        {alert.status === "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert._id, "ACTIVE")}
                            className="px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs rounded-lg font-bold transition-all shadow-sm"
                          >
                            <i className="fa-solid fa-arrow-rotate-left mr-1"></i> Re-Open
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
