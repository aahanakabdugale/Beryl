import { tool } from "ai";
import { z } from "zod";
import { searchProducts } from "../channel3";
import {
  AgentPaymentRequestInputSchema,
  AgentPaymentRequestInput,
} from "./types";

/**
 * Creates the two tools used by the autonomous shopping agent:
 * 1. search_products: searches Channel3 / mock catalog
 * 2. request_payment: formats and submits a payment request to the guard
 *
 * NOTE: STRICT AIR-GAP: Absolutely NO imports from @paypal or src/lib/paypal.
 */
export function createAgentTools(
  onPaymentRequested?: (payload: AgentPaymentRequestInput) => void
) {
  return {
    search_products: tool({
      description:
        "Searches real products via Channel3 (falls back to mock store if offline). Returns normalized product details with title, category, merchant, price in cents, and stock status.",
      inputSchema: z.object({
        query: z
          .string()
          .default("all")
          .describe(
            "The search query (e.g., 'ergonomic wireless mouse', 'phone stand', 'all', 'featured')"
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(4)
          .default(4)
          .describe("Maximum number of products to return"),
      }),
      execute: async ({ query, limit = 3 }) => {
        const products = await searchProducts(query, { limit: Math.min(limit, 3) });
        return {
          query,
          count: products.length,
          products: products.slice(0, 3).map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description ? p.description.slice(0, 80) : "",
            category: p.category,
            merchant: p.merchant,
            merchant_domain: p.merchant_domain,
            price_cents: p.price_cents,
            price_formatted: `$${(p.price_cents / 100).toFixed(2)}`,
            currency: p.currency,
            image_url: p.image_url || null,
            in_stock: p.in_stock,
            untrusted_metadata: p.untrusted_metadata ? p.untrusted_metadata.slice(0, 100) : undefined,
          })),
        };
      },
    }),

    request_payment: tool({
      description:
        "Submits a formal payment request to the BERYL Policy Guard layer. Does not execute the payment directly. Guard evaluates request against user mandate.",
      inputSchema: AgentPaymentRequestInputSchema,
      execute: async (args: AgentPaymentRequestInput) => {
        if (onPaymentRequested) {
          onPaymentRequested(args);
        }

        return {
          status: "SUBMITTED_TO_GUARD",
          message: `Payment request for "${args.item}" ($${(
            args.amount_cents / 100
          ).toFixed(2)}) forwarded to BERYL Policy Engine for mandate verification.`,
          payload: {
            item: args.item,
            amount_cents: args.amount_cents,
            merchant: args.merchant,
            merchant_domain: args.merchant_domain,
            category: args.category,
          },
        };
      },
    }),
  };
}
