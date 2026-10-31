"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export function RealtimeListener() {
  useEffect(() => {
    try {
      const supabase = createClient();
      const channel = supabase
        .channel("beryl-realtime-events")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "audit_logs" },
          (payload) => {
            const record = payload.new as {
              decision?: string;
              amount_cents?: number;
              rule_code?: string;
              reason?: string;
            };

            const amount = record.amount_cents
              ? `$${(record.amount_cents / 100).toFixed(2)}`
              : "Payment";

            if (record.decision === "APPROVE") {
              toast.success(`Payment Approved: ${amount}`, {
                description: "Executed in PayPal sandbox",
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
              });
            } else if (record.decision === "NEEDS_APPROVAL") {
              toast.warning(`Approval Required: ${amount}`, {
                description: record.reason || "Payment exceeds user threshold",
                icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
              });
            } else if (record.decision === "BLOCK") {
              toast.error(`Payment Blocked: ${record.rule_code || "REJECTED"}`, {
                description: record.reason || "Violated mandate policy",
                icon: <XCircle className="h-4 w-4 text-rose-500" />,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignore if Supabase realtime is not reachable in offline/mock mode
    }
  }, []);

  return null;
}
