"use client";
import React, { useState, useEffect, useRef } from "react";
import { useCase } from "@/context/CaseContext";

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

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeCaseId) return;

    // Add user message
    const userMsg: Message = {
      sender: "user",
      text: text,
      timestamp: new Date()
    };
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
        const aiMsg: Message = {
          sender: "ai",
          text: "I encountered a communication error querying the case intelligence files.",
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error(err);
      const aiMsg: Message = {
        sender: "ai",
        text: "Failed to connect to the backend AI agent.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleSuggest = (q: string) => {
    handleSendMessage(q);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full gap-4 relative overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 pb-4 shrink-0">
        <h1 className="text-2xl font-extrabold tracking-tight">AI Investigator Terminal</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Grounded case queries. Intercepts intent, traces NetworkX connections, and formats factual reports.
        </p>
      </div>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600 flex-grow">
          Please select an active Case File from the sidebar to initialize the AI Investigator.
        </div>
      ) : (
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* Chat Window Area */}
          <div className="flex-1 border border-white/5 bg-zinc-900/10 rounded-2xl flex flex-col min-h-0 backdrop-blur-sm">
            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                  <span className="text-4xl mb-4">🤖</span>
                  <h3 className="text-base font-extrabold text-white">NEXUS Investigation Agent</h3>
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                    Ask me about connection paths between suspects, why specific nodes carry high risk index, or for summaries of case evidence files.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[75%] ${
                      msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    {/* Timestamp / Sender info */}
                    <span className="text-[9px] text-zinc-500 mb-1 font-mono">
                      {msg.sender === "user" ? "INVESTIGATOR" : "NEXUS AI"} — {msg.timestamp.toLocaleTimeString()}
                    </span>

                    {/* Chat Bubble */}
                    <div className={`p-4 rounded-2xl text-xs border leading-relaxed ${
                      msg.sender === "user" 
                        ? "bg-blue-600/10 border-blue-500/20 text-white rounded-tr-none" 
                        : "bg-zinc-950/60 border-white/5 text-zinc-300 rounded-tl-none shadow-md"
                    }`}>
                      <p>{msg.text}</p>

                      {/* Supporting Evidence tag */}
                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5 text-[9px] font-mono text-zinc-500 space-y-1">
                          <p className="font-bold uppercase text-zinc-600">Grounded facts retrieved:</p>
                          {msg.evidence.map((ev, i) => <div key={i} className="truncate">&bull; {ev}</div>)}
                        </div>
                      )}
                    </div>

                    {/* AI Actions display */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {msg.actions.map((act, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (act.type === "TRACE_PATH") {
                                localStorage.setItem("activeCaseId", activeCaseId);
                                window.location.href = `/investigate?src=${act.source}&tgt=${act.target}`;
                              } else if (act.type === "FILTER_RISK") {
                                window.location.href = "/investigate";
                              } else if (act.type === "FOCUS_NODE") {
                                window.location.href = "/investigate";
                              }
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] rounded-lg transition-all"
                          >
                            Execute action: {act.type.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-white/5 bg-zinc-950/20">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }} 
                className="flex gap-3"
              >
                <input 
                  type="text" 
                  placeholder="Ask NEXUS AI (e.g. 'how is John Doe connected to Alice Smith?')"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 text-xs focus:outline-none focus:border-blue-500 placeholder-zinc-700 text-white"
                  disabled={sending}
                  required
                />
                <button 
                  type="submit" 
                  disabled={sending || !inputValue.trim()}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  {sending ? "Analyzing..." : "Query AI"}
                </button>
              </form>
            </div>
          </div>

          {/* Right sidebar panel: Suggestion queries */}
          <aside className="w-80 border border-white/5 bg-zinc-900/10 p-5 rounded-2xl flex flex-col gap-4 backdrop-blur-sm shrink-0">
            <div>
              <h3 className="text-sm font-bold text-zinc-300">💡 Suggested Prompts</h3>
              <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">Quick grounded case actions.</p>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto">
              <button 
                onClick={() => handleSuggest("Who are the high risk entities?")}
                className="w-full text-left p-3.5 rounded-xl border border-white/5 hover:border-white/10 bg-zinc-950/40 text-xs text-zinc-400 hover:text-zinc-200 transition-all font-semibold leading-relaxed cursor-pointer"
              >
                &ldquo;Who are the high risk entities?&rdquo;
              </button>
              <button 
                onClick={() => handleSuggest("how is John Doe connected to Alice Smith?")}
                className="w-full text-left p-3.5 rounded-xl border border-white/5 hover:border-white/10 bg-zinc-950/40 text-xs text-zinc-400 hover:text-zinc-200 transition-all font-semibold leading-relaxed cursor-pointer"
              >
                &ldquo;How is John Doe connected to Alice Smith?&rdquo;
              </button>
              <button 
                onClick={() => handleSuggest("why is Alice Smith high risk?")}
                className="w-full text-left p-3.5 rounded-xl border border-white/5 hover:border-white/10 bg-zinc-950/40 text-xs text-zinc-400 hover:text-zinc-200 transition-all font-semibold leading-relaxed cursor-pointer"
              >
                &ldquo;Why is Alice Smith high risk?&rdquo;
              </button>
            </div>
          </aside>

        </div>
      )}
    </div>
  );
}
