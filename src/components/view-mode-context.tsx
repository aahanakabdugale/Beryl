"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DeveloperGateModal } from "./developer-gate-modal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type ViewMode = "consumer" | "developer";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  requestDeveloperMode: (onSuccess?: () => void) => void;
  lockDeveloperMode: () => Promise<void>;
  isDeveloper: boolean;
  isConsumer: boolean;
  isDevAuthenticated: boolean;
}

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: "consumer",
  setViewMode: () => {},
  requestDeveloperMode: () => {},
  lockDeveloperMode: async () => {},
  isDeveloper: false,
  isConsumer: true,
  isDevAuthenticated: false,
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [viewMode, setViewModeState] = useState<ViewMode>("consumer");
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [pendingSuccessCallback, setPendingSuccessCallback] = useState<(() => void) | null>(null);

  const checkDevCookie = () => {
    if (typeof document === "undefined") return false;
    return document.cookie.split("; ").some((row) => row.startsWith("beryl_dev_authenticated=true"));
  };

  useEffect(() => {
    try {
      const isAuth = checkDevCookie();
      const saved = localStorage.getItem("beryl_view_mode");

      // Only allow developer mode if authenticated
      if (saved === "developer" && isAuth) {
        setViewModeState("developer");
      } else {
        setViewModeState("consumer");
        if (saved === "developer" && !isAuth) {
          localStorage.setItem("beryl_view_mode", "consumer");
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    if (mode === "developer") {
      const isAuth = checkDevCookie();
      if (!isAuth) {
        setIsGateOpen(true);
        return;
      }
    }

    setViewModeState(mode);
    try {
      localStorage.setItem("beryl_view_mode", mode);
    } catch {
      // Ignore
    }
  };

  const requestDeveloperMode = (onSuccess?: () => void) => {
    const isAuth = checkDevCookie();
    if (isAuth) {
      setViewMode("developer");
      if (onSuccess) onSuccess();
    } else {
      if (onSuccess) setPendingSuccessCallback(() => onSuccess);
      setIsGateOpen(true);
    }
  };

  const lockDeveloperMode = async () => {
    try {
      await fetch("/api/auth/lock-dev", { method: "POST" });
    } catch {
      // ignore
    }

    document.cookie = "beryl_dev_authenticated=; path=/; max-age=0";
    setViewModeState("consumer");
    try {
      localStorage.setItem("beryl_view_mode", "consumer");
    } catch {
      // ignore
    }

    toast.info("Developer session locked. Switched to Consumer App.");
    router.push("/dashboard");
  };

  const handleGateSuccess = () => {
    if (pendingSuccessCallback) {
      pendingSuccessCallback();
      setPendingSuccessCallback(null);
    }
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        requestDeveloperMode,
        lockDeveloperMode,
        isDeveloper: viewMode === "developer",
        isConsumer: viewMode === "consumer",
        isDevAuthenticated: typeof document !== "undefined" ? checkDevCookie() : false,
      }}
    >
      {children}
      <DeveloperGateModal
        isOpen={isGateOpen}
        onClose={() => {
          setIsGateOpen(false);
          setPendingSuccessCallback(null);
        }}
        onSuccess={handleGateSuccess}
      />
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
