"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [activeTab, setActiveTab] = useState<"INVESTIGATOR" | "ADMIN">("INVESTIGATOR");
  const [mode, setMode] = useState<"LOGIN" | "REGISTER" | "MFA">("LOGIN");
  const [mfaCode, setMfaCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Additional Registration Fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [designation, setDesignation] = useState("");
  const [country, setCountry] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "REGISTER") {
      return handleRegister();
    }
    
    setMessage(null);
    setLoading(true);

    try {
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
        
        // Basic JWT decode to check role
        try {
          const payloadBase64 = data.access_token.split('.')[1];
          const payload = JSON.parse(atob(payloadBase64));
          
          if (activeTab === "ADMIN" && payload.role !== "ADMIN") {
             setMessage({ text: "Access Denied: You do not have Administrator privileges.", isError: true });
             setLoading(false);
             return;
          }
        } catch (e) {
          console.error("Failed to parse JWT", e);
        }

        setTempToken(data.access_token);
        setMode("MFA");
      } else {
        const data = await res.json();
        setMessage({ text: data.detail || "Incorrect email or password", isError: true });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Unable to connect to the backend server. Please make sure it is running.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setMessage(null);
    
    // Client-side validation
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", isError: true });
      return;
    }
    
    if (strength < 5) {
      setMessage({ text: "Password does not meet all security requirements.", isError: true });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email,
        password,
        full_name: fullName,
        phone_number: phoneNumber,
        department,
        badge_number: badgeNumber,
        designation,
        country
      };

      const res = await fetch(getApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ text: "Registration successful. You may now log in.", isError: false });
        setMode("LOGIN");
      } else {
        const data = await res.json();
        setMessage({ text: data.detail || "Registration failed", isError: true });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Unable to connect to the backend server.", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      setMessage({ text: "Please enter a valid 6-digit MFA code.", isError: true });
      return;
    }
    
    // Accept any 6-digit code for the mock
    localStorage.setItem("token", tempToken);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-y-auto font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black to-transparent"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]"></div>
      </div>

      <div className={`w-full relative z-10 flex flex-col items-center my-8 ${mode === "REGISTER" ? "max-w-2xl" : "max-w-md"}`}>
        {/* Header / Logo Area */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative flex items-center justify-center h-16 w-16 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xl">
            <i className="fa-solid fa-shield-halved text-3xl text-blue-500"></i>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wider text-slate-100">NEXUS OS</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mt-1">
              Secure Intelligence Platform
            </p>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="flex w-full mb-6 bg-[var(--secondary-bg)] rounded-lg p-1 border border-[var(--border)] max-w-md">
          <button 
            type="button"
            onClick={() => { setActiveTab("ADMIN"); setMode("LOGIN"); setMessage(null); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex justify-center items-center gap-2 ${activeTab === "ADMIN" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <i className="fa-solid fa-user-shield"></i>
            Admin
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab("INVESTIGATOR"); setMessage(null); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex justify-center items-center gap-2 ${activeTab === "INVESTIGATOR" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            Investigator
          </button>
        </div>

        {/* Form Container */}
        <div className="w-full bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-2xl shadow-2xl relative">
          
          <h2 className="text-lg font-semibold text-slate-100 mb-2 text-center">
            {activeTab === "ADMIN" 
              ? (mode === "MFA" ? "Administrator Authentication" : "Administrator Login")
              : (mode === "LOGIN" ? "Investigator Login" : mode === "MFA" ? "Multi-Factor Authentication" : "Investigator Registration")}
          </h2>
          
          <div className="flex justify-center gap-4 mb-6 text-[10px] font-bold uppercase tracking-wider">
            <button 
              type="button"
              onClick={() => { setMode("LOGIN"); setMessage(null); }}
              className={`${mode === "LOGIN" ? "text-blue-400 border-b-2 border-blue-400 pb-1" : "text-slate-500 hover:text-slate-300 pb-1"}`}
            >
              Sign In
            </button>
            {activeTab === "INVESTIGATOR" && (
              <button 
                type="button"
                onClick={() => { setMode("REGISTER"); setMessage(null); }}
                className={`${mode === "REGISTER" ? "text-blue-400 border-b-2 border-blue-400 pb-1" : "text-slate-500 hover:text-slate-300 pb-1"}`}
              >
                Request Access
              </button>
            )}
          </div>

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

          <form onSubmit={mode === "MFA" ? handleMfaSubmit : handleAuth} className="flex flex-col gap-5">
            {mode === "MFA" ? (
              <div className="flex flex-col gap-4 text-center items-center py-4">
                <i className="fa-solid fa-fingerprint text-5xl text-[var(--accent-primary)] mb-2 animate-pulse"></i>
                <p className="text-sm text-slate-300">Enter the 6-digit verification code from your authenticator app.</p>
                <div className="relative w-48 mt-4">
                  <input 
                    type="text" 
                    maxLength={6}
                    value={mfaCode} 
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3.5 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-2xl text-center text-slate-200 tracking-widest font-mono" 
                    placeholder="000000" 
                    required 
                  />
                </div>
              </div>
            ) : mode === "REGISTER" && activeTab === "INVESTIGATOR" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 border-b border-[var(--border)] pb-2 uppercase tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-id-card text-blue-500"></i> Personal Information
                    </h3>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                      <div className="relative">
                        <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2.5 pl-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all" placeholder="John Doe" required />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                      <div className="relative">
                        <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 pl-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all" placeholder="agent@nexus-intel.gov" required />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                      <div className="relative">
                        <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full p-2.5 pl-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all" placeholder="+1 (555) 000-0000" required />
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 border-b border-[var(--border)] pb-2 uppercase tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-building-shield text-blue-500"></i> Professional Info
                    </h3>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Organization / Department</label>
                      <div className="relative">
                        <i className="fa-solid fa-sitemap absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2.5 pl-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all" placeholder="Cyber Intelligence Division" required />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Investigator / Employee ID</label>
                      <div className="relative">
                        <i className="fa-solid fa-id-badge absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input type="text" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} className="w-full p-2.5 pl-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all" placeholder="INV-9824A" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Role</label>
                        <div className="relative">
                          <i className="fa-solid fa-user-tag absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                          <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full p-2.5 pl-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all" placeholder="Analyst" required />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Region</label>
                        <div className="relative">
                          <i className="fa-solid fa-globe absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                          <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full p-2.5 pl-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all" placeholder="EU / US" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Security */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold text-slate-300 border-b border-[var(--border)] pb-2 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-lock text-blue-500"></i> Account Security
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
                      <div className="relative">
                        <i className="fa-solid fa-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 pl-10 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all font-mono tracking-widest" placeholder="••••••••" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
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
                          <div className="text-[9px] font-mono text-slate-500 space-y-1">
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
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Confirm Password</label>
                      <div className="relative">
                        <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2.5 pl-10 pr-10 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 transition-all font-mono tracking-widest" placeholder="••••••••" required />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
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
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                    <input 
                      type="email" 
                      placeholder="agent@nexus-intel.gov" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3.5 pl-11 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-200 placeholder-slate-600 transition-all" 
                      required 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Passphrase</label>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                    <input 
                      type="password" 
                      placeholder="••••••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3.5 pl-11 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-200 placeholder-slate-600 transition-all font-mono tracking-widest" 
                      required 
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-[-8px]">
                  <Link href="/forgot-password" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold tracking-wider">
                    Forgot Password?
                  </Link>
                </div>
              </>
            )}

            <button 
              type="submit" 
              disabled={loading || (mode === "REGISTER" && (strength < 5 || password !== confirmPassword))}
              className="mt-4 p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/40 disabled:text-blue-200/40 disabled:cursor-not-allowed rounded-lg font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all duration-200 w-full flex items-center justify-center gap-2 text-white text-sm uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  {mode === "LOGIN" ? "Authenticating..." : "Processing Registration..."}
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  {mode === "LOGIN" ? "Secure Login" : mode === "MFA" ? "Verify Identity" : "Request Authorization"}
                </>
              )}
            </button>
          </form>
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
