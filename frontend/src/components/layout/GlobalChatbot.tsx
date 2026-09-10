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
  const [isMinimized, setIsMinimized] = useState(false);
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
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }, [messages, isOpen, isMinimized]);

  // Sync case context and load entities
  useEffect(() => {
    // Clear conversation history to prevent contamination when case switches
    setMessages([]);
    
    if (activeCaseId) {
      const token = localStorage.getItem("token");
      fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (Array.isArray(data)) setCaseEntities(data);
      }).catch(e => console.error(e));
    } else {
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
    if (!text.trim() || !activeCaseId) return;

    const currentScopeId = activeCaseId;

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
      
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-floating-btn relative group w-14 h-14 flex items-center justify-center rounded-full bg-zinc-900 border border-white/10 hover:border-blue-500/50 hover:bg-zinc-800 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-200 active:scale-95 shadow-xl"
          aria-label="Open NEXUS AI Agent"
          title="Open NEXUS AI Agent"
        >
          <span className="chat-ping pointer-events-none group-hover:hidden absolute inset-0 rounded-full animate-ping bg-blue-500/20" />
          <div className="relative flex items-center justify-center w-8 h-8 text-blue-400">
            <svg className="absolute inset-0 w-full h-full text-blue-500/80" viewBox="0 0 100 100">
              <polygon points="50,2 98,26 98,74 50,98 2,74 2,26" fill="rgba(37, 99, 235, 0.2)" stroke="currentColor" strokeWidth="6" />
            </svg>
            <span className="font-extrabold text-white text-sm z-10">N</span>
          </div>
        </button>
      )}

      {/* Minimized Chat Box */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-64 h-14 rounded-xl border border-white/10 bg-zinc-950/90 backdrop-blur-md shadow-2xl flex items-center justify-between px-4 hover:border-blue-500/40 hover:bg-zinc-900/90 transition-all duration-200 active:scale-95 cursor-pointer group"
          aria-label="Restore NEXUS AI Agent"
          title="Restore NEXUS AI Agent"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-7 h-7 text-blue-400 shrink-0">
              <svg className="absolute inset-0 w-full h-full text-blue-500/80 group-hover:text-blue-400 transition-colors" viewBox="0 0 100 100">
                <polygon points="50,2 98,26 98,74 50,98 2,74 2,26" fill="rgba(37, 99, 235, 0.2)" stroke="currentColor" strokeWidth="6" />
              </svg>
              <span className="font-extrabold text-white text-xs z-10">N</span>
            </div>
            <div className="flex flex-col items-start">
              <h3 className="text-[11px] font-extrabold text-white tracking-wide uppercase">NEXUS AI</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider font-bold">ONLINE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Close AI Agent"
              aria-label="Close AI Agent"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </div>
          </div>
        </button>
      )}

      {/* Full Chat Box Panel */}
      {isOpen && !isMinimized && (
        <div className="w-[420px] h-[600px] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          
          {/* Header Panel */}
          <header className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-zinc-900/80 to-zinc-950/80 flex justify-between items-center shrink-0 shadow-sm relative">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                <svg className="absolute inset-0 w-full h-full text-blue-500/80" viewBox="0 0 100 100">
                  <polygon points="50,2 98,26 98,74 50,98 2,74 2,26" fill="rgba(37, 99, 235, 0.2)" stroke="currentColor" strokeWidth="5" className="backdrop-blur-sm" />
                </svg>
                <span className="font-extrabold text-white text-[15px] z-10">N</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-extrabold text-white tracking-widest uppercase drop-shadow-sm">NEXUS AI AGENT</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)] animate-pulse" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">ONLINE</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 relative z-10">
              <button 
                onClick={() => setIsMinimized(true)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer active:scale-90"
                title="Minimize AI Agent"
                aria-label="Minimize AI Agent"
              >
                <i className="fa-solid fa-minus text-xs"></i>
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all duration-200 cursor-pointer active:scale-90"
                title="Close AI Agent"
                aria-label="Close AI Agent"
              >
                <i className="fa-solid fa-xmark text-[15px]"></i>
              </button>
            </div>
          </header>

          {/* Active Case Indicator */}
          <div className="px-5 py-2.5 border-b border-white/5 bg-zinc-900/30 flex gap-2 justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <i className="fa-solid fa-folder-open text-zinc-600"></i> Active Case:
            </span>
            <div className="text-[10px] font-bold text-blue-400">
              {activeCaseId ? (activeCase?.name || activeCaseId) : "No active case selected"}
            </div>
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-[320px] mx-auto gap-5">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-400">
                  <i className="fa-solid fa-microchip"></i>
                </div>
                <div>
                  <h4 className="text-[12px] font-extrabold text-white tracking-widest uppercase">Investigation Agent</h4>
                  <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed">
                    Ask me for connection paths, suspect profiles, or high risk alerts.
                  </p>
                </div>
                
                {/* Suggestions Grid */}
                <div className="w-full space-y-2 mt-4">
                  {dynamicSuggestions.map((sug, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSuggest(sug.text)}
                      className="w-full text-left p-3.5 rounded-xl border border-white/5 hover:border-blue-500/30 bg-zinc-900/40 hover:bg-zinc-800/80 text-[10.5px] text-zinc-400 hover:text-zinc-200 transition-all duration-200 font-medium cursor-pointer whitespace-normal break-words leading-relaxed group shadow-sm"
                    >
                      <span className="mr-2 group-hover:text-blue-400 transition-colors">{sug.icon}</span> {sug.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[88%] ${
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <span className="text-[9px] text-zinc-500 mb-1.5 font-mono tracking-wide font-medium flex items-center gap-1.5">
                    {msg.sender === "user" ? (
                      <>INVESTIGATOR <i className="fa-solid fa-user text-zinc-600 text-[8px]"></i></>
                    ) : (
                      <><i className="fa-solid fa-robot text-blue-500 text-[9px]"></i> NEXUS AI</>
                    )} 
                    <span className="text-zinc-600 mx-0.5">•</span> 
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className={`p-4 rounded-2xl text-[12px] border leading-relaxed shadow-sm ${
                    msg.sender === "user" 
                      ? "bg-blue-600/15 border-blue-500/20 text-white rounded-tr-sm" 
                      : "bg-zinc-900 border-white/5 text-zinc-300 rounded-tl-sm shadow-md overflow-hidden"
                  }`}>
                    {msg.sender === "ai" ? (
                      <div className="prose prose-invert prose-sm max-w-none text-[12px] prose-p:leading-relaxed prose-headings:text-white prose-a:text-blue-400 marker:text-zinc-500 prose-ul:my-1.5 prose-li:my-0.5">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {msg.evidence && msg.evidence.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-white/10 text-[9px] font-mono text-zinc-400 bg-zinc-950/30 -mx-4 -mb-4 px-4 pb-3">
                        <p className="font-bold uppercase text-zinc-500 mb-1 flex items-center gap-1.5">
                          <i className="fa-solid fa-database text-[10px]"></i> Grounded case context:
                        </p>
                        {msg.evidence.map((ev, i) => <div key={i} className="truncate ml-4 relative before:absolute before:content-[''] before:w-1 before:h-1 before:bg-zinc-600 before:rounded-full before:top-1.5 before:-left-3">&nbsp;{ev}</div>)}
                      </div>
                    )}
                  </div>

                  {/* actions trigger buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                          className="px-2.5 py-1.5 bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold text-[9px] rounded-md transition-all cursor-pointer border border-white/5 shadow-sm hover:shadow-[0_0_10px_rgba(37,99,235,0.4)] flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-play text-[8px]"></i> {act.type.replace("_", " ")}
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
            <div className="px-5 py-3 text-[10px] text-zinc-500 flex items-center gap-2.5 bg-zinc-900/40 shrink-0 border-t border-white/5">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 bg-blue-500/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 bg-blue-500/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 bg-blue-500/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="font-medium font-mono text-[9px] tracking-widest uppercase text-zinc-500">Processing...</span>
            </div>
          )}

          {/* Input Panel */}
          <div className="p-4 border-t border-white/5 bg-zinc-950 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex gap-2.5 relative"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <i className="fa-solid fa-terminal text-zinc-500 text-[10px]"></i>
                </div>
                <input
                  type="text"
                  placeholder={
                    activeCaseId
                      ? "Query active case..."
                      : "Select a case to start an investigation."
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder-zinc-600 text-white transition-all shadow-inner"
                  disabled={sending || !activeCaseId}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sending || !inputValue.trim() || !activeCaseId}
                className="px-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-zinc-700 disabled:shadow-none border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] rounded-xl text-[13px] font-bold text-white transition-all duration-200 active:scale-[0.96] cursor-pointer flex items-center gap-2"
                aria-label="Send Message"
              >
                Send <i className="fa-solid fa-paper-plane text-[11px] mb-0.5"></i>
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
