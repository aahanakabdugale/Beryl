"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  Bot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Power,
  Clock,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useViewMode } from "@/components/view-mode-context";
import { BerylLogo } from "@/components/beryl-logo";
import { toast } from "sonner";

interface Mandate {
  id: string;
  name: string;
  currency: string;
  total_budget_cents: number;
  spent_cents?: number;
  per_purchase_limit_cents: number;
  ask_above_cents: number;
  is_frozen: boolean;
  expires_at: string;
  allowed_categories: string[];
  allowed_merchants: string[];
}

interface AuditLog {
  id: string;
  created_at: string;
  amount_cents: number;
  item?: string;
  item_name?: string;
  merchant?: string;
  decision: string;
  rule_code: string;
  reason?: string;
  paypal_order_id?: string;
  approval_status?: string | null;
  final_outcome?: string;
}

export default function DashboardOverview() {
  const { isDeveloper } = useViewMode();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [activityFilter, setActivityFilter] = useState<"all" | "purchased" | "pending" | "declined" | "blocked">("all");
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch Mandates
      const resMandates = await fetch("/api/mandates");
      if (resMandates.ok) {
        const data = await resMandates.json();
        const list: Mandate[] = data.mandates || [];
        setMandates(list);
        if (list.length > 0) {
          setActiveMandate(list[0]);
        }
      }

      // Fetch Recent Audit Logs
      const resAudit = await fetch("/api/audit");
      if (resAudit.ok) {
        const data = await resAudit.json();
        const logs = data.records || data.logs || [];
        setRecentLogs(logs.slice(0, 6));
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleFreeze = async () => {
    if (!activeMandate) return;
    setFreezeLoading(true);
    const newStatus = !activeMandate.is_frozen;
    try {
      const res = await fetch(`/api/mandates/${activeMandate.id}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_frozen: newStatus }),
      });

      if (res.ok) {
        setActiveMandate({ ...activeMandate, is_frozen: newStatus });
        if (isDeveloper) {
          toast[newStatus ? "error" : "success"](
            newStatus ? "Emergency Kill Switch Activated! Mandate Frozen." : "Mandate Unfrozen & Operational."
          );
        } else {
          toast[newStatus ? "info" : "success"](
            newStatus ? "AI Shopping Paused. No purchases will be made." : "AI Shopping Resumed & Active."
          );
        }
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error updating status");
    } finally {
      setFreezeLoading(false);
    }
  };

  const spentCents = activeMandate?.spent_cents || 0;
  const totalBudgetCents = activeMandate?.total_budget_cents || 10000;
  const remainingCents = Math.max(0, totalBudgetCents - spentCents);
  const spentPercent = Math.min(100, Math.round((spentCents / totalBudgetCents) * 100));

  // Countdown calculation
  const expiresAtText = activeMandate
    ? new Date(activeMandate.expires_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Active";
  const isExpired = activeMandate
    ? new Date(activeMandate.expires_at).getTime() < Date.now()
    : false;

  const purchasedCount = recentLogs.filter((l) => {
    const finalOutcome = (l.final_outcome || "").toUpperCase();
    const appStatus = (l.approval_status || "").toLowerCase();
    const dec = (l.decision || "").toUpperCase();
    return (finalOutcome === "COMPLETED" || Boolean(l.paypal_order_id) || dec === "APPROVE" || appStatus === "approved") && appStatus !== "rejected" && dec !== "BLOCK";
  }).length;

  const pendingCount = recentLogs.filter((l) => {
    const dec = (l.decision || "").toUpperCase();
    const appStatus = (l.approval_status || "").toLowerCase();
    const finalOutcome = (l.final_outcome || "").toUpperCase();
    return (dec === "NEEDS_APPROVAL" || finalOutcome === "PENDING_APPROVAL") && appStatus !== "rejected" && appStatus !== "approved";
  }).length;

  const declinedCount = recentLogs.filter((l) => {
    const appStatus = (l.approval_status || "").toLowerCase();
    const finalOutcome = (l.final_outcome || "").toUpperCase();
    return appStatus === "rejected" || finalOutcome === "REJECTED_BY_USER";
  }).length;

  const blockedCount = recentLogs.filter((l) => {
    const dec = (l.decision || "").toUpperCase();
    const finalOutcome = (l.final_outcome || "").toUpperCase();
    return dec === "BLOCK" || finalOutcome === "BLOCKED";
  }).length;

  const displayedLogs = recentLogs.filter((log) => {
    if (activityFilter === "all") return true;
    const dec = (log.decision || "").toUpperCase();
    const appStatus = (log.approval_status || "").toLowerCase();
    const finalOutcome = (log.final_outcome || "").toUpperCase();

    if (activityFilter === "purchased") {
      return (finalOutcome === "COMPLETED" || Boolean(log.paypal_order_id) || dec === "APPROVE" || appStatus === "approved") && appStatus !== "rejected" && dec !== "BLOCK";
    }
    if (activityFilter === "pending") {
      return (dec === "NEEDS_APPROVAL" || finalOutcome === "PENDING_APPROVAL") && appStatus !== "rejected" && appStatus !== "approved";
    }
    if (activityFilter === "declined") {
      return appStatus === "rejected" || finalOutcome === "REJECTED_BY_USER";
    }
    if (activityFilter === "blocked") {
      return dec === "BLOCK" || finalOutcome === "BLOCKED";
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isDeveloper ? "Autonomous Policy Dashboard" : "My Shopping Wallet & Allowance"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isDeveloper
              ? "Real-time policy guard state, active mandates, and execution metrics"
              : "Manage your AI shopping allowance, active orders, and safety limits"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="text-xs gap-1.5 h-8 border-zinc-200 dark:border-zinc-800 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Link href="/dashboard/mandates/new">
            <Button
              size="sm"
              className="bg-[#0B7A5A] hover:bg-[#086147] dark:bg-[#0B7A5A] dark:hover:bg-[#14966F] text-white text-xs gap-1.5 h-8 rounded-lg cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{isDeveloper ? "New Mandate" : "Adjust Budget"}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Active Mandate Card (M3) + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Mandate Card (Col 8) */}
        <div className="lg:col-span-8">
          <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] shadow-sm relative overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-[#162E25]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-[#152B23] flex items-center justify-center p-1.5 shadow-xs border border-emerald-500/20">
                    <BerylLogo size={26} />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg font-bold">
                      {activeMandate?.name || (isDeveloper ? "Active Autonomous Mandate" : "My Shopping Allowance")}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      {isDeveloper ? (
                        <>
                          ID: <span className="font-mono">{activeMandate?.id?.slice(0, 8) || "default"}</span>
                        </>
                      ) : (
                        <span>Automated PayPal Guard Active</span>
                      )}
                    </CardDescription>
                  </div>
                </div>

                {/* Status Badges & Emergency Kill Switch / Pause Shopping */}
                <div className="flex items-center gap-3">
                  {activeMandate?.is_frozen ? (
                    <Badge variant="destructive" className="font-mono text-[10px] uppercase font-bold tracking-wider">
                      {isDeveloper ? "FROZEN (KILL SWITCH)" : "SHOPPING PAUSED"}
                    </Badge>
                  ) : isExpired ? (
                    <Badge variant="outline" className="font-mono text-[10px] text-zinc-500">
                      EXPIRED
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/70 dark:text-[#3EE0A8] font-mono text-[10px]">
                      ACTIVE
                    </Badge>
                  )}

                  {/* Toggle */}
                  <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                      {isDeveloper ? "Kill Switch" : "Pause Shopping"}
                    </span>
                    <Power className={`h-4 w-4 ${activeMandate?.is_frozen ? "text-rose-500" : "text-zinc-400"}`} />
                    <Switch
                      checked={activeMandate?.is_frozen || false}
                      onCheckedChange={handleToggleFreeze}
                      disabled={freezeLoading || !activeMandate}
                      aria-label={isDeveloper ? "Emergency Kill Switch" : "Pause AI Shopping"}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Financial Ring / Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                {/* Remaining Balance Display */}
                <div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {isDeveloper ? "Remaining Budget" : "Remaining Allowance"}
                  </div>
                  <div className="font-heading text-4xl font-extrabold text-[#0B7A5A] dark:text-[#3EE0A8] mt-1">
                    ${(remainingCents / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    of ${(totalBudgetCents / 100).toFixed(2)} total limit
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Spent: ${(spentCents / 100).toFixed(2)}</span>
                    <span className="font-mono">{spentPercent}% used</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        activeMandate?.is_frozen
                          ? "bg-rose-500"
                          : spentPercent > 80
                          ? "bg-amber-500"
                          : "bg-[#0B7A5A] dark:bg-[#3EE0A8]"
                      }`}
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                    <span>$0.00</span>
                    <span>${(totalBudgetCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Policy Threshold Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#12241E] border border-zinc-200/60 dark:border-[#1E3A31]">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">
                    {isDeveloper ? "Per-Item Limit" : "Max Per Item"}
                  </div>
                  <div className="font-heading text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    ${((activeMandate?.per_purchase_limit_cents || 2500) / 100).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-[#251E11] border border-amber-500/20">
                  <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 uppercase">
                    {isDeveloper ? "Escalate Above" : "Ask Me Above"}
                  </div>
                  <div className="font-heading text-lg font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                    ${((activeMandate?.ask_above_cents || 1500) / 100).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#12241E] border border-zinc-200/60 dark:border-[#1E3A31]">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">Allowed Categories</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(activeMandate?.allowed_categories || ["electronics", "office"]).slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-[10px] font-medium"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#12241E] border border-zinc-200/60 dark:border-[#1E3A31]">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{isDeveloper ? "Expiry" : "Active Until"}</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                    {expiresAtText}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Quick Action Launchers (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          {isDeveloper ? (
            <>
              {/* Launch Agent Card */}
              <Card className="bg-[#0B7A5A] text-white border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Shopper Agent
                  </CardTitle>
                  <CardDescription className="text-emerald-100 text-xs">
                    Test the autonomous agent with Groq & Channel3 live catalog tools.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Link href="/dashboard/agent">
                    <Button className="w-full bg-white text-[#0B7A5A] hover:bg-zinc-100 font-semibold text-xs h-9 rounded-lg gap-1.5 cursor-pointer">
                      <span>Open Agent Chat & Timeline</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Launch Attack Lab Card */}
              <Card className="bg-[#07100D] border-[#1A332B] text-zinc-100">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-rose-400">
                    <ShieldAlert className="h-5 w-5" />
                    Red-Team Attack Lab
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    Test prompt injection, price spoofing, and malicious trap pages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Link href="/dashboard/attack-lab">
                    <Button
                      variant="outline"
                      className="w-full border-rose-500/40 text-rose-300 hover:bg-rose-950/40 font-semibold text-xs h-9 rounded-lg gap-1.5 cursor-pointer"
                    >
                      <span>Launch Attack Scoreboard</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Consumer Card 1: Shop with Agent */}
              <Card className="bg-[#0B7A5A] text-white border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg font-bold flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    AI Personal Shopper
                  </CardTitle>
                  <CardDescription className="text-emerald-100 text-xs">
                    Tell your agent what you want to buy. It searches verified items within your allowance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Link href="/dashboard/agent">
                    <Button className="w-full bg-white text-[#0B7A5A] hover:bg-zinc-100 font-semibold text-xs h-9 rounded-lg gap-1.5 cursor-pointer">
                      <span>Shop with Agent Now</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Consumer Card 2: Pending Approvals */}
              <Card className="bg-white dark:bg-[#0D1C17] border border-zinc-200/80 dark:border-[#1A332B]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-lg font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                      Order Approvals
                    </CardTitle>
                    {pendingCount > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold">
                        {pendingCount} Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-zinc-500 border-zinc-200 dark:border-zinc-800 text-[11px]">
                        All clear
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                    {pendingCount > 0
                      ? `${pendingCount} item(s) found by your agent exceed your auto-approve limit and need your green light.`
                      : "No orders waiting for your review. All pending requests have been decided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Link href="/dashboard/approvals">
                    <Button
                      variant="outline"
                      className="w-full border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold text-xs h-9 rounded-lg gap-1.5 cursor-pointer"
                    >
                      <span>{pendingCount > 0 ? "Review Pending Orders" : "View Approvals History"}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Recent Decisions / Orders Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight">
              {isDeveloper ? "Recent Decisions" : "Recent Orders & Activity"}
            </h2>
            <p className="text-xs text-zinc-500">
              {isDeveloper
                ? "Live guard execution record across all evaluated agent requests"
                : "Real-time record of all purchase requests evaluated by your policy guard"}
            </p>
          </div>
          {isDeveloper ? (
            <Link
              href="/dashboard/audit"
              className="text-xs font-semibold text-[#0B7A5A] dark:text-[#3EE0A8] hover:underline flex items-center gap-1"
            >
              <span>Full AG Grid Audit Log</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href="/dashboard/analytics"
              className="text-xs font-semibold text-[#0B7A5A] dark:text-[#3EE0A8] hover:underline flex items-center gap-1"
            >
              <span>View Spending Analytics</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Quick Filter Pills */}
        {recentLogs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setActivityFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activityFilter === "all"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              All Activity ({recentLogs.length})
            </button>
            <button
              onClick={() => setActivityFilter("purchased")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activityFilter === "purchased"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#3EE0A8] hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              }`}
            >
              {isDeveloper ? `Approved (${purchasedCount})` : `Purchased (${purchasedCount})`}
            </button>
            {pendingCount > 0 && (
              <button
                onClick={() => setActivityFilter("pending")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activityFilter === "pending"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                }`}
              >
                {isDeveloper ? `Needs Approval (${pendingCount})` : `Waiting for Review (${pendingCount})`}
              </button>
            )}
            {declinedCount > 0 && (
              <button
                onClick={() => setActivityFilter("declined")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activityFilter === "declined"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                }`}
              >
                {isDeveloper ? `Declined (${declinedCount})` : `Declined by You (${declinedCount})`}
              </button>
            )}
            <button
              onClick={() => setActivityFilter("blocked")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activityFilter === "blocked"
                  ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {isDeveloper ? `Blocked (${blockedCount})` : `Stopped by Guard (${blockedCount})`}
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-[#0D1C17] border border-zinc-200/80 dark:border-[#1A332B] rounded-2xl overflow-hidden shadow-xs">
          {displayedLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              {recentLogs.length === 0
                ? isDeveloper
                  ? "No transactions recorded yet. Launch the AI Shopper Agent or Attack Lab to simulate requests!"
                  : "No shopping orders yet. Start a chat with your AI Shopper to find and buy items!"
                : `No activity found for this filter.`}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-[#162E25]">
              {displayedLogs.map((log) => {
                const dec = (log.decision || "").toUpperCase();
                const appStatus = (log.approval_status || "").toLowerCase();
                const finalOutcome = (log.final_outcome || "").toUpperCase();

                const isDeclined = appStatus === "rejected" || finalOutcome === "REJECTED_BY_USER";
                const isApprovedByUser = appStatus === "approved" || finalOutcome === "APPROVED_BY_USER";
                const isPendingApproval = (dec === "NEEDS_APPROVAL" || finalOutcome === "PENDING_APPROVAL") && !isDeclined && !isApprovedByUser;
                const isAutoApproved = dec === "APPROVE" || finalOutcome === "APPROVED";
                const isPaid = (finalOutcome === "COMPLETED" || Boolean(log.paypal_order_id) || isAutoApproved || isApprovedByUser) && !isDeclined && dec !== "BLOCK";
                const isBlock = dec === "BLOCK" || finalOutcome === "BLOCKED";

                const getFriendlyReason = (code: string) => {
                  if (isDeclined) return "Declined by you in order reviews";
                  if (isApprovedByUser) return "Approved by you • Verified checkout";
                  if (code.includes("APPROVAL") || code.includes("THRESHOLD") || code.includes("ASK")) {
                    return "Requires your approval";
                  }
                  if (code.includes("BUDGET")) return "Exceeds total budget";
                  if (code.includes("PURCHASE_LIMIT")) return "Exceeds single item limit";
                  if (code.includes("INJECTION")) return "Stopped for security";
                  if (code.includes("FREEZE")) return "Shopping is paused";
                  return "Verified checkout";
                };

                return (
                  <div
                    key={log.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-[#12241E] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isPaid
                            ? "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950 dark:text-[#3EE0A8]"
                            : isDeclined
                            ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            : isPendingApproval
                            ? "bg-amber-100/70 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-rose-100/70 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isDeclined ? (
                          <XCircle className="h-4 w-4" />
                        ) : isPendingApproval ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {log.item || log.item_name || "Payment Request"}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span>{log.merchant || "Verified Merchant"}</span>
                          <span>•</span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="font-heading text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          ${(log.amount_cents / 100).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {isDeveloper
                            ? isDeclined
                              ? "REJECTED_BY_USER"
                              : isApprovedByUser
                              ? "APPROVED_BY_USER"
                              : log.rule_code
                            : getFriendlyReason(log.rule_code)}
                        </div>
                      </div>

                      <div>
                        {isDeveloper ? (
                          <>
                            {isPaid && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-[#3EE0A8] text-[10px] font-mono">
                                {isApprovedByUser ? "APPROVED (MANUAL)" : "APPROVED"}
                              </Badge>
                            )}
                            {isDeclined && (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-mono">
                                REJECTED BY USER
                              </Badge>
                            )}
                            {isPendingApproval && (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-mono">
                                NEEDS APPROVAL
                              </Badge>
                            )}
                            {isBlock && !isDeclined && (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-mono">
                                BLOCKED
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            {isPaid && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-[#3EE0A8] text-[10px] font-medium">
                                {isApprovedByUser ? "PAID (APPROVED)" : "PAID (PAYPAL)"}
                              </Badge>
                            )}
                            {isDeclined && (
                              <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-medium border border-zinc-200 dark:border-zinc-700">
                                DECLINED BY YOU
                              </Badge>
                            )}
                            {isPendingApproval && (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-medium">
                                WAITING FOR YOU
                              </Badge>
                            )}
                            {isBlock && !isDeclined && (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-medium">
                                STOPPED BY LIMIT
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
