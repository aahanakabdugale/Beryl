"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useViewMode } from "@/components/view-mode-context";
import ConsumerRulesScreen from "@/frontend/screens/ConsumerRulesScreen";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = [
  "electronics",
  "office",
  "books",
  "peripherals",
  "software",
  "accessories",
];

const EXPIRY_OPTIONS = [
  { label: "3 Days", days: 3 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

export default function MandateSetupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDeveloper } = useViewMode();

  // If consumer route or in consumer view mode, render the dedicated Consumer Rules Screen
  if (pathname.startsWith("/consumer") || !isDeveloper) {
    return <ConsumerRulesScreen />;
  }

  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("Research & Supplies Budget");
  const [totalBudgetDollars, setTotalBudgetDollars] = useState("100.00");
  const [perPurchaseLimitDollars, setPerPurchaseLimitDollars] = useState("30.00");
  const [askAboveDollars, setAskAboveDollars] = useState("20.00");
  const [expiryDays, setExpiryDays] = useState(7);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "electronics",
    "office",
    "peripherals",
  ]);
  const [merchantsInput, setMerchantsInput] = useState("amazon.com, bestbuy.com, channel3.store");

  // Load existing stored mandate to pre-populate form
  useEffect(() => {
    async function loadActiveMandate() {
      try {
        const res = await fetch("/api/mandates");
        if (res.ok) {
          const data = await res.json();
          const mandate = data.mandates?.[0];
          if (mandate) {
            if (mandate.name) setName(mandate.name);
            if (mandate.total_budget_cents !== undefined) {
              setTotalBudgetDollars((mandate.total_budget_cents / 100).toFixed(2));
            }
            if (mandate.per_purchase_limit_cents !== undefined) {
              setPerPurchaseLimitDollars((mandate.per_purchase_limit_cents / 100).toFixed(2));
            }
            const threshold = mandate.approval_threshold_cents ?? mandate.ask_above_cents;
            if (threshold !== undefined) {
              setAskAboveDollars((threshold / 100).toFixed(2));
            }
            if (Array.isArray(mandate.allowed_categories) && mandate.allowed_categories.length > 0) {
              setSelectedCategories(mandate.allowed_categories.map((c: string) => c.toLowerCase()));
            }
            if (Array.isArray(mandate.allowed_merchants) && mandate.allowed_merchants.length > 0) {
              setMerchantsInput(mandate.allowed_merchants.join(", "));
            }
            if (mandate.expires_at) {
              const diffMs = new Date(mandate.expires_at).getTime() - Date.now();
              const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
              if ([3, 7, 30, 90].includes(diffDays)) {
                setExpiryDays(diffDays);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not load stored mandate:", err);
      }
    }
    loadActiveMandate();
  }, []);

  const totalBudgetCents = Math.round(parseFloat(totalBudgetDollars || "0") * 100);
  const perPurchaseLimitCents = Math.round(parseFloat(perPurchaseLimitDollars || "0") * 100);
  const askAboveCents = Math.round(parseFloat(askAboveDollars || "0") * 100);

  const toggleCategory = (cat: string) => {
    const catLower = cat.toLowerCase();
    const exists = selectedCategories.some((c) => c.toLowerCase() === catLower);
    if (exists) {
      if (selectedCategories.length === 1) {
        toast.error("At least one permitted category required");
        return;
      }
      setSelectedCategories(selectedCategories.filter((c) => c.toLowerCase() !== catLower));
    } else {
      setSelectedCategories([...selectedCategories, catLower]);
    }
  };

  const handleDeployMandate = async () => {
    setSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const payload = {
        name,
        currency: "USD",
        total_budget_cents: totalBudgetCents,
        per_purchase_limit_cents: perPurchaseLimitCents,
        approval_threshold_cents: askAboveCents,
        ask_above_cents: askAboveCents,
        allowed_categories: selectedCategories,
        allowed_merchants: merchantsInput.split(",").map((m) => m.trim()).filter(Boolean),
        blocked_merchants: [],
        expires_at: expiresAt.toISOString(),
      };

      const res = await fetch("/api/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Mandate deployed successfully");
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        const fieldErrors = data.details
          ? Object.entries(data.details)
              .map(([k, v]) => `${k}: ${(v as any[]).join(", ")}`)
              .join("; ")
          : "";
        toast.error(fieldErrors || data.error || "Failed to create mandate");
      }
    } catch {
      toast.error("Network error creating mandate");
    } finally {
      setSubmitting(false);
    }
  };

  const [expiryDateText, setExpiryDateText] = useState("");

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + expiryDays);
    setExpiryDateText(d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }));
  }, [expiryDays]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#162E25]">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Policy & Mandate Constraints
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-xs font-mono font-medium px-3 py-1.5 border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-50 dark:hover:bg-[#12241E] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeployMandate}
            disabled={submitting}
            className="text-xs font-mono font-semibold px-4 py-1.5 bg-[#0B7A5A] hover:bg-[#086147] text-white rounded cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Deploying..." : "Deploy Mandate"}
          </button>
        </div>
      </div>

      {/* Main 2-Column Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Parameter Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Identification & Duration */}
          <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-6 space-y-5">
            <div className="text-sm font-mono font-bold uppercase text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-[#162E25] pb-2.5 tracking-wide">
              Mandate Identification & Duration
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Mandate Label
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Research & Supplies Budget"
                className="w-full px-3.5 py-2.5 rounded border border-zinc-300 dark:border-[#162E25] bg-zinc-50 dark:bg-[#07100D] text-base sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Validity Duration
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setExpiryDays(opt.days)}
                    className={`py-2.5 text-sm font-mono font-medium rounded border cursor-pointer ${
                      expiryDays === opt.days
                        ? "bg-[#0B7A5A] text-white border-[#0B7A5A]"
                        : "bg-zinc-50 dark:bg-[#07100D] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#162E25] hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Financial Ceilings */}
          <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-6 space-y-5">
            <div className="text-sm font-mono font-bold uppercase text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-[#162E25] pb-2.5 tracking-wide">
              Financial Ceilings & Thresholds
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Total Budget (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-mono text-zinc-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={totalBudgetDollars}
                    onChange={(e) => setTotalBudgetDollars(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded border border-zinc-300 dark:border-[#162E25] bg-zinc-50 dark:bg-[#07100D] text-base font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Per-Purchase Cap (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-mono text-zinc-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={perPurchaseLimitDollars}
                    onChange={(e) => setPerPurchaseLimitDollars(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded border border-zinc-300 dark:border-[#162E25] bg-zinc-50 dark:bg-[#07100D] text-base font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Review Threshold (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-mono text-zinc-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={askAboveDollars}
                    onChange={(e) => setAskAboveDollars(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded border border-zinc-300 dark:border-[#162E25] bg-zinc-50 dark:bg-[#07100D] text-base font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Category & Merchant Whitelist */}
          <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-6 space-y-5">
            <div className="text-sm font-mono font-bold uppercase text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-[#162E25] pb-2.5 tracking-wide">
              Scope & Merchant Whitelist
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Permitted Categories
              </label>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.some((c) => c.toLowerCase() === cat.toLowerCase());
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3.5 py-2 rounded text-sm font-medium border transition-colors cursor-pointer capitalize ${
                        isSelected
                          ? "bg-[#0B7A5A] text-white border-[#0B7A5A]"
                          : "bg-zinc-50 dark:bg-[#07100D] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-[#162E25] hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Allowed Merchant Domains
              </label>
              <input
                type="text"
                value={merchantsInput}
                onChange={(e) => setMerchantsInput(e.target.value)}
                placeholder="amazon.com, bestbuy.com, channel3.store"
                className="w-full px-3.5 py-2.5 rounded border border-zinc-300 dark:border-[#162E25] bg-zinc-50 dark:bg-[#07100D] text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
              />
            </div>
          </div>
        </div>

        {/* Right Pane: Specification Summary Sheet */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-6 space-y-5">
            <div className="text-sm font-mono font-bold uppercase text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-[#162E25] pb-2.5 tracking-wide">
              Policy Mandate Specification
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-[#162E25] text-sm font-mono">
              <div className="py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Label</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right">
                  {name || "Untitled"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Total Budget</span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 text-right">
                  ${parseFloat(totalBudgetDollars || "0").toFixed(2)}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Per-Purchase Limit</span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 text-right">
                  ${parseFloat(perPurchaseLimitDollars || "0").toFixed(2)}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Review Threshold</span>
                <span className="font-bold text-base text-amber-600 dark:text-amber-400 text-right">
                  ${parseFloat(askAboveDollars || "0").toFixed(2)}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Validity</span>
                <span className="text-zinc-900 dark:text-zinc-100 text-right">
                  {expiryDays} Days {expiryDateText ? `(${expiryDateText})` : ""}
                </span>
              </div>

              <div className="py-3 flex flex-col gap-1.5">
                <span className="text-zinc-500">Allowed Categories</span>
                <span className="text-zinc-800 dark:text-zinc-200 leading-snug">
                  {selectedCategories.length === 0
                    ? "None specified"
                    : selectedCategories.join(", ")}
                </span>
              </div>

              <div className="py-3 flex flex-col gap-1.5">
                <span className="text-zinc-500">Merchant Whitelist</span>
                <span className="text-zinc-800 dark:text-zinc-200 break-all leading-snug">
                  {merchantsInput || "All merchants disallowed"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Precision Unit</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  Integer Cents ({totalBudgetCents} cents)
                </span>
              </div>

              <div className="py-3 flex justify-between gap-4">
                <span className="text-zinc-500">Guard Air-Gap</span>
                <span className="text-[#0B7A5A] dark:text-[#3EE0A8] font-bold">
                  Enforced
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDeployMandate}
                disabled={submitting}
                className="w-full py-3 bg-[#0B7A5A] hover:bg-[#086147] text-white rounded text-sm font-mono font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Deploying..." : "Deploy Mandate to Policy Guard"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}