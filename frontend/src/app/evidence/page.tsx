"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useCase } from "@/context/CaseContext";

export default function EvidencePage() {
  const { activeCaseId, activeCase } = useCase();
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchEvidence = useCallback(async () => {
    if (!activeCaseId) {
      setEvidenceList([]);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(`/api/evidence/?case_id=${activeCaseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvidenceList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeCaseId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  // Polling mechanism to auto-update evidence list while processing
  const isPolling = useRef<boolean>(false);
  const wasProcessing = useRef<boolean>(false);

  useEffect(() => {
    if (!activeCaseId) return;

    let intervalId: NodeJS.Timeout;
    
    const checkProcessingStatus = async () => {
      if (isPolling.current) return;
      isPolling.current = true;
      
      const token = localStorage.getItem("token");
      if (!token) {
        isPolling.current = false;
        return;
      }
      
      try {
        const res = await fetch(getApiUrl(`/api/evidence/?case_id=${activeCaseId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const latestEvidenceList = await res.json();
          const processingCount = latestEvidenceList.filter((e: any) => e.processing_status === "PROCESSING").length;
          
          if (processingCount > 0) {
            wasProcessing.current = true;
            // Also update the UI with the latest list if there is a change, or just calling fetchEvidence 
            // Wait, to avoid double loading state, we can just update the state silently
            setEvidenceList(latestEvidenceList);
          } else if (processingCount === 0 && wasProcessing.current) {
            wasProcessing.current = false;
            setEvidenceList(latestEvidenceList);
          }
        }
      } catch (err) {
        console.error("Failed to check evidence processing status:", err);
      } finally {
        isPolling.current = false;
      }
    };

    wasProcessing.current = false;
    isPolling.current = false;

    // Start polling every 3 seconds to check for processing updates
    intervalId = setInterval(checkProcessingStatus, 3000);
    checkProcessingStatus();

    return () => {
      clearInterval(intervalId);
    };
  }, [activeCaseId]);

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or not available", err);
      setMessage({ text: "Microphone access denied or not available.", isError: true });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const uploadRecording = async () => {
    if (!activeCaseId || !audioBlob) return;
    
    const token = localStorage.getItem("token");
    const formData = new FormData();
    const file = new File([audioBlob], `recording_${Date.now()}.webm`, { type: "audio/webm" });
    formData.append("file", file);
    formData.append("case_id", activeCaseId);
    formData.append("title", file.name);

    try {
      setMessage(null);
      const res = await fetch(getApiUrl("/api/evidence/upload"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setMessage({ text: "Audio recording uploaded successfully to case evidence.", isError: false });
        discardRecording();
        fetchEvidence();
      } else {
        const err = await res.json();
        setMessage({ text: err.detail || "Failed to upload recording.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error uploading recording.", isError: true });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="border-b border-[var(--border-primary)] pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Evidence Intelligence Workspace</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Ingest, map, and organize forensic evidence. Create live audio intercepts or upload file records.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm flex justify-between items-center shadow-sm ${
          message.isError ? "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]" : "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]"
        }`}>
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:opacity-80">Close</button>
        </div>
      )}

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)]">
          <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-50"></i>
          <p>Please select an active Case File from the sidebar to interact with evidence intelligence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Side: Upload & Audio */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            
            {/* Primary: File Upload */}
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                <i className="fa-solid fa-cloud-arrow-up text-[var(--accent-primary)]"></i> Upload Evidence
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                Upload documents, images, audio, video, and other investigation files to this case.
              </p>

              <label className="flex flex-col items-center justify-center p-8 bg-[var(--surface-secondary)] border-2 border-dashed border-[var(--border-secondary)] hover:border-[var(--accent-primary)] rounded-xl mb-4 transition-colors cursor-pointer group">
                <i className="fa-solid fa-file-arrow-up text-4xl text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] mb-4 transition-colors"></i>
                <span className="text-sm font-bold text-[var(--text-primary)] mb-1">Click to browse or drag files here</span>
                <span className="text-xs text-[var(--text-secondary)] text-center">
                  Supports PDF, DOCX, TXT, CSV, JSON, JPG, PNG, WEBP, MP3, MP4, etc.
                </span>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0 || !activeCaseId) return;
                    
                    const token = localStorage.getItem("token");
                    
                    setMessage({ text: `Uploading ${files.length} file(s)...`, isError: false });

                    const uploadPromises = Array.from(files).map(async (file) => {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("case_id", activeCaseId);
                      formData.append("title", file.name);
                      
                      const res = await fetch(getApiUrl("/api/evidence/upload"), {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData
                      });
                      
                      if (!res.ok) throw new Error("Upload failed");
                      const data = await res.json();
                      
                      // Immediately add to UI state
                      const newEvidence = {
                        _id: data.evidence_id,
                        title: file.name,
                        source_type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
                        created_by: "Uploading...",
                        created_at: new Date().toISOString(),
                        processing_status: "PROCESSING"
                      };
                      
                      setEvidenceList(prev => [newEvidence, ...prev]);
                      return data;
                    });

                    const results = await Promise.allSettled(uploadPromises);
                    const hasError = results.some(r => r.status === 'rejected');

                    if (hasError) {
                      setMessage({ text: "Some files failed to upload. Check console for details.", isError: true });
                    } else {
                      setMessage({ text: "All files uploaded successfully.", isError: false });
                    }
                    
                    // Trigger one final sync to ensure we have the fully correct data from server
                    fetchEvidence();
                    
                    // Clear input
                    e.target.value = "";
                  }} 
                />
              </label>
            </div>


          </div>

          {/* Right Side: Evidence Registry */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-[var(--border-primary)] pb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <i className="fa-solid fa-clipboard-list text-[var(--accent-primary)]"></i> Case Evidence Registry
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Viewing intelligence for: <strong className="text-[var(--text-primary)]">{activeCase?.name}</strong>
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-primary)]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
                  <span className="text-xs text-[var(--text-secondary)]">Retrieving case registries...</span>
                </div>
              ) : evidenceList.length === 0 ? (
                <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)]">
                  <i className="fa-solid fa-file-shield text-3xl mb-3 opacity-50"></i>
                  <p>No evidence registries recorded for this case. Upload files or record audio to begin.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                  <table className="w-full border-collapse text-left text-sm text-[var(--text-primary)]">
                    <thead>
                      <tr className="border-b border-[var(--border-primary)] bg-[var(--surface-tertiary)] text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Filename</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Registrar</th>
                        <th className="py-3 px-4">Date Ingested</th>
                        <th className="py-3 px-4">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-primary)]">
                      {evidenceList.map((ev) => (
                        <tr key={ev._id} className="hover:bg-[var(--surface-hover)] transition-colors bg-[var(--surface-primary)]">
                          <td className="py-3.5 px-4 font-bold text-[var(--text-primary)]">
                            <span className="flex items-center gap-2">
                              {ev.source_type === "WEBM" ? (
                                <i className="fa-solid fa-file-audio text-[var(--danger)]"></i>
                              ) : (
                                <i className="fa-solid fa-file text-[var(--accent-primary)]"></i>
                              )}
                              <span className="truncate max-w-[200px]" title={ev.title}>{ev.title}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-[var(--text-secondary)]">
                              {ev.source_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)] font-medium">
                            <span className="truncate max-w-[120px] inline-block" title={ev.created_by}>{ev.created_by}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">
                            {new Date(ev.created_at).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-[10px] font-mono text-[var(--text-muted)]">
                            {ev._id.substring(0, 8)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
