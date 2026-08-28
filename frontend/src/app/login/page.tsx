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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-zinc-950 to-black text-white flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
          <span>&larr;</span> Back to Home
        </Link>

        {/* Form Container */}
        <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg text-white">
              N
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">NEXUS Portal</h1>
          </div>

          <h2 className="text-xl font-bold text-center text-zinc-300 mb-6">
            {isRegistering ? "Register Investigator Profile" : "Sign In to Engine"}
          </h2>

          {message && (
            <div className={`p-4 rounded-xl border mb-6 text-sm ${
              message.isError 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {isRegistering && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:border-blue-500 text-sm placeholder-zinc-600 transition-colors" 
                  required 
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                placeholder="investigator@nexus.gov" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:border-blue-500 text-sm placeholder-zinc-600 transition-colors" 
                required 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Security Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="p-3 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:border-blue-500 text-sm placeholder-zinc-600 transition-colors" 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 rounded-xl font-bold mt-4 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-300"
            >
              {loading ? "Verifying..." : isRegistering ? "Create Profile" : "Authenticate"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-sm text-zinc-500">
            {isRegistering ? (
              <p>
                Already registered?{" "}
                <button 
                  onClick={() => { setIsRegistering(false); setMessage(null); }}
                  className="font-semibold text-blue-400 hover:text-blue-300 hover:underline bg-transparent border-none cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                First time?{" "}
                <button 
                  onClick={() => { setIsRegistering(true); setMessage(null); }}
                  className="font-semibold text-blue-400 hover:text-blue-300 hover:underline bg-transparent border-none cursor-pointer"
                >
                  Create Profile
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
