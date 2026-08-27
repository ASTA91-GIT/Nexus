"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        router.push("/dashboard");
      } else {
        alert("Login failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 p-8 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold mb-4">NEXUS Login</h1>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" 
          required 
        />
        <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 rounded font-bold mt-2">
          Sign In
        </button>
      </form>
    </div>
  );
}
