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
  const modelName = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
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
  maxSteps = 5,
}: RunShoppingAgentOptions): Promise<AgentRunResult> {
  const model = getGroqModel();
  const system = buildAgentSystemPrompt(mandate);

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
    prompt: instruction,
    tools,
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

  return {
    sessionId,
    response: result.text,
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
