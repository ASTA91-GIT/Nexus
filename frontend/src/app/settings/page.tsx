"use client";
import React, { useState } from "react";

export default function SettingsPage() {
  const [theme, setTheme] = useState("DARK");
  const [saveMessage, setSaveMessage] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-white/5 pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Adjust visual styles, backend coordinate endpoints, and local interface properties.
        </p>
      </div>

      {saveMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs">
          System settings saved successfully.
        </div>
      )}

      {/* Settings Panel */}
      <div className="bg-zinc-900/20 border border-white/5 p-6 rounded-2xl">
        <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
          
          {/* Section 1 */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-300 border-b border-white/5 pb-2">🌐 Connection Parameters</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500 font-bold uppercase tracking-wider">FastAPI Host URI</label>
              <input 
                type="text" 
                value={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} 
                disabled
                className="p-3 rounded-xl bg-zinc-950/40 border border-white/10 text-zinc-400 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500 font-bold uppercase tracking-wider">MongoDB Port Mapping</label>
              <input 
                type="text" 
                value="mongodb://127.0.0.1:27018" 
                disabled
                className="p-3 rounded-xl bg-zinc-950/40 border border-white/10 text-zinc-400 font-mono"
              />
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-4 pt-4">
            <h2 className="text-sm font-bold text-zinc-300 border-b border-white/5 pb-2">🎨 Visualization Preferences</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500 font-bold uppercase tracking-wider">Interface Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-zinc-300 focus:outline-none"
              >
                <option value="DARK">Premium Obsidian Dark (Active)</option>
                <option value="LIGHT">Classic Operational Light</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500 font-bold uppercase tracking-wider">WebGL Frame Cap</label>
              <select
                className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-zinc-300 focus:outline-none"
                disabled
              >
                <option value="60">60 FPS (V-Sync Map Rendering)</option>
                <option value="30">30 FPS (Energy Saver Mode)</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit"
            className="w-full mt-4 p-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs transition-all active:scale-[0.98]"
          >
            Apply Preference Configurations
          </button>

        </form>
      </div>
    </div>
  );
}
