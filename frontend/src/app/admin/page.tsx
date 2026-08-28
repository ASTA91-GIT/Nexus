"use client";
import React, { useState, useEffect, useCallback } from "react";

export default function AdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const fetchAuditLogs = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const res = await fetch(getApiUrl("/api/audit/"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        setMessage("Unauthorized access to audit registries.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error loading audit logs from API server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Security & Audit Logs Portal</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Monitor investigator logins, case file updates, and dataset ingestion lifecycle records.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
          {message}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: System Health and Roles */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-zinc-300 flex items-center gap-2">
              <span>🛡️</span> Security Context
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-950/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-zinc-500">Access Role</span>
                <span className="font-bold text-blue-400 font-mono">INVESTIGATOR</span>
              </div>
              <div className="p-3 bg-zinc-950/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-zinc-500">Session Mode</span>
                <span className="font-bold text-emerald-400 font-mono">SECURE JWT</span>
              </div>
              <div className="p-3 bg-zinc-950/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-zinc-500">Rate Limiter</span>
                <span className="font-bold text-zinc-400 font-mono">ACTIVE (100/m)</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-zinc-300 flex items-center gap-2">
              <span>🖥️</span> System Resource Index
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-950/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-zinc-500">FastAPI Host</span>
                <span className="font-bold text-white font-mono">UVICORN 127.0.0.1</span>
              </div>
              <div className="p-3 bg-zinc-950/40 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-zinc-500">MongoDB Core</span>
                <span className="font-bold text-white font-mono">v8.2 (27018)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Audit Logs checklist */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl flex-grow">
            <h2 className="text-base font-bold text-zinc-300 mb-6 flex items-center gap-2">
              <span>📋</span> Investigator Action Log Registry
            </h2>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <span className="text-xs text-zinc-500 font-mono">Loading audit logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 border border-dashed border-white/5 rounded-xl text-center text-zinc-600 text-xs italic">
                No security audit records logged in the database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-zinc-400">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-semibold uppercase tracking-wider font-mono">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User Email</th>
                      <th className="py-3 px-4 text-center">Action Code</th>
                      <th className="py-3 px-4">Target Resource</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-zinc-300">{log.email}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded bg-zinc-950 border border-white/10 text-blue-400 font-extrabold text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 truncate max-w-[200px]">{log.resource}</td>
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
