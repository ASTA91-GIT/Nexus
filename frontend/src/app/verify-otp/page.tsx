"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const router = useRouter();

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("reset_email");
    if (!storedEmail) {
      router.push("/forgot-password");
    } else {
      setEmail(storedEmail);
    }
  }, [router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setMessage({ text: "Please enter a valid 6-digit OTP.", isError: true });
      return;
    }
    
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(getApiUrl("/api/auth/verify-reset-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      
      if (res.ok) {
        sessionStorage.setItem("reset_token", data.reset_token);
        setMessage({ text: "OTP Verified. Redirecting...", isError: false });
        setTimeout(() => {
          router.push("/reset-password");
        }, 1500);
      } else {
        setMessage({ text: data.detail || "Invalid or expired OTP.", isError: true });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Unable to connect to the backend server.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    
    setResending(true);
    setMessage(null);

    try {
      const res = await fetch(getApiUrl("/api/auth/resend-reset-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ text: data.message || "A new OTP has been sent.", isError: false });
        setCooldown(60);
      } else {
        setMessage({ text: data.detail || "Failed to resend OTP.", isError: true });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Unable to connect to the backend server.", isError: true });
    } finally {
      setResending(false);
    }
  };

  if (!email) return null; // Avoid flicker before redirect

  return (
    <div className="min-h-screen bg-[var(--app-background)] dark:text-slate-200 text-[var(--text-primary)] flex flex-col items-center justify-center p-6 relative overflow-y-auto font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t dark:from-black from-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]"></div>
      </div>

      <div className="w-full relative z-10 flex flex-col items-center my-8 max-w-md">
        {/* Header / Logo Area */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative flex items-center justify-center h-16 w-16 rounded-xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-xl">
            <i className="fa-solid fa-shield-halved text-3xl text-blue-500"></i>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wider dark:text-slate-100 text-[var(--text-primary)]">VERIFY OTP</h1>
            <p className="text-xs font-mono dark:text-slate-400 text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">
              Secure Intelligence Platform
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full bg-[var(--surface-primary)] border border-[var(--border)] p-8 rounded-2xl shadow-2xl relative">
          
          <h2 className="text-lg font-semibold dark:text-slate-100 text-[var(--text-primary)] mb-6 text-center">
            Verify Identity
          </h2>

          {message && (
            <div className={`p-4 rounded-lg border mb-6 text-xs font-medium flex items-start gap-3 ${
              message.isError 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}>
              <i className={`fa-solid mt-0.5 ${message.isError ? "fa-triangle-exclamation" : "fa-circle-check"}`}></i>
              <p>{message.text}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 text-center items-center py-2">
              <i className="fa-solid fa-envelope-open-text text-4xl text-blue-500 mb-2"></i>
              <p className="text-sm dark:text-slate-300 text-[var(--text-secondary)]">
                We've sent a 6-digit OTP to<br/>
                <span className="font-bold">{email.replace(/(.{2})(.*)(?=@)/, (match, p1, p2) => p1 + p2.replace(/./g, '*'))}</span>
              </p>
              <div className="relative w-48 mt-4">
                <input 
                  type="text" 
                  maxLength={6}
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-3.5 rounded-lg bg-[var(--app-background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-2xl text-center dark:text-slate-200 text-[var(--text-primary)] tracking-widest font-mono" 
                  placeholder="000000" 
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
                  Verifying...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check-to-slot mr-2"></i>
                  Verify OTP
                </>
              )}
            </button>
            
            <div className="flex justify-center mt-2">
              <button 
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${cooldown > 0 ? "dark:text-slate-500 text-slate-400 cursor-not-allowed" : "text-blue-400 hover:text-blue-300"}`}
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : resending ? "Resending..." : "Resend OTP"}
              </button>
            </div>
            
            <div className="flex justify-center mt-4 border-t border-[var(--border)] pt-4">
              <Link href="/login" className="text-[10px] dark:text-slate-400 text-slate-500 hover:dark:text-slate-300 hover:text-slate-600 transition-colors uppercase font-bold tracking-wider">
                Cancel
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
