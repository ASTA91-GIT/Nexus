"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCase } from "@/context/CaseContext";

export default function ReportsPage() {
  const { activeCaseId, activeCase } = useCase();
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchReportData = useCallback(async () => {
    if (!activeCaseId) {
      setEntities([]);
      setRelationships([]);
      setAlerts([]);
      setEvidence([]);
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

      // Fetch Alerts
      const alertRes = await fetch(getApiUrl(`/api/alerts/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (alertRes.ok) {
        const alts = await alertRes.json();
        setAlerts(alts);
      }

      // Fetch Evidence
      const evRes = await fetch(getApiUrl(`/api/evidence/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (evRes.ok) {
        const evs = await evRes.json();
        setEvidence(evs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handlePrint = () => {
    window.print();
  };

  const highRiskEntities = useMemo(() => {
    return entities.filter(e => e.risk_score > 0.7);
  }, [entities]);

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full print:bg-white print:text-black">
      {/* Header controls (Hidden on print) */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Case Report Generator</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Compile fact sheets, suspect logs, relationship linkage tracks, and alert triages.
          </p>
        </div>
        {activeCaseId && (
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
          >
            🖨️ Export PDF / Print Report
          </button>
        )}
      </div>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600 print:hidden">
          Please select an active Case File from the sidebar to compile case reports.
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 print:hidden">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-zinc-500">Compiling report stats...</span>
        </div>
      ) : (
        /* Printable Page document sheet wrapper */
        <article className="bg-zinc-900/10 border border-white/5 p-8 sm:p-12 rounded-2xl space-y-10 print:border-0 print:p-0 print:bg-transparent">
          
          {/* Executive Logo header */}
          <div className="flex justify-between items-start border-b border-white/10 pb-6 print:border-black/10">
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider print:text-zinc-600">
                Nexus Forensics Engine — Case Log Report
              </span>
              <h2 className="text-2xl font-black text-white print:text-black mt-1 uppercase tracking-tight">
                {activeCase.name}
              </h2>
            </div>
            <div className="text-right text-[10px] text-zinc-500 font-mono">
              <p>REPORT_ID: {activeCase._id}</p>
              <p>COMPILED: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Case Metadata sheet */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-blue-400 print:text-blue-600 uppercase tracking-wider">I. Case Metadata Summary</h3>
            <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 print:bg-zinc-100 p-4 border border-white/5 print:border-black/10 rounded-xl text-xs">
              <div>
                <p className="text-zinc-500">Investigator Assigned</p>
                <p className="font-bold text-zinc-200 print:text-zinc-800 mt-0.5">{activeCase.investigator || activeCase.created_by}</p>
              </div>
              <div>
                <p className="text-zinc-500">Open Case Status</p>
                <p className="font-bold text-zinc-200 print:text-zinc-800 mt-0.5">{activeCase.status}</p>
              </div>
              <div>
                <p className="text-zinc-500">Date File Opened</p>
                <p className="font-bold text-zinc-200 print:text-zinc-800 mt-0.5">{new Date(activeCase.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-zinc-500">Priority Tier</p>
                <p className="font-bold text-zinc-200 print:text-zinc-800 mt-0.5">{activeCase.priority || "MEDIUM"}</p>
              </div>
            </div>
            <div className="text-xs text-zinc-400 print:text-zinc-600 leading-relaxed pl-1">
              <span className="font-semibold block mb-1">Operational Description:</span>
              {activeCase.description || "No case description file compiled."}
            </div>
          </section>

          {/* Suspect profile index statistics */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-blue-400 print:text-blue-600 uppercase tracking-wider">II. Investigated Suspect Directory</h3>
            <p className="text-xs text-zinc-500">
              Total of {entities.length} suspects mapped. Below is the subset of high-threat targets (Risk score &gt; 0.70).
            </p>
            {highRiskEntities.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">No high-risk suspects flagged.</p>
            ) : (
              <div className="overflow-x-auto border border-white/5 print:border-black/10 rounded-xl bg-zinc-950/20 print:bg-transparent">
                <table className="w-full text-left text-xs text-zinc-400 print:text-zinc-800">
                  <thead>
                    <tr className="border-b border-white/5 print:border-black/10 bg-zinc-950/40 print:bg-zinc-100 font-bold uppercase text-[10px] text-zinc-500 print:text-zinc-600">
                      <th className="py-3 px-4">Suspect Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Threat Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-black/10">
                    {highRiskEntities.map((ent) => (
                      <tr key={ent._id}>
                        <td className="py-3 px-4 font-bold text-white print:text-black">{ent.name}</td>
                        <td className="py-3 px-4">{ent.type}</td>
                        <td className="py-3 px-4 text-center font-bold text-red-400 print:text-red-600">{ent.risk_score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Relationship links track */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-blue-400 print:text-blue-600 uppercase tracking-wider">III. Network Linkages Registry</h3>
            <p className="text-xs text-zinc-500">
              Total of {relationships.length} network edges mapped in the forensic graph structure.
            </p>
            {relationships.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">No linkages mapped.</p>
            ) : (
              <div className="overflow-x-auto border border-white/5 print:border-black/10 rounded-xl bg-zinc-950/20 print:bg-transparent">
                <table className="w-full text-left text-xs text-zinc-400 print:text-zinc-800">
                  <thead>
                    <tr className="border-b border-white/5 print:border-black/10 bg-zinc-950/40 print:bg-zinc-100 font-bold uppercase text-[10px] text-zinc-500 print:text-zinc-600">
                      <th className="py-3 px-4">Source Entity</th>
                      <th className="py-3 px-4">Relationship</th>
                      <th className="py-3 px-4">Target Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-black/10">
                    {relationships.slice(0, 15).map((rel) => {
                      const src = entities.find(e => e._id === rel.source_entity_id);
                      const tgt = entities.find(e => e._id === rel.target_entity_id);
                      return (
                        <tr key={rel._id}>
                          <td className="py-3 px-4 font-bold text-zinc-200 print:text-zinc-800">{src ? src.name : "Unknown"}</td>
                          <td className="py-3 px-4 font-mono text-blue-400 print:text-blue-600 font-bold">{rel.type}</td>
                          <td className="py-3 px-4 font-bold text-zinc-200 print:text-zinc-800">{tgt ? tgt.name : "Unknown"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Evidence Registry metadata checklist */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-blue-400 print:text-blue-600 uppercase tracking-wider">IV. Forensic Evidence Ledger</h3>
            {evidence.length === 0 ? (
              <p className="text-zinc-600 text-xs italic">No evidence document files indexed.</p>
            ) : (
              <div className="space-y-2">
                {evidence.map((ev) => (
                  <div key={ev._id} className="p-3 bg-zinc-950/40 print:bg-zinc-50 border border-white/5 print:border-black/10 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-zinc-200 print:text-black">{ev.title}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Category: {ev.source_type} | Registrar: {ev.created_by}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">{new Date(ev.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Investigator Signatures block */}
          <section className="pt-8 border-t border-white/10 print:border-black/10 grid grid-cols-2 gap-8 text-xs text-zinc-500">
            <div className="space-y-12">
              <p className="uppercase font-bold tracking-wider text-[10px] text-zinc-600">Lead Investigator Signature</p>
              <div className="border-b border-white/10 print:border-black/15 w-48" />
              <p className="font-mono text-[10px]">Date: ________________________</p>
            </div>
            <div className="space-y-12 text-right flex flex-col items-end">
              <p className="uppercase font-bold tracking-wider text-[10px] text-zinc-600">NEXUS Platform Seal</p>
              <div className="h-16 w-16 border border-dashed border-white/10 print:border-black/15 rounded flex items-center justify-center font-bold text-[10px] font-mono uppercase text-zinc-600">
                SECURE
              </div>
            </div>
          </section>

        </article>
      )}
    </div>
  );
}
