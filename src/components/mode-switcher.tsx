"use client";

import React from "react";
import { useViewMode } from "./view-mode-context";

export function ModeSwitcher({ className = "" }: { className?: string }) {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div
      role="group"
      aria-label="Application View Mode"
      className={`inline-flex items-center p-1 rounded-md bg-[#E4ECE7] dark:bg-[#060D0A] border border-[#CCD8D1] dark:border-[#162B21] shadow-inner ${className}`}
    >
      {/* Consumer Option */}
      <button
        type="button"
        onClick={() => setViewMode("consumer")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
          viewMode === "consumer"
            ? "bg-white dark:bg-[#0F221A] text-[#0B7A5A] dark:text-[#3EE0A8] border border-[#CCD8D1] dark:border-[#1E3F31] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`}
        aria-pressed={viewMode === "consumer"}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            viewMode === "consumer" ? "bg-[#0B7A5A] dark:bg-[#3EE0A8]" : "bg-zinc-400 dark:bg-zinc-600"
          }`}
        />
        <span>Consumer</span>
      </button>

      {/* Developer Lab Option */}
      <button
        type="button"
        onClick={() => setViewMode("developer")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
          viewMode === "developer"
            ? "bg-[#08130F] dark:bg-[#0F221A] text-[#3EE0A8] border border-[#162D24] dark:border-[#1E3F31] shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`}
        aria-pressed={viewMode === "developer"}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            viewMode === "developer" ? "bg-[#3EE0A8]" : "bg-zinc-400 dark:bg-zinc-600"
          }`}
        />
        <span>Developer Lab</span>
      </button>
    </div>
  );
}

export default ModeSwitcher;
