"use client";
import React from 'react';
import Link from 'next/link';

export default function HeroContent() {
  return (
    <div className="relative z-10 w-full min-h-screen flex items-center pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Side Content */}
        <div className="flex flex-col justify-center pointer-events-auto">
          {/* Status Indicator */}
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm mb-8 w-max shadow-xl">
            <div className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse"></div>
            <span className="text-xs font-semibold tracking-[0.2em] text-gray-300">
              NEXUS SECURE NETWORK — ONLINE
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-2 leading-none drop-shadow-2xl">
            NEXUS
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-wide bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent mb-6">
            AI-Powered Intelligence<br />& Investigation Platform
          </h2>

          {/* Supporting Text */}
          <p className="text-gray-400 text-lg max-w-lg mb-10 leading-relaxed font-light">
            Transform complex evidence, entities, relationships, and intelligence into actionable investigative insight.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-5">
            <Link 
              href="/login" 
              className="px-8 py-4 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-bold tracking-wide text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all duration-300 hover:-translate-y-0.5 group"
            >
              ENTER NEXUS 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a 
              href="#capabilities" 
              className="px-8 py-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold tracking-wide text-sm flex items-center justify-center backdrop-blur-sm transition-all duration-300"
            >
              EXPLORE PLATFORM
            </a>
          </div>
        </div>

        {/* Right Side - Empty space for the 3D scene to shine */}
        <div className="hidden lg:block"></div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Scroll</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-gray-400 to-transparent"></div>
      </div>
    </div>
  );
}
