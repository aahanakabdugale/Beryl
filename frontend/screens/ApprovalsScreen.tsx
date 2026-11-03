"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Shield,
  CreditCard,
  RefreshCw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useViewMode } from "@/components/view-mode-context";
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
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [tab, setTab] = useState("pending");

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals?status=all");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch {
      toast.error("Failed to load approvals");
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
  };

  const handleDecide = async (decision: "APPROVE" | "REJECT") => {
    if (!selectedApproval) return;
    setDeciding(true);
    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decision === "APPROVE" ? "approved" : "rejected",
          reason: decision === "REJECT" ? rejectReason || "Rejected by user" : undefined,
        }),
      });

      if (res.ok) {
        toast[decision === "APPROVE" ? "success" : "info"](
          decision === "APPROVE"
            ? "Payment Approved & PayPal Sandbox charge executed!"
            : "Payment Rejected by policy manager."
        );
        setSheetOpen(false);
        fetchApprovals();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit decision");
      }
    } catch {
      toast.error("Network error during decision");
    } finally {
      setDeciding(false);
    }
  };

  const handleCreateMockEscalation = async () => {
    try {
      const res = await fetch("/api/guard/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: "Mechanical Ergonomic Keyboard",
          category: "electronics",
          merchant_domain: "bestbuy.com",
          amount_cents: 4500, // $45.00 > $30.00 ask_above threshold
          agent_reason: "Requested by AI agent for ergonomic workstation upgrade",
        }),
      });
      if (res.ok) {
        toast.success("Generated escalation test request ($45.00)");
        fetchApprovals();
      }
    } catch {
      toast.error("Failed to generate test escalation");
    }
  };

  const filtered = approvals.filter((a) => {
    if (tab === "pending") return a.status === "pending";
    if (tab === "approved") return a.status === "approved";
    if (tab === "rejected") return a.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isDeveloper ? "Escalation Queue & Human-in-the-Loop Interceptor" : "Pending Order Approvals"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isDeveloper
              ? "Authorize or reject transactions exceeding your autonomous escalation thresholds"
              : "Items your agent found that need your sign-off before charging PayPal."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApprovals}
            disabled={loading}
            className="text-xs gap-1.5 h-8 border-zinc-200 dark:border-zinc-800 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateMockEscalation}
            className="text-xs gap-1.5 h-8 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{isDeveloper ? "Generate Escalation Test" : "Sample Order ($45.00)"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-white dark:bg-[#0D1C17] border border-zinc-200/80 dark:border-[#1A332B] p-1">
          <TabsTrigger value="pending" className="text-xs font-semibold">
            {isDeveloper ? "Pending Review" : "Waiting for You"}
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs font-semibold">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs font-semibold">
            Declined
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#0B7A5A]" />
              <span>Checking pending approvals...</span>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] p-12 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <div className="font-heading text-base font-bold text-zinc-800 dark:text-zinc-200">
                No {tab} approvals found
              </div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                {isDeveloper
                  ? "When an AI agent requests an item priced above your mandate threshold, it halts here for your explicit authorization."
                  : "When your AI shopping agent finds an item priced higher than your auto-approve limit, it waits here for your 1-click confirmation."}
              </p>
              <Button
                size="sm"
                onClick={handleCreateMockEscalation}
                className="bg-[#0B7A5A] hover:bg-[#086147] text-white text-xs rounded-lg cursor-pointer"
              >
                {isDeveloper ? "Simulate $45.00 Keyboard Escalation" : "Try a sample purchase approval"}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const req = item.payment_requests;
                const amount = req?.amount_cents ? (req.amount_cents / 100).toFixed(2) : "0.00";
                const isPending = item.status === "pending";

                return (
                  <Card
                    key={item.id}
                    className={`bg-white dark:bg-[#0D1C17] border transition-all ${
                      isPending
                        ? "border-amber-500/40 hover:border-amber-500 shadow-xs cursor-pointer"
                        : "border-zinc-200 dark:border-[#1A332B] opacity-80"
                    }`}
                    onClick={() => isPending && handleOpenSheet(item)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            item.status === "approved"
                              ? "default"
                              : item.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="font-mono text-[10px] uppercase font-bold"
                        >
                          {item.status}
                        </Badge>
                        <span className="font-mono text-xs text-zinc-400">
                          {req?.category || "general"}
                        </span>
                      </div>
                      <CardTitle className="font-heading text-base font-bold mt-1 line-clamp-1">
                        {req?.item || "Payment Request"}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-heading text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                          ${amount}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {req?.merchant_domain || "channel3.store"}
                        </span>
                      </div>

                      {req?.agent_reason && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-[#12241E] p-2 rounded-lg border border-zinc-200/50 dark:border-[#1E3A31]">
                          "{req.agent_reason}"
                        </p>
                      )}

                      {isPending && (
                        <Button
                          size="sm"
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-8 rounded-lg mt-2"
                        >
                          Review & Decide
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Slide-In Sheet: Approve or Reject (M8) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md bg-white dark:bg-[#0D1C17] border-l border-zinc-200 dark:border-[#1A332B] flex flex-col justify-between p-6">
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Escalation Triggered
                </span>
              </div>
              <SheetTitle className="font-heading text-2xl font-extrabold">
                {selectedApproval?.payment_requests?.item || "Purchase Request"}
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-500">
                This item exceeds your autonomous limit and halts for human-in-the-loop signoff.
              </SheetDescription>
            </SheetHeader>

            {/* Transaction Breakdown */}
            <div className="space-y-3 bg-[#F8FAF9] dark:bg-[#12241E] p-4 rounded-xl border border-zinc-200/60 dark:border-[#1E3A31] text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-[#1E3A31]">
                <span className="text-zinc-500">Amount Requested:</span>
                <span className="font-heading text-base font-bold text-zinc-900 dark:text-zinc-100">
                  ${((selectedApproval?.payment_requests?.amount_cents || 0) / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-[#1E3A31]">
                <span className="text-zinc-500">Merchant Domain:</span>
                <span className="font-mono font-semibold">
                  {selectedApproval?.payment_requests?.merchant_domain || "channel3.store"}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-200/60 dark:border-[#1E3A31]">
                <span className="text-zinc-500">Category:</span>
                <span className="font-semibold uppercase text-[10px]">
                  {selectedApproval?.payment_requests?.category || "general"}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Execution Target:</span>
                <span className="text-emerald-600 dark:text-[#3EE0A8] font-bold">
                  PayPal Sandbox
                </span>
              </div>
            </div>

            {/* Agent Reason */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Agent Stated Justification</Label>
              <div className="text-xs text-zinc-700 dark:text-zinc-300 p-3 rounded-lg bg-zinc-100 dark:bg-[#162D25] border border-zinc-200/50 dark:border-zinc-800">
                {selectedApproval?.payment_requests?.agent_reason || "Autonomous shopping task execution."}
              </div>
            </div>

            {/* Optional Rejection Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rejection Note (if rejecting)</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Too expensive, choose a cheaper alternative"
                className="text-xs"
              />
            </div>
          </div>

          {/* Action Buttons: Approve & Reject */}
          <SheetFooter className="pt-6 border-t border-zinc-100 dark:border-[#162E25] flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => handleDecide("APPROVE")}
              disabled={deciding}
              className="w-full bg-[#0B7A5A] hover:bg-[#086147] text-white font-semibold text-xs h-10 rounded-xl gap-2 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{deciding ? "Executing PayPal..." : "Approve & Execute PayPal Payment"}</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleDecide("REJECT")}
              disabled={deciding}
              className="w-full border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-xs h-10 rounded-xl gap-2 cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
              <span>Reject Payment</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
