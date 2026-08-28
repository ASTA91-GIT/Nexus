"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCase } from "@/context/CaseContext";

export default function EvidencePage() {
  const { activeCaseId, activeCase } = useCase();
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Wizard state
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Mappings, 3: Success
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<"ENTITIES" | "RELATIONSHIPS">("ENTITIES");
  
  // Mapping columns response from preview
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);

  // User configured mappings
  const [mappings, setMappings] = useState<Record<string, string>>({
    name: "",
    type: "",
    source: "",
    target: "",
  });

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setParsing(true);
    setMessage(null);

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(getApiUrl("/api/ingestion/preview"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns);
        setPreviewRows(data.preview);
        setRawData(data.raw_data);
        
        // Auto initialize default mappings if found in columns
        const newMappings: Record<string, string> = {};
        if (importType === "ENTITIES") {
          newMappings.name = data.columns.find((c: string) => c.toLowerCase() === "name" || c.toLowerCase() === "id") || data.columns[0] || "";
          newMappings.type = data.columns.find((c: string) => c.toLowerCase() === "type" || c.toLowerCase() === "category") || "";
        } else {
          newMappings.source = data.columns.find((c: string) => c.toLowerCase() === "source" || c.toLowerCase() === "from") || data.columns[0] || "";
          newMappings.target = data.columns.find((c: string) => c.toLowerCase() === "target" || c.toLowerCase() === "to") || data.columns[1] || "";
          newMappings.type = data.columns.find((c: string) => c.toLowerCase() === "type" || c.toLowerCase() === "relation") || "";
        }
        setMappings(newMappings);
        setStep(2);
      } else {
        const err = await res.json();
        setMessage({ text: err.detail || "Failed to parse file preview.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error connecting to parser service.", isError: true });
    } finally {
      setParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!activeCaseId) return;
    setImporting(true);
    setMessage(null);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(getApiUrl("/api/ingestion/import-mapped"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          case_id: activeCaseId,
          import_type: importType,
          data: rawData,
          mappings: mappings,
          filename: selectedFile?.name || "import_data.csv"
        })
      });

      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        setStep(3);
        fetchEvidence();
      } else {
        const err = await res.json();
        setMessage({ text: err.detail || "Import failed.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network connection error executing import.", isError: true });
    } finally {
      setImporting(false);
    }
  };

  const handleResetWizard = () => {
    setSelectedFile(null);
    setColumns([]);
    setPreviewRows([]);
    setRawData([]);
    setStep(1);
    setImportResult(null);
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Evidence Explorer & Ingestion</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Upload phone records, call detail registries, transaction charts, or location lists. Custom map them dynamically.
        </p>
      </div>

      {/* Main Grid split: Left is Import Wizard, Right is Registry list */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Side: Dynamic Data Import Wizard */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
              <span>⚡</span> Data Ingestion Wizard
            </h2>
            
            {message && (
              <div className="mb-4 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex justify-between">
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)} className="font-bold">X</button>
              </div>
            )}

            {!activeCaseId ? (
              <div className="p-8 text-center text-zinc-600 text-xs italic bg-zinc-950/40 rounded-xl">
                Please select or create an active Case File first to ingest evidence records.
              </div>
            ) : (
              <>
                {/* Wizard Steps Indicators */}
                <div className="flex justify-between items-center mb-6 text-[10px] font-bold text-zinc-500 font-mono">
                  <span className={step >= 1 ? "text-blue-500" : ""}>1. UPLOAD</span>
                  <span>&rarr;</span>
                  <span className={step >= 2 ? "text-blue-500" : ""}>2. MAP FIELDS</span>
                  <span>&rarr;</span>
                  <span className={step >= 3 ? "text-blue-500" : ""}>3. PROCESS</span>
                </div>

                {/* STEP 1: Upload File */}
                {step === 1 && (
                  <form onSubmit={handleGeneratePreview} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Import Category</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setImportType("ENTITIES")}
                          className={`p-3 rounded-xl border font-semibold text-xs transition-all ${
                            importType === "ENTITIES" 
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-extrabold" 
                              : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          👥 Entity Directory
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportType("RELATIONSHIPS")}
                          className={`p-3 rounded-xl border font-semibold text-xs transition-all ${
                            importType === "RELATIONSHIPS" 
                              ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-extrabold" 
                              : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          🔗 Relationship Links
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Forensic File (CSV or JSON)</label>
                      <input 
                        type="file" 
                        accept=".csv,.json"
                        onChange={handleFileChange}
                        className="w-full text-zinc-400 text-xs bg-zinc-950/60 p-3 rounded-xl border border-white/10 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/15 file:text-blue-400 cursor-pointer"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={parsing || !selectedFile}
                      className="w-full p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-bold text-xs transition-all active:scale-[0.98]"
                    >
                      {parsing ? "Parsing File..." : "Analyze Columns & Preview"}
                    </button>
                  </form>
                )}

                {/* STEP 2: Configure Mappings & Preview */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="p-3 bg-zinc-950 border border-white/5 rounded-xl space-y-2 text-xs">
                      <p className="text-zinc-500">File Selected: <span className="text-zinc-300 font-mono font-semibold">{selectedFile?.name}</span></p>
                      <p className="text-zinc-500">Total Rows Detected: <span className="text-zinc-300 font-mono font-semibold">{rawData.length}</span></p>
                    </div>

                    {/* Mapping Selectors */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Map Columns to Schema</h3>
                      
                      {importType === "ENTITIES" ? (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entity Name column (Required)</label>
                            <select
                              value={mappings.name}
                              onChange={(e) => setMappings({ ...mappings, name: e.target.value })}
                              className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
                              required
                            >
                              <option value="">-- Select Column --</option>
                              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Classification/Type column (Optional)</label>
                            <select
                              value={mappings.type}
                              onChange={(e) => setMappings({ ...mappings, type: e.target.value })}
                              className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
                            >
                              <option value="">-- Default (PERSON) --</option>
                              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Source Entity (From) (Required)</label>
                            <select
                              value={mappings.source}
                              onChange={(e) => setMappings({ ...mappings, source: e.target.value })}
                              className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
                              required
                            >
                              <option value="">-- Select Column --</option>
                              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Target Entity (To) (Required)</label>
                            <select
                              value={mappings.target}
                              onChange={(e) => setMappings({ ...mappings, target: e.target.value })}
                              className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
                              required
                            >
                              <option value="">-- Select Column --</option>
                              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Relationship Type (Optional)</label>
                            <select
                              value={mappings.type}
                              onChange={(e) => setMappings({ ...mappings, type: e.target.value })}
                              className="p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-300 focus:outline-none"
                            >
                              <option value="">-- Default (CONNECTED_TO) --</option>
                              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Preview Table */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sample Preview (First 3 Rows)</label>
                      <div className="overflow-x-auto border border-white/5 rounded-xl bg-zinc-950/40 text-[10px]">
                        <table className="w-full text-left text-zinc-400">
                          <thead>
                            <tr className="border-b border-white/5 bg-zinc-900/40 font-mono text-[9px]">
                              {columns.slice(0, 3).map((col) => <th key={col} className="p-2">{col}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {previewRows.slice(0, 3).map((row, idx) => (
                              <tr key={idx}>
                                {columns.slice(0, 3).map((col) => <td key={col} className="p-2 truncate max-w-[100px]">{String(row[col])}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleExecuteImport}
                        disabled={importing || (importType === "ENTITIES" ? !mappings.name : (!mappings.source || !mappings.target))}
                        className="flex-1 p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-bold text-xs transition-all active:scale-[0.98]"
                      >
                        {importing ? "Importing Records..." : "Execute Import"}
                      </button>
                      <button
                        onClick={handleResetWizard}
                        className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl font-bold text-xs text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Complete Success Status */}
                {step === 3 && (
                  <div className="text-center py-6 space-y-4">
                    <span className="text-4xl">✅</span>
                    <h3 className="text-base font-extrabold text-white">Import Complete!</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed px-4">
                      {importResult?.message || "Data processed successfully."}
                    </p>
                    <div className="p-3 bg-zinc-950 border border-white/5 rounded-xl text-left space-y-1.5 max-w-xs mx-auto text-xs font-mono text-zinc-400">
                      <div className="flex justify-between"><span>New Entities:</span> <span className="font-bold text-white">{importResult?.entities_created}</span></div>
                      <div className="flex justify-between"><span>New Relationships:</span> <span className="font-bold text-white">{importResult?.relationships_created}</span></div>
                    </div>
                    <button
                      onClick={handleResetWizard}
                      className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl font-bold text-xs text-white"
                    >
                      Import Another Dataset
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Evidence Registry Explorer */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
              <span>📋</span> Case Evidence Registry
            </h2>

            {!activeCaseId ? (
              <div className="p-16 border border-dashed border-white/5 rounded-xl text-center text-zinc-600">
                Please select a Case File from the sidebar to inspect evidence registries.
              </div>
            ) : loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="text-xs text-zinc-500">Retrieving case files registry...</span>
              </div>
            ) : evidenceList.length === 0 ? (
              <div className="p-16 border border-dashed border-white/5 rounded-xl text-center text-zinc-600">
                No evidence registries recorded for this case. Use the Import Wizard on the left to ingest records.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-zinc-400">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Registrar</th>
                      <th className="py-3 px-4">Date Ingested</th>
                      <th className="py-3 px-4">Evidence ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {evidenceList.map((ev) => (
                      <tr key={ev._id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white text-base">{ev.title}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 text-xs rounded-full bg-zinc-900 border border-white/10 text-zinc-400 font-mono">
                            {ev.source_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-400">{ev.created_by}</td>
                        <td className="py-3.5 px-4 text-xs text-zinc-500">
                          {new Date(ev.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-zinc-600">{ev._id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
