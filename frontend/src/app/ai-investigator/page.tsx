"use client";
import React, { useState, useEffect, useRef } from "react";
import { useCase } from "@/context/CaseContext";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "ai";
  text: string;
  actions?: any[];
  evidence?: string[];
  timestamp: Date;
}

export default function AiInvestigatorPage() {
  const { activeCaseId, activeCase } = useCase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeCaseId) return;

    const userMsg: Message = { sender: "user", text: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/chat/?query=${encodeURIComponent(text)}&case_id=${activeCaseId}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          sender: "ai",
          text: data.answer,
          actions: data.actions || [],
          evidence: data.supporting_evidence || [],
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const aiMsg: Message = { sender: "ai", text: "I encountered a communication error querying the case intelligence files.", timestamp: new Date() };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error(err);
      const aiMsg: Message = { sender: "ai", text: "Failed to connect to the backend AI agent.", timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSuggest = (q: string) => handleSendMessage(q);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full gap-6 relative overflow-hidden pb-4">
      <div className="border-b border-[var(--border-primary)] pb-4 shrink-0 mx-4 mt-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">AI Investigator Terminal</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Grounded case queries. Intercepts intent, traces Network connections, and formats factual reports.
        </p>
      </div>

      {!activeCaseId ? (
        <div className="m-4 p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-secondary)] flex-grow">
          Please select an active Case File from the sidebar to initialize the AI Investigator.
        </div>
      ) : (
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden px-4">
          
          <div className="flex-1 border border-[var(--border-primary)] bg-[var(--surface-primary)] rounded-2xl flex flex-col min-h-0 backdrop-blur-md shadow-2xl overflow-hidden ai-chat-panel">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                  <span className="text-5xl mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">🤖</span>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)]">NEXUS Investigation Agent</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Ask me about connection paths between suspects, why specific nodes carry high risk index, or for summaries of case evidence files.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col max-w-[80%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                    <span className="text-[10px] text-[var(--text-tertiary)] mb-1.5 font-mono font-bold tracking-wider uppercase">
                      {msg.sender === "user" ? "INVESTIGATOR" : "NEXUS AI"} — {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>

                    <div className={`p-4 text-sm leading-relaxed shadow-lg ${
                      msg.sender === "user" 
                        ? "bg-gradient-to-br from-[var(--primary-accent)] to-blue-700 text-white rounded-2xl rounded-tr-sm" 
                        : "bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-2xl rounded-tl-sm"
                    }`}>
                      <div className="whitespace-pre-wrap markdown-container">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>

                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-primary)] text-[10px] font-mono text-[var(--text-secondary)] space-y-1.5">
                          <p className="font-bold uppercase text-[var(--text-tertiary)] mb-2 tracking-wider">Grounded facts retrieved:</p>
                          {msg.evidence.map((ev, i) => (
                            <div key={i} className="flex gap-2 items-start bg-[var(--surface-primary)] p-2 rounded border border-[var(--border-primary)]">
                              <span className="text-[var(--primary-accent)]">📎</span>
                              <span className="leading-tight">{ev}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.actions.map((act, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (act.type === "TRACE_PATH") {
                                localStorage.setItem("activeCaseId", activeCaseId);
                                window.location.href = `/investigate?src=${act.source}&tgt=${act.target}`;
                              } else {
                                window.location.href = "/investigate";
                              }
                            }}
                            className="px-3 py-1.5 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all btn-neutral"
                          >
                            Execute: {act.type.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--surface-secondary)]/50">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex gap-3">
                <input 
                  type="text" placeholder="Ask NEXUS AI (e.g. 'how is John Doe connected to Alice Smith?')"
                  value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={sending} required
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-[var(--text-primary)] transition-colors shadow-inner chat-input-field"
                />
                <button type="submit" disabled={sending || !inputValue.trim()} className="px-6 py-3 bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-[var(--primary-accent)]/20">
                  {sending ? "Analyzing..." : "Query"}
                </button>
              </form>
            </div>
          </div>

          <aside className="w-80 bg-[var(--surface-primary)] border border-[var(--border-primary)] p-5 rounded-2xl flex flex-col gap-5 backdrop-blur-md shrink-0 shadow-2xl ai-prompts-panel">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">💡 Suggested Prompts</h3>
              <p className="text-[10px] text-[var(--text-secondary)] leading-tight mt-1">Quick grounded case actions.</p>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {[
                "Identify the shortest known relationship path between two entities in the active case.",
                "Which entities currently present the highest cumulative investigative risk?",
                "Highlight entities with unusually high relationship density.",
                "Identify missing evidence required to strengthen the current investigation.",
                "Summarize the strongest connections surrounding the highest-risk entity.",
                "Are there any isolated entities with a disproportionately high risk score?",
                "Identify potential financial or communication patterns across the active case.",
                "Which relationships require further verification based on available evidence?"
              ].map((query, i) => (
                <button 
                  key={i} onClick={() => handleSuggest(query)}
                  className="w-full text-left p-3.5 rounded-xl border border-[var(--border-primary)] hover:border-[var(--primary-accent)]/50 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-semibold leading-relaxed cursor-pointer prompt-card"
                >
                  &ldquo;{query}&rdquo;
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
