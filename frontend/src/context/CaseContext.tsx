"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

interface CaseContextType {
  cases: any[];
  activeCaseId: string | null;
  activeCase: any;
  loadingCases: boolean;
  setActiveCaseId: (id: string) => void;
  refreshCases: () => Promise<void>;
  logout: () => void;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<any[]>([]);
  // Use null as the default state to signify "uninitialized" or "no case"
  // It will be hydrated during refreshCases
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<any>(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isRefreshing = useRef(false);

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("activeCaseId");
    setActiveCaseId(null);
    setActiveCase(null);
    setCases([]);
    router.push("/login");
  }, [router]);

  const refreshCases = useCallback(async () => {
    if (isRefreshing.current) return;
    
    const token = localStorage.getItem("token");
    if (!token) {
      if (pathname !== "/login" && pathname !== "/") {
        router.push("/login");
      }
      setLoadingCases(false);
      return;
    }

    isRefreshing.current = true;
    setLoadingCases(true);

    try {
      const res = await fetch(getApiUrl("/api/cases/"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const normalizedData = data.map((c: any) => ({ ...c, _id: c._id || c.id }));
        
        // Sort cases to prefer most recently created/updated as a fallback
        normalizedData.sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
        
        setCases(normalizedData);
        
        if (normalizedData.length > 0) {
          const storedCaseId = localStorage.getItem("activeCaseId");
          const found = normalizedData.find((c: any) => c._id === storedCaseId);
          
          if (found) {
            setActiveCaseId(found._id);
            localStorage.setItem("activeCaseId", found._id);
          } else {
            setActiveCaseId(normalizedData[0]._id);
            localStorage.setItem("activeCaseId", normalizedData[0]._id);
          }
        } else {
          setActiveCaseId(null);
          setActiveCase(null);
          localStorage.removeItem("activeCaseId");
        }
      } else if (res.status === 401 || res.status === 403) {
        // Only logout if it's genuinely a 401 unauthorized
        // If the proxy is dropping headers occasionally, we don't want a sudden loop,
        // but typically 401 means invalid token.
        logout();
      }
    } catch (err) {
      console.error("Failed to load cases:", err);
      // We don't logout on network error, just stop loading
    } finally {
      setLoadingCases(false);
      isRefreshing.current = false;
    }
  }, [router, pathname, logout]);

  // Fetch active case details when activeCaseId changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchActiveCase = async () => {
      if (!activeCaseId) {
        if (isMounted) setActiveCase(null);
        return;
      }
      
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(getApiUrl(`/api/cases/${activeCaseId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setActiveCase(data);
        }
      } catch (err) {
        console.error("Failed to fetch active case details:", err);
      }
    };
    fetchActiveCase();
    
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);


  useEffect(() => {
    if (pathname !== "/login" && pathname !== "/") {
      refreshCases();
    } else {
      setLoadingCases(false);
    }
  }, [pathname, refreshCases]);

  const handleSetActiveCaseId = (id: string) => {
    setActiveCaseId(id);
    localStorage.setItem("activeCaseId", id);
    // Optimistically clear activeCase details to prevent UI showing stale case data
    setActiveCase(null); 
  };

  return (
    <CaseContext.Provider value={{
      cases,
      activeCaseId,
      activeCase,
      loadingCases,
      setActiveCaseId: handleSetActiveCaseId,
      refreshCases,
      logout
    }}>
      {children}
    </CaseContext.Provider>
  );
}

export function useCase() {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error("useCase must be used within a CaseProvider");
  }
  return context;
}
