import { SupabaseClient } from "@supabase/supabase-js";
import { TransactionHistory } from "./types";

/**
 * Loads aggregated spending history for a specific mandate:
 * - total_spent_cents: Total approved spend under this mandate
 * - daily_spent_cents: Approved spend in the last 24 hours
 * - weekly_spent_cents: Approved spend in the last 7 days
 * - purchases_today_count: Number of approved purchases in the last 24 hours
 */
export async function loadMandateHistory(
  supabase: SupabaseClient,
  mandateId: string,
  now: Date = new Date()
): Promise<TransactionHistory> {
  const nowMs = now.getTime();
  const oneDayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Query all payment requests for this mandate that have an 'approve' decision
  const { data: requests, error } = await supabase
    .from("payment_requests")
    .select(
      `
      id,
      amount_cents,
      created_at,
      decisions (
        outcome
      )
    `
    )
    .eq("mandate_id", mandateId);

  if (error || !requests) {
    return {
      total_spent_cents: 0,
      daily_spent_cents: 0,
      weekly_spent_cents: 0,
      purchases_today_count: 0,
    };
  }

  let total_spent_cents = 0;
  let daily_spent_cents = 0;
  let weekly_spent_cents = 0;
  let purchases_today_count = 0;

  for (const req of requests) {
    const isApproved =
      Array.isArray(req.decisions) &&
      req.decisions.some((d: any) => d.outcome === "approve");

    if (isApproved && req.amount_cents) {
      const amount = req.amount_cents;
      total_spent_cents += amount;

      const reqDate = req.created_at ? new Date(req.created_at) : null;
      if (reqDate) {
        if (reqDate.toISOString() >= oneDayAgo) {
          daily_spent_cents += amount;
          purchases_today_count += 1;
        }
        if (reqDate.toISOString() >= oneWeekAgo) {
          weekly_spent_cents += amount;
        }
      }
    }
  }

  return {
    total_spent_cents,
    daily_spent_cents,
    weekly_spent_cents,
    purchases_today_count,
  };
}
