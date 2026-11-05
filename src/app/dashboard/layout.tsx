"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Copy,
  Check,
  Lock,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
  ShieldAlert,
  Bot,
  Sliders,
  CheckSquare,
  BarChart3,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { RealtimeListener } from "@/components/realtime-listener";
import { useViewMode } from "@/components/view-mode-context";
import { useInspector } from "@/components/inspector-context";
import { DeveloperCommandBar } from "@/components/developer-command-bar";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

const EXPLORER_MODULES = [
  { id: "overview", name: "overview.ts", href: "/dashboard", icon: LayoutDashboard },
  { id: "audit", name: "audit_log.grid", href: "/dashboard/audit", icon: FileSpreadsheet },
  { id: "attack", name: "attack_lab", href: "/dashboard/attack-lab", icon: ShieldAlert },
  { id: "tracing", name: "agent_tracing", href: "/dashboard/agent", icon: Bot },
  { id: "policy", name: "policy.json", href: "/dashboard/mandates/new", icon: Sliders },
  { id: "escalations", name: "escalations", href: "/dashboard/approvals", icon: CheckSquare },
  { id: "analytics", name: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

function SyntaxHighlightedJson({ data }: { data: Record<string, any> }) {
  const formatted = JSON.stringify(data, null, 2);
  const lines = formatted.split("\n");

  return (
    <pre className="font-mono text-[11px] leading-relaxed select-text whitespace-pre-wrap break-all p-1">
      {lines.map((line, idx) => {
        const keyMatch = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
        if (keyMatch) {
          const indent = keyMatch[1];
          const key = keyMatch[2];
          const val = keyMatch[3];

          let valColor = "text-[#A7F3D0] dark:text-[#A7F3D0]";
          if (val.includes("BLOCK") || val.includes("REJECT")) valColor = "text-rose-500 dark:text-rose-400 font-bold";
          else if (val.includes("APPROV")) valColor = "text-emerald-500 dark:text-[#3EE0A8] font-bold";
          else if (val.includes("NEEDS_APPROVAL") || val.includes("PENDING")) valColor = "text-amber-500 dark:text-amber-400 font-bold";
          else if (!isNaN(Number(val.replace(/,$/, "")))) valColor = "text-amber-400 dark:text-amber-300 font-mono";
          else if (val.startsWith('"')) valColor = "text-emerald-300 dark:text-[#6EE7B7]";
          else if (val.includes("true") || val.includes("false") || val.includes("null")) valColor = "text-sky-400";

          return (
            <div key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 py-0.5 rounded px-1 transition-colors">
              <span>{indent}</span>
              <span className="text-emerald-600 dark:text-[#3EE0A8] font-semibold">&quot;{key}&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className={`${valColor} break-all`}>{val}</span>
            </div>
          );
        }

        return (
          <div key={idx} className="text-zinc-500 dark:text-zinc-400 py-0.5 px-1 break-all">
            {line}
          </div>
        );
      })}
    </pre>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDeveloper, lockDeveloperMode } = useViewMode();
  const { inspectorPayload, isInspectorVisible, toggleInspector } = useInspector();
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("demo@beryl.dev");
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch {
        // demo fallback
      }
    }
    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      document.cookie = "beryl_demo_mode=; path=/; max-age=0";
      toast.success("Signed out successfully");
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(inspectorPayload.data, null, 2));
      setCopiedJson(true);
      toast.success("Inspector payload copied to clipboard");
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  const isDark = mounted ? resolvedTheme === "dark" : true;

  // If consumer mode, render the standard ConsumerShell cleanly
  if (!isDeveloper) {
    return (
      <div className="min-h-screen bg-[var(--approvals-page)] text-[var(--approvals-ink)]">
        <RealtimeListener />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F2] dark:bg-[#07100D] text-zinc-900 dark:text-zinc-100 flex flex-col font-mono selection:bg-[#3EE0A8]/30 transition-colors">
      <RealtimeListener />

      {/* ============================================================== */}
      {/* 1. TOP IDE BAR HEADER                                          */}
      {/* ============================================================== */}
      <header className="h-14 border-b border-zinc-200 dark:border-[#173026] bg-white/90 dark:bg-[#091511]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-40 transition-colors">
        {/* Left: [B] BERYL + Developer Lab Badge */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            aria-label="Toggle explorer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 focus:outline-none">
            <div className="w-7 h-7 rounded-lg bg-[#0B7A5A] dark:bg-[#10B981] text-white dark:text-[#07100D] font-bold text-sm flex items-center justify-center font-heading shadow-xs">
              B
            </div>
            <span className="font-heading font-extrabold text-base tracking-wider text-zinc-900 dark:text-[#EDF5F2]">
              BERYL
            </span>
          </Link>

          <span className="px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[#0B7A5A] dark:text-[#3EE0A8] text-[11px] font-semibold tracking-wide hidden sm:inline-block">
            Developer Lab
          </span>
        </div>

        {/* Right: Engine status, Dark/Light Switch & Lock lab */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Status pill: ● engine 0ms · air-gap enforced */}
          <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-[#0E1F1A] border border-emerald-200 dark:border-[#1B3B2E] text-[11px] text-[#0B7A5A] dark:text-[#3EE0A8] font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>engine 0ms · air-gap enforced</span>
          </div>

          {/* Inspector Toggle Button */}
          <button
            type="button"
            onClick={toggleInspector}
            className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono transition-colors cursor-pointer border ${
              isInspectorVisible
                ? "bg-emerald-50 dark:bg-[#122A21] text-[#0B7A5A] dark:text-[#3EE0A8] border-emerald-200 dark:border-[#1F4638]"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border-zinc-200 dark:border-[#173026]"
            }`}
            title="Toggle JSON Inspector"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Inspector</span>
          </button>

          {/* Theme Switch: Dark [toggle] Light */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 select-none">
            <span className={isDark ? "text-zinc-400 dark:text-[#A7D7C5] font-semibold" : "text-zinc-400"}>
              Dark
            </span>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                isDark ? "bg-[#1B382F]" : "bg-emerald-600"
              }`}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  isDark ? "translate-x-0" : "translate-x-4"
                }`}
              />
            </button>
            <span className={!isDark ? "text-zinc-900 font-bold" : "text-zinc-500"}>
              Light
            </span>
          </div>

          {/* Lock Lab Button */}
          <button
            type="button"
            onClick={lockDeveloperMode}
            className="px-3.5 py-1.5 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Lock Developer Lab and return to Consumer App"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Lock lab</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN 3-PANEL IDE BODY                                       */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden p-3 sm:p-4 gap-3">
        {/* ============================================================ */}
        {/* PANEL 1: EXPLORER                                             */}
        {/* ============================================================ */}
        <aside
          className={`${
            mobileMenuOpen ? "flex" : "hidden"
          } md:flex flex-col w-56 lg:w-60 shrink-0 bg-white dark:bg-[#0B1713] border border-zinc-200 dark:border-[#173026] rounded-2xl p-4 justify-between transition-colors z-30 shadow-xs fixed md:relative top-16 md:top-0 bottom-4 left-3 right-3 md:left-0 md:right-0 md:bottom-0`}
        >
          <div className="space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold px-2">
              EXPLORER
            </div>

            <nav className="space-y-1">
              {EXPLORER_MODULES.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                      isActive
                        ? "bg-emerald-500/10 text-[#0B7A5A] dark:text-[#3EE0A8] font-bold border border-emerald-500/25 shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-[#0F221B]"
                    }`}
                  >
                    <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#0B7A5A] dark:text-[#3EE0A8]" : "opacity-60"}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Explorer Bottom: Active Account */}
          <div className="pt-3 border-t border-zinc-200 dark:border-[#173026] space-y-2 text-xs">
            <div className="px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#08120E] text-[11px] truncate">
              <span className="text-zinc-400 block text-[9px] uppercase tracking-wider">Session</span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate block mt-0.5">
                {userEmail}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* PANEL 2: WORKSPACE / EDITOR STAGE                             */}
        {/* ============================================================ */}
        <main className="flex-1 min-w-0 bg-white dark:bg-[#0B1713] border border-zinc-200 dark:border-[#173026] rounded-2xl flex flex-col overflow-hidden shadow-xs transition-colors">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </div>
        </main>

        {/* ============================================================ */}
        {/* PANEL 3: INSPECTOR                                           */}
        {/* ============================================================ */}
        {isInspectorVisible && (
          <aside className="hidden xl:flex flex-col w-72 lg:w-80 shrink-0 bg-white dark:bg-[#0B1713] border border-zinc-200 dark:border-[#173026] rounded-2xl p-4 justify-between transition-colors shadow-xs font-mono text-xs">
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              {/* Inspector Header */}
              <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold pb-2 border-b border-zinc-200 dark:border-[#173026]">
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#0B7A5A] dark:text-[#3EE0A8]" />
                  <span>INSPECTOR</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Copy formatted JSON"
                  >
                    {copiedJson ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Title Tag */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="font-semibold text-emerald-700 dark:text-[#3EE0A8]">
                  {inspectorPayload.title || "PAYLOAD_SNAPSHOT"}
                </span>
                <span>0ms latency</span>
              </div>

              {/* Formatted Code Block */}
              <div className="flex-1 overflow-y-auto rounded-xl bg-zinc-50 dark:bg-[#07100D] border border-zinc-200 dark:border-[#173026] p-2.5">
                <SyntaxHighlightedJson data={inspectorPayload.data} />
              </div>
            </div>

            {/* Inspector Footer Status */}
            <div className="pt-3 border-t border-zinc-200 dark:border-[#173026] text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Policy: Deterministic</span>
              <span className="text-emerald-600 dark:text-[#3EE0A8] font-bold">AIR-GAP ACTIVE</span>
            </div>
          </aside>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM TERMINAL / COMMAND BAR                               */}
      {/* ============================================================== */}
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
