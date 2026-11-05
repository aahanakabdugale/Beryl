"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { ConsumerShell } from "@/frontend/components/ConsumerShell";
import { useViewMode } from "@/components/view-mode-context";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const { isDeveloper } = useViewMode();
  const [loading, setLoading] = useState(true);
  const [spentCents, setSpentCents] = useState(0);
  const [totalBudgetCents, setTotalBudgetCents] = useState(15000); // $150.00
  const [stats, setStats] = useState({
    approved: 0,
    needsApproval: 0,
    blocked: 0,
    preventedCents: 0,
  });
  const [categoryData, setCategoryData] = useState<{ category: string; spent: number }[]>([
    { category: "Accessories", spent: 4.99 },
    { category: "Electronics", spent: 0 },
    { category: "Office Supplies", spent: 0 },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch mandates
      const resMandates = await fetch("/api/mandates");
      if (resMandates.ok) {
        const data = await resMandates.json();
        const active = data.mandates?.[0];
        if (active) {
          setSpentCents(typeof active.spent_cents === "number" ? active.spent_cents : 499);
          setTotalBudgetCents(active.total_budget_cents || 15000);
        }
      }

      // Fetch audit logs to calculate decision breakdown
      const resAudit = await fetch("/api/audit");
      if (resAudit.ok) {
        const data = await resAudit.json();
        const logs: any[] = data.records || data.logs || [];
        if (logs.length > 0) {
          let app = 0;
          let needs = 0;
          let blk = 0;
          let prevented = 0;
          const catMap: Record<string, number> = {};

          logs.forEach((l) => {
            const dec = (l.decision || "").toUpperCase();
            if (dec === "APPROVE") {
              app++;
              const cat = l.category || "General";
              const normCat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
              catMap[normCat] = (catMap[normCat] || 0) + (l.amount_cents || 0);
            } else if (dec === "NEEDS_APPROVAL") {
              needs++;
            } else if (dec === "BLOCK") {
              blk++;
              prevented += l.amount_cents || 0;
            }
          });

          setStats({
            approved: app,
            needsApproval: needs,
            blocked: blk,
            preventedCents: prevented,
          });

          const dynCat = Object.entries(catMap).map(([category, cents]) => ({
            category,
            spent: cents / 100,
          }));
          if (dynCat.length > 0) {
            setCategoryData(dynCat);
          }
        }
      }
    } catch {
      // Demo defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClearDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/clean-demo", { method: "POST" });
      if (res.ok) {
        toast.success("Preloaded demo orders removed! Showing only your real purchases.");
        await fetchData();
      } else {
        toast.error("Failed to remove demo data");
      }
    } catch {
      toast.error("Network error while clearing demo data");
    } finally {
      setLoading(false);
    }
  };

  const remainingCents = Math.max(0, totalBudgetCents - spentCents);

  // Chart 1 Data: Spent vs Remaining
  const budgetData = [
    { name: "Spent", value: spentCents / 100, color: "#0b7a55" },
    { name: "Remaining", value: remainingCents / 100, color: "#3fe0a0" },
  ];

  // Chart 2 Data: Approved vs Waiting vs Blocked
  const decisionData = [
    { name: "Paid Orders", count: stats.approved, fill: "#0b7a55" },
    { name: "Waiting for you", count: stats.needsApproval, fill: "#b87400" },
    { name: "Blocked limits", count: stats.blocked, fill: "#d93a52" },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      {stats.approved > 1 && (
        <button
          type="button"
          onClick={handleClearDemo}
          disabled={loading}
          className="text-[13px] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
        >
          Clear demo orders
        </button>
      )}
      <button
        type="button"
        onClick={fetchData}
        disabled={loading}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--approvals-line)] bg-[var(--approvals-card)] text-[13px] text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors cursor-pointer"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        <span>Refresh</span>
      </button>
    </div>
  );

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200/80 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] p-5 space-y-1 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Total spent</div>
          <div className="text-2xl font-bold tracking-tight text-[#0B7A5A] dark:text-[#3EE0A8]">
            ${(spentCents / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-zinc-400">
            of ${(totalBudgetCents / 100).toFixed(2)} allowance
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] p-5 space-y-1 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Protected capital</div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            ${(stats.preventedCents / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-zinc-400">
            stopped from overspending
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] p-5 space-y-1 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Approved orders</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-[#3EE0A8]">
            {stats.approved}
          </div>
          <div className="text-[11px] text-zinc-400">
            paid automatically via PayPal
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] p-5 space-y-1 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Allowance health</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-[#3EE0A8]">
            Protected
          </div>
          <div className="text-[11px] text-zinc-400">
            policy air-gap active
          </div>
        </div>
      </div>

      {/* 2 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Donut Budget Breakdown */}
        <div className="lg:col-span-6 rounded-2xl border border-zinc-200/80 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Spent vs remaining allowance
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Current active mandate allocation
            </p>
          </div>

          <div className="h-[260px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, ""]}
                  contentStyle={{
                    backgroundColor: "#0D1C17",
                    borderColor: "#1A332B",
                    borderRadius: "12px",
                    color: "#EDF5F2",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 border-t border-zinc-100 dark:border-[#162E25] text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0b7a55]" />
              <span className="text-zinc-500 dark:text-zinc-400">Spent:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                ${(spentCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3fe0a0]" />
              <span className="text-zinc-500 dark:text-zinc-400">Remaining:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                ${(remainingCents / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Decisions Breakdown */}
        <div className="lg:col-span-6 rounded-2xl border border-zinc-200/80 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Guard decision outcomes
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Distribution of order results handled by BERYL
            </p>
          </div>

          <div className="h-[260px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decisionData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1C17",
                    borderColor: "#1A332B",
                    borderRadius: "12px",
                    color: "#EDF5F2",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {decisionData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2 border-t border-zinc-100 dark:border-[#162E25] text-[11px] text-zinc-400 font-mono">
            <span>Automated PayPal Protection · 100% Policy Enforced</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (isDeveloper) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
              Spending & Telemetry Analytics
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Deterministic policy enforcement metrics, budget utilization, and guard decision breakdowns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-[#1A332B] bg-white dark:bg-[#0D1C17] text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-[#12241E] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Telemetry</span>
            </button>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <ConsumerShell
      activePath="/dashboard/analytics"
      maxWidth="max-w-[1000px]"
      title="Spending analytics"
      description="Review how your shopping allowance has been used and protected."
      headerActions={headerActions}
    >
      {content}
    </ConsumerShell>
  );
}
