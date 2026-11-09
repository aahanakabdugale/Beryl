"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useInspector } from "@/components/inspector-context";
import { toast } from "sonner";

interface Mandate {
  id: string;
  name: string;
  total_budget_cents: number;
  spent_cents?: number;
  per_purchase_limit_cents: number;
  ask_above_cents?: number;
  approval_threshold_cents?: number;
  is_frozen: boolean;
  allowed_categories: string[];
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
  paypal_order_id?: string;
  approval_status?: string | null;
  final_outcome?: string;
}

export default function DashboardOverview() {
  const { inspectData } = useInspector();
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [activityFilter, setActivityFilter] = useState<"all" | "approved" | "blocked" | "pending">("all");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);

  // Load from local cache immediately on mount to prevent any delay/flash
  useEffect(() => {
    try {
      const cachedMandate = localStorage.getItem("beryl_active_mandate_cache");
      if (cachedMandate) {
        const parsed = JSON.parse(cachedMandate);
        if (parsed && parsed.name) {
          setActiveMandate(parsed);
          setLoading(false);
        }
      }
      const cachedLogs = localStorage.getItem("beryl_recent_logs_cache");
      if (cachedLogs) {
        const parsedLogs = JSON.parse(cachedLogs);
        if (Array.isArray(parsedLogs)) {
          setRecentLogs(parsedLogs);
        }
      }
    } catch {}
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (manual = false) => {
    try {
      if (manual) setIsRefreshing(true);
      const [resMandates, resAudit] = await Promise.all([
        fetch("/api/mandates"),
        fetch("/api/audit?limit=10"),
      ]);

      if (resMandates.status === 401 || resAudit.status === 401) {
        toast.error("Please sign in to view your dashboard");
        window.location.href = "/login?redirectTo=/dashboard";
        return;
      }

      if (resMandates.ok) {
        const data = await resMandates.json();
        const list: Mandate[] = data.mandates || [];
        if (list.length > 0) {
          setActiveMandate(list[0]);
          try {
            localStorage.setItem("beryl_active_mandate_cache", JSON.stringify(list[0]));
          } catch {}
        } else {
          setActiveMandate(null);
          try {
            localStorage.removeItem("beryl_active_mandate_cache");
          } catch {}
        }
      }

      if (resAudit.ok) {
        const data = await resAudit.json();
        const logs = data.records || data.logs || [];
        const topLogs = logs.slice(0, 8);
        setRecentLogs(topLogs);
        try {
          localStorage.setItem("beryl_recent_logs_cache", JSON.stringify(topLogs));
        } catch {}

        if (topLogs.length > 0) {
          const first = topLogs[0];
          inspectData("RECENT_DECISION", {
            merchant: first.merchant || "Amazon",
            amount: (first.amount_cents || 0) / 100,
            rule: first.rule_code || "APPROVED",
            verdict: first.decision || "APPROVE",
            item: first.item || first.item_name || "Payment Request",
            latency_ms: 0,
          });
        }
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

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
        const updated = { ...activeMandate, is_frozen: newStatus };
        setActiveMandate(updated);
        try {
          localStorage.setItem("beryl_active_mandate_cache", JSON.stringify(updated));
        } catch {}
        toast[newStatus ? "error" : "success"](
          newStatus ? "Kill switch activated. Payments frozen." : "Mandate operational."
        );
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

  const approvedCount = recentLogs.filter((l) => {
    const dec = (l.decision || "").toUpperCase();
    const appStatus = (l.approval_status || "").toLowerCase();
    const finalOutcome = (l.final_outcome || "").toUpperCase();
    return (finalOutcome === "COMPLETED" || Boolean(l.paypal_order_id) || dec === "APPROVE" || appStatus === "approved") && dec !== "BLOCK" && appStatus !== "rejected";
  }).length;

  const blockedCount = recentLogs.filter((l) => {
    const dec = (l.decision || "").toUpperCase();
    const finalOutcome = (l.final_outcome || "").toUpperCase();
    return dec === "BLOCK" || finalOutcome === "BLOCKED";
  }).length;

  const pendingCount = recentLogs.filter((l) => {
    const dec = (l.decision || "").toUpperCase();
    const appStatus = (l.approval_status || "").toLowerCase();
    const finalOutcome = (l.final_outcome || "").toUpperCase();
    return (dec === "NEEDS_APPROVAL" || finalOutcome === "PENDING_APPROVAL") && appStatus !== "rejected" && appStatus !== "approved";
  }).length;

  const displayedLogs = recentLogs.filter((log) => {
    if (activityFilter === "all") return true;
    const dec = (log.decision || "").toUpperCase();
    const appStatus = (log.approval_status || "").toLowerCase();
    const finalOutcome = (log.final_outcome || "").toUpperCase();

    if (activityFilter === "approved") {
      return (finalOutcome === "COMPLETED" || Boolean(log.paypal_order_id) || dec === "APPROVE" || appStatus === "approved") && dec !== "BLOCK" && appStatus !== "rejected";
    }
    if (activityFilter === "blocked") {
      return dec === "BLOCK" || finalOutcome === "BLOCKED";
    }
    if (activityFilter === "pending") {
      return (dec === "NEEDS_APPROVAL" || finalOutcome === "PENDING_APPROVAL") && appStatus !== "rejected" && appStatus !== "approved";
    }
    return true;
  });

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100">
      
      {/* Mandate Summary Strip */}
      <div className="bg-white dark:bg-[#0A1612] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {loading ? (
              <div className="h-6 w-56 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            ) : activeMandate ? (
              <div className="font-bold text-base sm:text-lg">
                {activeMandate.name}
              </div>
            ) : (
              <div className="font-bold text-base sm:text-lg text-zinc-500">
                No Policy Mandate Active
              </div>
            )}
            {loading ? (
              <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800/60 rounded mt-1.5 animate-pulse" />
            ) : activeMandate ? (
              <div className="text-xs text-zinc-400 mt-0.5">
                Scope: {(activeMandate.allowed_categories || []).join(", ") || "All categories"}
              </div>
            ) : (
              <div className="text-xs text-zinc-400 mt-0.5">
                Create a policy mandate to set spending caps, allowed merchants, and approvals.
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-medium text-zinc-500">
              Status:{" "}
              {loading ? (
                <span className="text-zinc-400">LOADING...</span>
              ) : activeMandate ? (
                <span className={`font-bold ${activeMandate.is_frozen ? "text-rose-600 dark:text-rose-400" : "text-[#0B7A5A] dark:text-[#3EE0A8]"}`}>
                  {activeMandate.is_frozen ? "FROZEN" : "OPERATIONAL"}
                </span>
              ) : (
                <span className="text-amber-500 font-bold">UNCONFIGURED</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggleFreeze}
              disabled={freezeLoading || !activeMandate}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold uppercase transition-colors cursor-pointer ${
                !activeMandate
                  ? "opacity-40 cursor-not-allowed border border-zinc-300 dark:border-zinc-800 text-zinc-400"
                  : activeMandate?.is_frozen
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white bg-rose-50/40 dark:bg-rose-950/20"
              }`}
            >
              {freezeLoading
                ? "Updating..."
                : activeMandate?.is_frozen
                ? "Resume Payments"
                : "Freeze All Payments"}
            </button>
          </div>
        </div>

        {/* 3 Large, Clean Financial Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Budget Remaining</div>
            {loading ? (
              <div className="h-9 w-40 bg-zinc-100 dark:bg-zinc-800 rounded mt-1.5 animate-pulse" />
            ) : activeMandate ? (
              <div className="text-3xl font-extrabold mt-1.5 text-[#0B7A5A] dark:text-[#3EE0A8]">
                ${(remainingCents / 100).toFixed(2)}
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  / ${(totalBudgetCents / 100).toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="text-3xl font-extrabold mt-1.5 text-zinc-400">
                $0.00
              </div>
            )}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-[#0B7A5A] dark:bg-[#3EE0A8]"
                style={{ width: `${spentPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Single Purchase Cap</div>
            {loading ? (
              <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-800 rounded mt-1.5 animate-pulse" />
            ) : activeMandate ? (
              <div className="text-3xl font-extrabold mt-1.5">
                ${((activeMandate.per_purchase_limit_cents ?? 0) / 100).toFixed(2)}
              </div>
            ) : (
              <div className="text-3xl font-extrabold mt-1.5 text-zinc-400">
                $0.00
              </div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Approval Threshold</div>
            {loading ? (
              <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-800 rounded mt-1.5 animate-pulse" />
            ) : activeMandate ? (
              <div className="text-3xl font-extrabold mt-1.5 text-amber-600 dark:text-amber-400">
                ${(((activeMandate.ask_above_cents ?? activeMandate.approval_threshold_cents) ?? 0) / 100).toFixed(2)}
              </div>
            ) : (
              <div className="text-3xl font-extrabold mt-1.5 text-zinc-400">
                $0.00
              </div>
            )}
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/agent"
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold transition-colors"
          >
            Launch Agent
          </Link>

          <Link
            href="/dashboard/attack-lab"
            className="px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
          >
            Run Attack Lab
          </Link>

          <Link
            href="/dashboard/mandates/new"
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors"
          >
            Edit Mandate
          </Link>

          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Decision Ledger */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="font-bold text-lg">
            Recent Decisions
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-1">
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActivityFilter("all")}
                className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  activityFilter === "all"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                All ({recentLogs.length})
              </button>

              <button
                type="button"
                onClick={() => setActivityFilter("approved")}
                className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  activityFilter === "approved"
                    ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-[#3EE0A8] font-semibold shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Approved ({approvedCount})
              </button>

              <button
                type="button"
                onClick={() => setActivityFilter("blocked")}
                className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  activityFilter === "blocked"
                    ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-semibold shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Blocked ({blockedCount})
              </button>

              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActivityFilter("pending")}
                  className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    activityFilter === "pending"
                      ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-semibold shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  Review ({pendingCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clean Ledger Table */}
        <div className="bg-white dark:bg-[#0A1612] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          {displayedLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No transactions recorded for this filter.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-400">
                  <th className="py-3 px-4 font-medium">Item / Request</th>
                  <th className="py-3 px-4 font-medium">Vendor</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  <th className="py-3 px-4 font-medium">Verdict</th>
                  <th className="py-3 px-4 font-medium text-right">Time</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {displayedLogs.map((log) => {
                  const dec = (log.decision || "").toUpperCase();
                  const appStatus = (log.approval_status || "").toLowerCase();
                  const finalOutcome = (log.final_outcome || "").toUpperCase();

                  const isDeclined = appStatus === "rejected" || finalOutcome === "REJECTED_BY_USER";
                  const isApprovedByUser = appStatus === "approved" || finalOutcome === "APPROVED_BY_USER";
                  const isPending = (dec === "NEEDS_APPROVAL" || finalOutcome === "PENDING_APPROVAL") && !isDeclined && !isApprovedByUser;
                  const isAutoApproved = dec === "APPROVE" || finalOutcome === "APPROVED";
                  const isPaid = (finalOutcome === "COMPLETED" || Boolean(log.paypal_order_id) || isAutoApproved || isApprovedByUser) && !isDeclined && dec !== "BLOCK";
                  const isBlock = dec === "BLOCK" || finalOutcome === "BLOCKED";

                  return (
                    <tr
                      key={log.id}
                      onClick={() => {
                        inspectData("INSPECTED_DECISION", {
                          id: log.id,
                          merchant: log.merchant || "Amazon",
                          amount: (log.amount_cents || 0) / 100,
                          rule: log.rule_code || "APPROVED",
                          verdict: log.decision || "APPROVE",
                          item: log.item || log.item_name || "Payment Request",
                          created_at: log.created_at,
                          paypal_order_id: log.paypal_order_id || null,
                          latency_ms: 0,
                        });
                      }}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer text-sm"
                    >
                      <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 max-w-sm truncate text-sm">
                        {log.item || log.item_name || "Payment Request"}
                      </td>

                      <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                        {log.merchant || "verified-vendor.com"}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-right text-sm">
                        ${((log.amount_cents || 0) / 100).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 font-medium">
                        {isPaid ? (
                          <span className="text-emerald-700 dark:text-[#3EE0A8]">
                            Approved
                          </span>
                        ) : isBlock ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            Blocked ({log.rule_code || "SECURITY"})
                          </span>
                        ) : isPending ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Needs Approval
                          </span>
                        ) : (
                          <span className="text-zinc-400">
                            Declined
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-400 text-right font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
