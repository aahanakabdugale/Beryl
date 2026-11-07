"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ArrowRight,
  Shield,
  CreditCard,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useViewMode } from "@/components/view-mode-context";
import { useInspector } from "@/components/inspector-context";
import { toast } from "sonner";

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

export default function ApprovalsPage() {
  const { isDeveloper } = useViewMode();
  const { inspectData } = useInspector();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals?status=all");
      if (res.ok) {
        const data = await res.json();
        const list: ApprovalItem[] = data.approvals || [];
        setApprovals(list);

        if (list.length > 0) {
          const first = list[0];
          inspectData("ESCALATION_QUEUE", {
            total_items: list.length,
            pending: list.filter((a) => a.status === "pending").length,
            approved: list.filter((a) => a.status === "approved").length,
            rejected: list.filter((a) => a.status === "rejected").length,
            active_item: {
              id: first.id,
              request_id: first.request_id,
              item: first.payment_requests?.item || "Payment Request",
              amount: (first.payment_requests?.amount_cents || 0) / 100,
              status: first.status,
            },
          });
        }
      } else {
        toast.error("Failed to load approvals");
      }
    } catch {
      toast.error("Network error fetching approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleOpenSheet = (item: ApprovalItem) => {
    setSelectedApproval(item);
    setRejectReason("");
    setSheetOpen(true);
    inspectData("SELECTED_ESCALATION", {
      id: item.id,
      request_id: item.request_id,
      item: item.payment_requests?.item,
      amount: (item.payment_requests?.amount_cents || 0) / 100,
      merchant: item.payment_requests?.merchant || item.payment_requests?.merchant_domain,
      status: item.status,
      agent_reason: item.payment_requests?.agent_reason,
      threshold: item.payment_requests?.mandates?.approval_threshold_cents
        ? item.payment_requests.mandates.approval_threshold_cents / 100
        : 15.0,
      rule: "APPROVAL_THRESHOLD_EXCEEDED",
      verdict: "NEEDS_APPROVAL",
    });
  };

  const handleDecide = async (targetId: string, decision: "APPROVE" | "REJECT", customReason?: string) => {
    setDecidingId(targetId);

    // Optimistic UI update
    const previousApprovals = [...approvals];
    const newStatus = decision === "APPROVE" ? "approved" : "rejected";
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? { ...item, status: newStatus, decided_at: new Date().toISOString() }
          : item
      )
    );

    try {
      const res = await fetch(`/api/approvals/${targetId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: newStatus,
          reason: customReason || (decision === "REJECT" ? rejectReason || "Declined by policy manager" : undefined),
        }),
      });

      if (res.ok) {
        toast[decision === "APPROVE" ? "success" : "info"](
          decision === "APPROVE"
            ? "Payment Approved & PayPal Sandbox charge executed"
            : "Payment Rejected by policy manager"
        );
        setSheetOpen(false);
        fetchApprovals();
      } else {
        const err = await res.json();
        // Rollback optimistic update
        setApprovals(previousApprovals);
        toast.error(err.error || "Failed to submit decision");
      }
    } catch {
      setApprovals(previousApprovals);
      toast.error("Network error during decision");
    } finally {
      setDecidingId(null);
    }
  };

  const handleCreateMockEscalation = async () => {
    try {
      const res = await fetch("/api/guard/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: "Mechanical Ergonomic Keyboard (RGB Backlit)",
          category: "electronics",
          merchant_domain: "bestbuy.com",
          merchant: "Best Buy",
          amount_cents: 4500, // $45.00 > $15.00 threshold
          agent_reason: "User requested wireless mechanical keyboard. Best matching option in electronics category.",
        }),
      });

      if (res.ok) {
        toast.success("Generated escalation test item ($45.00)");
        setActiveTab("pending");
        fetchApprovals();
      } else {
        toast.error("Failed to generate test item");
      }
    } catch {
      toast.error("Failed to generate test escalation");
    }
  };

  const pendingList = approvals.filter((a) => a.status === "pending");
  const approvedList = approvals.filter((a) => a.status === "approved");
  const rejectedList = approvals.filter((a) => a.status === "rejected");

  const currentList =
    activeTab === "pending"
      ? pendingList
      : activeTab === "approved"
      ? approvedList
      : rejectedList;

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {isDeveloper ? "Escalation Queue" : "Order Approvals"}
        </h1>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApprovals}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 h-9 border-zinc-200 dark:border-zinc-800 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateMockEscalation}
            className="text-xs font-semibold gap-1.5 h-9 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 cursor-pointer border border-zinc-200/80 dark:border-zinc-700"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#0B7A5A] dark:text-[#3EE0A8]" />
            <span>Simulate $45 Escalation</span>
          </Button>
        </div>
      </div>

      {/* Horizontal Status Segments (No broken Radix Tabs list) */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "pending"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <span>Pending Review</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              pendingList.length > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {pendingList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("approved")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "approved"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <span>Approved</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
            {approvedList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rejected")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "rejected"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <span>Declined</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
            {rejectedList.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center text-sm text-zinc-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#0B7A5A] dark:text-[#3EE0A8]" />
          <span>Synchronizing escalation queue with Supabase...</span>
        </div>
      ) : currentList.length === 0 ? (
        <Card className="bg-white dark:bg-[#0A1612] border-zinc-200 dark:border-zinc-800 p-12 text-center rounded-xl shadow-xs">
          <AlertTriangle className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
          <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
            No {activeTab} approvals found
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-2 mb-5">
            {activeTab === "pending"
              ? "When an AI agent requests an item priced above your mandate threshold ($15.00), it safely pauses here for human authorization."
              : `There are currently no items marked as ${activeTab}.`}
          </p>
          {activeTab === "pending" && (
            <Button
              size="sm"
              onClick={handleCreateMockEscalation}
              className="bg-[#0B7A5A] hover:bg-[#086147] text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              Simulate $45.00 Keyboard Escalation
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentList.map((item) => {
            const req = item.payment_requests;
            const amount = req?.amount_cents ? (req.amount_cents / 100).toFixed(2) : "0.00";
            const isPending = item.status === "pending";
            const isDeciding = decidingId === item.id;

            return (
              <Card
                key={item.id}
                className={`bg-white dark:bg-[#0A1612] border transition-all rounded-xl flex flex-col justify-between shadow-xs ${
                  isPending
                    ? "border-amber-400/60 dark:border-amber-500/40 hover:border-amber-500"
                    : "border-zinc-200 dark:border-zinc-800 opacity-90"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                        item.status === "approved"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-[#3EE0A8]"
                          : item.status === "rejected"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                      }`}
                    >
                      {item.status === "pending" ? "NEEDS APPROVAL" : item.status.toUpperCase()}
                    </span>

                    <span className="font-mono text-xs text-zinc-500 uppercase">
                      {req?.category || "general"}
                    </span>
                  </div>

                  <CardTitle className="text-base font-bold mt-2 text-zinc-950 dark:text-white line-clamp-2">
                    {req?.item || "Payment Request"}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Price & Merchant */}
                  <div className="flex items-baseline justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                    <span className="text-3xl font-extrabold text-zinc-950 dark:text-white">
                      ${amount}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">
                      {req?.merchant_domain || req?.merchant || "bestbuy.com"}
                    </span>
                  </div>

                  {/* Escalation Context Pill */}
                  <div className="text-xs font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                    Threshold: ${amount} &gt; ${(
                      (req?.mandates?.approval_threshold_cents || 1500) / 100
                    ).toFixed(2)} limit
                  </div>

                  {/* Agent Stated Reason */}
                  {req?.agent_reason && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 line-clamp-2">
                      &quot;{req.agent_reason}&quot;
                    </div>
                  )}

                  {/* Action Controls */}
                  {isPending ? (
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          disabled={isDeciding}
                          onClick={() => handleDecide(item.id, "APPROVE")}
                          className="bg-[#0B7A5A] hover:bg-[#086147] text-white font-semibold text-xs h-9 rounded-lg gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{isDeciding ? "Executing..." : "Approve"}</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isDeciding}
                          onClick={() => handleDecide(item.id, "REJECT")}
                          className="border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs h-9 rounded-lg gap-1.5 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenSheet(item)}
                        className="w-full text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white h-8 cursor-pointer"
                      >
                        Review Details →
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                      <span>Decided</span>
                      <span className="font-mono">
                        {item.decided_at
                          ? new Date(item.decided_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Completed"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Slide-In Sheet: Detailed Decision & Inspection */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="!w-full !max-w-[560px] sm:!max-w-[560px] data-[side=right]:!max-w-[560px] bg-white dark:bg-[#07100D] border-l border-zinc-200 dark:border-[#162E25] flex flex-col justify-between p-6 sm:p-8 overflow-y-auto">
          <div className="space-y-6">
            <SheetHeader className="space-y-2 text-left">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                STATUS: ESCALATED FOR HUMAN REVIEW
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white text-left leading-snug">
                {selectedApproval?.payment_requests?.item || "Purchase Request"}
              </SheetTitle>
            </SheetHeader>

            {/* Transaction Breakdown */}
            <div className="border border-zinc-200 dark:border-[#162E25] bg-zinc-50/50 dark:bg-[#0D1C17] rounded-lg p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Requested Amount</span>
                <span className="font-bold text-xl text-zinc-950 dark:text-white">
                  ${((selectedApproval?.payment_requests?.amount_cents || 0) / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Review Threshold</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  ${((selectedApproval?.payment_requests?.mandates?.approval_threshold_cents || 3500) / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Threshold Delta</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  +${Math.max(0, ((selectedApproval?.payment_requests?.amount_cents || 0) - (selectedApproval?.payment_requests?.mandates?.approval_threshold_cents || 3500)) / 100).toFixed(2)} Exceeded
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Merchant Domain</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedApproval?.payment_requests?.merchant_domain || "bestbuy.com"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-200/60 dark:border-[#162E25]">
                <span className="text-zinc-500 font-medium">Category</span>
                <span className="font-semibold uppercase text-zinc-900 dark:text-zinc-100">
                  {selectedApproval?.payment_requests?.category || "general"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 font-medium">Settlement Target</span>
                <span className="text-[#0B7A5A] dark:text-[#3EE0A8] font-bold">
                  PayPal Sandbox Air-Gap
                </span>
              </div>
            </div>

            {/* Agent Reason */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Agent Justification &amp; Context
              </div>
              <div className="text-xs font-mono text-zinc-800 dark:text-zinc-200 p-4 rounded-lg bg-zinc-50 dark:bg-[#0D1C17] border border-zinc-200 dark:border-[#162E25] leading-relaxed break-words whitespace-pre-wrap">
                {selectedApproval?.payment_requests?.agent_reason || "Autonomous shopping task execution."}
              </div>
            </div>

            {/* Rejection Note */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Decline Reason (Optional)
              </div>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Price too high, select a cheaper alternative"
                className="text-xs font-mono h-10 px-3.5 bg-white dark:bg-[#0D1C17] border-zinc-300 dark:border-[#162E25] rounded"
              />
            </div>
          </div>

          {/* Action Buttons: Authorize & Decline */}
          <SheetFooter className="pt-6 border-t border-zinc-200 dark:border-[#162E25] flex flex-row items-center justify-end gap-3 sm:flex-row mt-6">
            <Button
              variant="outline"
              onClick={() => selectedApproval && handleDecide(selectedApproval.id, "REJECT")}
              disabled={decidingId === selectedApproval?.id}
              className="flex-1 border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-mono font-bold text-xs h-11 px-4 rounded cursor-pointer transition-colors"
            >
              Decline Request
            </Button>

            <Button
              onClick={() => selectedApproval && handleDecide(selectedApproval.id, "APPROVE")}
              disabled={decidingId === selectedApproval?.id}
              className="flex-1 bg-[#0B7A5A] hover:bg-[#086147] text-white font-mono font-bold text-xs h-11 px-4 rounded cursor-pointer transition-colors"
            >
              {decidingId === selectedApproval?.id
                ? "Executing Payment..."
                : "Authorize PayPal Payment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
