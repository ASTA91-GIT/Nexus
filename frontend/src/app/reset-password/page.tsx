"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("reset_token");
    if (!token) {
      router.push("/forgot-password");
    } else {
      setResetToken(token);
    }
  }, [router]);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    return score;
  };

  const strength = getPasswordStrength();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", isError: true });
      return;
    }
    if (strength < 5) {
      setMessage({ text: "Password does not meet all security requirements.", isError: true });
      return;
    }
    
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(getApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: resetToken, new_password: password }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        sessionStorage.removeItem("reset_token");
        sessionStorage.removeItem("reset_email");
        setMessage({ text: "Password has been updated successfully.", isError: false });
      } else {
        setMessage({ text: data.detail || "Failed to reset password. The session may have expired.", isError: true });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Unable to connect to the backend server.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) return null; // Avoid flicker

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
            <i className="fa-solid fa-lock text-3xl text-blue-500"></i>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wider dark:text-slate-100 text-[var(--text-primary)]">CREATE NEW PASSWORD</h1>
            <p className="text-xs font-mono dark:text-slate-400 text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">
              Secure Intelligence Platform
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full bg-[var(--surface-primary)] border border-[var(--border)] p-8 rounded-2xl shadow-2xl relative">
          
          <h2 className="text-lg font-semibold dark:text-slate-100 text-[var(--text-primary)] mb-6 text-center">
            Secure Account
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

          {success ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <Link href="/login" className="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-white text-sm uppercase tracking-wider">
                <i className="fa-solid fa-right-to-bracket"></i> Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold dark:text-slate-400 text-[var(--text-muted)] uppercase tracking-widest pl-1">New Password</label>
                <div className="relative">
                  <i className="fa-solid fa-key absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500 text-[var(--text-muted)] text-xs"></i>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 pl-10 pr-10 rounded-lg bg-[var(--app-background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs dark:text-slate-200 text-[var(--text-primary)] placeholder-slate-600 transition-all font-mono tracking-widest" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-[var(--text-muted)] hover:dark:text-slate-300 text-[var(--text-secondary)] transition-colors">
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-1 h-1.5 w-full">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div key={level} className={`flex-1 rounded-full ${strength >= level ? (strength === 5 ? "bg-emerald-500" : strength >= 3 ? "bg-blue-500" : "bg-red-500") : "bg-[var(--border)]"}`}></div>
                      ))}
                    </div>
                    <div className="text-[9px] font-mono dark:text-slate-500 text-[var(--text-muted)] space-y-1">
                      <p className={password.length >= 8 ? "text-emerald-400" : ""}>
                        <i className={`fa-solid mr-1 ${password.length >= 8 ? "fa-check" : "fa-xmark"}`}></i> 8+ characters
                      </p>
                      <p className={/[A-Z]/.test(password) ? "text-emerald-400" : ""}>
                        <i className={`fa-solid mr-1 ${/[A-Z]/.test(password) ? "fa-check" : "fa-xmark"}`}></i> Uppercase letter
                      </p>
                      <p className={/[a-z]/.test(password) ? "text-emerald-400" : ""}>
                        <i className={`fa-solid mr-1 ${/[a-z]/.test(password) ? "fa-check" : "fa-xmark"}`}></i> Lowercase letter
                      </p>
                      <p className={/\d/.test(password) ? "text-emerald-400" : ""}>
                        <i className={`fa-solid mr-1 ${/\d/.test(password) ? "fa-check" : "fa-xmark"}`}></i> Number
                      </p>
                      <p className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-emerald-400" : ""}>
                        <i className={`fa-solid mr-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "fa-check" : "fa-xmark"}`}></i> Special character
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold dark:text-slate-400 text-[var(--text-muted)] uppercase tracking-widest pl-1">Confirm Password</label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500 text-[var(--text-muted)] text-xs"></i>
                  <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2.5 pl-10 pr-10 rounded-lg bg-[var(--app-background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs dark:text-slate-200 text-[var(--text-primary)] placeholder-slate-600 transition-all font-mono tracking-widest" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-[var(--text-muted)] hover:dark:text-slate-300 text-[var(--text-secondary)] transition-colors">
                    <i className={`fa-solid ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
                
                {confirmPassword && (
                  <p className={`text-[9px] font-mono mt-1 ${password === confirmPassword ? "text-emerald-400" : "text-red-400"}`}>
                    <i className={`fa-solid mr-1 ${password === confirmPassword ? "fa-check" : "fa-triangle-exclamation"}`}></i>
                    {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading || strength < 5 || password !== confirmPassword}
                className="mt-4 p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 disabled:text-blue-200/40 disabled:cursor-not-allowed rounded-lg font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all duration-200 w-full flex items-center justify-center gap-2 text-white text-sm uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                    Resetting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk mr-2"></i>
                    Save New Password
                  </>
                )}
              </button>
              
              <div className="flex justify-center mt-2 border-t border-[var(--border)] pt-4">
                <Link href="/login" className="text-[10px] dark:text-slate-400 text-slate-500 hover:dark:text-slate-300 hover:text-slate-600 transition-colors uppercase font-bold tracking-wider">
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer Security Notice */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-center text-[10px] font-mono dark:text-slate-500 text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-shield-halved mr-1"></i> 256-BIT ENCRYPTED CHANNEL
          </p>
        </div>
      </div>
    </div>
  );
}
