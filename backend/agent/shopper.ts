import { createGroq } from "@ai-sdk/groq";
import { generateText, streamText, stepCountIs } from "ai";
import { Mandate } from "../policy/types";
import { buildAgentSystemPrompt } from "./prompt";
import { createAgentTools } from "./tools";
import {
  AgentPaymentRequestInput,
  AgentRunResult,
  AgentStep,
} from "./types";
import crypto from "crypto";

export function getGroqModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY environment variable");
  }

  const groq = createGroq({ apiKey });
  const modelName = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  return groq(modelName);
}

export interface RunShoppingAgentOptions {
  instruction: string;
  mandate?: Mandate | null;
  sessionId?: string;
  maxSteps?: number;
}

/**
 * Runs the autonomous shopping agent synchronously with tool calling steps.
 * STRICT AIR-GAP: Strictly zero imports or connections to PayPal.
 */
export async function runShoppingAgent({
  instruction,
  mandate,
  sessionId = crypto.randomUUID(),
  maxSteps = 4,
}: RunShoppingAgentOptions): Promise<AgentRunResult> {
  const model = getGroqModel();
  const system = buildAgentSystemPrompt(mandate);

  // Natural language intent normalization for catalog listing & browsing
  const lower = instruction.toLowerCase().trim();
  const isCatalogBrowsing =
    lower.includes("which are here") ||
    lower.includes("items below") ||
    lower.includes("what items are here") ||
    lower.includes("what products do you have") ||
    lower.includes("show me all products") ||
    lower.includes("list all items") ||
    lower.includes("list all the items") ||
    lower.includes("what can i buy");

  const effectivePrompt = isCatalogBrowsing
    ? `${instruction} (User is requesting to view the catalog of available products and prices)`
    : instruction;

  let capturedPaymentRequest: AgentPaymentRequestInput | undefined;
  const executionSteps: AgentStep[] = [];
  let stepCounter = 1;

  const tools = createAgentTools((paymentPayload) => {
    capturedPaymentRequest = paymentPayload;
    executionSteps.push({
      step: stepCounter++,
      type: "payment-requested",
      content: `Agent proposed payment: ${paymentPayload.item} ($${(
        paymentPayload.amount_cents / 100
      ).toFixed(2)}) from ${paymentPayload.merchant_domain}`,
      timestamp: new Date().toISOString(),
    });
  });

  const result = await generateText({
    model,
    system,
    prompt: effectivePrompt,
    tools,
    temperature: 0.1,
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: ({ text, toolCalls, toolResults }) => {
      if (text && text.trim()) {
        executionSteps.push({
          step: stepCounter++,
          type: "thought",
          content: text.trim(),
          timestamp: new Date().toISOString(),
        });
      }

      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls as any[]) {
          executionSteps.push({
            step: stepCounter++,
            type: "tool-call",
            toolName: tc.toolName,
            toolArgs: tc.input || tc.args,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (toolResults && toolResults.length > 0) {
        for (const tr of toolResults as any[]) {
          executionSteps.push({
            step: stepCounter++,
            type: "tool-result",
            toolName: tr.toolName,
            toolResult: tr.output || tr.result,
            timestamp: new Date().toISOString(),
          });
        }
      }
    },
  });

  let finalResponse = result.text?.trim();

  // If text is empty because the agent stopped on a tool call/result step:
  if (!finalResponse && capturedPaymentRequest) {
    const formattedPrice = `$${(capturedPaymentRequest.amount_cents / 100).toFixed(2)}`;
    finalResponse = `I found **${capturedPaymentRequest.item}** for **${formattedPrice}** from ${capturedPaymentRequest.merchant || capturedPaymentRequest.merchant_domain} and submitted a payment request to the BERYL Policy Guard.`;
  } else if (!finalResponse) {
    // Extract products from the most recent search tool step
    const searchStep = executionSteps
      .slice()
      .reverse()
      .find((s) => s.toolName === "search_products" && s.toolResult);

    const products = searchStep?.toolResult?.products;
    if (products && Array.isArray(products) && products.length > 0) {
      const itemsList = products
        .slice(0, 4)
        .map(
          (p: any, i: number) =>
            `${i + 1}. **${p.title}** — **${p.price_formatted || "$" + (p.price_cents / 100).toFixed(2)}** (${p.merchant || p.merchant_domain})`
        )
        .join("\n");

      finalResponse = `Here are the matching items found in the product catalog:\n\n${itemsList}\n\nLet me know if you would like me to request payment for any of these!`;
    } else {
      finalResponse =
        "I searched the product catalog, but could not find matching in-stock items. Please let me know if you would like to adjust your search.";
    }
  }

  return {
    sessionId,
    response: finalResponse,
    steps: executionSteps,
    paymentRequest: capturedPaymentRequest,
  };
}

/**
 * Creates a streaming agent response for real-time frontend chat UI.
 */
export function streamShoppingAgent({
  instruction,
  mandate,
  maxSteps = 5,
  onPaymentRequested,
}: {
  instruction: string;
  mandate?: Mandate | null;
  maxSteps?: number;
  onPaymentRequested?: (payload: AgentPaymentRequestInput) => void;
}) {
  const model = getGroqModel();
  const system = buildAgentSystemPrompt(mandate);
  const tools = createAgentTools(onPaymentRequested);

  return streamText({
    model,
    system,
    prompt: instruction,
    tools,
    stopWhen: stepCountIs(maxSteps),
  });
}
