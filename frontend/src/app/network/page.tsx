"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

// Dynamically import the 3D scene to prevent SSR issues with Three.js
const NetworkScene = dynamic(() => import("../../three/NetworkScene"), { ssr: false });

export default function NetworkPage() {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // In a real app, this would get the active case ID from context or URL params
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchGraph = async () => {
      try {
        // Just fetching the first available case for demo purposes
        const casesRes = await fetch("/api/cases/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (casesRes.ok) {
          const cases = await casesRes.json();
          if (cases.length > 0) {
            const activeCase = cases[0]._id;
            const res = await fetch(`/api/network/${activeCase}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.ok) {
              const data = await res.json();
              setGraphData(data);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load network:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGraph();
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Left Sidebar: Controls */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 p-6 flex flex-col z-10">
        <h1 className="text-2xl font-bold text-blue-400 mb-6">NEXUS Engine</h1>
        
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Filters</h2>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="form-checkbox text-blue-500 rounded bg-gray-800 border-gray-600" />
              <span>Persons</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="form-checkbox text-green-500 rounded bg-gray-800 border-gray-600" />
              <span>Organizations</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="form-checkbox text-yellow-500 rounded bg-gray-800 border-gray-600" />
              <span>Locations</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="form-checkbox text-purple-500 rounded bg-gray-800 border-gray-600" />
              <span>Communications</span>
            </label>
          </div>
        </div>

        <div className="mt-auto">
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold transition-colors">
            Run AI Analysis
          </button>
        </div>
      </aside>

      {/* Main 3D Canvas Area */}
      <main className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <NetworkScene data={graphData || { nodes: [], links: [] }} />
        )}
        
        {/* Overlay Analytics */}
        <div className="absolute top-6 right-6 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg p-4 pointer-events-none">
          <h3 className="font-bold mb-2">Network Stats</h3>
          <div className="text-sm text-gray-300">
            <p>Nodes: {graphData?.nodes?.length || 0}</p>
            <p>Edges: {graphData?.links?.length || 0}</p>
            <p className="mt-2 text-yellow-500">Density: Low</p>
          </div>
        </div>
      </main>
    </div>
  );
}
