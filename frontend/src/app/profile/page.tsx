"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const { theme, setTheme } = useTheme();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [preferences, setPreferences] = useState({
    animations: true,
    effects3d: true,
    notifications: true,
    aiSuggestions: true,
  });

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    // Fetch Audit logs for Activity Tab
    const fetchLogs = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        setLoadingLogs(true);
        const res = await fetch(getApiUrl("/api/audit/"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoadingLogs(false);
      }
    };
    
    if (activeTab === "ACTIVITY") {
      fetchLogs();
    }
  }, [activeTab]);

  const togglePref = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 pb-12">
      
      {/* HEADER SECTION */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-lg">
        <div className="h-32 bg-gradient-to-r from-[var(--primary-accent)] to-purple-600 relative">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="px-8 pb-8 flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-[var(--surface-primary)] p-1.5 shadow-xl">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-[var(--primary-accent)] to-purple-600 flex items-center justify-center text-white font-black text-3xl">
              AD
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-3xl font-black text-[var(--text-primary)]">Admin Investigator</h1>
            <p className="text-sm text-[var(--text-secondary)] font-medium">admin@nexus-intel.local</p>
            <div className="flex gap-4 mt-2 text-[11px] font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
              <span>Role: Global Admin</span>
              <span>Status: <span className="text-[var(--success)]">Active</span></span>
              <span>Last Login: Just now</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-xs font-bold rounded-lg border border-[var(--border-primary)] transition-colors">
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-[var(--border-primary)]">
        {["OVERVIEW", "ACTIVITY", "SECURITY", "PREFERENCES"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab 
                ? "border-[var(--primary-accent)] text-[var(--primary-accent)] bg-[var(--primary-accent)]/5" 
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="min-h-[400px]">
        {activeTab === "OVERVIEW" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Cases Created</span>
              <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">14</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Cases Assigned</span>
              <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">22</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Evidence Uploaded</span>
              <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">186</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Reports Generated</span>
              <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">42</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm col-span-1 sm:col-span-2">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">AI Investigation Queries</span>
              <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">891</p>
            </div>
          </div>
        )}

        {activeTab === "ACTIVITY" && (
          <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Platform Audit Log</h3>
            </div>
            {loadingLogs ? (
              <div className="p-12 text-center text-[var(--text-secondary)]">Loading secure logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-tertiary)] italic">No activity recorded.</div>
            ) : (
              <div className="divide-y divide-[var(--border-primary)] max-h-[600px] overflow-y-auto">
                {logs.map(log => (
                  <div key={log._id} className="px-6 py-4 flex justify-between items-start hover:bg-[var(--surface-secondary)]/50">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{log.action}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{log.resource}</p>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "SECURITY" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Update Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full mt-1 bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm rounded-lg p-2.5 focus:outline-none focus:border-[var(--primary-accent)]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full mt-1 bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm rounded-lg p-2.5 focus:outline-none focus:border-[var(--primary-accent)]" />
                </div>
                <button className="px-4 py-2 bg-[var(--primary-accent)] text-white text-sm font-bold rounded-lg shadow hover:bg-[var(--primary-hover)] transition-colors">
                  Update Security Credentials
                </button>
              </div>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Active Sessions</h3>
              <div className="p-4 border border-[var(--primary-accent)]/30 bg-[var(--primary-accent)]/5 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Current Session (Windows 11)</p>
                  <p className="text-xs text-[var(--text-secondary)]">IP: 192.168.1.144</p>
                </div>
                <span className="text-[10px] font-bold text-[var(--success)] uppercase tracking-wider">Active Now</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "PREFERENCES" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">Appearance</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Interface Theme</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Select your preferred color scheme.</p>
                  </div>
                  <div className="flex bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-lg p-1">
                    {(["light", "dark", "system"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md capitalize transition-colors ${
                          theme === t ? "bg-[var(--surface-primary)] text-[var(--primary-accent)] shadow-sm" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-primary)]">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">UI Animations</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Enable micro-interactions and transitions.</p>
                  </div>
                  <button 
                    onClick={() => togglePref("animations")}
                    className={`w-12 h-6 rounded-full relative transition-colors ${preferences.animations ? "bg-[var(--success)]" : "bg-[var(--border-primary)]"}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.animations ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-primary)]">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">3D Canvas Effects</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">High fidelity network rendering.</p>
                  </div>
                  <button 
                    onClick={() => togglePref("effects3d")}
                    className={`w-12 h-6 rounded-full relative transition-colors ${preferences.effects3d ? "bg-[var(--success)]" : "bg-[var(--border-primary)]"}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.effects3d ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-6">System Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Push Notifications</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Alerts for risk updates and tasks.</p>
                  </div>
                  <button 
                    onClick={() => togglePref("notifications")}
                    className={`w-12 h-6 rounded-full relative transition-colors ${preferences.notifications ? "bg-[var(--success)]" : "bg-[var(--border-primary)]"}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.notifications ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-primary)]">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">NEXUS AI Suggestions</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Show proactive query suggestions in chat.</p>
                  </div>
                  <button 
                    onClick={() => togglePref("aiSuggestions")}
                    className={`w-12 h-6 rounded-full relative transition-colors ${preferences.aiSuggestions ? "bg-[var(--success)]" : "bg-[var(--border-primary)]"}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.aiSuggestions ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
