"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Bot,
  CheckSquare,
  FileSpreadsheet,
  ShieldAlert,
  BarChart3,
  LogOut,
  Power,
  Menu,
  X,
  ShoppingBag,
  Terminal,
  Shield,
  Sparkles,
} from "lucide-react";
import { BerylLogo } from "@/components/beryl-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { RealtimeListener } from "@/components/realtime-listener";
import { ViewModeProvider, useViewMode } from "@/components/view-mode-context";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

// Navigation sets tailored for each persona
const CONSUMER_NAV = [
  { label: "Wallet & Budget", href: "/dashboard", icon: LayoutDashboard },
  { label: "Shop with Agent", href: "/dashboard/agent", icon: Bot },
  { label: "Pending Approvals", href: "/dashboard/approvals", icon: CheckSquare },
  { label: "Spending Rules", href: "/dashboard/mandates/new", icon: PlusCircle },
  { label: "Spending Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const DEVELOPER_NAV = [
  { label: "Dashboard Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Audit Log (AG Grid)", href: "/dashboard/audit", icon: FileSpreadsheet },
  { label: "Attack Lab & Scoreboard", href: "/dashboard/attack-lab", icon: ShieldAlert },
  { label: "Agent Tool Tracing", href: "/dashboard/agent", icon: Bot },
  { label: "Policy Parameters", href: "/dashboard/mandates/new", icon: PlusCircle },
  { label: "Escalation Queue", href: "/dashboard/approvals", icon: CheckSquare },
  { label: "Engine Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { viewMode, isDeveloper } = useViewMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("demo@beryl.dev");

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

  const navItems = isDeveloper ? DEVELOPER_NAV : CONSUMER_NAV;

  return (
    <div className="min-h-screen bg-[#F3F7F5] dark:bg-[#07100D] flex flex-col md:flex-row text-zinc-900 dark:text-zinc-100">
      <RealtimeListener />

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BerylLogo size={24} />
          <span className="font-heading font-bold text-base tracking-wider text-[#07100D] dark:text-[#EDF5F2]">
            BERYL
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-64 bg-white dark:bg-[#0D1C17] border-r border-zinc-200 dark:border-[#1A332B] p-4 shrink-0 justify-between fixed md:sticky top-0 h-screen z-30 transition-all`}
      >
        <div className="space-y-5">
          {/* Logo & Tag */}
          <div className="px-2 pt-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BerylLogo size={28} />
              <span className="font-heading font-extrabold text-lg tracking-wider text-[#07100D] dark:text-[#EDF5F2]">
                BERYL
              </span>
            </Link>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-[#3EE0A8] font-bold">
                {isDeveloper ? "Developer Runtime" : "Autonomous Wallet"}
              </span>
            </div>
          </div>

          {/* Mode Indicator Pill inside Sidebar */}
          <div className="px-1">
            <div
              className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                isDeveloper
                  ? "bg-[#07100D] border-[#3EE0A8]/30 text-[#3EE0A8]"
                  : "bg-emerald-50/80 dark:bg-[#12241E] border-emerald-500/20 text-[#0B7A5A] dark:text-[#3EE0A8]"
              }`}
            >
              {isDeveloper ? (
                <>
                  <Terminal className="h-4 w-4 shrink-0" />
                  <div className="truncate">
                    <span className="font-mono font-bold block text-[11px]">Developer Lab</span>
                    <span className="text-[10px] text-zinc-400 font-sans">Full Engine & Attack Tools</span>
                  </div>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold block text-[11px]">Consumer App</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans">Simple Shopper Interface</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            <div className="text-[10px] font-mono text-zinc-400 px-3 uppercase tracking-wider font-semibold mb-1">
              {isDeveloper ? "Security & Policy Modules" : "Shopping Navigation"}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-emerald-50 dark:bg-[#152B23] text-[#0B7A5A] dark:text-[#3EE0A8]"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#12241E] hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: User & System Status */}
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-[#1A332B]">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-mono text-zinc-400">Theme</span>
            <ThemeToggle />
          </div>

          <div className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#12241E] border border-zinc-200/60 dark:border-[#1E3A31] text-xs">
            <div className="text-[10px] font-mono text-zinc-400 truncate">Active Account</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
              {userEmail}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-xs text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 gap-2 h-8 px-3 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        {/* Top Header Bar with Mode Switcher */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-[#F3F7F5]/90 dark:bg-[#07100D]/90 border-b border-zinc-200/80 dark:border-[#1A332B] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <ModeSwitcher />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {isDeveloper ? (
              <Badge className="bg-[#07100D] border border-emerald-500/40 text-[#3EE0A8] font-mono text-[10px] px-2.5 py-1">
                ENGINE: 0ms · AIR-GAP ENFORCED
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-[#3EE0A8] text-[10px] font-medium px-2.5 py-1">
                PROTECTED BY BERYL
              </Badge>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewModeProvider>
      <DashboardContent>{children}</DashboardContent>
    </ViewModeProvider>
  );
}
