import { describe, it, expect } from "vitest";
import { createAgentTools } from "../lib/agent/tools";
import { buildAgentSystemPrompt } from "../lib/agent/prompt";
import { Mandate } from "../lib/policy/types";
import fs from "fs";
import path from "path";

describe("Autonomous Shopping Agent (M5)", () => {
  it("Enforces strict air-gap: no paypal imports in src/lib/agent", () => {
    const agentDir = path.resolve(process.cwd(), "src/lib/agent");
    const files = fs.readdirSync(agentDir);

    for (const file of files) {
      if (file.endsWith(".ts")) {
        const content = fs.readFileSync(path.join(agentDir, file), "utf8");
        // Verify no import of paypal packages or paypal lib
        expect(content).not.toMatch(/from\s+["']@paypal/i);
        expect(content).not.toMatch(/from\s+["'].*\/paypal/i);
      }
    }
  });

  it("Builds system prompt with strict untrusted data boundaries", () => {
    const mandate: Mandate = {
      name: "Desk Setup Budget",
      total_budget_cents: 10000,
      per_purchase_limit_cents: 4000,
      approval_threshold_cents: 2500,
      allowed_categories: ["electronics", "office supplies"],
      allowed_merchants: ["amazon.com", "bestbuy.com"],
      blocked_merchants: [],
      status: "active",
    };

    const prompt = buildAgentSystemPrompt(mandate);

    expect(prompt).toContain("ACTIVE MANDATE CONSTRAINTS");
    expect(prompt).toContain("Desk Setup Budget");
    expect(prompt).toContain("$100.00");
    expect(prompt).toContain("ZERO PAYMENT CREDENTIALS");
    expect(prompt).toContain("UNTRUSTED DATA BOUNDARY");
    expect(prompt).toContain("IGNORE PREVIOUS INSTRUCTIONS");
  });

  it("Tools: search_products executes and returns products", async () => {
    const tools = createAgentTools();
    const searchTool = tools.search_products;

    const result = await (searchTool as any).execute({
      query: "ergonomic mouse",
      limit: 2,
    });

    expect(result.products).toBeDefined();
    expect(result.products.length).toBeGreaterThanOrEqual(1);
    expect(result.products[0].price_cents).toBeDefined();
    expect(Number.isInteger(result.products[0].price_cents)).toBe(true);
  });

  it("Tools: request_payment captures structured proposal in integer cents", async () => {
    let capturedPayload: any = null;
    const tools = createAgentTools((payload) => {
      capturedPayload = payload;
    });

    const paymentTool = tools.request_payment;

    const samplePayload = {
      item: "Logitech M510 Wireless Mouse",
      category: "electronics",
      merchant: "Best Buy",
      merchant_domain: "bestbuy.com",
      amount_cents: 2499,
      agent_reason: "Matches user request under $30.",
      source: "mock" as const,
      in_stock: true,
      listed_price_cents: 2499,
    };

    const executionResult = await (paymentTool as any).execute(samplePayload);

    expect(executionResult.status).toBe("SUBMITTED_TO_GUARD");
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.amount_cents).toBe(2499);
    expect(capturedPayload.merchant_domain).toBe("bestbuy.com");
  });
});
