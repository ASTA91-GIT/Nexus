"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchCases = async () => {
      try {
        const res = await fetch("/api/cases/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCases(data);
        } else if (res.status === 401) {
          router.push("/login");
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCases();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-blue-400">NEXUS Dashboard</h1>
        <button 
          onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
        >
          Logout
        </button>
      </header>

      <main>
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-gray-400 uppercase text-xs font-bold mb-2">Total Cases</h2>
            <p className="text-4xl font-light">{cases.length}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-gray-400 uppercase text-xs font-bold mb-2">Entities</h2>
            <p className="text-4xl font-light">0</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-gray-400 uppercase text-xs font-bold mb-2">Relationships</h2>
            <p className="text-4xl font-light">0</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-gray-400 uppercase text-xs font-bold mb-2">Alerts</h2>
            <p className="text-4xl font-light text-red-400">0</p>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-bold mb-4">Recent Cases</h2>
          {cases.length === 0 ? (
            <div className="p-12 text-center text-gray-500 bg-gray-800 rounded-lg border border-gray-700">
              <p>No cases found. Create a new case to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {cases.map((c: any) => (
                <div key={c._id} className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer">
                  <h3 className="font-bold text-lg mb-2">{c.name}</h3>
                  <p className="text-sm text-gray-400">{c.description || "No description provided."}</p>
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-xs text-gray-500">
                    <span>Status: {c.status}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
