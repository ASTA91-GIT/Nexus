"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCase } from "@/context/CaseContext";

import dynamic from "next/dynamic";

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink), { ssr: false });
import CaseReportPDF from '@/components/reports/CaseReportPDF';
import DownloadButton from '@/components/ui/DownloadButton';

export default function ReportsPage() {
  const { activeCaseId, activeCase } = useCase();
  const [reportData, setReportData] = useState<any>(null);
  const [entities, setEntities] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const generateReport = useCallback(async () => {
    if (!activeCaseId) return;
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const [res, entRes, relRes, evRes] = await Promise.all([
        fetch(getApiUrl(`/api/reports/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl(`/api/relationships/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl(`/api/evidence/?case_id=${activeCaseId}`), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        if (entRes.ok) setEntities(await entRes.json());
        if (relRes.ok) setRelationships(await relRes.json());
        if (evRes.ok) setEvidenceList(await evRes.json());
      } else {
        console.error("Failed to generate report");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);



  if (!activeCaseId) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="max-w-md w-full p-8 border border-[var(--border-primary)] rounded-2xl bg-[var(--surface-primary)] shadow-sm text-center">
          <div className="w-16 h-16 bg-[var(--surface-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-primary)]">
            <i className="fa-solid fa-folder-open text-2xl text-[var(--text-muted)]"></i>
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Active Case Selected</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Please select an active Case File from the sidebar to compile case reports and intelligence briefs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-20 print:bg-white print:text-black print:pb-0">
      
      {/* Page Header (Hidden on Print) */}
      <div className="flex justify-between items-center bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Intelligence Report Builder</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Generate comprehensive AI-driven forensic intelligence reports from existing case data.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm text-white transition-all shadow-sm flex items-center gap-2"
          >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
            {loading ? "Synthesizing..." : "Generate AI Report"}
          </button>
          {reportData && typeof window !== "undefined" && (
            <PDFDownloadLink
              document={<CaseReportPDF caseData={activeCase} entities={entities} relationships={relationships} evidence={evidenceList} />}
              fileName={`NEXUS_Report_${activeCase?.name.replace(/\s+/g, '_')}.pdf`}
              className="inline-block"
            >
              <DownloadButton as="div" />
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
          <span className="text-sm font-semibold text-[var(--text-secondary)]">Querying MongoDB and synthesizing intelligence...</span>
        </div>
      ) : !reportData ? (
        <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center flex flex-col items-center gap-4 bg-[var(--surface-secondary)]/50 print:hidden">
          <i className="fa-solid fa-file-invoice text-4xl text-[var(--text-muted)] mb-2"></i>
          <p className="text-[var(--text-secondary)] text-sm font-medium">No report generated yet for {activeCase?.name}.</p>
          <button
              onClick={generateReport}
              className="px-6 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white rounded-lg font-bold text-sm transition-all shadow-sm mt-2"
            >
              Generate Report Now
          </button>
        </div>
      ) : (
        /* Printable Report Container */
        <article className="flex flex-col gap-6 print:gap-4 w-full">
          
          {/* Header Block */}
          <div className="bg-[var(--surface-primary)] p-8 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20 print:border-b-4 print:border-b-black flex flex-col gap-6 relative">
            {/* Watermark for Print */}
            <div className="hidden print:flex absolute inset-0 pointer-events-none items-center justify-center overflow-hidden opacity-5">
              <span className="text-[150px] font-black rotate-[-30deg] tracking-widest text-black">CONFIDENTIAL</span>
            </div>
            
            <div className="flex justify-between items-start border-b border-[var(--border-primary)] print:border-black/40 pb-6 relative z-10">
              <div>
                <span className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest print:text-black">
                  Nexus Intelligence Agency
                </span>
                <h2 className="text-3xl font-black text-[var(--text-primary)] print:text-black mt-2 tracking-tight uppercase">
                  Classified Case Report
                </h2>
                <p className="text-lg font-medium text-[var(--text-secondary)] mt-1">{reportData.case_overview?.name}</p>
              </div>
              <div className="text-right text-xs text-[var(--text-secondary)] print:text-black font-mono space-y-1">
                <p><span className="font-bold text-[var(--text-muted)]">CASE ID:</span> {activeCase?._id}</p>
                <p><span className="font-bold text-[var(--text-muted)]">REPORT DATE:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-bold text-[var(--text-muted)]">STATUS:</span> <span className="uppercase text-[var(--success)]">{reportData.case_overview?.status}</span></p>
                <p><span className="font-bold text-[var(--text-muted)]">INVESTIGATOR:</span> {reportData.case_overview?.investigator}</p>
              </div>
            </div>

            {/* Section 1: Summary Cards */}
            <div className="grid grid-cols-4 gap-4 print:grid-cols-4">
              <div className="p-4 bg-[var(--surface-secondary)] print:bg-gray-50 border border-[var(--border-primary)] print:border-black/10 rounded-xl">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Entities</p>
                <p className="text-2xl font-black text-[var(--text-primary)] print:text-black">{reportData.metadata_summary?.total_entities}</p>
              </div>
              <div className="p-4 bg-[var(--surface-secondary)] print:bg-gray-50 border border-[var(--border-primary)] print:border-black/10 rounded-xl">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Relationships</p>
                <p className="text-2xl font-black text-[var(--text-primary)] print:text-black">{reportData.metadata_summary?.total_relationships}</p>
              </div>
              <div className="p-4 bg-[var(--surface-secondary)] print:bg-gray-50 border border-[var(--border-primary)] print:border-black/10 rounded-xl">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Evidence Files</p>
                <p className="text-2xl font-black text-[var(--text-primary)] print:text-black">{reportData.metadata_summary?.total_evidence}</p>
              </div>
              <div className="p-4 bg-[var(--surface-secondary)] print:bg-gray-50 border border-[var(--border-primary)] print:border-black/10 rounded-xl">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Overall Risk</p>
                <p className={`text-2xl font-black ${reportData.risk_assessment?.overall_risk === 'HIGH' ? 'text-[var(--danger)] print:text-red-700' : 'text-[var(--warning)] print:text-orange-600'}`}>
                  {reportData.risk_assessment?.overall_risk}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            
            {/* Left Column (Main Text Sections) */}
            <div className="md:col-span-2 space-y-6 flex flex-col">
              
              {/* Section 2: Executive Summary */}
              <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20 flex-1">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-file-lines text-[var(--accent-primary)]"></i> 2. Executive Summary
                </h3>
                <p className="text-sm text-[var(--text-primary)] print:text-black leading-relaxed whitespace-pre-wrap">
                  {reportData.executive_summary}
                </p>
              </section>

              {/* Section 3: Key Insights */}
              <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20 flex-1">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-lightbulb text-[var(--warning)]"></i> 3. Key Investigation Insights
                </h3>
                <div className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-xl">
                  <p className="text-sm text-[var(--text-primary)] print:text-black leading-relaxed whitespace-pre-wrap font-mono">
                    {reportData.ai_insights}
                  </p>
                </div>
              </section>
              
              {/* Section 11: Recommendations */}
              <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20 flex-1">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-clipboard-check text-[var(--success)]"></i> 11. Investigation Recommendations
                </h3>
                <div className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-xl">
                  <p className="text-sm text-[var(--text-primary)] print:text-black leading-relaxed whitespace-pre-wrap font-mono">
                    {reportData.recommendations}
                  </p>
                </div>
              </section>

            </div>

            {/* Right Column (Metrics & Details) */}
            <div className="space-y-6 flex flex-col">
              
              {/* Section 4: Entity Intelligence */}
              <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-users text-[var(--accent-primary)]"></i> 4. Entity Intelligence
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Total Persons</span>
                    <span className="font-bold text-[var(--text-primary)]">{reportData.entity_intelligence?.persons}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Organizations</span>
                    <span className="font-bold text-[var(--text-primary)]">{reportData.entity_intelligence?.organizations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Locations</span>
                    <span className="font-bold text-[var(--text-primary)]">{reportData.entity_intelligence?.locations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">High Risk Targets</span>
                    <span className="font-bold text-[var(--danger)]">{reportData.entity_intelligence?.high_risk_count}</span>
                  </div>
                </div>
              </section>

              {/* Section 5: Network Analysis */}
              <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-diagram-project text-[var(--accent-primary)]"></i> 5. Network Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Total Nodes</span>
                    <span className="font-bold text-[var(--text-primary)]">{reportData.network_analysis?.total_nodes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Total Edges</span>
                    <span className="font-bold text-[var(--text-primary)]">{reportData.network_analysis?.total_edges}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--border-primary)]">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase">Edge Distribution</p>
                    {reportData.network_analysis?.relationship_distribution && Object.entries(reportData.network_analysis.relationship_distribution).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)]">{key}</span>
                        <span className="font-mono text-[var(--text-primary)]">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              
              {/* Section 6: Anomaly & Risk Audit */}
              <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-radar text-[var(--danger)]"></i> 6. Anomaly & Risk Audit
                </h3>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Flagged Audit Items</p>
                  {reportData.risk_assessment?.critical_entities?.length > 0 ? (
                    reportData.risk_assessment.critical_entities.map((ent: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[var(--surface-secondary)] border border-[var(--danger)] rounded">
                        <span className="font-bold text-[var(--text-primary)] truncate max-w-[140px]">{ent.name}</span>
                        <span className="text-[var(--danger)] font-mono">{Number(ent.risk_score).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">No critical risk entities found.</p>
                  )}
                </div>
              </section>

            </div>
          </div>

          {/* Full Width Sections */}

          {/* Section 7: Timeline & Geo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 break-inside-avoid">
            {/* Timeline */}
            <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-clock text-[var(--accent-primary)]"></i> 7. Timeline Intelligence
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)] font-mono bg-[var(--surface-secondary)] p-2 rounded border border-[var(--border-primary)]">
                    <span>{reportData.timeline_summary?.earliest_event?.date ? String(reportData.timeline_summary.earliest_event.date).split('T')[0] : 'N/A'}</span>
                    <span>&rarr;</span>
                    <span>{reportData.timeline_summary?.latest_event?.date ? String(reportData.timeline_summary.latest_event.date).split('T')[0] : 'N/A'}</span>
                  </div>
                  <div className="space-y-2">
                    {reportData.timeline_summary?.events?.slice(0,5).map((evt: any, idx: number) => (
                      <div key={idx} className="flex gap-3 text-sm border-l-2 border-[var(--accent-primary)] pl-3 py-1">
                        <span className="font-mono text-xs text-[var(--text-muted)] shrink-0 w-24">
                          {evt.date ? String(evt.date).split('T')[0] : 'Unknown'}
                        </span>
                        <span className="text-[var(--text-primary)] font-medium truncate">{evt.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
            </section>
            
            {/* Geography */}
            <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-map-location-dot text-[var(--accent-primary)]"></i> 8. Geographic Intelligence
                </h3>
                {reportData.geographic_intelligence?.locations?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {reportData.geographic_intelligence.locations.slice(0, 8).map((loc: any, idx: number) => (
                      <div key={idx} className="text-xs p-2 bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded flex items-center gap-2">
                        <i className="fa-solid fa-location-dot text-[var(--text-muted)]"></i>
                        <span className="text-[var(--text-primary)] font-semibold truncate">{loc.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] italic">No geographic locations extracted.</p>
                )}
            </section>
          </div>

          {/* Section 9 & 10: Evidence & Relationships */}
          <section className="bg-[var(--surface-primary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm print:shadow-none print:border-black/20 break-inside-avoid">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Evidence Log */}
              <div>
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-file-shield text-[var(--accent-primary)]"></i> 9. Evidence Log
                </h3>
                {reportData.evidence_summary?.files?.length > 0 ? (
                  <ul className="space-y-2">
                    {reportData.evidence_summary.files.map((file: any, idx: number) => (
                      <li key={idx} className="flex justify-between items-center text-sm p-3 bg-[var(--surface-secondary)] rounded-lg border border-[var(--border-primary)]">
                        <span className="font-semibold text-[var(--text-primary)] truncate pr-4">{file.title}</span>
                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-tertiary)] px-2 py-1 rounded">{file.type}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] italic">No evidence files attached to this case.</p>
                )}
              </div>

              {/* Relationships */}
              <div>
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-primary)] pb-2">
                  <i className="fa-solid fa-link text-[var(--accent-primary)]"></i> 10. Core Relationships
                </h3>
                {reportData.relationship_analysis?.important_relationships?.length > 0 ? (
                  <ul className="space-y-2">
                    {reportData.relationship_analysis.important_relationships.slice(0, 5).map((rel: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-3 text-xs p-3 bg-[var(--surface-secondary)] rounded-lg border border-[var(--border-primary)]">
                        <span className="font-semibold text-[var(--text-primary)] flex-1 text-right truncate">{rel.source}</span>
                        <span className="px-2 py-1 bg-[var(--accent-primary)] text-white font-bold text-[8px] rounded uppercase shrink-0">{rel.type}</span>
                        <span className="font-semibold text-[var(--text-primary)] flex-1 truncate">{rel.target}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] italic">No definitive relationships extracted yet.</p>
                )}
              </div>

            </div>
          </section>

          {/* Footer Signatures */}
          <section className="pt-8 grid grid-cols-2 gap-8 text-xs text-[var(--text-secondary)] mt-8 break-inside-avoid print:mt-12 relative z-10">
            <div className="space-y-8">
              <p className="uppercase font-bold tracking-wider text-[10px] text-[var(--text-muted)]">Lead Investigator Authorization</p>
              <div className="border-b border-[var(--border-primary)] print:border-black w-64" />
              <p className="font-mono text-[10px] print:text-black">Date: ________________________</p>
            </div>
            <div className="space-y-8 text-right flex flex-col items-end">
              <p className="uppercase font-bold tracking-wider text-[10px] text-[var(--text-muted)]">NEXUS Security Seal</p>
              <div className="h-16 w-32 border-2 border-double border-[var(--border-primary)] print:border-red-700 print:text-red-700 rounded flex items-center justify-center font-bold text-xs font-mono uppercase text-[var(--text-muted)]">
                CONFIDENTIAL
              </div>
            </div>
          </section>

        </article>
      )}
    </div>
  );
}
