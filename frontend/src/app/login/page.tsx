"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper to construct API URLs using dev proxy if needed
  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (isRegistering) {
        // Register user via JSON payload
        const res = await fetch(getApiUrl("/api/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            role: "INVESTIGATOR"
          }),
        });

        if (res.ok) {
          setMessage({ text: "Registration successful! You can now log in.", isError: false });
          setIsRegistering(false);
          setPassword("");
        } else {
          const data = await res.json();
          setMessage({ text: data.detail || "Registration failed", isError: true });
        }
      } else {
        // Login user via URL-encoded form data
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const res = await fetch(getApiUrl("/api/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("token", data.access_token);
          router.push("/dashboard");
        } else {
          const data = await res.json();
          setMessage({ text: data.detail || "Incorrect email or password", isError: true });
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Unable to connect to the backend server. Please make sure it is running.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[var(--text-primary)] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--primary-accent)]/50 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--primary-accent)]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black to-transparent"></div>
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] mask-image-linear-gradient"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header / Logo Area */}
        <div className="flex flex-col items-center gap-4 justify-center mb-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-[var(--primary-accent)]/30 rounded-2xl blur-xl group-hover:bg-[var(--primary-accent)]/50 transition-all duration-500"></div>
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-tr from-[var(--primary-accent)] to-blue-500 flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-[var(--primary-accent)]/20 border border-white/10">
              N
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">NEXUS</h1>
            <p className="text-[10px] font-mono font-bold text-[var(--primary-accent)] uppercase tracking-[0.3em]">
              Intelligence Platform
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[var(--surface-primary)]/80 border border-[var(--border-primary)] p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black backdrop-blur-xl relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--primary-accent)] via-blue-400 to-[var(--primary-accent)] opacity-50"></div>
          
          <h2 className="text-lg font-bold text-center text-[var(--text-primary)] mb-8">
            {isRegistering ? "Register Authorization Profile" : "System Authentication"}
          </h2>

          {message && (
            <div className={`p-4 rounded-xl border mb-6 text-xs font-medium flex items-start gap-3 ${
              message.isError 
                ? "bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]" 
                : "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]"
            }`}>
              <span className="mt-0.5">{message.isError ? "⚠️" : "✓"}</span>
              <p>{message.text}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            {isRegistering && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest pl-1">Agent Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Enter full name" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-3.5 pl-4 rounded-xl bg-[var(--background)] border border-[var(--border-primary)] focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all shadow-inner" 
                    required 
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest pl-1">Clearance Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="agent@nexus.gov" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3.5 pl-4 rounded-xl bg-[var(--background)] border border-[var(--border-primary)] focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all shadow-inner" 
                  required 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest pl-1">Passphrase</label>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="••••••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 pl-4 rounded-xl bg-[var(--background)] border border-[var(--border-primary)] focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all shadow-inner font-mono tracking-widest" 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="group relative overflow-hidden p-4 bg-gradient-to-r from-[var(--primary-accent)] to-blue-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed rounded-xl font-bold mt-2 shadow-lg shadow-[var(--primary-accent)]/20 active:scale-[0.98] transition-all duration-300 w-full"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 group-hover:translate-x-full transition-transform duration-500 -translate-x-full skew-x-12"></div>
              <span className="relative text-white text-sm uppercase tracking-widest font-extrabold flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </>
                ) : isRegistering ? "Initialize Profile" : "Establish Connection"}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border-primary)] text-center text-xs text-[var(--text-tertiary)] flex flex-col items-center gap-2">
            {isRegistering ? (
              <p>
                Have active clearance?{" "}
                <button 
                  onClick={() => { setIsRegistering(false); setMessage(null); }}
                  className="font-bold text-[var(--primary-accent)] hover:text-white transition-colors uppercase tracking-wider ml-1"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                First time access?{" "}
                <button 
                  onClick={() => { setIsRegistering(true); setMessage(null); }}
                  className="font-bold text-[var(--primary-accent)] hover:text-white transition-colors uppercase tracking-wider ml-1"
                >
                  Request Profile
                </button>
              </p>
            )}
            
            <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[var(--text-tertiary)] hover:text-white transition-colors bg-[var(--surface-secondary)] px-3 py-1.5 rounded-full border border-[var(--border-primary)]">
              <span>←</span> Return to Gateway
            </Link>
          </div>
        </div>
        
        {/* Footer Security Notice */}
        <p className="text-center text-[9px] font-mono text-[var(--text-tertiary)] mt-8 uppercase tracking-widest opacity-60">
          SECURE CONNECTION ESTABLISHED • ENCRYPTED CHANNEL
        </p>
      </div>
    </div>
  );
}
