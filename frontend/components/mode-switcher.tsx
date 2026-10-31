"use client";

import React from "react";
import { ShoppingBag, Terminal, Sparkles, ShieldCheck } from "lucide-react";
import { useViewMode } from "./view-mode-context";

export function ModeSwitcher({ className = "" }: { className?: string }) {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-zinc-200/60 dark:bg-[#12241E] border border-zinc-300/60 dark:border-[#1E3A31] text-xs font-semibold ${className}`}
    >
      {/* Consumer App Option */}
      <button
        type="button"
        onClick={() => setViewMode("consumer")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
          viewMode === "consumer"
            ? "bg-white dark:bg-[#0B7A5A] text-zinc-900 dark:text-white shadow-xs font-bold"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
        aria-pressed={viewMode === "consumer"}
      >
        <ShoppingBag className="h-3.5 w-3.5 text-[#0B7A5A] dark:text-[#3EE0A8]" />
        <span>Consumer App</span>
      </button>

      {/* Developer Lab Option */}
      <button
        type="button"
        onClick={() => setViewMode("developer")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
          viewMode === "developer"
            ? "bg-[#07100D] text-[#3EE0A8] border border-[#3EE0A8]/30 shadow-xs font-bold font-mono"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-mono"
        }`}
        aria-pressed={viewMode === "developer"}
      >
        <Terminal className="h-3.5 w-3.5 text-emerald-500 dark:text-[#3EE0A8]" />
        <span>Developer Lab</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-[#0B7A5A] dark:text-[#3EE0A8] font-bold">
          DEV
        </span>
      </button>
    </div>
  );
}
