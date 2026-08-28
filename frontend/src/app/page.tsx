"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-zinc-950 to-black text-white font-sans overflow-x-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg tracking-wider text-white shadow-lg shadow-blue-500/20">
              N
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              NEXUS
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Access Platform
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-pulse">
          <span>AI-Powered Intelligence Engine</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight max-w-4xl mx-auto">
          Unveil Hidden Connections with{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Graph Intelligence
          </span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          NEXUS is a next-generation intelligence and investigation platform featuring 3D network visualization, automated risk analysis, AI-driven entity extraction, and secure evidence management.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full font-bold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Launch Investigation Dashboard
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 rounded-full font-bold transition-all duration-300"
          >
            Create Investigator Account
          </Link>
        </div>

        {/* Dashboard Preview mockup */}
        <div className="relative rounded-2xl border border-white/10 bg-zinc-900/40 p-2 backdrop-blur-sm max-w-5xl mx-auto overflow-hidden shadow-2xl shadow-blue-500/5">
          <div className="rounded-xl border border-white/5 bg-black/40 overflow-hidden aspect-video flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold mb-4 text-2xl animate-bounce">
              3D
            </div>
            <h3 className="text-xl font-bold mb-2">Interactive 3D Link Analysis</h3>
            <p className="text-zinc-500 text-sm max-w-md text-center">
              Navigate networks of entities and relationships dynamically in a high-performance WebGL environment powered by Three.js.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-black/40 border-y border-white/5 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Powerful Forensic Capabilities</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Designed for investigators, researchers, and intelligence analysts.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-white/10 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold mb-6 group-hover:scale-110 transition-transform">
                🌐
              </div>
              <h3 className="text-xl font-bold mb-3">3D Network Graphs</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Visualize entities (Persons, Organizations, locations) and their communication/financial linkages in an immersive 3D space with React Three Fiber.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-white/10 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold mb-6 group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <h3 className="text-xl font-bold mb-3">AI Entity Extraction</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Ingest unstructured text files and PDFs, and automatically detect names, organizations, and telephone numbers using Hugging Face NLP models.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-white/10 transition-all duration-300 group">
              <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold mb-6 group-hover:scale-110 transition-transform">
                🚨
              </div>
              <h3 className="text-xl font-bold mb-3">Network Centrality Risk</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Leverage graph algorithms to analyze node centrality, calculate threat score matrices, and raise automated alerts on high-risk nodes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 px-6 bg-black text-center text-zinc-600 text-sm">
        <p className="max-w-7xl mx-auto">
          &copy; {new Date().getFullYear()} NEXUS Intelligence Platforms. All rights reserved. Configured with secure local database storage.
        </p>
      </footer>
    </div>
  );
}
