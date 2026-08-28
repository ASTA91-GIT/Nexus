"use client";
import React, { useState, useEffect } from "react";
import { useCase } from "@/context/CaseContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AnomaliesDashboard() {
  const { activeCaseId } = useCase();
  const router = useRouter();

  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    const fetchAnomalies = async () => {
      if (!activeCaseId) {
        setAnomalies([]);
        setLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch(getApiUrl(`/api/alerts/anomalies/${activeCaseId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAnomalies(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnomalies();
  }, [activeCaseId]);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">
      <header className="border-b border-[var(--border-primary)] pb-5 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <span>⚡</span> Anomaly Detection
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Triaging suspicious behavior, high-value transfers, and odd-hour communications.
          </p>
        </div>
        <div className="text-[10px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--surface-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
          Total Anomalies: <span className="text-[var(--primary-accent)]">{anomalies.length}</span>
        </div>
      </header>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-secondary)]">
          Please select an active Case File to scan for anomalies.
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-[var(--primary-accent)] border-[var(--border-primary)]"></div>
          <span className="text-xs text-[var(--text-secondary)]">Scanning network logic...</span>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 border border-dashed border-[var(--border-primary)] rounded-2xl bg-[var(--surface-primary)]/50 text-center">
          <span className="text-4xl opacity-50">🛡️</span>
          <p className="text-sm font-bold text-[var(--text-primary)]">No Anomalies Detected</p>
          <span className="text-xs text-[var(--text-secondary)] max-w-md mt-1">
            The active case does not currently contain any transaction, communication, or activity patterns that exceed safety thresholds.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {anomalies.map((anom, idx) => (
            <div key={idx} className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-5 rounded-2xl shadow-sm hover:border-[var(--primary-accent)]/50 transition-colors flex flex-col sm:flex-row gap-5 items-start">
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    anom.severity === "HIGH" ? "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20" : "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"
                  }`}>
                    {anom.severity} SEVERITY
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                    {anom.category}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                    {new Date(anom.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Suspicious Subject: <span className="text-[var(--primary-accent)]">{anom.entity}</span>
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    {anom.reason}
                  </p>
                </div>
                
                <div className="pt-2 flex gap-2 flex-wrap">
                  {anom.evidence && anom.evidence.map((ev: string, i: number) => (
                    <span key={i} className="text-[10px] font-mono bg-[var(--surface-secondary)]/50 text-[var(--text-tertiary)] px-2 py-1 rounded border border-[var(--border-primary)]/50">
                      📎 {ev}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                <Link href="/investigate" className="flex-1 sm:flex-none text-center px-4 py-2 bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-lg transition-colors">
                  Investigate
                </Link>
                <button className="flex-1 sm:flex-none px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-xs font-bold rounded-lg border border-[var(--border-primary)] transition-colors">
                  View Evidence
                </button>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
