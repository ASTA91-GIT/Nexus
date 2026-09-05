"use client";
import React, { useState, useRef } from "react";
import { useCase } from "@/context/CaseContext";

export default function CasesPage() {
  const { cases, activeCaseId, setActiveCaseId, refreshCases, activeCase } = useCase();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  
  // Create state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [investigator, setInvestigator] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editInvestigator, setEditInvestigator] = useState("");
  const [editStatus, setEditStatus] = useState("OPEN");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{name: string, status: string, message: string}[]>([]);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setMessage(null);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl("/api/cases/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, description, priority, investigator, status: "OPEN" })
      });

      if (res.ok) {
        const data = await res.json();
        setName("");
        setDescription("");
        setPriority("MEDIUM");
        setInvestigator("");
        setMessage({ text: `Case "${data.name}" created successfully.`, isError: false });
        await refreshCases();
        setActiveCaseId(data._id || data.id);
      } else {
        setMessage({ text: "Failed to create case.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error connection error.", isError: true });
    } finally {
      setCreating(false);
    }
  };

  const handleEditStart = (c: any) => {
    setEditingCaseId(c._id);
    setEditName(c.name);
    setEditDesc(c.description || "");
    setEditPriority(c.priority || "MEDIUM");
    setEditInvestigator(c.investigator || "");
    setEditStatus(c.status || "OPEN");
  };

  const handleEditSave = async (caseId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/cases/${caseId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          priority: editPriority,
          investigator: editInvestigator,
          status: editStatus
        })
      });

      if (res.ok) {
        setEditingCaseId(null);
        setMessage({ text: "Case updated successfully.", isError: false });
        await refreshCases();
      } else {
        setMessage({ text: "Failed to update case.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error saving case details.", isError: true });
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm("WARNING: Are you sure you want to delete this case? This will permanently delete all associated records!")) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/cases/${caseId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ text: "Case deleted.", isError: false });
        if (activeCaseId === caseId) {
          setActiveCaseId("");
        }
        await refreshCases();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage({ text: errorData.detail || "Failed to delete case.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error connecting to backend.", isError: true });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (!activeCaseId) {
      setMessage({ text: "Please select an active case first.", isError: true });
      return;
    }
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadResults([]);
    const token = localStorage.getItem("token");
    
    const uploadPromises = selectedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("case_id", activeCaseId);
      formData.append("title", file.name);

      try {
        const res = await fetch(getApiUrl("/api/evidence/upload"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setUploadResults(prev => [...prev, { name: file.name, status: "Success", message: data.message }]);
          return data;
        } else {
          setUploadResults(prev => [...prev, { name: file.name, status: "Error", message: "Server rejected file." }]);
          throw new Error("Server rejected file.");
        }
      } catch (err: any) {
        setUploadResults(prev => [...prev, { name: file.name, status: "Error", message: err.message || "Network error" }]);
        throw err;
      }
    });

    await Promise.allSettled(uploadPromises);

    setSelectedFiles([]);
    setUploading(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const processedCases = cases
    .filter((c: any) => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); 
    });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-20">
      
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-[var(--border-primary)] pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Upload Case Files & Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Create new cases, upload evidence files, and manage existing investigation files.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className={`p-4 rounded-xl border text-sm flex justify-between items-center shadow-sm ${
          message.isError ? "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]" : "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]"
        }`}>
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:opacity-80">Close</button>
        </div>
      )}

      {/* Main Grid: Create Case & Upload Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 1: Create New Case */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm flex flex-col">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <i className="fa-solid fa-folder-plus text-[var(--accent-primary)]"></i> 1. Create New Case
          </h2>
          <form onSubmit={handleCreateCase} className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Case Title / Code</label>
              <input 
                type="text" 
                placeholder="e.g. Operation Hawk Eye"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Operational Description</label>
              <textarea 
                placeholder="Brief summary of suspects, communication networks, or financial traces..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="input-field"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Investigator</label>
                <input 
                  type="text" 
                  placeholder="e.g. Agent Carter"
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-auto pt-4">
              <button 
                type="submit" 
                disabled={creating || !name.trim()}
                className="w-full p-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                {creating ? "Opening File..." : "Create Case Directory"}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Upload Case Files */}
        <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm flex flex-col">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-[var(--text-primary)]">
            <i className="fa-solid fa-cloud-arrow-up text-[var(--accent-primary)]"></i> 2. Upload Case Files
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4 border-b border-[var(--border-primary)] pb-4">
            Currently active case: <strong className="text-[var(--text-primary)]">{activeCase ? activeCase.name : "None selected"}</strong>
          </p>

          <div className="flex flex-col gap-4 flex-1">
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.json,.xml,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.webm,.zip"
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-[var(--border-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)] bg-[var(--surface-secondary)] rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
            >
              <i className="fa-solid fa-file-arrow-up text-3xl text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors"></i>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Click to Browse Files</span>
              <span className="text-xs text-[var(--text-muted)]">Supports PDF, CSV, Images, Audio, Video, etc.</span>
            </button>

            {selectedFiles.length > 0 && (
              <div className="bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-lg max-h-32 overflow-y-auto p-2">
                <ul className="space-y-1">
                  {selectedFiles.map((f, idx) => (
                    <li key={idx} className="flex justify-between items-center text-xs p-2 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded">
                      <span className="truncate text-[var(--text-primary)] font-medium max-w-[80%]">{f.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--text-muted)] font-mono">{(f.size / 1024 / 1024).toFixed(2)}MB</span>
                        <button onClick={() => handleRemoveFile(idx)} className="text-[var(--danger)] hover:text-red-700">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {uploadResults.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Upload Results</p>
                <div className="bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-lg max-h-40 overflow-y-auto p-2">
                  <ul className="space-y-1">
                    {uploadResults.map((r, idx) => (
                      <li key={idx} className={`text-[10px] p-2 rounded border flex flex-col gap-1 ${
                        r.status === 'Success' ? 'bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]'
                      }`}>
                        <div className="flex justify-between font-bold">
                          <span className="truncate">{r.name}</span>
                          <span>{r.status}</span>
                        </div>
                        <span className="font-mono">{r.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-auto pt-4">
              <button 
                onClick={handleUploadFiles}
                disabled={uploading || selectedFiles.length === 0 || !activeCaseId}
                className="w-full p-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-2"
              >
                {uploading ? (
                  <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing Files...</>
                ) : (
                  <><i className="fa-solid fa-upload"></i> Upload {selectedFiles.length > 0 ? selectedFiles.length : ''} Files to Case</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Existing Case Files */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm mt-4">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
          <i className="fa-solid fa-folder-open text-[var(--accent-primary)]"></i> 3. Existing Case Files
        </h2>

        {/* Controls Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-[var(--surface-secondary)] p-4 border border-[var(--border-primary)] rounded-xl mb-6 shadow-inner">
          <input 
            type="text" 
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full md:w-64"
          />
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Cases</option>
              <option value="CLOSED">Closed Cases</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </select>
          </div>
        </div>

        {/* Cases List */}
        {processedCases.length === 0 ? (
          <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-muted)] bg-[var(--surface-secondary)]">
            <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-50"></i>
            <p>No matching investigation files found. Create a case file above to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedCases.map((c: any) => {
              const isEditing = editingCaseId === c._id;
              const isActive = activeCaseId === c._id;

              return (
                <div 
                  key={c._id} 
                  className={`p-5 rounded-xl border transition-all ${
                    isActive 
                      ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/40 shadow-md ring-1 ring-[var(--accent-primary)]/20" 
                      : "bg-[var(--surface-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input-field"
                          placeholder="Case Title"
                        />
                        <input 
                          type="text" 
                          value={editInvestigator}
                          onChange={(e) => setEditInvestigator(e.target.value)}
                          className="input-field"
                          placeholder="Investigator"
                        />
                      </div>
                      <textarea 
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="input-field min-h-[60px] resize-none"
                        placeholder="Description"
                      />
                      <div className="flex gap-3">
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value)}
                          className="input-field"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="input-field"
                        >
                          <option value="OPEN">Open</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-primary)]">
                        <button 
                          onClick={() => setEditingCaseId(null)}
                          className="px-4 py-2 rounded-lg bg-[var(--surface-tertiary)] hover:bg-[var(--surface-hover)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleEditSave(c._id)}
                          className="px-4 py-2 rounded-lg bg-[var(--success)] hover:brightness-110 text-white font-bold text-xs shadow-sm transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="flex flex-col gap-1.5 overflow-hidden">
                          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight truncate" title={c.name}>{c.name}</h3>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                              c.status === "OPEN" ? "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--surface-tertiary)] border-[var(--border-primary)] text-[var(--text-muted)]"
                            }`}>
                              {c.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                              c.priority === "HIGH" 
                                ? "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]" 
                                : c.priority === "MEDIUM" 
                                ? "bg-[var(--warning)]/10 border-[var(--warning)]/20 text-[var(--warning)]" 
                                : "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                            }`}>
                              {c.priority}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={() => handleEditStart(c)}
                            className="w-8 h-8 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-secondary)] flex items-center justify-center transition-colors shadow-sm"
                            title="Edit Case"
                          >
                            <i className="fa-solid fa-pen text-xs"></i>
                          </button>
                          <button 
                            onClick={() => handleDeleteCase(c._id)}
                            className="w-8 h-8 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-primary)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white flex items-center justify-center transition-colors shadow-sm"
                            title="Delete Case"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
                        {c.description || "No description provided."}
                      </p>

                      <div className="flex justify-between items-center pt-3 border-t border-[var(--border-primary)] text-[11px] text-[var(--text-muted)] font-mono">
                        <div className="truncate pr-2">
                          <i className="fa-solid fa-user-tie mr-1"></i>
                          <span className="text-[var(--text-secondary)] font-semibold">{c.investigator || c.created_by}</span>
                        </div>
                        <div className="shrink-0">
                          <i className="fa-solid fa-calendar mr-1"></i>
                          <span className="text-[var(--text-secondary)]">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Active Toggle Button */}
                      <button
                        onClick={() => setActiveCaseId(c._id)}
                        disabled={isActive}
                        className={`mt-4 w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                          isActive 
                            ? "bg-[var(--accent-primary)] text-white border border-[var(--accent-primary)] cursor-default"
                            : "bg-[var(--surface-primary)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                        }`}
                      >
                        {isActive ? (
                          <><i className="fa-solid fa-circle-check"></i> Active Workspace</>
                        ) : (
                          <><i className="fa-solid fa-arrow-right-to-bracket"></i> Select Case Workspace</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
