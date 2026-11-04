"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { BerylLogo } from "@/components/beryl-logo";
import { ModeSwitcher } from "@/components/mode-switcher";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

interface ConsumerShellProps {
  children: React.ReactNode;
  activePath?: string;
  pendingCount?: number;
  maxWidth?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerActions?: React.ReactNode;
  compactPadding?: boolean;
  isSidebarMinimized?: boolean;
  onToggleSidebar?: () => void;
}

export function ConsumerShell({
  children,
  activePath,
  pendingCount: propPendingCount,
  maxWidth = "max-w-[1120px]",
  title,
  description,
  headerActions,
  compactPadding = false,
  isSidebarMinimized,
  onToggleSidebar,
}: ConsumerShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [localSidebarCollapsed, setLocalSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState("Aahana");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [internalPendingCount, setInternalPendingCount] = useState<number>(0);

  const isCollapsed = isSidebarMinimized !== undefined ? isSidebarMinimized : localSidebarCollapsed;
  const toggleSidebar = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      setLocalSidebarCollapsed(!localSidebarCollapsed);
    }
  };

  const currentPath = activePath || pathname;

  // Load pending approvals count if not provided
  useEffect(() => {
    if (propPendingCount !== undefined) {
      setInternalPendingCount(propPendingCount);
      return;
    }

    async function loadPendingCount() {
      try {
        const res = await fetch("/api/approvals?status=pending");
        if (res.ok) {
          const data = await res.json();
          setInternalPendingCount((data.approvals || []).length);
        }
      } catch {
        // silent
      }
    }
    loadPendingCount();
  }, [propPendingCount]);

  // Load user name
  useEffect(() => {
    async function getUserName() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const first = user.email.split("@")[0].split(".")[0];
          setUserName(first.charAt(0).toUpperCase() + first.slice(1));
        }
      } catch {
        // fallback
      }
    }
    getUserName();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      document.cookie = "beryl_demo_mode=; path=/; max-age=0";
      toast.success("Signed out");
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const pendingBadge = propPendingCount !== undefined ? propPendingCount : internalPendingCount;

  const isWalletActive = currentPath === "/dashboard" || currentPath === "/consumer/wallet";
  const isAgentActive = currentPath === "/dashboard/agent" || currentPath === "/consumer/agent";
  const isApprovalsActive = currentPath === "/dashboard/approvals" || currentPath === "/consumer/approvals";
  const isRulesActive = currentPath === "/dashboard/mandates/new" || currentPath === "/consumer/rules";
  const isAnalyticsActive = currentPath === "/dashboard/analytics" || currentPath === "/consumer/analytics";

  return (
    <div className="min-h-screen bg-[var(--approvals-page)] text-[var(--approvals-ink)] font-[family-name:var(--font-space-grotesk)] flex selection:bg-emerald-500/20">
      {/* ============================================================== */}
      {/* 236px Fixed Sidebar                                             */}
      {/* ============================================================== */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[236px] bg-[var(--approvals-card)] border-r border-[var(--approvals-line)] p-6 flex flex-col justify-between z-40 transition-transform duration-200 ${
          mobileDrawerOpen
            ? "translate-x-0"
            : isCollapsed
            ? "-translate-x-full"
            : "-translate-x-full [@media(min-width:980px)]:translate-x-0"
        }`}
      >
        <div className="space-y-8">
          {/* Logo row (28px gem tile + BERYL Space Grotesk 700 tracking .05em) */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] rounded-lg"
            >
              <BerylLogo size={26} />
              <span className="font-heading font-bold text-[17px] tracking-[0.05em] text-[var(--approvals-ink)]">
                BERYL
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden [@media(min-width:980px)]:flex p-1.5 rounded-lg text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors cursor-pointer"
                title="Minimize sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="[@media(min-width:980px)]:hidden p-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Plain text links */}
          <nav className="space-y-1 flex flex-col">
            <Link
              href="/dashboard"
              className={`px-4 py-2.5 text-[15px] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] ${
                isWalletActive
                  ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-medium"
                  : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] font-normal"
              }`}
            >
              Wallet & Budget
            </Link>

            <Link
              href="/dashboard/agent"
              className={`px-4 py-2.5 text-[15px] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] ${
                isAgentActive
                  ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-medium"
                  : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] font-normal"
              }`}
            >
              Shop with agent
            </Link>

            <Link
              href="/dashboard/approvals"
              className={`px-4 py-2.5 text-[15px] rounded-xl flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] ${
                isApprovalsActive
                  ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-medium"
                  : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] font-normal"
              }`}
            >
              <span>Pending approvals</span>
              {pendingBadge > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--approvals-amber)] text-white text-[11px] font-bold flex items-center justify-center">
                  {pendingBadge}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/mandates/new"
              className={`px-4 py-2.5 text-[15px] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] ${
                isRulesActive
                  ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-medium"
                  : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] font-normal"
              }`}
            >
              Spending rules
            </Link>

            <Link
              href="/dashboard/analytics"
              className={`px-4 py-2.5 text-[15px] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] ${
                isAnalyticsActive
                  ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-medium"
                  : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] font-normal"
              }`}
            >
              Spending analytics
            </Link>
          </nav>
        </div>

        {/* Sidebar Bottom: Account Chip with Menu & Theme Toggle */}
        <div className="pt-4 border-t border-[var(--approvals-line)] flex items-center justify-between gap-2 relative">
          {/* Account Chip */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="w-full flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-[var(--approvals-page)] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-bold text-xs flex items-center justify-center shrink-0">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-[var(--approvals-ink)] truncate leading-tight">
                  {userName}
                </div>
                <div className="text-[11px] text-[var(--approvals-mute)] leading-tight">
                  Consumer
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-[var(--approvals-mute)] shrink-0 mr-1" />
            </button>

            {/* Dropdown Menu */}
            {accountMenuOpen && (
              <div className="absolute bottom-12 left-0 w-48 bg-[var(--approvals-card)] border border-[var(--approvals-line)] rounded-xl shadow-lg p-1.5 z-50">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle Icon Button */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-full border border-[var(--approvals-line)] flex items-center justify-center text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] cursor-pointer shrink-0"
            aria-label="Toggle dark mode"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-[var(--approvals-mute)]" />
            )}
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 [@media(min-width:980px)]:hidden"
        />
      )}

      {/* ============================================================== */}
      {/* Main Content Area                                              */}
      {/* ============================================================== */}
      <main className={`flex-1 min-w-0 transition-all duration-200 ${isCollapsed ? "pl-0" : "[@media(min-width:980px)]:pl-[236px]"} flex justify-center min-h-screen`}>
        <div className={`w-full ${isCollapsed ? "max-w-[1340px]" : maxWidth} px-5 sm:px-10 ${compactPadding ? "py-4 sm:py-5 space-y-3.5" : "py-6 sm:py-8 space-y-6"}`}>
          {/* Header Row: Title on Left, Mode Switcher & Actions on Right */}
          {title ? (
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileDrawerOpen(true)}
                    className="[@media(min-width:980px)]:hidden p-1.5 -ml-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  {/* Desktop Show Sidebar Button when collapsed */}
                  {isCollapsed && (
                    <button
                      type="button"
                      onClick={toggleSidebar}
                      className="hidden [@media(min-width:980px)]:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--approvals-line)] bg-[var(--approvals-card)] text-[12px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors cursor-pointer mr-1"
                      title="Show navigation sidebar"
                    >
                      <PanelLeftOpen className="h-4 w-4 text-[var(--approvals-brand)]" />
                      <span>Sidebar</span>
                    </button>
                  )}

                  {typeof title === "string" ? (
                    <h1 className="text-[28px] sm:text-[32px] font-medium tracking-[-0.03em] text-[var(--approvals-ink)] leading-tight">
                      {title}
                    </h1>
                  ) : (
                    title
                  )}
                </div>
                {description && (
                  <p className="text-[14px] sm:text-[15px] text-[var(--approvals-mute)]">
                    {description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                {headerActions}
                <div className="scale-90 origin-right">
                  <ModeSwitcher />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileDrawerOpen(true)}
                  className="[@media(min-width:980px)]:hidden p-1.5 -ml-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {isCollapsed && (
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="hidden [@media(min-width:980px)]:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--approvals-line)] bg-[var(--approvals-card)] text-[12px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors cursor-pointer mr-1"
                  >
                    <PanelLeftOpen className="h-4 w-4 text-[var(--approvals-brand)]" />
                    <span>Sidebar</span>
                  </button>
                )}
              </div>

              <div className="ml-auto flex items-center gap-3">
                {headerActions}
                <div className="scale-90 origin-right">
                  <ModeSwitcher />
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
