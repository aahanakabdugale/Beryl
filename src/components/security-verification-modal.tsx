"use client";

import React, { useState } from "react";
import { toast } from "sonner";

export interface EvaluationStage {
  id: string;
  name: string;
  status: "PASSED" | "TRIGGERED" | "FAILED" | "ESCALATED" | "BLOCKED" | "APPROVED" | "NEEDS_APPROVAL";
  duration_ms: number;
  detail: string;
}

export interface SecurityEvaluationResponse {
  success: boolean;
  request_id: string;
  decision_id: string;
  mandate_id: string;
  outcome: "approve" | "needs_approval" | "block";
  rule_code: string;
  reason_text: string;
  flags?: string[];
  audit_hash: string;
  execution_time_ms: number;
  stages: EvaluationStage[];
  request_payload?: {
    item: string;
    amount_cents: number;
    merchant_domain: string;
    category?: string;
    agent_reason?: string;
  };
}

interface SecurityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  data: SecurityEvaluationResponse | null;
  targetPayload?: {
    item: string;
    amount_cents: number;
    merchant_domain: string;
    category?: string;
  } | null;
  payload?: any;
}

export function SecurityVerificationModal({
  isOpen,
  onClose,
  isLoading = false,
  data,
  targetPayload,
  payload: propPayload,
}: SecurityVerificationModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const payload = data?.request_payload || targetPayload || propPayload;
  const isBlocked = data?.outcome === "block";
  const isEscalated = data?.outcome === "needs_approval";

  const handleCopyHash = () => {
    if (!data?.audit_hash) return;
    navigator.clipboard.writeText(data.audit_hash);
    setCopiedHash(true);
    toast.success("Audit hash copied");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#07100D] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-[#162E25] rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-zinc-50 dark:bg-[#091410] border-b border-zinc-200 dark:border-[#162E25] flex items-center justify-between select-none shrink-0">
          <div className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Security Evaluation &amp; Policy Trace
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Payload Snapshot Strip */}
        {payload && (
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-[#162E25] bg-zinc-50/50 dark:bg-[#0D1C17] text-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-zinc-400">Target: </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {payload.item}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Amount: </span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                ${((payload.amount_cents || 0) / 100).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Vendor: </span>
              <span className="text-zinc-800 dark:text-zinc-200">
                {payload.merchant_domain}
              </span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading && (!data || !data.stages) && (
            <div className="py-12 text-center text-zinc-500">
              Evaluating request against mandate rules...
            </div>
          )}

          {data && (
            <>
              {/* Verdict Summary Box */}
              <div
                className={`p-4 rounded border ${
                  isBlocked
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 text-rose-800 dark:text-rose-300"
                    : isEscalated
                    ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                } space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm uppercase tracking-wide">
                    {isBlocked ? "VERDICT: BLOCKED" : isEscalated ? "VERDICT: HUMAN REVIEW REQUIRED" : "VERDICT: APPROVED"}
                  </span>
                  <span className="font-semibold text-xs font-mono">
                    [{data.rule_code}]
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {data.reason_text}
                </div>
              </div>

              {/* Stage Pipeline Table */}
              {data.stages && data.stages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 uppercase text-[11px] font-semibold">
                    <span>Policy Evaluation Matrices</span>
                    <span>Total Latency: {data.execution_time_ms}ms</span>
                  </div>

                  <div className="border border-zinc-200 dark:border-[#162E25] rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-zinc-100 dark:bg-[#091410] border-b border-zinc-200 dark:border-[#162E25] text-zinc-500">
                        <tr>
                          <th className="px-3 py-2">Stage Check</th>
                          <th className="px-3 py-2 text-right">Latency</th>
                          <th className="px-3 py-2 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-[#162E25] bg-white dark:bg-[#0D1C17]">
                        {data.stages.map((stage) => {
                          const isTriggered =
                            stage.status === "TRIGGERED" ||
                            stage.status === "FAILED" ||
                            stage.status === "BLOCKED";
                          const isReview =
                            stage.status === "ESCALATED" ||
                            stage.status === "NEEDS_APPROVAL";

                          return (
                            <tr key={stage.id} className="hover:bg-zinc-50 dark:hover:bg-[#12241E]">
                              <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                                {stage.name}
                              </td>
                              <td className="px-3 py-2 text-right text-zinc-500">
                                {stage.duration_ms}ms
                              </td>
                              <td className="px-3 py-2 text-right font-bold">
                                {isTriggered ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                    [TRIGGERED]
                                  </span>
                                ) : isReview ? (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    [REVIEW]
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-[#3EE0A8]">
                                    [PASSED]
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SHA-256 Audit Hash Row */}
              {data.audit_hash && (
                <div className="p-3 border border-zinc-200 dark:border-[#162E25] rounded bg-zinc-50 dark:bg-[#0D1C17] flex items-center justify-between gap-3 text-xs">
                  <div className="truncate text-zinc-500">
                    <span>SHA-256: </span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 select-all">
                      {data.audit_hash}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="px-2.5 py-1 rounded border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#07100D] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer shrink-0 font-medium text-[11px]"
                  >
                    {copiedHash ? "Copied" : "Copy Hash"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-[#091410] border-t border-zinc-200 dark:border-[#162E25] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded border border-zinc-300 dark:border-[#162E25] bg-white dark:bg-[#07100D] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#12241E] text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecurityVerificationModal;