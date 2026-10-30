import { z } from "zod";
import { NormalizedProduct } from "../channel3/types";
import { Mandate, PolicyDecision } from "../policy/types";

export const AgentPaymentRequestInputSchema = z.object({
  item: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  merchant: z.string().min(1, "Merchant name is required"),
  merchant_domain: z.string().min(1, "Merchant domain is required"),
  amount_cents: z
    .number()
    .int("Amount must be in integer cents")
    .positive("Amount must be positive"),
  agent_reason: z.string().min(1, "Agent reason is required"),
  source: z.enum(["channel3", "mock", "other"]).default("channel3"),
  channel3_product_id: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),
  listed_price_cents: z.number().int().optional().nullable(),
  in_stock: z.boolean().default(true),
  untrusted_metadata: z.string().optional().nullable(),
});

export type AgentPaymentRequestInput = z.infer<
  typeof AgentPaymentRequestInputSchema
>;

export interface AgentStep {
  step: number;
  type: "tool-call" | "tool-result" | "thought" | "payment-requested";
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  content?: string;
  timestamp: string;
}

export interface AgentRunResult {
  sessionId: string;
  response: string;
  steps: AgentStep[];
  paymentRequest?: AgentPaymentRequestInput;
  decision?: PolicyDecision;
}
