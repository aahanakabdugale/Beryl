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
  Wallet,
  Bot,
  CheckSquare,
  SlidersHorizontal,
  BarChart3,
  User,
  ShieldCheck,
  History,
  Home,
} from "lucide-react";
import { BerylLogo } from "@/components/beryl-logo";
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
  const [mounted, setMounted] = useState(false);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [localSidebarCollapsed, setLocalSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState("Aahana");
  const [userEmail, setUserEmail] = useState("aahana.kabdugale@gmail.com");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [internalPendingCount, setInternalPendingCount] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize collapse state from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem("beryl_sidebar_collapsed");
      if (stored !== null) {
        setLocalSidebarCollapsed(stored === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const isCollapsed = isSidebarMinimized !== undefined ? isSidebarMinimized : localSidebarCollapsed;

  const toggleSidebar = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      setLocalSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("beryl_sidebar_collapsed", String(next));
        } catch {
          // ignore
        }
        return next;
      });
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

  // Load user name & check custom profile from localStorage or Supabase
  const loadProfile = async () => {
    try {
      const savedProfile = localStorage.getItem("beryl_user_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.email) setUserEmail(parsed.email);
        return;
      }
    } catch {
      // ignore
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        const first = user.email.split("@")[0].split(".")[0];
        setUserName(first.charAt(0).toUpperCase() + first.slice(1));
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadProfile();

    const handleProfileUpdate = () => {
      loadProfile();
    };
    window.addEventListener("beryl_profile_updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("beryl_profile_updated", handleProfileUpdate);
    };
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
  const isAccountActive = currentPath === "/dashboard/account" || currentPath === "/consumer/account";

  const navItems = [
    {
      label: "Wallet & Budget",
      href: "/dashboard",
      icon: Wallet,
      isActive: isWalletActive,
    },
    {
      label: "Shop with agent",
      href: "/dashboard/agent",
      icon: Bot,
      isActive: isAgentActive,
    },
    {
      label: "Pending approvals",
      href: "/dashboard/approvals",
      icon: CheckSquare,
      isActive: isApprovalsActive,
      badge: pendingBadge,
    },
    {
      label: "Spending rules",
      href: "/dashboard/mandates/new",
      icon: SlidersHorizontal,
      isActive: isRulesActive,
    },
    {
      label: "Spending analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      isActive: isAnalyticsActive,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--approvals-page)] text-[var(--approvals-ink)] font-[family-name:var(--font-space-grotesk)] flex selection:bg-emerald-500/20">
      {/* ============================================================== */}
      {/* EXPANDED DESKTOP SIDEBAR (w-[236px]) or MOBILE DRAWER          */}
      {/* ============================================================== */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[236px] bg-[var(--approvals-card)] border-r border-[var(--approvals-line)] p-5 flex flex-col justify-between z-40 transition-transform duration-200 ${
          mobileDrawerOpen
            ? "translate-x-0"
            : isCollapsed
            ? "-translate-x-full"
            : "-translate-x-full [@media(min-width:980px)]:translate-x-0"
        }`}
      >
        <div className="space-y-7">
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
                title="Minimize sidebar to thin view"
                aria-label="Minimize sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="[@media(min-width:980px)]:hidden p-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links with Sensible Logos */}
          <nav className="space-y-1.5 flex flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-[14.5px] rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] ${
                    item.isActive
                      ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-semibold shadow-xs"
                      : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)]/70 font-normal"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${item.isActive ? "text-[var(--approvals-accent)]" : "text-[var(--approvals-mute)]"}`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--approvals-amber)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom: Account Card with Menu & Theme Toggle */}
        <div className="pt-3.5 border-t border-[var(--approvals-line)] space-y-2 relative">
          <div className="flex items-center justify-between gap-1.5">
            {/* Account Chip Button */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--approvals-page)] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] cursor-pointer ${
                  isAccountActive ? "bg-[var(--approvals-soft)]/50 ring-1 ring-[var(--approvals-accent)]/30" : ""
                }`}
                title="Account options"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--approvals-accent)]/20 shadow-xs">
                  {userName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--approvals-ink)] truncate leading-tight">
                    {userName}
                  </div>
                  <div className="text-[11px] text-[var(--approvals-mute)] leading-tight flex items-center gap-1">
                    <span>Consumer</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--approvals-mute)] shrink-0 mr-1" />
              </button>

              {/* Account Dropdown Menu */}
              {accountMenuOpen && (
                <div className="absolute bottom-12 left-0 w-52 bg-[var(--approvals-card)] border border-[var(--approvals-line)] rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 border-b border-[var(--approvals-line)] mb-1">
                    <p className="text-[12px] font-semibold text-[var(--approvals-ink)] truncate">{userName}</p>
                    <p className="text-[11px] text-[var(--approvals-mute)] truncate">{userEmail}</p>
                  </div>

                  <Link
                    href="/dashboard/account"
                    onClick={() => setAccountMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] rounded-lg transition-colors cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-[var(--approvals-accent)]" />
                    <div className="flex-1">
                      <span className="font-medium block">Account page</span>
                      <span className="text-[10px] text-[var(--approvals-mute)] block">Update data & see history</span>
                    </div>
                  </Link>

                  <Link
                    href="/"
                    onClick={() => setAccountMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] rounded-lg transition-colors cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span>Back to Landing Page</span>
                  </Link>

                  <div className="my-1 border-t border-[var(--approvals-line)]" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
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
              className="w-8 h-8 rounded-xl border border-[var(--approvals-line)] flex items-center justify-center text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] cursor-pointer shrink-0"
              aria-label="Toggle dark mode"
              title="Toggle theme"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[var(--approvals-mute)]" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* THIN DESKTOP SIDEBAR (w-[72px] rail when collapsed)            */}
      {/* ============================================================== */}
      {isCollapsed && (
        <aside
          className="hidden [@media(min-width:980px)]:flex fixed left-0 top-0 bottom-0 w-[72px] bg-[var(--approvals-card)] border-r border-[var(--approvals-line)] py-5 px-2 flex-col justify-between items-center z-40 transition-all duration-200"
          aria-label="Collapsed navigation rail"
        >
          {/* Top: Logo & Expand toggle */}
          <div className="flex flex-col items-center gap-4 w-full">
            <Link
              href="/"
              title="BERYL"
              className="p-1 rounded-lg hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
            >
              <BerylLogo size={28} />
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4 text-[var(--approvals-brand)]" />
            </button>

            <div className="w-8 h-[1px] bg-[var(--approvals-line)]" />

            {/* Navigation Logos in Thin Sidebar */}
            <nav className="flex flex-col items-center gap-2 w-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] group ${
                      item.isActive
                        ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] shadow-xs ring-1 ring-[var(--approvals-accent)]/20"
                        : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[var(--approvals-amber)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {item.badge}
                      </span>
                    )}

                    {/* Hover tooltip label */}
                    <span className="absolute left-[78px] bg-[var(--approvals-card)] border border-[var(--approvals-line)] text-[var(--approvals-ink)] text-[12px] font-medium px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom of Thin Sidebar: Account Avatar & Theme Toggle */}
          <div className="flex flex-col items-center gap-3 w-full relative">
            <div className="w-8 h-[1px] bg-[var(--approvals-line)]" />

            {/* Account Icon Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                title={`${userName} (Account)`}
                className={`w-9 h-9 rounded-full bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-bold text-xs flex items-center justify-center border border-[var(--approvals-accent)]/25 hover:ring-2 hover:ring-[var(--approvals-brand)] transition-all cursor-pointer ${
                  isAccountActive ? "ring-2 ring-[var(--approvals-accent)]" : ""
                }`}
              >
                {userName.charAt(0)}
              </button>

              {/* Account Dropdown in Thin Rail */}
              {accountMenuOpen && (
                <div className="absolute bottom-0 left-[68px] w-52 bg-[var(--approvals-card)] border border-[var(--approvals-line)] rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 border-b border-[var(--approvals-line)] mb-1">
                    <p className="text-[12px] font-semibold text-[var(--approvals-ink)] truncate">{userName}</p>
                    <p className="text-[11px] text-[var(--approvals-mute)] truncate">{userEmail}</p>
                  </div>

                  <Link
                    href="/dashboard/account"
                    onClick={() => setAccountMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] rounded-lg transition-colors cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-[var(--approvals-accent)]" />
                    <div className="flex-1">
                      <span className="font-medium block">Account page</span>
                      <span className="text-[10px] text-[var(--approvals-mute)] block">Update data & see history</span>
                    </div>
                  </Link>

                  <Link
                    href="/"
                    onClick={() => setAccountMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] rounded-lg transition-colors cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span>Back to Landing Page</span>
                  </Link>

                  <div className="my-1 border-t border-[var(--approvals-line)]" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[12px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-8 h-8 rounded-xl border border-[var(--approvals-line)] flex items-center justify-center text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] cursor-pointer"
              title="Toggle theme"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[var(--approvals-mute)]" />
              )}
            </button>
          </div>
        </aside>
      )}

      {/* Backdrop for mobile drawer */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 [@media(min-width:980px)]:hidden animate-in fade-in duration-150"
        />
      )}

      {/* ============================================================== */}
      {/* Main Content Area                                              */}
      {/* ============================================================== */}
      <main
        className={`flex-1 min-w-0 transition-all duration-200 ${
          isCollapsed
            ? "[@media(min-width:980px)]:pl-[72px]"
            : "[@media(min-width:980px)]:pl-[236px]"
        } flex justify-center min-h-screen`}
      >
        <div
          className={`w-full ${
            isCollapsed ? "max-w-[1300px]" : maxWidth
          } px-5 sm:px-10 ${
            compactPadding ? "py-4 sm:py-5 space-y-3.5" : "py-6 sm:py-8 space-y-6"
          }`}
        >
          {/* Header Row: Title on Left, Mode Switcher & Actions on Right */}
          {title ? (
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileDrawerOpen(true)}
                    className="[@media(min-width:980px)]:hidden p-1.5 -ml-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] cursor-pointer"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

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

              {headerActions && (
                <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                  {headerActions}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileDrawerOpen(true)}
                  className="[@media(min-width:980px)]:hidden p-1.5 -ml-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] cursor-pointer"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>

              {headerActions && (
                <div className="ml-auto flex items-center gap-3">
                  {headerActions}
                </div>
              )}
            </div>
          )}

          {/* Main Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
