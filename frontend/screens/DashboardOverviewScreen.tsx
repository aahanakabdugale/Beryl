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
  item_name?: string;
  merchant?: string;
  decision: "APPROVE" | "NEEDS_APPROVAL" | "BLOCK";
  rule_code: string;
  reason?: string;
  paypal_order_id?: string;
}

export default function DashboardOverview() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
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
        setRecentLogs((data.logs || []).slice(0, 6));
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
        toast[newStatus ? "error" : "success"](
          newStatus ? "Emergency Kill Switch Activated! Mandate Frozen." : "Mandate Unfrozen & Operational."
        );
      } else {
        toast.error("Failed to update kill switch");
      }
    } catch {
      toast.error("Network error updating kill switch");
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            Autonomous Policy Dashboard
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time policy guard state, active mandates, and execution metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="text-xs gap-1.5 h-8 border-zinc-200 dark:border-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Link href="/dashboard/mandates/new">
            <Button
              size="sm"
              className="bg-[#0B7A5A] hover:bg-[#086147] dark:bg-[#0B7A5A] dark:hover:bg-[#14966F] text-white text-xs gap-1.5 h-8 rounded-lg"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>New Mandate</span>
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
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-[#152B23] flex items-center justify-center text-[#0B7A5A] dark:text-[#3EE0A8]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg font-bold">
                      {activeMandate?.name || "Active Autonomous Mandate"}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      ID: <span className="font-mono">{activeMandate?.id?.slice(0, 8) || "default"}</span>
                    </CardDescription>
                  </div>
                </div>

                {/* Status Badges & Emergency Kill Switch */}
                <div className="flex items-center gap-3">
                  {activeMandate?.is_frozen ? (
                    <Badge variant="destructive" className="font-mono text-[10px] uppercase font-bold tracking-wider">
                      FROZEN (KILL SWITCH)
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

                  {/* Kill Switch Toggle */}
                  <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                    <Power className={`h-4 w-4 ${activeMandate?.is_frozen ? "text-rose-500" : "text-zinc-400"}`} />
                    <Switch
                      checked={activeMandate?.is_frozen || false}
                      onCheckedChange={handleToggleFreeze}
                      disabled={freezeLoading || !activeMandate}
                      aria-label="Emergency Kill Switch"
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
                    Remaining Budget
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
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">Per-Item Limit</div>
                  <div className="font-heading text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    ${((activeMandate?.per_purchase_limit_cents || 2500) / 100).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-[#251E11] border border-amber-500/20">
                  <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 uppercase">
                    Escalate Above
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
                    <span>Expiry</span>
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
        </div>
      </div>

      {/* Recent Decisions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight">Recent Decisions</h2>
            <p className="text-xs text-zinc-500">Live guard execution record</p>
          </div>
          <Link
            href="/dashboard/audit"
            className="text-xs font-semibold text-[#0B7A5A] dark:text-[#3EE0A8] hover:underline flex items-center gap-1"
          >
            <span>Full AG Grid Audit Log</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#0D1C17] border border-zinc-200/80 dark:border-[#1A332B] rounded-2xl overflow-hidden shadow-xs">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No transactions recorded yet. Launch the AI Shopper Agent or Attack Lab to simulate requests!
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-[#162E25]">
              {recentLogs.map((log) => {
                const isApprove = log.decision === "APPROVE";
                const isNeedsApproval = log.decision === "NEEDS_APPROVAL";
                const isBlock = log.decision === "BLOCK";

                return (
                  <div
                    key={log.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-[#12241E] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isApprove
                            ? "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950 dark:text-[#3EE0A8]"
                            : isNeedsApproval
                            ? "bg-amber-100/70 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-rose-100/70 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        }`}
                      >
                        {isApprove ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isNeedsApproval ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {log.item_name || "Payment Request"}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5 font-mono">
                          <span>{log.merchant || "Channel3 Merchant"}</span>
                          <span>•</span>
                          <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="font-heading text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          ${(log.amount_cents / 100).toFixed(2)}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {log.rule_code}
                        </div>
                      </div>

                      <div>
                        {isApprove && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-[#3EE0A8] text-[10px] font-mono">
                            APPROVED
                          </Badge>
                        )}
                        {isNeedsApproval && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-mono">
                            NEEDS APPROVAL
                          </Badge>
                        )}
                        {isBlock && (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-mono">
                            BLOCKED
                          </Badge>
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
