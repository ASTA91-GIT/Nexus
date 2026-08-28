"use client";
import React, { useState } from "react";
import { useCase } from "@/context/CaseContext";

export default function CasesPage() {
  const { cases, activeCaseId, setActiveCaseId, refreshCases } = useCase();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  
  // Create state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [investigator, setInvestigator] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit/Toggles state
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editInvestigator, setEditInvestigator] = useState("");
  const [editStatus, setEditStatus] = useState("OPEN");

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

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
        setActiveCaseId(data._id);
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
    if (!confirm("WARNING: Are you sure you want to delete this case? This will permanently delete all associated suspect entities, relationships, evidence, and alerts! This action cannot be undone.")) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl(`/api/cases/${caseId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ text: "Case and all associated records deleted.", isError: false });
        await refreshCases();
      } else {
        setMessage({ text: "Failed to delete case.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error connecting to backend.", isError: true });
    }
  };

  // Filter & Sort cases
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
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // date_desc
    });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Case Files Management</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create, update, or archive investigation coordinates. Strictly isolated environments.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className={`p-4 rounded-xl border text-sm flex justify-between items-center ${
          message.isError ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:opacity-80">Close</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create Case Form */}
        <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl h-fit">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
            <span>📁</span> Open New Case File
          </h2>
          <form onSubmit={handleCreateCase} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Case Title / Code</label>
              <input 
                type="text" 
                placeholder="e.g. Operation Hawk Eye"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-3 rounded-xl bg-zinc-950/60 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-700 text-white"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Operational Description</label>
              <textarea 
                placeholder="Brief summary of suspects, communication networks, or financial traces..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-3 rounded-xl bg-zinc-950/60 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-700 text-white min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-white/10 text-sm focus:outline-none focus:border-blue-500 text-zinc-300"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High Threat</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lead Investigator</label>
                <input 
                  type="text" 
                  placeholder="e.g. Agent Carter"
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="p-3 rounded-xl bg-zinc-950/60 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-700 text-white"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={creating || !name.trim()}
              className="mt-2 p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            >
              {creating ? "Opening File..." : "Create Case Directory"}
            </button>
          </form>
        </div>

        {/* Right Side: Case list directory */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-zinc-900/10 p-4 border border-white/5 rounded-2xl">
            <input 
              type="text" 
              placeholder="Search case files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600 text-white w-64"
            />
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-xs text-zinc-400 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open Cases</option>
                <option value="CLOSED">Closed Cases</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-zinc-950/40 border border-white/10 text-xs text-zinc-400 focus:outline-none focus:border-blue-500"
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
            <div className="p-16 border border-dashed border-white/5 rounded-2xl text-center text-zinc-600">
              No matching investigation files found. Create a case file to begin.
            </div>
          ) : (
            <div className="space-y-4">
              {processedCases.map((c: any) => {
                const isEditing = editingCaseId === c._id;
                const isActive = activeCaseId === c._id;

                return (
                  <div 
                    key={c._id} 
                    className={`p-6 rounded-2xl border transition-all ${
                      isActive 
                        ? "bg-blue-600/5 border-blue-500/30 shadow-lg shadow-blue-500/5" 
                        : "bg-zinc-900/10 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                            placeholder="Case Title"
                          />
                          <input 
                            type="text" 
                            value={editInvestigator}
                            onChange={(e) => setEditInvestigator(e.target.value)}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white"
                            placeholder="Investigator"
                          />
                        </div>
                        <textarea 
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white w-full min-h-[60px]"
                          placeholder="Description"
                        />
                        <div className="flex gap-4">
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300"
                          >
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                          <div className="ml-auto flex gap-2">
                            <button 
                              onClick={() => handleEditSave(c._id)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingCaseId(null)}
                              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-white tracking-tight">{c.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                c.status === "OPEN" ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-400" : "bg-zinc-800 border-white/5 text-zinc-500"
                              }`}>
                                {c.status}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                c.priority === "HIGH" 
                                  ? "bg-red-500/10 border-red-500/15 text-red-400" 
                                  : c.priority === "MEDIUM" 
                                  ? "bg-amber-500/10 border-amber-500/15 text-amber-400" 
                                  : "bg-blue-500/10 border-blue-500/15 text-blue-400"
                              }`}>
                                {c.priority}
                              </span>
                            </div>
                            <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">{c.description || "No description provided."}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            {!isActive && (
                              <button 
                                onClick={() => setActiveCaseId(c._id)}
                                className="px-3.5 py-1.5 bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/10 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                              >
                                Select Case
                              </button>
                            )}
                            <button 
                              onClick={() => handleEditStart(c)}
                              className="p-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer text-xs"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteCase(c._id)}
                              className="p-1.5 rounded-lg border border-white/5 hover:border-red-500/20 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px] text-zinc-500 font-mono">
                          <div>
                            <span>Investigator: </span>
                            <span className="text-zinc-400 font-semibold">{c.investigator || c.created_by}</span>
                          </div>
                          <div>
                            <span>Created: </span>
                            <span className="text-zinc-400">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
