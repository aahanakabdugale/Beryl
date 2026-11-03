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
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
  DollarSign,
  Flame,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useViewMode } from "@/components/view-mode-context";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const { isDeveloper } = useViewMode();
  const [loading, setLoading] = useState(true);
  const [spentCents, setSpentCents] = useState(0);
  const [totalBudgetCents, setTotalBudgetCents] = useState(10000); // $100.00
  const [stats, setStats] = useState({
    approved: 0,
    needsApproval: 0,
    blocked: 0,
    preventedCents: 0,
  });
  const [categoryData, setCategoryData] = useState<{ category: string; spent: number }[]>([
    { category: "Accessories", spent: 0 },
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
          setSpentCents(typeof active.spent_cents === "number" ? active.spent_cents : 0);
          setTotalBudgetCents(active.total_budget_cents || 10000);
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
    { name: isDeveloper ? "Spent Budget" : "Spent", value: spentCents / 100, color: "#0B7A5A" },
    { name: isDeveloper ? "Remaining Budget" : "Remaining", value: remainingCents / 100, color: "#3EE0A8" },
  ];

  // Chart 2 Data: Approved vs Blocked vs Escalated
  const decisionData = isDeveloper
    ? [
        { name: "Approved (PayPal Paid)", count: stats.approved, fill: "#10B981" },
        { name: "Needs Approval (Escalated)", count: stats.needsApproval, fill: "#F59E0B" },
        { name: "Blocked (Attacks & Limits)", count: stats.blocked, fill: "#EF4444" },
      ]
    : [
        { name: "Approved Orders", count: stats.approved, fill: "#10B981" },
        { name: "Needs Your Sign-off", count: stats.needsApproval, fill: "#F59E0B" },
        { name: "Stopped by Limits", count: stats.blocked, fill: "#EF4444" },
      ];



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isDeveloper ? "Spending & Security Analytics" : "Shopping & Budget Analytics"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isDeveloper
              ? "Real-time charts powered by Recharts: spending velocity, remaining capacity, and attack defense rates"
              : "Track how much your AI shopper has spent, remaining allowance, and purchase categories"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats.approved > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearDemo}
              disabled={loading}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 h-8 cursor-pointer"
            >
              Clear Demo Sample Orders
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs gap-1.5 h-8 border-zinc-200 dark:border-zinc-800 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Analytics</span>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Total Spent</span>
            <DollarSign className="h-4 w-4 text-[#0B7A5A] dark:text-[#3EE0A8]" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            ${(spentCents / 100).toFixed(2)}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            of ${(totalBudgetCents / 100).toFixed(2)} capacity
          </span>
        </Card>

        <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{isDeveloper ? "Capital Protected" : "Protected Capital"}</span>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ${(stats.preventedCents / 100).toFixed(2)}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {isDeveloper ? "blocked attack attempts" : "prevented from overspending"}
          </span>
        </Card>

        <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{isDeveloper ? "Total Decisions" : "Orders Placed"}</span>
            <ShieldCheck className="h-4 w-4 text-[#0B7A5A] dark:text-[#3EE0A8]" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            {isDeveloper ? (stats.approved + stats.needsApproval + stats.blocked) : stats.approved}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {isDeveloper
              ? `${stats.approved} approved · ${stats.blocked} blocked`
              : `${stats.approved} paid via PayPal`}
          </span>
        </Card>

        <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{isDeveloper ? "Guard Latency" : "Allowance Health"}</span>
            <Clock className="h-4 w-4 text-[#3EE0A8]" />
          </div>
          <div className="font-heading text-2xl sm:text-3xl font-black text-[#0B7A5A] dark:text-[#3EE0A8] mt-1">
            {isDeveloper ? "< 1 ms" : "Protected"}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {isDeveloper ? "pure deterministic engine" : "verified PayPal checkout"}
          </span>
        </Card>
      </div>

      {/* Main Charts: Spent vs Remaining & Decision Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Spent vs Remaining (Col 6) */}
        <div className="lg:col-span-6">
          <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-5 shadow-sm">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-heading text-lg font-bold">
                Spent vs Remaining Budget
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Current active mandate allocation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${val.toFixed(2)}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "#0D1C17",
                      borderRadius: "8px",
                      border: "1px solid #1A332B",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Chart 2: Approved vs Blocked (Col 6) */}
        <div className="lg:col-span-6">
          <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-5 shadow-sm">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-heading text-lg font-bold">
                Decision Outcomes
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Approved PayPal charges vs Blocked Attacks & Escalations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decisionData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    tickFormatter={(val) => val.split(" ")[0]}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D1C17",
                      borderRadius: "8px",
                      border: "1px solid #1A332B",
                      color: "#fff",
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Breakdown Card */}
      <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-5 shadow-sm">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="font-heading text-lg font-bold">
            {isDeveloper ? "Spending by Product Category" : "Where Your Shopping Allowance Goes"}
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Purchases classified under your mandate's allowed shopping categories
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {categoryData.map((c) => (
              <div
                key={c.category}
                className="p-4 rounded-xl border border-zinc-100 dark:border-[#1A332B] bg-zinc-50/50 dark:bg-[#07130F] flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    {c.category}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Verified Purchases
                  </div>
                </div>
                <div className="font-heading text-lg font-bold text-[#0B7A5A] dark:text-[#3EE0A8]">
                  ${c.spent.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
