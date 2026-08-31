"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useCase } from "@/context/CaseContext";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "ai";
  text: string;
  actions?: any[];
  evidence?: string[];
  timestamp: Date;
}

export default function GlobalChatbot() {
  const { activeCaseId, activeCase } = useCase();
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<"active" | "all">("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [caseEntities, setCaseEntities] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  // Scroll to bottom when messages update or panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }, [messages, isOpen]);

  // Sync scope selection with case context and load entities
  useEffect(() => {
    if (activeCaseId) {
      setScope("active");
      const token = localStorage.getItem("token");
      fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (Array.isArray(data)) setCaseEntities(data);
      }).catch(e => console.error(e));
    } else {
      setScope("all");
      setCaseEntities([]);
    }
  }, [activeCaseId]);

  // Derived suggested questions based on case entities
  const dynamicSuggestions = useMemo(() => {
    return [
      { text: "Identify the highest-risk entities in this case and explain the factors contributing to their risk scores.", icon: "🔍" },
      { text: "Trace the shortest known relationship path between two selected entities using the available case intelligence.", icon: "🔗" },
      { text: "Highlight missing evidence or intelligence gaps that should be prioritized for further investigation.", icon: "⚠️" }
    ];
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const currentScopeId = scope === "active" ? activeCaseId : "all";

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
      const res = await fetch(getApiUrl(`/api/chat/?query=${encodeURIComponent(text)}&case_id=${currentScopeId}`), {
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
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Button with Pulse Glow */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-floating-btn relative group"
        >
          <span className="chat-ping pointer-events-none group-hover:hidden" />
          🤖
        </button>
      )}

      {/* Chat Box Panel */}
      {isOpen && (
        <div className="w-96 h-[520px] rounded-2xl border border-white/10 bg-zinc-950/85 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          
          {/* Header Panel */}
          <header className="px-4 py-3.5 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="text-xs font-extrabold text-white tracking-wide uppercase">NEXUS AI Agent</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-bold">ONLINE</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm"
            >
              &times;
            </button>
          </header>

          {/* Scope Toggle / Controller */}
          <div className="px-4 py-2 border-b border-white/5 bg-zinc-900/20 flex gap-2 justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Search Scope:</span>
            <div className="flex bg-zinc-950/60 p-0.5 rounded-lg border border-white/5">
              <button
                disabled={!activeCaseId}
                onClick={() => setScope("active")}
                className={`px-2 py-1 rounded-md text-[9px] font-bold tracking-wide transition-all ${
                  scope === "active"
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/10"
                    : "text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
                }`}
                title={!activeCaseId ? "Select an active case in sidebar first" : `Query only: ${activeCase?.name || "Active Case"}`}
              >
                Active Case
              </button>
              <button
                onClick={() => setScope("all")}
                className={`px-2 py-1 rounded-md text-[9px] font-bold tracking-wide transition-all ${
                  scope === "all"
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/10"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Query entire crime dataset"
              >
                Global DB
              </button>
            </div>
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-[280px] mx-auto gap-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-lg">💡</div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-white tracking-wide uppercase">AI Investigation Agent</h4>
                  <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                    Ask me connection paths, suspect profile explanations, or high risk alerts.
                  </p>
                </div>
                
                {/* Suggestions Grid */}
                <div className="w-full space-y-1.5 mt-2">
                  {dynamicSuggestions.map((sug, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSuggest(sug.text)}
                      className="w-full text-left p-2 rounded-lg border border-white/5 hover:border-white/10 bg-zinc-900/40 text-[9px] text-zinc-400 hover:text-zinc-200 transition-all font-semibold cursor-pointer truncate"
                    >
                      {sug.icon} "{sug.text}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <span className="text-[8px] text-zinc-500 mb-1 font-mono">
                    {msg.sender === "user" ? "INVESTIGATOR" : "NEXUS AI"} — {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className={`p-3 rounded-xl text-[11px] border leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-blue-600/10 border-blue-500/20 text-white rounded-tr-none" 
                      : "bg-zinc-900 border-white/5 text-zinc-300 rounded-tl-none shadow-md overflow-hidden"
                  }`}>
                    {msg.sender === "ai" ? (
                      <div className="prose prose-invert prose-sm max-w-none text-[11px] prose-p:leading-relaxed prose-headings:text-white prose-a:text-blue-400 marker:text-zinc-500 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {msg.evidence && msg.evidence.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/5 text-[8px] font-mono text-zinc-500 space-y-0.5">
                        <p className="font-bold uppercase text-zinc-600">Grounded evidence:</p>
                        {msg.evidence.map((ev, i) => <div key={i} className="truncate">&bull; {ev}</div>)}
                      </div>
                    )}
                  </div>

                  {/* actions trigger buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (act.type === "TRACE_PATH") {
                              if (act.scope === "all") {
                                window.location.href = `/global-network`;
                              } else {
                                window.location.href = `/investigate?src=${act.source}&tgt=${act.target}`;
                              }
                            } else {
                              window.location.href = act.scope === "all" ? `/global-network` : `/investigate`;
                            }
                          }}
                          className="px-2 py-0.5 bg-blue-600/80 hover:bg-blue-500 text-white font-bold text-[8px] rounded transition-all cursor-pointer"
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

          {/* Typing state */}
          {sending && (
            <div className="px-4 py-2 text-[10px] text-zinc-500 flex items-center gap-2 bg-zinc-900/10 shrink-0">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="font-medium font-mono text-[9px] tracking-wider uppercase text-zinc-600">AI Investigator analyzing...</span>
            </div>
          )}

          {/* Input Panel */}
          <div className="p-3 border-t border-white/5 bg-zinc-950 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder={
                  scope === "active"
                    ? "Query active case file..."
                    : "Query global database across all cases..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs focus:outline-none focus:border-blue-500 placeholder-zinc-700 text-white"
                disabled={sending}
                required
              />
              <button
                type="submit"
                disabled={sending || !inputValue.trim()}
                className="px-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900 disabled:text-zinc-600 rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
