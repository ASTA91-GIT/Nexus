import json

file_path = 'frontend/src/app/profile/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    original = f.read()

# We will just write a new updated file for profile page
new_file_content = '''"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const { theme, setTheme } = useTheme();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  const [preferences, setPreferences] = useState({
    defaultView: "Graph",
    animations: true,
    autoSave: true,
    aiDetail: "Detailed",
    timelineLayout: "Chronological",
    
    notifyHighRisk: true,
    notifyAnomalies: true,
    notifyRelationships: true,
    notifyEvidence: true,
    notifyCaseUpdates: false,
  });

  const [stats, setStats] = useState({
    cases_created: 0,
    cases_assigned: 0,
    evidence_uploaded: 0,
    reports_generated: 0,
    ai_queries: 0
  });
  const [userProfile, setUserProfile] = useState<any>(null);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return ${baseUrl};
  };

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      try {
        // Fetch User Profile
        const meRes = await fetch(getApiUrl("/api/auth/me"), {
          headers: { Authorization: Bearer  }
        });
        if (meRes.ok) {
          const userData = await meRes.json();
          setUserProfile(userData);
        }

        // Fetch Stats
        const statsRes = await fetch(getApiUrl("/api/stats/"), {
          headers: { Authorization: Bearer  }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Failed to fetch profile and stats", err);
      }
    };

    fetchProfileAndStats();

    // Fetch Audit logs for Activity Tab
    const fetchLogs = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        setLoadingLogs(true);
        const res = await fetch(getApiUrl("/api/audit/"), {
          headers: { Authorization: Bearer  }
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
    
    // Fetch Cases for Recent Activity
    const fetchCases = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        setLoadingCases(true);
        const res = await fetch(getApiUrl("/api/cases/"), {
          headers: { Authorization: Bearer  }
        });
        if (res.ok) {
          const data = await res.json();
          setRecentCases(data);
        }
      } catch (err) {
        console.error("Failed to fetch cases", err);
      } finally {
        setLoadingCases(false);
      }
    };

    if (activeTab === "ACTIVITY") fetchLogs();
    if (activeTab === "OVERVIEW") fetchCases();
    
  }, [activeTab]);

  const togglePref = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] as never }));
  };

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    const savedAvatar = localStorage.getItem("user_avatar");
    if (savedAvatar) {
      setAvatarDataUrl(savedAvatar);
    }
  }, []);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }
    
    setFileToUpload(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!fileToUpload) return;
    
    const token = localStorage.getItem("token");
    if (!token) return;
    const formData = new FormData();
    formData.append("file", fileToUpload);
    
    try {
      const res = await fetch(getApiUrl("/api/auth/profile/avatar"), {
        method: "POST",
        headers: { Authorization: Bearer  },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.avatar_url) {
          setAvatarDataUrl(data.avatar_url);
          localStorage.setItem("user_avatar", data.avatar_url);
          window.dispatchEvent(new Event("avatar-updated"));
          setPreviewAvatar(null);
          setFileToUpload(null);
        }
      }
    } catch (err) {
      console.error("Failed to upload avatar", err);
    }
  };
  
  const handleRemoveAvatar = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const res = await fetch(getApiUrl("/api/auth/profile/avatar"), {
        method: "DELETE",
        headers: { Authorization: Bearer  }
      });
      if (res.ok) {
        setAvatarDataUrl(null);
        localStorage.removeItem("user_avatar");
        window.dispatchEvent(new Event("avatar-updated"));
      }
    } catch (err) {
      console.error("Failed to remove avatar", err);
    }
  };

  // Filter logs & cases for the active user
  const personalLogs = logs.filter(log => log.email === userProfile?.email);
  const personalCases = recentCases.filter(c => c.created_by === userProfile?.email || c.investigator === userProfile?.email).slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 pb-12">
      
      {/* HEADER SECTION */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-lg">
        <div className="h-32 bg-gradient-to-r from-[var(--accent-primary)] to-purple-600 relative">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="px-8 pb-8 flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 relative z-10">
          
          <div className="relative group shrink-0 block">
            <label className="w-24 h-24 rounded-2xl bg-[var(--surface-primary)] p-1.5 shadow-xl cursor-pointer overflow-hidden block">
              <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleAvatarSelect} />
              
              {(previewAvatar || avatarDataUrl) && (previewAvatar !== "null" && avatarDataUrl !== "null") ? (
                <img src={previewAvatar || avatarDataUrl as string} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 flex items-center justify-center text-white font-black text-3xl uppercase">
                  {userProfile?.email ? userProfile.email.substring(0, 2) : "AD"}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                <i className="fa-solid fa-camera text-white"></i>
              </div>
            </label>
            
            {/* Avatar Actions Overlay */}
            {previewAvatar && (
              <div className="absolute top-28 left-0 right-0 flex justify-center gap-2 z-20">
                <button onClick={handleSaveAvatar} className="px-3 py-1 bg-[var(--success)] text-white text-[10px] font-bold rounded shadow uppercase tracking-wider hover:brightness-110">Save</button>
                <button onClick={() => { setPreviewAvatar(null); setFileToUpload(null); }} className="px-3 py-1 bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] text-[10px] font-bold rounded shadow uppercase tracking-wider hover:bg-[var(--surface-tertiary)]">Cancel</button>
              </div>
            )}
            {!previewAvatar && avatarDataUrl && (
              <div className="absolute top-28 left-0 right-0 flex justify-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleRemoveAvatar} className="px-3 py-1 bg-[var(--danger)]/90 text-white text-[10px] font-bold rounded shadow uppercase tracking-wider hover:brightness-110 flex items-center gap-1"><i className="fa-solid fa-trash text-[8px]"></i> Remove</button>
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-1">
            <h1 className="text-3xl font-black text-[var(--text-primary)] capitalize">
              {userProfile?.role === "ADMIN" ? "Admin Investigator" : "Investigator"}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] font-medium">{userProfile?.email || "admin@nexus-intel.local"}</p>
            <div className="flex gap-4 mt-2 text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Role: {userProfile?.role || "Global Admin"}</span>
              <span>Status: <span className="text-[var(--success)]">Active</span></span>
              <span>Joined: {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : "Just now"}</span>
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
      <div className="flex gap-2 border-b border-[var(--border-primary)] overflow-x-auto no-scrollbar">
        {["OVERVIEW", "ACTIVITY", "SECURITY", "PREFERENCES"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="min-h-[400px]">
        {activeTab === "OVERVIEW" && (
          <div className="flex flex-col gap-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cases Created</span>
                <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">{stats.cases_created}</p>
              </div>
              <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cases Assigned</span>
                <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">{stats.cases_assigned}</p>
              </div>
              <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Evidence Uploaded</span>
                <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">{stats.evidence_uploaded}</p>
              </div>
              <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Reports Generated</span>
                <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">{stats.reports_generated}</p>
              </div>
              <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-6 shadow-sm col-span-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">AI Investigation Queries</span>
                <p className="text-4xl font-black mt-2 text-[var(--text-primary)]">{stats.ai_queries}</p>
              </div>
            </div>

            {/* Investigator Profile Details */}
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Investigator Profile</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Investigator ID</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">{userProfile?._id ? NX-INV- : "NX-INV-2048"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Clearance Level</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">LEVEL {userProfile?.role === "ADMIN" ? "5" : "3"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Department / Team</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">DIGITAL INVESTIGATIONS</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Account Status</p>
                  <p className="text-sm font-semibold text-[var(--success)] mt-1 uppercase">ACTIVE</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Security Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">92%</p>
                    <div className="h-1.5 w-24 bg-[var(--surface-tertiary)] rounded-full overflow-hidden"><div className="h-full bg-[var(--success)] w-[92%]"></div></div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Last Login</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">Today, {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            </div>

            {/* Recent Case Activity */}
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Recent Case Activity</h3>
              </div>
              
              {loadingCases ? (
                <div className="p-8 text-center text-[var(--text-secondary)] text-sm">Fetching active cases...</div>
              ) : personalCases.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)] italic text-sm">No recent case activity found for this investigator.</div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {personalCases.map(c => (
                    <div key={c._id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-[var(--surface-secondary)]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shadow-sm">
                          <i className="fa-solid fa-briefcase"></i>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{c.name}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">ID: {c._id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-4 sm:mt-0">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</p>
                          <p className="text-xs font-semibold text-[var(--success)] mt-1">{c.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Risk Level</p>
                          <p className={	ext-xs font-semibold mt-1 }>{c.priority}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Last Activity</p>
                          <p className="text-xs font-semibold text-[var(--text-primary)] mt-1">{new Date(c.updated_at).toLocaleDateString()}</p>
                        </div>
                        <button className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"><i className="fa-solid fa-chevron-right"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ACTIVITY" && (
          <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Chronological Activity Timeline</h3>
            </div>
            {loadingLogs ? (
              <div className="p-12 text-center text-[var(--text-secondary)]">Loading secure logs...</div>
            ) : personalLogs.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)] italic">No recent activity available for your account.</div>
            ) : (
              <div className="p-6">
                <div className="relative border-l-2 border-[var(--border-primary)] ml-3 space-y-8 pb-4">
                  {personalLogs.map((log, idx) => {
                    let icon = "fa-circle-dot";
                    let color = "text-[var(--text-muted)]";
                    let bg = "bg-[var(--surface-tertiary)]";
                    
                    if(log.action.includes("LOGIN")) { icon = "fa-right-to-bracket"; color = "text-[var(--success)]"; bg = "bg-[var(--success)]/20"; }
                    else if(log.action.includes("CASE")) { icon = "fa-folder-open"; color = "text-[var(--accent-primary)]"; bg = "bg-[var(--accent-primary)]/20"; }
                    else if(log.action.includes("EVIDENCE")) { icon = "fa-paperclip"; color = "text-[var(--warning)]"; bg = "bg-[var(--warning)]/20"; }
                    else if(log.action.includes("QUERY") || log.action.includes("AI")) { icon = "fa-robot"; color = "text-purple-500"; bg = "bg-purple-500/20"; }

                    return (
                      <div key={log._id} className="relative pl-8">
                        <div className={bsolute -left-[13px] top-1 w-6 h-6 rounded-full border-2 border-[var(--surface-primary)] flex items-center justify-center }>
                          <i className={a-solid  text-[10px] }></i>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 bg-[var(--surface-hover)] p-4 rounded-xl border border-[var(--border-primary)]">
                          <div>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{log.action}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">{log.resource}</p>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono font-bold whitespace-nowrap bg-[var(--surface-primary)] px-2 py-1 rounded shadow-sm">
                            {new Date(log.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "SECURITY" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Account Security</h3>
                </div>
                <div className="divide-y divide-[var(--border-primary)]">
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">Password</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Last updated 3 months ago</p>
                    </div>
                    <button className="px-3 py-1.5 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition-colors">Change Password</button>
                  </div>
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">Two-Factor Authentication</p>
                      <p className="text-xs text-[var(--success)] font-bold mt-1 flex items-center gap-1"><i className="fa-solid fa-shield-check"></i> Enabled via App</p>
                    </div>
                    <button className="px-3 py-1.5 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition-colors">Manage</button>
                  </div>
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">Email Verification</p>
                      <p className="text-xs text-[var(--success)] font-bold mt-1">Verified ({userProfile?.email})</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm h-fit">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Active Sessions</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 rounded-lg flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="text-xl text-[var(--accent-primary)] mt-1"><i className="fa-brands fa-windows"></i></div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">Windows 11 • Edge Browser</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Location: Local Network (192.168.1.144)</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono mt-2">Current Session</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--success)] uppercase tracking-wider bg-[var(--success)]/10 px-2 py-1 rounded">Active Now</span>
                </div>
                <button className="w-full py-2.5 text-center text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-colors">Revoke All Other Sessions</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "PREFERENCES" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm h-fit">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Investigation Settings</h3>
              </div>
              <div className="p-6 space-y-6">
                
                <div>
                  <label className="text-sm font-bold text-[var(--text-primary)] block mb-1">Default Investigation View</label>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Preferred startup layout for cases.</p>
                  <div className="flex bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-lg p-1">
                    {(["Graph", "Timeline", "Map"] as const).map(t => (
                      <button key={t} onClick={() => setPreferences({...preferences, defaultView: t})} className={lex-1 py-1.5 text-xs font-bold rounded-md transition-colors }>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-primary)]">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Auto-Save Investigation</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Automatically save node layouts.</p>
                  </div>
                  <button onClick={() => togglePref("autoSave")} className={w-12 h-6 rounded-full relative transition-colors }>
                    <div className={bsolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform } />
                  </button>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-primary)]">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">Graph Animation</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Enable physics-based node movement.</p>
                  </div>
                  <button onClick={() => togglePref("animations")} className={w-12 h-6 rounded-full relative transition-colors }>
                    <div className={bsolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform } />
                  </button>
                </div>
                
              </div>
            </div>

            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden shadow-sm h-fit">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Notification Settings</h3>
              </div>
              <div className="p-6 space-y-6">
                {[
                  { key: "notifyHighRisk", label: "High Risk Entity Alerts", desc: "Alert when a new high-risk entity is detected." },
                  { key: "notifyAnomalies", label: "Anomaly Detection Alerts", desc: "Notify on unusual behavioral patterns." },
                  { key: "notifyRelationships", label: "New Relationship Alerts", desc: "Notify when unknown connections are found." },
                  { key: "notifyEvidence", label: "Evidence Processing", desc: "Alert when OCR or extraction completes." },
                  { key: "notifyCaseUpdates", label: "Case Updates", desc: "Receive email digests for assigned cases." }
                ].map(setting => (
                  <div key={setting.key} className="flex justify-between items-center pb-4 border-b border-[var(--border-primary)] last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{setting.label}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{setting.desc}</p>
                    </div>
                    <button onClick={() => togglePref(setting.key as any)} className={w-12 h-6 rounded-full relative transition-colors shrink-0 }>
                      <div className={bsolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform } />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
'''

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_file_content)

print('Profile Page updated successfully')
