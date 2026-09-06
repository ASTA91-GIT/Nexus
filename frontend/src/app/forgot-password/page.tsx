"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const router = useRouter();

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(getApiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Whether success or failure, we show success text and redirect (to prevent email enumeration)
      sessionStorage.setItem("reset_email", email);
      setMessage({ text: "If the email is registered, a verification OTP has been sent.", isError: false });
      
      setTimeout(() => {
        router.push("/verify-otp");
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Unable to connect to the backend server.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-background)] text-[var(--text-primary)] dark:text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-y-auto font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t dark:from-black from-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center my-8">
        {/* Header / Logo Area */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative flex items-center justify-center h-16 w-16 rounded-xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-xl">
            <i className="fa-solid fa-shield-halved text-3xl text-blue-500"></i>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wider dark:text-slate-100 text-[var(--text-primary)]">NEXUS OS</h1>
            <p className="text-xs font-mono dark:text-slate-400 text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">
              Secure Password Recovery
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full bg-[var(--surface-primary)] border border-[var(--border)] p-8 rounded-2xl shadow-2xl relative">
          
          <h2 className="text-lg font-semibold dark:text-slate-100 text-[var(--text-primary)] mb-2 text-center">
            Identity Verification
          </h2>

          {message && (
            <div className={`mt-4 p-4 rounded-lg border mb-2 text-xs font-medium flex items-start gap-3 ${
              message.isError 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}>
              <i className={`fa-solid mt-0.5 ${message.isError ? "fa-triangle-exclamation" : "fa-circle-check"}`}></i>
              <p>{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold dark:text-slate-400 text-[var(--text-muted)] uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500 text-[var(--text-muted)] text-sm"></i>
                <input 
                  type="email" 
                  placeholder="agent@nexus-intel.gov" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3.5 pl-11 rounded-lg bg-[var(--app-background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm dark:text-slate-200 text-[var(--text-primary)] placeholder-slate-600 transition-all" 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 disabled:text-blue-200/40 disabled:cursor-not-allowed rounded-lg font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all duration-200 w-full flex items-center justify-center gap-2 text-white text-sm uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane mr-2"></i>
                  Send Verification OTP
                </>
              )}
            </button>

            <div className="flex justify-center mt-2">
              <Link href="/login" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold tracking-wider">
                <i className="fa-solid fa-arrow-left mr-1"></i> Back to Login
              </Link>
            </div>
          </form>
        </div>
        
        {/* Footer Security Notice */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-center text-[10px] font-mono dark:text-slate-500 text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-shield-halved"></i> 256-BIT ENCRYPTED CHANNEL
          </p>
        </div>
      </div>
    </div>
  );
}
