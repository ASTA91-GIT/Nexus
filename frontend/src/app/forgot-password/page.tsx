"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-background)] text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-y-auto font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black to-transparent"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center my-8">
        {/* Header / Logo Area */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative flex items-center justify-center h-16 w-16 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xl">
            <i className="fa-solid fa-shield-halved text-3xl text-blue-500"></i>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wider text-slate-100">NEXUS OS</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mt-1">
              Secure Password Recovery
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-2xl shadow-2xl relative">
          
          <h2 className="text-lg font-semibold text-slate-100 mb-2 text-center">
            Identity Verification
          </h2>

          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <i className="fa-solid fa-envelope-circle-check text-5xl text-[var(--success)] mb-2"></i>
              <p className="text-sm text-slate-300">
                If an account exists for <span className="font-bold text-white">{email}</span>, a secure recovery link has been dispatched.
              </p>
              <Link href="/login" className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors text-xs uppercase tracking-wider">
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                  <input 
                    type="email" 
                    placeholder="agent@nexus-intel.gov" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 pl-11 rounded-lg bg-[var(--app-background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-200 placeholder-slate-600 transition-all" 
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="mt-4 p-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all duration-200 w-full flex items-center justify-center gap-2 text-white text-sm uppercase tracking-wider"
              >
                <i className="fa-solid fa-paper-plane"></i>
                Dispatch Recovery Link
              </button>

              <div className="flex justify-center mt-2">
                <Link href="/login" className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors uppercase font-bold tracking-wider">
                  <i className="fa-solid fa-arrow-left mr-1"></i> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer Security Notice */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-shield-halved"></i> 256-BIT ENCRYPTED CHANNEL
          </p>
        </div>
      </div>
    </div>
  );
}
