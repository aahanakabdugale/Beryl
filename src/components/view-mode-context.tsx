"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ViewMode = "consumer" | "developer";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isDeveloper: boolean;
  isConsumer: boolean;
}

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: "consumer",
  setViewMode: () => {},
  isDeveloper: false,
  isConsumer: true,
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("consumer");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("beryl_view_mode");
      if (saved === "developer" || saved === "consumer") {
        setViewModeState(saved);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem("beryl_view_mode", mode);
    } catch {
      // Ignore
    }
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        isDeveloper: viewMode === "developer",
        isConsumer: viewMode === "consumer",
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
