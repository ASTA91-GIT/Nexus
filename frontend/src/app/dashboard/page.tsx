"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCase } from "@/context/CaseContext";

export default function Dashboard() {
  const { cases, activeCaseId, activeCase, refreshCases, setActiveCaseId } = useCase();
  
  // Stats and lists for active case
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  // Interactive form states
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [calculatingRisk, setCalculatingRisk] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const router = useRouter();

  // API base URL helper
  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  // Logged-in token
  const getToken = useCallback(() => {
    return localStorage.getItem("token");
  }, []);



  // Fetch active case stats, entities, and alerts
  const fetchCaseDetails = useCallback(async (caseId: string) => {
    if (!caseId) return;
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      // Fetch Entities
      const entitiesRes = await fetch(getApiUrl(`/api/entities/?case_id=${caseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (entitiesRes.ok) {
        const entitiesData = await entitiesRes.json();
        setEntities(entitiesData);
      }

      // Fetch Relationships
      const relsRes = await fetch(getApiUrl(`/api/relationships/?case_id=${caseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (relsRes.ok) {
        const relsData = await relsRes.json();
        setRelationships(relsData);
      }

      // Fetch Alerts
      const alertsRes = await fetch(getApiUrl(`/api/alerts/?case_id=${caseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (err) {
      console.error("Failed to load case details:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);



  useEffect(() => {
    if (activeCaseId) {
      fetchCaseDetails(activeCaseId);
    }
  }, [activeCaseId, fetchCaseDetails]);



  // Create new case
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !newCaseName.trim()) return;

    try {
      const res = await fetch(getApiUrl("/api/cases/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCaseName,
          description: newCaseDesc,
          status: "OPEN"
        })
      });

      if (res.ok) {
        const created = await res.json();
        setNewCaseName("");
        setNewCaseDesc("");
        setMessage({ text: `Case "${created.name}" created!`, isError: false });
        
        // Refresh case list and select the newly created case
        await refreshCases();
        setActiveCaseId(created._id);
      } else {
        setMessage({ text: "Failed to create case.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error creating case.", isError: true });
    }
  };

  // Handle file ingestion
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token || !uploadFile || !activeCaseId) return;

    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("case_id", activeCaseId);
    formData.append("file", uploadFile);

    try {
      const res = await fetch(getApiUrl("/api/ingestion/upload"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ text: `File "${uploadFile.name}" ingested successfully! Evidence registered.`, isError: false });
        setUploadFile(null);
        // Clear input file
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        // Reload details to capture new entities/evidence
        fetchCaseDetails(activeCaseId);
      } else {
        const errData = await res.json();
        setMessage({ text: errData.detail || "Ingestion failed.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error uploading file.", isError: true });
    } finally {
      setUploading(false);
    }
  };

  // Recalculate network risk
  const handleCalculateRisk = async () => {
    const token = getToken();
    if (!token || !activeCaseId) return;

    setCalculatingRisk(true);
    setMessage(null);

    try {
      const res = await fetch(getApiUrl(`/api/alerts/calculate-risk/${activeCaseId}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ text: `${result.message} Generated ${result.alerts_created} new alerts.`, isError: false });
        // Refresh detail tables
        fetchCaseDetails(activeCaseId);
      } else {
        setMessage({ text: "Risk computation failed.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error calculating network risk matrix.", isError: true });
    } finally {
      setCalculatingRisk(false);
    }
  };



  return (
    <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-950/40 backdrop-blur">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Investigation Overview</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {activeCase ? `Analyzing case: ${activeCase.name}` : "Create a case to begin investigating connections."}
            </p>
          </div>
          {activeCaseId && (
            <button 
              onClick={handleCalculateRisk}
              disabled={calculatingRisk}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] rounded-full font-bold text-sm transition-all"
            >
              {calculatingRisk ? "Running Analysis..." : "Run AI Risk Calculation"}
            </button>
          )}
        </header>

        {/* Inner Content scroll */}
        <div className="p-8 flex flex-col gap-8 max-w-7xl w-full mx-auto">
          
          {/* Notifications */}
          {message && (
            <div className={`p-4 rounded-xl border text-sm ${
              message.isError 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}>
              {message.text}
            </div>
          )}

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl backdrop-blur-sm hover:border-white/10 transition-colors">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">Total Cases</span>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                {cases.length}
              </p>
            </div>
            <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl backdrop-blur-sm hover:border-white/10 transition-colors">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">Entities Detected</span>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                {activeCaseId ? entities.length : 0}
              </p>
            </div>
            <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl backdrop-blur-sm hover:border-white/10 transition-colors">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">Link Connections</span>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                {activeCaseId ? relationships.length : 0}
              </p>
            </div>
            <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl backdrop-blur-sm hover:border-white/10 transition-colors">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">Threat Alerts</span>
              <p className={`text-3xl font-extrabold ${activeCaseId && alerts.length > 0 ? "text-red-400" : "text-zinc-400"}`}>
                {activeCaseId ? alerts.length : 0}
              </p>
            </div>
          </div>

          {/* Action Panels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Column Left: Input Actions */}
            <div className="flex flex-col gap-8">
              
              {/* Card 1: Ingest Evidence */}
              {activeCaseId && (
                <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
                    <span>📥</span> Ingest Case Evidence
                  </h2>
                  <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                    Upload forensic evidence files (CSV tables, JSON collections, raw TXT logs, or PDFs). The NLP engine will parse records and add nodes to the active case.
                  </p>

                  <form onSubmit={handleUploadFile} className="flex flex-col gap-4">
                    <input 
                      id="file-input"
                      type="file" 
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full text-zinc-400 text-sm bg-zinc-950/60 p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer"
                      required
                    />
                    <button 
                      type="submit"
                      disabled={uploading || !uploadFile}
                      className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all"
                    >
                      {uploading ? "Parsing Document..." : "Upload and Extract Entities"}
                    </button>
                  </form>
                </div>
              )}

              {/* Card 2: Create New Case */}
              <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
                  <span>📁</span> Create New Case File
                </h2>
                <form onSubmit={handleCreateCase} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Case Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Case #2026-AR-09"
                      value={newCaseName}
                      onChange={(e) => setNewCaseName(e.target.value)}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-700"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
                    <textarea 
                      placeholder="Summary of suspect, entity networks, or operational coordinates..."
                      value={newCaseDesc}
                      onChange={(e) => setNewCaseDesc(e.target.value)}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-700 min-h-[90px]"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 rounded-xl font-semibold text-sm transition-all"
                  >
                    Open Investigation File
                  </button>
                </form>
              </div>

            </div>

            {/* Column Right: Case Alerts Timeline */}
            <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl flex flex-col min-h-[400px]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
                <span>🚨</span> Case Threat Alerts ({alerts.length})
              </h2>
              
              {!activeCaseId ? (
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm italic">
                  No active case selected.
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <span className="text-3xl mb-3">🛡️</span>
                  <p className="text-zinc-500 text-sm">No security threats detected.</p>
                  <p className="text-xs text-zinc-600 mt-1">Run AI Risk Calculation to evaluate threat profiles.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[440px] pr-2 space-y-3">
                  {alerts.map((alert: any) => (
                    <div key={alert._id} className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 flex gap-3.5 items-start">
                      <span className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                        alert.severity === "HIGH" ? "bg-red-500 shadow-md shadow-red-500/50" : "bg-yellow-500"
                      }`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            alert.severity === "HIGH" ? "bg-red-500/10 text-red-400 border border-red-500/15" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/15"
                          }`}>
                            {alert.type}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {new Date(alert.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Bottom Panel: Detected Case Entities */}
          {activeCaseId && (
            <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-300">
                <span>👥</span> Investigated Entity Directory ({entities.length})
              </h2>

              {entities.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 border border-dashed border-white/5 rounded-xl">
                  No entities detected in this case file yet. Upload evidence data to extract profiles.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-zinc-400">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Entity Profile Name</th>
                        <th className="py-3 px-4">Classification</th>
                        <th className="py-3 px-4 text-center">Threat Risk index</th>
                        <th className="py-3 px-4">Ingestion Attributes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {entities.map((ent: any) => (
                        <tr key={ent._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white text-base">{ent.name}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 text-xs rounded-full bg-zinc-900 border border-white/10 text-zinc-400">
                              {ent.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
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
                          <td className="py-3.5 px-4 text-xs max-w-xs truncate text-zinc-500">
                            {JSON.stringify(ent.properties || {})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
    </div>
  );
}
