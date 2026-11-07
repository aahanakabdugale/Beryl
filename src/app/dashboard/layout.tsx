"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { RealtimeListener } from "@/components/realtime-listener";
import { useViewMode } from "@/components/view-mode-context";
import { useInspector } from "@/components/inspector-context";
import { DeveloperCommandBar } from "@/components/developer-command-bar";
import { BerylLogo } from "@/components/beryl-logo";
import { toast } from "sonner";

interface NavTabItem {
  id: string;
  name: string;
  href: string;
}

const NAV_TABS: NavTabItem[] = [
  { id: "overview", name: "Overview", href: "/dashboard" },
  { id: "audit", name: "Audit Ledger", href: "/dashboard/audit" },
  { id: "attack", name: "Attack Lab", href: "/dashboard/attack-lab" },
  { id: "tracing", name: "Agent Tracing", href: "/dashboard/agent" },
  { id: "policy", name: "Policy Mandates", href: "/dashboard/mandates/new" },
  { id: "approvals", name: "Order Reviews", href: "/dashboard/approvals" },
  { id: "analytics", name: "Analytics", href: "/dashboard/analytics" },
];

function InspectorPanel({
  payload,
  onClose,
}: {
  payload: { title?: string; data?: any };
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"fields" | "json">("fields");
  const [copied, setCopied] = useState(false);

  const data = payload.data || {};
  const dataEntries = typeof data === "object" && data !== null && !Array.isArray(data)
    ? Object.entries(data)
    : [];

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      toast.success("Payload copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  const payloadByteSize = new TextEncoder().encode(JSON.stringify(data)).length;

  return (
    <aside className="w-[420px] max-w-[90vw] shrink-0 border-l border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#07100D] flex flex-col justify-between font-mono text-xs z-30 shadow-xl">
      {/* Top Header */}
      <div className="p-3.5 border-b border-zinc-200 dark:border-[#162E25] flex items-center justify-between bg-zinc-50/50 dark:bg-[#091410]">
        <span className="font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          Security Inspector
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-0.5 rounded border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Target Record Bar & View Mode Toggle */}
      <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-[#162E25] flex items-center justify-between bg-white dark:bg-[#07100D] text-[11px]">
        <span className="text-[#0B7A5A] dark:text-[#3EE0A8] font-bold">
          {payload.title || "PAYLOAD_SNAPSHOT"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode("fields")}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              viewMode === "fields"
                ? "bg-zinc-200 dark:bg-[#162E25] text-zinc-900 dark:text-zinc-100 font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Fields
          </button>
          <button
            type="button"
            onClick={() => setViewMode("json")}
            className={`px-2 py-0.5 rounded cursor-pointer ${
              viewMode === "json"
                ? "bg-zinc-200 dark:bg-[#162E25] text-zinc-900 dark:text-zinc-100 font-bold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {viewMode === "fields" && dataEntries.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-[#162E25]">
            {dataEntries.map(([key, val]) => {
              const valStr = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
              const isVerdict = key === "verdict" || key === "decision" || key === "outcome";
              const isRule = key === "rule" || key === "rule_code";

              let valColor = "text-zinc-800 dark:text-zinc-200";
              if (isVerdict) {
                const upper = String(val).toUpperCase();
                if (upper.includes("APPROV")) valColor = "text-emerald-600 dark:text-[#3EE0A8] font-bold";
                else if (upper.includes("NEEDS") || upper.includes("PENDING") || upper.includes("REVIEW")) valColor = "text-amber-600 dark:text-amber-400 font-bold";
                else valColor = "text-rose-600 dark:text-rose-400 font-bold";
              } else if (isRule) {
                valColor = "text-[#0B7A5A] dark:text-[#3EE0A8] font-semibold";
              }

              return (
                <div key={key} className="py-2.5 flex flex-col gap-1">
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
                    {key}
                  </span>
                  <div className={`text-xs break-words whitespace-pre-wrap leading-relaxed ${valColor}`}>
                    {typeof val === "object" ? (
                      <pre className="p-2 rounded bg-zinc-50 dark:bg-[#0D1C17] border border-zinc-200 dark:border-[#162E25] overflow-x-auto text-[11px]">
                        {valStr}
                      </pre>
                    ) : (
                      valStr
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-2.5 rounded bg-zinc-50 dark:bg-[#091410] border border-zinc-200 dark:border-[#162E25]">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed text-zinc-800 dark:text-zinc-200">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Telemetry */}
      <div className="px-4 py-2 border-t border-zinc-200 dark:border-[#162E25] bg-zinc-50/50 dark:bg-[#091410] text-[10px] text-zinc-500 flex items-center justify-between">
        <span>{dataEntries.length} attributes</span>
        <span>{payloadByteSize} bytes</span>
      </div>
    </aside>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDeveloper, lockDeveloperMode } = useViewMode();
  const { inspectorPayload, isInspectorVisible, toggleInspector, setIsInspectorVisible } = useInspector();
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  if (!isDeveloper) {
    return (
      <div className="min-h-screen bg-[var(--approvals-page)] text-[var(--approvals-ink)]">
        <RealtimeListener />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#07100D] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <RealtimeListener />

      {/* Institutional Top Bar Navigation */}
      <header className="bg-white dark:bg-[#07100D] border-b border-zinc-200 dark:border-[#162E25] px-6 sticky top-0 z-40 select-none">
        <div className="flex items-center justify-between gap-6 h-14">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-6 shrink-0">
            <Link 
              href="/"
              className="flex items-center gap-2.5 shrink-0"
              title="BERYL Autonomous Finance"
            >
              <BerylLogo size={32} />
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-zinc-950 dark:text-white leading-none">
                  BERYL
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#0B7A5A] dark:text-[#3EE0A8] font-bold px-1.5 py-0.5 rounded border border-[#0B7A5A]/30 bg-emerald-500/10">
                  DEV LAB
                </span>
              </div>
            </Link>

            {/* Separator */}
            <div className="h-5 w-[1px] bg-zinc-200 dark:border-[#162E25] shrink-0" />

            {/* Navigation Tabs (Text Only, Institutional Underline Accent) */}
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Main Navigation">
              {NAV_TABS.map((tab) => {
                const isActive =
                  tab.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(tab.href);

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative px-3.5 py-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "text-zinc-950 dark:text-white font-semibold"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <span>{tab.name}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B7A5A] dark:bg-[#3EE0A8]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Institutional Utility Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Security Inspector Toggle */}
            <button
              type="button"
              onClick={toggleInspector}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer border ${
                isInspectorVisible
                  ? "bg-emerald-50 dark:bg-[#12241E] border-[#0B7A5A] text-[#0B7A5A] dark:text-[#3EE0A8]"
                  : "border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
              }`}
              title="Toggle Security Payload Inspector"
            >
              Inspector
            </button>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="px-3 py-1.5 rounded border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? "Light" : "Dark"}
            </button>

            {/* Lock Lab Button */}
            <button
              type="button"
              onClick={lockDeveloperMode}
              className="px-3 py-1.5 rounded border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 text-xs font-mono font-medium transition-colors cursor-pointer"
              title="Exit Developer Lab to Consumer View"
            >
              Lock Lab
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-6 sm:px-10 py-6 space-y-6">
            {children}
          </div>
        </main>

        {/* Slide-out Inspector Drawer */}
        {isInspectorVisible && (
          <InspectorPanel
            payload={inspectorPayload}
            onClose={() => setIsInspectorVisible(false)}
          />
        )}
      </div>

      {/* Bottom Command Terminal */}
      <DeveloperCommandBar />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardContent>{children}</DashboardContent>;
}