"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ConsumerShell } from "@/frontend/components/ConsumerShell";
import { toast } from "sonner";

interface Mandate {
  id: string;
  name: string;
  currency: string;
  total_budget_cents: number;
  spent_cents?: number;
  per_purchase_limit_cents: number;
  ask_above_cents?: number;
  approval_threshold_cents?: number;
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

interface PendingApproval {
  id: string;
  payment_requests?: {
    item?: string;
    amount_cents?: number;
    merchant?: string;
  };
}

export default function ConsumerWalletScreen() {
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch {}
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Mandates
      const resMandates = await fetch("/api/mandates");
      if (resMandates.ok) {
        const data = await resMandates.json();
        const list: Mandate[] = data.mandates || [];
        if (list.length > 0) {
          setActiveMandate(list[0]);
          try {
            localStorage.setItem("beryl_active_mandate_cache", JSON.stringify(list[0]));
          } catch {}
        }
      }

      // 2. Fetch Pending Approvals
      const resPending = await fetch("/api/approvals?status=pending");
      if (resPending.ok) {
        const data = await resPending.json();
        setPendingApprovals(data.approvals || []);
      }

      // 3. Fetch Audit Logs
      const resLogs = await fetch("/api/audit");
      if (resLogs.ok) {
        const data = await resLogs.json();
        const rawLogs = data.records || data.logs || [];
        setRecentLogs(rawLogs.slice(0, 8));
      }
    } catch {
      toast.error("Failed to refresh wallet data");
    } finally {
      setLoading(false);
    }
  };

  const totalBudgetCents = activeMandate?.total_budget_cents ?? 0;
  const spentCents = activeMandate?.spent_cents ?? 0;
  const remainingCents = Math.max(0, totalBudgetCents - spentCents);
  const perPurchaseLimitCents = activeMandate?.per_purchase_limit_cents ?? 0;
  const askAboveCents = activeMandate?.ask_above_cents || activeMandate?.approval_threshold_cents || 0;

  const spentPercent = totalBudgetCents > 0
    ? Math.min(100, Math.round((spentCents / totalBudgetCents) * 100))
    : 0;

  const validUntilText = activeMandate?.expires_at
    ? new Date(activeMandate.expires_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : "November 30";

  const categoriesText =
    activeMandate?.allowed_categories && activeMandate.allowed_categories.length > 0
      ? activeMandate.allowed_categories
          .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
          .join(", ")
      : "Electronics, office supplies, accessories";

  const pendingCount = pendingApprovals.length;
  const firstPending = pendingApprovals[0]?.payment_requests;

  return (
    <ConsumerShell
      activePath="/dashboard"
      pendingCount={pendingCount}
      maxWidth="max-w-[760px]"
      title="My shopping wallet"
      description="Your agent can only spend what you've allowed here."
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* 1. Allowance Card */}
        <div className="rounded-3xl border border-[var(--approvals-line)] bg-[var(--approvals-card)] p-8 shadow-[0_8px_30px_-14px_rgba(11,70,48,0.16)] dark:shadow-none space-y-7">
          <div className="space-y-1">
            <div className="text-[14px] text-[var(--approvals-mute)] font-normal">
              Money left to spend
            </div>
            <div className="text-[48px] sm:text-[64px] font-medium tracking-[-0.04em] text-[var(--approvals-brand)] dark:text-[var(--approvals-accent)] leading-none pt-1">
              ${(remainingCents / 100).toFixed(2)}
            </div>
            <div className="text-[14px] text-[var(--approvals-mute)] pt-2">
              out of ${(totalBudgetCents / 100).toFixed(2)} · {activeMandate?.name || "Desk & Electronics Setup"}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2.5">
            <div className="h-2.5 w-full rounded-full bg-[var(--approvals-soft)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--approvals-brand)] dark:bg-[var(--approvals-accent)] transition-all duration-500"
                style={{ width: `${Math.max(8, spentPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[14px] text-[var(--approvals-mute)]">
              <span>${(spentCents / 100).toFixed(2)} spent</span>
              <span>{activeMandate?.is_frozen ? "Shopping paused" : "Shopping is on"}</span>
            </div>
          </div>

          {/* Facts grid: 2 columns */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-[var(--approvals-line)] pt-7 mt-8">
            <div>
              <div className="text-[13px] text-[var(--approvals-mute)] mb-1">Most per item</div>
              <div className="text-[18px] font-medium text-[var(--approvals-ink)]">
                ${(perPurchaseLimitCents / 100).toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[13px] text-[var(--approvals-mute)] mb-1">I'll ask you above</div>
              <div className="text-[18px] font-medium text-[var(--approvals-ink)]">
                ${(askAboveCents / 100).toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[13px] text-[var(--approvals-mute)] mb-1">Allowed items</div>
              <div className="text-[16px] font-medium text-[var(--approvals-ink)] leading-snug">
                {categoriesText}
              </div>
            </div>

            <div>
              <div className="text-[13px] text-[var(--approvals-mute)] mb-1">Valid until</div>
              <div className="text-[16px] font-medium text-[var(--approvals-ink)] leading-snug">
                {validUntilText}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Approval Strip (only if pending > 0) */}
        {pendingCount > 0 && (
          <div className="rounded-2xl bg-[var(--approvals-amber-bg)] border border-[var(--approvals-amber)]/20 px-6 py-5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-[15px] font-medium text-[var(--approvals-amber)]">
                {pendingCount} order{pendingCount > 1 ? "s" : ""} need{pendingCount === 1 ? "s" : ""} your approval
              </div>
              <div className="text-[13px] text-[var(--approvals-mute)]">
                {firstPending?.item || "Pending order"} · ${((firstPending?.amount_cents || 0) / 100).toFixed(2)}
              </div>
            </div>

            <Link href="/consumer/approvals">
              <button
                type="button"
                className="bg-[var(--approvals-amber)] text-white text-[13px] font-medium px-5 py-2 rounded-full hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                Review
              </button>
            </Link>
          </div>
        )}

        {/* 3. Shop Bar */}
        <div className="rounded-full border border-[var(--approvals-line)] bg-[var(--approvals-card)] pl-6 p-1.5 flex items-center justify-between shadow-xs">
          <span className="text-[14px] text-[var(--approvals-mute)]">
            Want something? Ask your shopper.
          </span>
          <Link href="/consumer/agent">
            <button
              type="button"
              className="bg-[var(--approvals-brand)] text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-emerald-800 transition-colors cursor-pointer shrink-0"
            >
              Shop with agent
            </button>
          </Link>
        </div>

        {/* 4. Recent Orders */}
        <div className="pt-4">
          <h2 className="text-[22px] font-medium text-[var(--approvals-ink)] mb-3">
            Recent orders
          </h2>

          <div className="rounded-3xl border border-[var(--approvals-line)] bg-[var(--approvals-card)] px-7 divide-y divide-[var(--approvals-line)]">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-[14px] text-[var(--approvals-mute)]">
                No purchases yet. Start shopping with your agent!
              </div>
            ) : (
              recentLogs.map((log) => {
                const itemName = log.item || log.item_name || "Payment Request";
                const merchant = log.merchant || "Merchant";
                const timeStr = new Date(log.created_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });

                const isPaid = log.decision === "APPROVE" || log.decision === "approve";
                const isDeclined =
                  log.approval_status === "rejected" ||
                  log.rule_code === "USER_DECLINED" ||
                  log.final_outcome === "rejected";
                const isWaiting =
                  !isDeclined &&
                  (log.decision === "NEEDS_APPROVAL" || log.decision === "needs_approval") &&
                  log.approval_status !== "approved";
                const isBlock =
                  !isDeclined &&
                  (log.decision === "BLOCK" || log.decision === "block");

                let statusText = "Paid";
                let statusColor = "text-[var(--approvals-brand)] dark:text-[var(--approvals-accent)]";

                if (isDeclined) {
                  statusText = "Declined";
                  statusColor = "text-[var(--approvals-red)]";
                } else if (isWaiting) {
                  statusText = "Waiting for you";
                  statusColor = "text-[var(--approvals-amber)]";
                } else if (isBlock) {
                  statusText = "Blocked for your safety";
                  statusColor = "text-[var(--approvals-red)]";
                }

                return (
                  <div key={log.id} className="py-5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-medium text-[var(--approvals-ink)] truncate">
                        {itemName}
                      </div>
                      <div className="text-[13px] text-[var(--approvals-mute)] mt-0.5">
                        {merchant} · {timeStr}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[16px] font-medium text-[var(--approvals-ink)]">
                        ${(log.amount_cents / 100).toFixed(2)}
                      </div>
                      <div className={`text-[13px] font-normal ${statusColor} mt-0.5`}>
                        {statusText}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </ConsumerShell>
  );
}
