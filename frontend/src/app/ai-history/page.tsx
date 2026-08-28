"use client";
import React, { useState, useEffect } from "react";
import { useCase } from "@/context/CaseContext";

export default function AIHistoryPage() {
  const { activeCaseId } = useCase();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setLoading(true);
        const url = activeCaseId 
          ? getApiUrl(`/api/chat/history?case_id=${activeCaseId}`) 
          : getApiUrl(`/api/chat/history`);
          
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activeCaseId]);

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pb-12">
      <header className="border-b border-[var(--border-primary)] pb-5 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <span>🕰️</span> AI Interaction Logs
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Historical record of all NEXUS AI queries, responses, and grounded evidence citations.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-[var(--primary-accent)] border-[var(--border-primary)]"></div>
          <span className="text-xs text-[var(--text-secondary)]">Retrieving encrypted logs...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 border border-dashed border-[var(--border-primary)] rounded-2xl bg-[var(--surface-primary)]/50 text-center">
          <span className="text-4xl opacity-50">🤖</span>
          <p className="text-sm font-bold text-[var(--text-primary)]">No AI Interaction History</p>
          <span className="text-xs text-[var(--text-secondary)] max-w-md mt-1">
            You have not queried the AI Investigator for {activeCaseId ? "this case" : "any cases"} yet. Use the Global Chatbot to begin.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {history.map((interaction, idx) => (
            <div key={interaction._id || idx} className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
              
              <div className="bg-[var(--surface-secondary)]/50 px-6 py-4 flex justify-between items-center border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-tertiary)] flex items-center justify-center font-bold text-xs">
                    YOU
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{interaction.question}</p>
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] font-mono flex flex-col items-end">
                  <span>{new Date(interaction.timestamp).toLocaleDateString()}</span>
                  <span>{new Date(interaction.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="px-6 py-5 flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-accent)] shrink-0 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-[var(--primary-accent)]/20">
                  AI
                </div>
                <div className="flex-1 space-y-4">
                  <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {interaction.response}
                  </div>
                  
                  {interaction.actions && interaction.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-primary)]">
                      <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mt-1.5 mr-2">Executed Actions:</span>
                      {interaction.actions.map((act: any, i: number) => (
                        <div key={i} className="px-2 py-1 bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded text-[10px] font-mono text-[var(--text-secondary)] flex gap-2 items-center">
                          <span className="text-[var(--primary-accent)]">{act.type}</span>
                          {act.target && <span>{act.target}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
