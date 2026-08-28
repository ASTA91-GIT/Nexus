"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface CaseContextType {
  cases: any[];
  activeCaseId: string;
  activeCase: any;
  loadingCases: boolean;
  setActiveCaseId: (id: string) => void;
  refreshCases: () => Promise<void>;
  logout: () => void;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<any[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>("");
  const [activeCase, setActiveCase] = useState<any>(null);
  const [loadingCases, setLoadingCases] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${path}`;
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("activeCaseId");
    router.push("/login");
  }, [router]);

  const refreshCases = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      if (pathname !== "/login" && pathname !== "/") {
        router.push("/login");
      }
      setLoadingCases(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/cases/"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        if (data.length > 0) {
          const storedCaseId = localStorage.getItem("activeCaseId");
          const found = data.find((c: any) => c._id === storedCaseId);
          const currentId = found ? found._id : data[0]._id;
          setActiveCaseId(currentId);
          localStorage.setItem("activeCaseId", currentId);
        } else {
          setActiveCaseId("");
          setActiveCase(null);
          localStorage.removeItem("activeCaseId");
        }
      } else if (res.status === 401) {
        logout();
      }
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setLoadingCases(false);
    }
  }, [router, pathname, logout]);

  // Fetch active case details when activeCaseId changes
  useEffect(() => {
    const fetchActiveCase = async () => {
      if (!activeCaseId) {
        setActiveCase(null);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(getApiUrl(`/api/cases/${activeCaseId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setActiveCase(data);
        }
      } catch (err) {
        console.error("Failed to fetch active case details:", err);
      }
    };
    fetchActiveCase();
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
