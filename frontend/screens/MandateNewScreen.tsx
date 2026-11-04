"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { ConsumerShell } from "@/frontend/components/ConsumerShell";
import { useViewMode } from "@/components/view-mode-context";
import { toast } from "sonner";
import { motion } from "framer-motion";

const DEFAULT_CATEGORIES = [
  "electronics",
  "office",
  "books",
  "peripherals",
  "software",
  "accessories",
];

export default function MandateSetupPage() {
  const router = useRouter();
  const { isDeveloper } = useViewMode();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState(isDeveloper ? "Research & Supplies Budget" : "My Shopping Allowance");
  const [totalBudgetDollars, setTotalBudgetDollars] = useState("100.00");
  const [perPurchaseLimitDollars, setPerPurchaseLimitDollars] = useState("30.00");
  const [askAboveDollars, setAskAboveDollars] = useState("20.00");
  const [expiryDays, setExpiryDays] = useState("7");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "electronics",
    "office",
    "peripherals",
  ]);
  const [merchantsInput, setMerchantsInput] = useState("amazon.com, bestbuy.com, channel3.store");

  const totalBudgetCents = Math.round(parseFloat(totalBudgetDollars || "0") * 100);
  const perPurchaseLimitCents = Math.round(parseFloat(perPurchaseLimitDollars || "0") * 100);
  const askAboveCents = Math.round(parseFloat(askAboveDollars || "0") * 100);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleDeployMandate = async () => {
    setSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays || "7", 10));

      const payload = {
        name,
        currency: "USD",
        total_budget_cents: totalBudgetCents,
        per_purchase_limit_cents: perPurchaseLimitCents,
        ask_above_cents: askAboveCents,
        allowed_categories: selectedCategories,
        allowed_merchants: merchantsInput.split(",").map((m) => m.trim()).filter(Boolean),
        expires_at: expiresAt.toISOString(),
      };

      const res = await fetch("/api/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isDeveloper ? "Mandate deployed successfully!" : "Shopping allowance saved!");
        router.push("/dashboard");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create mandate");
      }
    } catch {
      toast.error("Network error creating mandate");
    } finally {
      setSubmitting(false);
    }
  };

  // Content for consumer
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 2-Column Split: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Step Form (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-[var(--approvals-line)] bg-[var(--approvals-card)] p-7 space-y-6 shadow-xs">
            {/* Step title */}
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--approvals-line)]">
              <span className="w-7 h-7 rounded-full bg-[var(--approvals-brand)] text-white text-[13px] font-medium flex items-center justify-center shrink-0">
                {step}
              </span>
              <div>
                <h2 className="text-[18px] font-medium text-[var(--approvals-ink)]">
                  {step === 1 && "Shopping budget & name"}
                  {step === 2 && "Item limits & review rules"}
                  {step === 3 && "Allowed stores & categories"}
                </h2>
                <p className="text-[13px] text-[var(--approvals-mute)] mt-0.5">
                  {step === 1 && "Name your allowance and set your total shopping budget."}
                  {step === 2 && "Set maximum price for any single item and when to ask for your approval."}
                  {step === 3 && "Select which product categories and stores your agent is allowed to shop from."}
                </p>
              </div>
            </div>

            {/* Step 1 Fields */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--approvals-ink)]">
                    Allowance Label
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My Shopping Allowance"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--approvals-line)] bg-[var(--approvals-page)] text-[14px] text-[var(--approvals-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--approvals-ink)]">
                    Total Shopping Allowance (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[14px] text-[var(--approvals-mute)] font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={totalBudgetDollars}
                      onChange={(e) => setTotalBudgetDollars(e.target.value)}
                      placeholder="100.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[var(--approvals-line)] bg-[var(--approvals-page)] text-[14px] text-[var(--approvals-ink)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--approvals-ink)]">
                    Valid For
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["3", "7", "30"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setExpiryDays(d)}
                        className={`py-2 text-[13px] font-medium rounded-full border transition-colors cursor-pointer ${
                          expiryDays === d
                            ? "bg-[var(--approvals-brand)] text-white border-[var(--approvals-brand)]"
                            : "bg-[var(--approvals-card)] text-[var(--approvals-mute)] border-[var(--approvals-line)] hover:text-[var(--approvals-ink)]"
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 Fields */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--approvals-ink)]">
                    Max Single Item Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[14px] text-[var(--approvals-mute)] font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={perPurchaseLimitDollars}
                      onChange={(e) => setPerPurchaseLimitDollars(e.target.value)}
                      placeholder="30.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[var(--approvals-line)] bg-[var(--approvals-page)] text-[14px] text-[var(--approvals-ink)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                    />
                  </div>
                  <p className="text-[12px] text-[var(--approvals-mute)]">
                    Any item costing more than this will be rejected automatically.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--approvals-ink)]">
                    Ask Me Before Buying If Over (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[14px] text-[var(--approvals-amber)] font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={askAboveDollars}
                      onChange={(e) => setAskAboveDollars(e.target.value)}
                      placeholder="20.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[var(--approvals-line)] bg-[var(--approvals-page)] text-[14px] text-[var(--approvals-ink)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                    />
                  </div>
                  <p className="text-[12px] text-[var(--approvals-mute)]">
                    Orders above this price halt and wait for your 1-click approval.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3 Fields */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--approvals-ink)]">
                    Permitted Item Categories
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DEFAULT_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[var(--approvals-soft)] text-[var(--approvals-brand)] dark:text-[var(--approvals-accent)] border-[var(--approvals-brand)]/40 font-medium"
                              : "bg-[var(--approvals-page)] text-[var(--approvals-mute)] border-[var(--approvals-line)] hover:text-[var(--approvals-ink)]"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--approvals-ink)]">
                    Allowed Merchant Domains
                  </label>
                  <input
                    type="text"
                    value={merchantsInput}
                    onChange={(e) => setMerchantsInput(e.target.value)}
                    placeholder="amazon.com, bestbuy.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--approvals-line)] bg-[var(--approvals-page)] text-[13px] text-[var(--approvals-ink)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                  />
                  <p className="text-[12px] text-[var(--approvals-mute)]">
                    Comma separated. Purchases from untrusted domains are blocked.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--approvals-line)]">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] rounded-full transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-2 bg-[var(--approvals-brand)] text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeployMandate}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[var(--approvals-brand)] text-white text-[13px] font-medium px-6 py-2.5 rounded-full hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{submitting ? "Saving..." : "Save Spending Rules"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Preview Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-3 sticky top-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--approvals-mute)] font-medium">
            Live Preview
          </div>

          <div className="rounded-3xl border border-[var(--approvals-line)] bg-[var(--approvals-card)] p-7 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[var(--approvals-ink)]">
                {name || "Untitled Allowance"}
              </span>
              <span className="font-mono text-[11px] text-[var(--approvals-brand)] dark:text-[var(--approvals-accent)] bg-[var(--approvals-soft)] px-2.5 py-0.5 rounded-full font-medium">
                {expiryDays}d valid
              </span>
            </div>

            <div>
              <div className="text-[36px] font-medium tracking-[-0.03em] text-[var(--approvals-brand)] dark:text-[var(--approvals-accent)] leading-none">
                ${parseFloat(totalBudgetDollars || "0").toFixed(2)}
              </div>
              <div className="text-[13px] text-[var(--approvals-mute)] mt-1.5">
                Total autonomous budget allocated
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-[var(--approvals-soft)] overflow-hidden">
              <div className="h-full bg-[var(--approvals-brand)] dark:bg-[var(--approvals-accent)] w-0 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--approvals-line)]">
              <div>
                <span className="text-[11px] font-mono text-[var(--approvals-mute)] uppercase block">
                  Most per item
                </span>
                <span className="text-[16px] font-medium text-[var(--approvals-ink)]">
                  ${parseFloat(perPurchaseLimitDollars || "0").toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-mono text-[var(--approvals-amber)] uppercase block">
                  I'll ask above
                </span>
                <span className="text-[16px] font-medium text-[var(--approvals-ink)]">
                  ${parseFloat(askAboveDollars || "0").toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[var(--approvals-line)]">
              <span className="text-[11px] font-mono text-[var(--approvals-mute)] uppercase block">
                Allowed Items
              </span>
              <p className="text-[13px] text-[var(--approvals-ink)] font-normal leading-snug">
                {selectedCategories.length === 0
                  ? "None selected"
                  : selectedCategories
                      .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
                      .join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <ConsumerShell
      activePath="/dashboard/mandates/new"
      maxWidth="max-w-[1000px]"
      title="Set your spending rules"
      description="Choose how much your agent can spend and when it needs to ask your permission."
      headerActions={
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--approvals-mute)] px-3 py-1 rounded-full border border-[var(--approvals-line)]">
          Step {step} of 3
        </span>
      }
    >
      {content}
    </ConsumerShell>
  );
}
