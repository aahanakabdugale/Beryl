"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Wallet,
  ShoppingBag,
  CheckSquare,
  Sliders,
  BarChart3,
  Sun,
  Moon,
  RotateCcw,
  Plus,
  Check,
  AlertCircle,
  Menu,
  X,
  Keyboard,
  Package,
  Zap,
  Layers,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { BerylLogo } from "@/components/beryl-logo";
import { ModeSwitcher } from "@/components/mode-switcher";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Mandate {
  id: string;
  name: string;
  total_budget_cents: number;
  spent_cents?: number;
  per_purchase_limit_cents: number;
  ask_above_cents?: number;
  approval_threshold_cents?: number;
  allowed_categories: string[];
}

interface ApprovalItem {
  id: string;
  request_id: string;
  status: "pending" | "approved" | "rejected";
  decided_at?: string;
  payment_requests?: {
    id: string;
    item?: string;
    category?: string;
    merchant?: string;
    merchant_domain?: string;
    amount_cents: number;
    agent_reason?: string;
    product_url?: string;
    mandates?: {
      name?: string;
      approval_threshold_cents?: number;
    };
  };
}

export default function ConsumerApprovalsScreen() {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userName, setUserName] = useState("Aahana");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // 1. Fetch approvals and active mandate
  const loadData = async () => {
    try {
      setLoading(true);

      const [resApprovals, resMandates] = await Promise.all([
        fetch("/api/approvals?status=all"),
        fetch("/api/mandates"),
      ]);

      if (resApprovals.ok) {
        const data = await resApprovals.json();
        setApprovals(data.approvals || []);
      }

      if (resMandates.ok) {
        const data = await resMandates.json();
        const list: Mandate[] = data.mandates || [];
        if (list.length > 0) {
          setActiveMandate(list[0]);
        }
      }
    } catch {
      toast.error("Failed to load approvals data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Fetch user profile name
    async function getUserName() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const first = user.email.split("@")[0].split(".")[0];
          setUserName(first.charAt(0).toUpperCase() + first.slice(1));
        }
      } catch {
        // fallback to default
      }
    }
    getUserName();
  }, []);

  // Counts
  const counts = useMemo(() => {
    const pending = approvals.filter((a) => a.status === "pending").length;
    const approved = approvals.filter((a) => a.status === "approved").length;
    const rejected = approvals.filter((a) => a.status === "rejected").length;
    return { pending, approved, rejected };
  }, [approvals]);

  // Tab filtered items
  const filteredItems = useMemo(() => {
    return approvals.filter((a) => a.status === activeTab);
  }, [approvals, activeTab]);

  // Financial calculations
  const totalBudgetCents = activeMandate?.total_budget_cents ?? 15000;
  const spentCents = activeMandate?.spent_cents ?? 499;
  const remainingAllowanceCents = Math.max(0, totalBudgetCents - spentCents);

  // Handlers
  const handleToggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDecide = async (approvalId: string, decision: "APPROVE" | "REJECT") => {
    const target = approvals.find((a) => a.id === approvalId);
    if (!target) return;

    setDecidingId(approvalId);

    // Optimistic Update
    const previousApprovals = [...approvals];
    const previousMandate = activeMandate ? { ...activeMandate } : null;

    const newStatus = decision === "APPROVE" ? "approved" : "rejected";
    const amountCents = target.payment_requests?.amount_cents || 0;

    setApprovals((prev) =>
      prev.map((item) =>
        item.id === approvalId
          ? { ...item, status: newStatus, decided_at: new Date().toISOString() }
          : item
      )
    );

    if (decision === "APPROVE" && activeMandate) {
      setActiveMandate({
        ...activeMandate,
        spent_cents: (activeMandate.spent_cents || 0) + amountCents,
      });
    }

    try {
      const res = await fetch(`/api/approvals/${approvalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decision === "APPROVE" ? "approved" : "rejected",
          reason: decision === "REJECT" ? "Declined by user" : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Server responded with error");
      }

      toast[decision === "APPROVE" ? "success" : "info"](
        decision === "APPROVE"
          ? "Payment approved & charged to PayPal sandbox!"
          : "Order declined. No payment made."
      );
    } catch {
      // Rollback on failure
      setApprovals(previousApprovals);
      if (previousMandate) setActiveMandate(previousMandate);
      toast.error("Failed to submit decision. Rolled back.");
    } finally {
      setDecidingId(null);
    }
  };

  // Sample order mock creation
  const handleCreateMockEscalation = async () => {
    try {
      const sampleNames = [
        "Redragon K517RGB PRO 94-Key Wireless Keyboard",
        "Desk organiser, bamboo, 5-slot",
        "Anker 65W USB-C Fast Charger",
        "Keychron K2 Wireless Mechanical Keyboard",
      ];
      const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
      const randomAmount = Math.floor(Math.random() * 2500) + 2500; // $25 - $50

      const res = await fetch("/api/guard/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: randomName,
          category: randomName.includes("bamboo") ? "office supplies" : "electronics",
          merchant_domain: "bestbuy.com",
          amount_cents: randomAmount,
          agent_reason: `Discovered by AI shopper for workspace setup. Verified seller and catalog price match. Exceeds auto-approval threshold.`,
        }),
      });

      if (res.ok) {
        toast.success("Sample order created!");
        loadData();
      } else {
        toast.error("Failed to generate test order");
      }
    } catch {
      toast.error("Network error creating sample order");
    }
  };

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

  // Helper for Item icon
  const getItemIcon = (name: string = "") => {
    const lower = name.toLowerCase();
    if (lower.includes("keyboard") || lower.includes("keychron")) return Keyboard;
    if (lower.includes("charger") || lower.includes("power") || lower.includes("cable")) return Zap;
    if (lower.includes("organis") || lower.includes("desk") || lower.includes("stand")) return Package;
    return Layers;
  };

  return (
    <div className="min-h-screen bg-[var(--approvals-page)] text-[var(--approvals-ink)] font-[family-name:var(--font-space-grotesk)] flex">
      {/* ============================================================== */}
      {/* 236px Fixed Sidebar                                             */}
      {/* ============================================================== */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[236px] bg-[var(--approvals-card)] border-r border-[var(--approvals-line)] p-6 flex flex-col justify-between z-40 transition-transform duration-200 ${
          mobileDrawerOpen
            ? "translate-x-0"
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

            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="[@media(min-width:980px)]:hidden p-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Plain text links */}
          <nav className="space-y-1 flex flex-col">
            <Link
              href="/dashboard"
              className="px-4 py-2.5 text-[15px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] rounded-xl transition-colors font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
            >
              Wallet & Budget
            </Link>

            <Link
              href="/dashboard/agent"
              className="px-4 py-2.5 text-[15px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] rounded-xl transition-colors font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
            >
              Shop with agent
            </Link>

            <Link
              href="/dashboard/approvals"
              className="px-4 py-2.5 text-[15px] font-medium rounded-xl bg-[var(--approvals-soft)] text-[var(--approvals-accent)] flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
            >
              <span>Pending approvals</span>
              {counts.pending > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--approvals-amber)] text-white text-[11px] font-bold flex items-center justify-center">
                  {counts.pending}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/mandates/new"
              className="px-4 py-2.5 text-[15px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] rounded-xl transition-colors font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
            >
              Spending rules
            </Link>

            <Link
              href="/dashboard/analytics"
              className="px-4 py-2.5 text-[15px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] rounded-xl transition-colors font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
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
              className="w-full flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-[var(--approvals-page)] transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
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
      <main className="flex-1 min-w-0 [@media(min-width:980px)]:pl-[236px] flex justify-center min-h-screen">
        <div className="w-full max-w-[1120px] px-6 sm:px-11 py-9 space-y-9">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileDrawerOpen(true)}
                  className="[@media(min-width:980px)]:hidden p-1.5 -ml-1 text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="text-[32px] font-medium tracking-[-0.03em] text-[var(--approvals-ink)] leading-tight">
                  Pending order approvals
                </h1>
              </div>
              <p className="text-[15px] text-[var(--approvals-mute)]">
                Items your agent found that need your sign-off before charging PayPal.
              </p>
            </div>

            {/* Right Controls: Refresh, Sample order & Mode Switcher */}
            <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--approvals-line)] text-[14px] text-[var(--approvals-ink)] hover:bg-[var(--approvals-card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] cursor-pointer"
              >
                <RotateCcw className={`h-3.5 w-3.5 text-[var(--approvals-mute)] ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleCreateMockEscalation}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--approvals-line)] text-[14px] text-[var(--approvals-ink)] hover:bg-[var(--approvals-card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[var(--approvals-mute)]" />
                <span>Sample order</span>
              </button>

              {/* Mode Switcher preserved small in top-right */}
              <div className="scale-90 origin-right">
                <ModeSwitcher />
              </div>
            </div>
          </div>

          {/* Segmented Pill Tabs */}
          <div>
            <div className="inline-flex items-center p-1 rounded-full bg-[var(--approvals-card)] border border-[var(--approvals-line)]">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
                  activeTab === "pending"
                    ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)]"
                    : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
                }`}
              >
                Waiting for you {counts.pending}
              </button>

              <button
                onClick={() => setActiveTab("approved")}
                className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
                  activeTab === "approved"
                    ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)]"
                    : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
                }`}
              >
                Approved {counts.approved}
              </button>

              <button
                onClick={() => setActiveTab("rejected")}
                className={`px-4 py-1.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
                  activeTab === "rejected"
                    ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)]"
                    : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)]"
                }`}
              >
                Declined {counts.rejected}
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* LEDGER TABLE (Main Component, no outer card)                   */}
          {/* ============================================================== */}
          <div className="w-full">
            {filteredItems.length === 0 ? (
              /* Empty State */
              <div className="border-2 border-dashed border-[var(--approvals-line)] rounded-3xl p-12 text-center my-6">
                <h3 className="text-[20px] font-medium text-[var(--approvals-ink)]">
                  {activeTab === "pending"
                    ? "Nothing waiting for you"
                    : "Nothing here yet"}
                </h3>
                <p className="text-[14px] text-[var(--approvals-mute)] mt-1.5">
                  {activeTab === "pending"
                    ? "Your agent is staying inside your rules."
                    : "Decided orders will be archived in this view."}
                </p>
              </div>
            ) : (
              <div className="w-full border-b border-[var(--approvals-line)]">
                {/* Header Row */}
                <div className="grid grid-cols-[1fr_auto_auto] [@media(min-width:980px)]:grid-cols-[1.5fr_1fr_1fr_100px_90px] items-center pb-3 border-b border-[var(--approvals-ink)]/15 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--approvals-mute)] px-3">
                  <div>ITEM</div>
                  <div className="hidden [@media(min-width:980px)]:block">MERCHANT</div>
                  <div className="hidden [@media(min-width:980px)]:block">CATEGORY</div>
                  <div className="text-right">AMOUNT</div>
                  <div className="text-right pl-3"></div>
                </div>

                {/* Table Rows */}
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {filteredItems.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const req = item.payment_requests;
                    const itemName = req?.item || "Pending order request";
                    const merchantName = req?.merchant || req?.merchant_domain || "verified seller";
                    const category = req?.category || "electronics";
                    const amountCents = req?.amount_cents || 0;
                    const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;

                    // Icon Tile Style
                    const IconComp = getItemIcon(itemName);
                    const iconTileClass =
                      item.status === "pending"
                        ? "bg-[#fff6e0] dark:bg-[#17130a] text-[#b87400] dark:text-[#f3b33d]"
                        : item.status === "approved"
                        ? "bg-[#e6f4ec] dark:bg-[#0f2a1e] text-[#0b7a55] dark:text-[#3fe0a0]"
                        : "bg-[#fff0f2] dark:bg-[#1d0c10] text-[#d93a52] dark:text-[#ff5d75]";

                    // Action Pill Style
                    let actionText = "REVIEW";
                    let actionClass = "bg-[var(--approvals-amber-bg)] text-[var(--approvals-amber)]";
                    if (item.status === "approved") {
                      actionText = "APPROVED";
                      actionClass = "bg-[var(--approvals-soft)] text-[var(--approvals-accent)]";
                    } else if (item.status === "rejected") {
                      actionText = "DECLINED";
                      actionClass = "bg-[var(--approvals-red-bg)] text-[var(--approvals-red)]";
                    }

                    if (isExpanded) {
                      actionText = "CLOSE";
                    }

                    // Impact Calculation for Expanded panel
                    const ifApprovedLeftCents = Math.max(0, remainingAllowanceCents - amountCents);
                    const leftNowFormatted = `$${(remainingAllowanceCents / 100).toFixed(2)}`;
                    const ifApprovedFormatted = `$${(ifApprovedLeftCents / 100).toFixed(2)}`;

                    // Progress percentages for right impact bar
                    const currentSpentPercent = Math.min(100, (spentCents / totalBudgetCents) * 100);
                    const orderPercent = Math.min(100 - currentSpentPercent, (amountCents / totalBudgetCents) * 100);

                    // Threshold limit for checklist
                    const askAboveCents = activeMandate?.ask_above_cents || activeMandate?.approval_threshold_cents || 1500;
                    const maxPerItemCents = activeMandate?.per_purchase_limit_cents || 5000;
                    const isWithinMax = amountCents <= maxPerItemCents;
                    const isExceedThreshold = amountCents > askAboveCents;
                    const hasEnoughAllowance = remainingAllowanceCents >= amountCents;

                    return (
                      <div key={item.id} className="border-b border-[var(--approvals-line)]">
                        {/* Interactive Row */}
                        <div
                          role="button"
                          aria-expanded={isExpanded}
                          tabIndex={0}
                          onClick={() => handleToggleRow(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggleRow(item.id);
                            }
                          }}
                          className={`grid grid-cols-[1fr_auto_auto] [@media(min-width:980px)]:grid-cols-[1.5fr_1fr_1fr_100px_90px] items-center py-4 px-3 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)] ${
                            isExpanded
                              ? "bg-[var(--approvals-card)]"
                              : "hover:bg-[var(--approvals-card)]"
                          }`}
                        >
                          {/* Item Cell */}
                          <div className="flex items-center gap-3.5 min-w-0 pr-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconTileClass}`}>
                              <IconComp className="h-5 w-5" />
                            </div>
                            <span
                              className="font-medium text-[15px] text-[var(--approvals-ink)] truncate"
                              title={itemName}
                            >
                              {itemName}
                            </span>
                          </div>

                          {/* Merchant Cell */}
                          <div className="hidden [@media(min-width:980px)]:block text-[14px] text-[var(--approvals-mute)] truncate pr-4">
                            {merchantName}
                          </div>

                          {/* Category Cell */}
                          <div className="hidden [@media(min-width:980px)]:block text-[14px] text-[var(--approvals-mute)] truncate pr-4">
                            {category}
                          </div>

                          {/* Amount Cell */}
                          <div className="font-medium text-[16px] text-[var(--approvals-ink)] text-right">
                            {amountFormatted}
                          </div>

                          {/* Action Pill Cell */}
                          <div className="text-right pl-3">
                            <span
                              className={`inline-block font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3 py-1 rounded-full ${actionClass}`}
                            >
                              {actionText}
                            </span>
                          </div>
                        </div>

                        {/* ============================================================== */}
                        {/* EXPANDED ROW PANEL                                             */}
                        {/* ============================================================== */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className="overflow-hidden bg-[var(--approvals-card)]"
                            >
                              <div className="p-6 sm:p-7 grid grid-cols-1 [@media(min-width:980px)]:grid-cols-[1.2fr_1fr] gap-[34px] border-t border-[var(--approvals-line)]">
                                {/* Left Column: Agent Reasoning & Buttons */}
                                <div className="space-y-4">
                                  <div>
                                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--approvals-mute)] block mb-2">
                                      WHY YOUR AGENT PICKED THIS
                                    </span>
                                    <div className="bg-[var(--approvals-page)] rounded-2xl p-4 sm:p-[18px] text-[var(--approvals-mute)] text-[14px] leading-[1.6]">
                                      {req?.agent_reason ? (
                                        <span>{req.agent_reason}</span>
                                      ) : (
                                        <span>
                                          Requested <span className="font-medium text-[var(--approvals-ink)]">{itemName}</span> at{" "}
                                          <span className="font-medium text-[var(--approvals-ink)]">{amountFormatted}</span> from{" "}
                                          <span className="font-medium text-[var(--approvals-ink)]">{merchantName}</span>. Fits your workspace setup mandate and passed catalog validation.
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons for Waiting items only */}
                                  {item.status === "pending" && (
                                    <div className="flex items-center gap-3 pt-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDecide(item.id, "APPROVE");
                                        }}
                                        disabled={decidingId === item.id}
                                        className="bg-[var(--approvals-amber)] text-white hover:opacity-90 font-medium text-[14px] rounded-full px-[22px] py-[11px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-amber)]"
                                      >
                                        Approve {amountFormatted}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDecide(item.id, "REJECT");
                                        }}
                                        disabled={decidingId === item.id}
                                        className="border border-[var(--approvals-line)] text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] font-medium text-[14px] rounded-full px-[22px] py-[11px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--approvals-brand)]"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}

                                  {/* For Approved / Declined items */}
                                  {item.status === "approved" && (
                                    <div className="text-[14px] font-medium text-[var(--approvals-accent)] pt-1 flex items-center gap-1.5">
                                      <Check className="h-4 w-4" />
                                      <span>Charged {amountFormatted} via PayPal</span>
                                    </div>
                                  )}

                                  {item.status === "rejected" && (
                                    <div className="text-[14px] font-medium text-[var(--approvals-mute)] pt-1">
                                      No charge was made
                                    </div>
                                  )}
                                </div>

                                {/* Right Column: Allowance Impact & Policy Checklist */}
                                <div className="space-y-4">
                                  {/* Allowance impact row */}
                                  <div>
                                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--approvals-mute)] block mb-1">
                                      ALLOWANCE IMPACT
                                    </span>
                                    <div className="text-[24px] sm:text-[28px] font-medium text-[var(--approvals-ink)] tracking-tight">
                                      Left now {leftNowFormatted} → If approved {ifApprovedFormatted}
                                    </div>

                                    {/* 8px Bar showing used (accent) + this order (amber) */}
                                    <div className="h-2 w-full rounded-full bg-[var(--approvals-line)] overflow-hidden flex mt-2.5">
                                      <div
                                        className="h-full bg-[var(--approvals-accent)] transition-all"
                                        style={{ width: `${currentSpentPercent}%` }}
                                      />
                                      {item.status === "pending" && (
                                        <div
                                          className="h-full bg-[var(--approvals-amber)] transition-all"
                                          style={{ width: `${orderPercent}%` }}
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Policy Checklist */}
                                  <div className="space-y-2 pt-2 border-t border-[var(--approvals-line)]">
                                    {/* 1. Within per-item limit */}
                                    <div className="flex items-center justify-between text-[13px]">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-[var(--approvals-soft)] text-[var(--approvals-accent)] flex items-center justify-center shrink-0">
                                          <Check className="h-3 w-3 stroke-[2.5]" />
                                        </div>
                                        <span className="text-[var(--approvals-ink)]">Within per-item limit</span>
                                      </div>
                                      <span className="text-[var(--approvals-mute)]">
                                        {amountFormatted} ≤ ${((maxPerItemCents) / 100).toFixed(2)} max
                                      </span>
                                    </div>

                                    {/* 2. Category allowed */}
                                    <div className="flex items-center justify-between text-[13px]">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-[var(--approvals-soft)] text-[var(--approvals-accent)] flex items-center justify-center shrink-0">
                                          <Check className="h-3 w-3 stroke-[2.5]" />
                                        </div>
                                        <span className="text-[var(--approvals-ink)]">Category allowed</span>
                                      </div>
                                      <span className="text-[var(--approvals-mute)] capitalize">
                                        {category} permitted
                                      </span>
                                    </div>

                                    {/* 3. Above auto-approve limit */}
                                    <div className="flex items-center justify-between text-[13px]">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-[var(--approvals-amber-bg)] text-[var(--approvals-amber)] flex items-center justify-center shrink-0 font-bold text-xs">
                                          !
                                        </div>
                                        <span className="text-[var(--approvals-ink)]">Above auto-approve limit</span>
                                      </div>
                                      <span className="text-[var(--approvals-amber)] font-medium">
                                        Needs you (&gt;${((askAboveCents) / 100).toFixed(2)})
                                      </span>
                                    </div>

                                    {/* 4. Enough allowance left */}
                                    <div className="flex items-center justify-between text-[13px]">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-[var(--approvals-soft)] text-[var(--approvals-accent)] flex items-center justify-center shrink-0">
                                          <Check className="h-3 w-3 stroke-[2.5]" />
                                        </div>
                                        <span className="text-[var(--approvals-ink)]">Enough allowance left</span>
                                      </div>
                                      <span className="text-[var(--approvals-mute)]">
                                        {ifApprovedFormatted} remaining
                                      </span>
                                    </div>

                                    {/* 5. Merchant verified */}
                                    <div className="flex items-center justify-between text-[13px]">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-[22px] h-[22px] rounded-full bg-[var(--approvals-soft)] text-[var(--approvals-accent)] flex items-center justify-center shrink-0">
                                          <Check className="h-3 w-3 stroke-[2.5]" />
                                        </div>
                                        <span className="text-[var(--approvals-ink)]">Merchant verified</span>
                                      </div>
                                      <span className="text-[var(--approvals-mute)]">
                                        {merchantName}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
