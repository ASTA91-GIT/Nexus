"use client";
import React, { useState, useEffect } from "react";
import { useCase } from "@/context/CaseContext";
import { useRouter } from "next/navigation";

export default function RiskDashboard() {
  const { activeCaseId } = useCase();
  const router = useRouter();

  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    const fetchEntities = async () => {
      if (!activeCaseId) {
        setEntities([]);
        setLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch(getApiUrl(`/api/entities/?case_id=${activeCaseId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEntities(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntities();
  }, [activeCaseId]);

  const sortedEntities = [...entities].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  
  const highRisk = sortedEntities.filter(e => e.risk_score > 0.7);
  const mediumRisk = sortedEntities.filter(e => e.risk_score > 0.4 && e.risk_score <= 0.7);
  const lowRisk = sortedEntities.filter(e => e.risk_score <= 0.4);
  
  const totalRiskScore = sortedEntities.reduce((sum, e) => sum + (e.risk_score || 0), 0);
  const averageRisk = sortedEntities.length ? (totalRiskScore / sortedEntities.length) : 0;
  
  const overallCaseRisk = averageRisk > 0.5 ? "CRITICAL" : averageRisk > 0.3 ? "ELEVATED" : "MODERATE";
  const overallRiskColor = averageRisk > 0.5 ? "text-[var(--danger)]" : averageRisk > 0.3 ? "text-[var(--warning)]" : "text-[var(--success)]";

  const handleEntityClick = (entityId: string) => {
    // In a full implementation, we could pass this entityId via context or URL params to auto-focus in the investigate page.
    router.push(`/investigate?focus=${entityId}`);
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-12">
      <header className="border-b border-[var(--border-primary)] pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Risk Analysis Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Evaluate case-wide threat profiles, entity risk distribution, and centralized network vulnerabilities.
        </p>
      </header>

      {!activeCaseId ? (
        <div className="p-16 border border-dashed border-[var(--border-primary)] rounded-2xl text-center text-[var(--text-secondary)]">
          Please select an active Case File to analyze risk profiles.
        </div>
      ) : loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-[var(--primary-accent)] border-[var(--border-primary)]"></div>
          <span className="text-xs text-[var(--text-secondary)]">Computing threat matrix...</span>
        </div>
      ) : (
        <>
          {/* STATS SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">Overall Case Risk</span>
              <p className={`text-3xl font-black ${overallRiskColor}`}>{overallCaseRisk}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Avg Score: {averageRisk.toFixed(2)}</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">High Risk Targets</span>
              <p className="text-3xl font-black text-[var(--danger)]">{highRisk.length}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">&gt; 0.70 Threat Index</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">Medium Risk Targets</span>
              <p className="text-3xl font-black text-[var(--warning)]">{mediumRisk.length}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">0.41 - 0.70 Threat Index</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">Low Risk Targets</span>
              <p className="text-3xl font-black text-[var(--success)]">{lowRisk.length}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">&lt;= 0.40 Threat Index</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* RISK DISTRIBUTION BAR CHART (Visual representation) */}
            <div className="lg:col-span-1 bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm flex flex-col gap-6">
              <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Risk Distribution</h3>
              
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-bold">
                    <span className="text-[var(--danger)]">High Risk</span>
                    <span className="text-[var(--text-primary)]">{highRisk.length}</span>
                  </div>
                  <div className="w-full h-4 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--danger)] rounded-full" style={{ width: `${(highRisk.length / (entities.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1 font-bold">
                    <span className="text-[var(--warning)]">Medium Risk</span>
                    <span className="text-[var(--text-primary)]">{mediumRisk.length}</span>
                  </div>
                  <div className="w-full h-4 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--warning)] rounded-full" style={{ width: `${(mediumRisk.length / (entities.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1 font-bold">
                    <span className="text-[var(--success)]">Low Risk</span>
                    <span className="text-[var(--text-primary)]">{lowRisk.length}</span>
                  </div>
                  <div className="w-full h-4 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--success)] rounded-full" style={{ width: `${(lowRisk.length / (entities.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* ENTITY RISK RANKING */}
            <div className="lg:col-span-2 bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 rounded-2xl shadow-sm flex flex-col gap-4 max-h-[600px]">
              <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Entity Threat Ranking</h3>
              
              {entities.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-secondary)] italic">
                  No entities found in this case.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                  {sortedEntities.map((ent, idx) => {
                    const isHigh = ent.risk_score > 0.7;
                    const isMedium = ent.risk_score > 0.4 && ent.risk_score <= 0.7;
                    
                    return (
                      <div 
                        key={ent._id} 
                        onClick={() => handleEntityClick(ent._id)}
                        className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer group transition-all ${
                          isHigh 
                            ? 'bg-[var(--danger)]/5 border-[var(--danger)]/20 hover:border-[var(--danger)]' 
                            : isMedium 
                              ? 'bg-[var(--warning)]/5 border-[var(--warning)]/20 hover:border-[var(--warning)]' 
                              : 'bg-[var(--surface-secondary)] border-[var(--border-primary)] hover:border-[var(--primary-accent)]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isHigh ? 'bg-[var(--danger)] text-white' : isMedium ? 'bg-[var(--warning)] text-white' : 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-primary)] text-sm">{ent.name}</p>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{ent.type}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold mb-1">Threat Index</p>
                            <div className="w-24 h-1.5 bg-[var(--surface-primary)] rounded-full overflow-hidden border border-[var(--border-primary)]">
                              <div className={`h-full ${isHigh ? 'bg-[var(--danger)]' : isMedium ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}`} style={{ width: `${Math.min((ent.risk_score || 0) * 100, 100)}%` }}></div>
                            </div>
                          </div>
                          <span className={`text-lg font-black ${isHigh ? 'text-[var(--danger)]' : isMedium ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                            {(ent.risk_score || 0).toFixed(2)}
                          </span>
                          <span className="text-[var(--text-tertiary)] group-hover:text-[var(--primary-accent)] transition-colors">
                            ↗
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}
