"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ConsumerShell } from "@/frontend/components/ConsumerShell";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = [
  "Electronics",
  "Office",
  "Books",
  "Peripherals",
  "Software",
  "Accessories",
];

const DURATION_OPTIONS = [
  { label: "3 Days", days: 3 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

export default function ConsumerRulesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("Personal Shopping Budget");
  const [totalBudgetDollars, setTotalBudgetDollars] = useState("100.00");
  const [perPurchaseLimitDollars, setPerPurchaseLimitDollars] = useState("30.00");
  const [askAboveDollars, setAskAboveDollars] = useState("20.00");
  const [expiryDays, setExpiryDays] = useState(7);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Electronics",
    "Office",
    "Peripherals",
  ]);

  const totalBudgetCents = Math.round(parseFloat(totalBudgetDollars || "0") * 100);
  const perPurchaseLimitCents = Math.round(parseFloat(perPurchaseLimitDollars || "0") * 100);
  const askAboveCents = Math.round(parseFloat(askAboveDollars || "0") * 100);

  // Load existing saved mandate to pre-populate form
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
              // Normalize to Capitalized format matching DEFAULT_CATEGORIES
              const formatted = mandate.allowed_categories.map((c: string) =>
                c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
              );
              setSelectedCategories(formatted);
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

  const toggleCategory = (cat: string) => {
    const catLower = cat.toLowerCase();
    const exists = selectedCategories.some((c) => c.toLowerCase() === catLower);
    if (exists) {
      if (selectedCategories.length === 1) {
        toast.error("Please keep at least one allowed category");
        return;
      }
      setSelectedCategories(selectedCategories.filter((c) => c.toLowerCase() !== catLower));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSaveRules = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for your spending allowance");
      return;
    }
    if (totalBudgetCents <= 0) {
      toast.error("Total budget must be greater than zero");
      return;
    }
    if (perPurchaseLimitCents > totalBudgetCents) {
      toast.error("Per-order limit cannot exceed total budget");
      return;
    }

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
        allowed_categories: selectedCategories.map((c) => c.toLowerCase()),
        allowed_merchants: ["amazon.com", "bestbuy.com", "channel3.store"],
        blocked_merchants: [],
        expires_at: expiresAt.toISOString(),
      };

      const res = await fetch("/api/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Spending rules saved successfully");
        const targetRoute = pathname.startsWith("/consumer") ? "/consumer/wallet" : "/dashboard";
        router.push(targetRoute);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update spending rules");
      }
    } catch {
      toast.error("Network error while saving spending rules");
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
    <ConsumerShell
      activePath={pathname.startsWith("/consumer") ? "/consumer/rules" : "/dashboard/mandates/new"}
      title="Spending Rules"
      compactPadding={true}
      maxWidth="max-w-[1040px]"
    >
      <div className="space-y-5">
        {/* Main Grid: Form Left, Preview Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Form: 7 cols */}
          <div className="lg:col-span-7 space-y-4">
            {/* Card 1: Allowance Details */}
            <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
                Allowance Name & Validity
              </h2>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Allowance Label
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Personal Shopping Budget"
                  className="w-full bg-zinc-50 dark:bg-[#07100D] border border-zinc-300 dark:border-[#162E25] rounded px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Valid Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setExpiryDays(opt.days)}
                      className={`py-2 text-xs font-medium rounded border cursor-pointer transition-colors ${
                        expiryDays === opt.days
                          ? "bg-[#0B7A5A] text-white border-[#0B7A5A] font-bold"
                          : "bg-white dark:bg-[#07100D] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#162E25] hover:border-[#0B7A5A]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Financial Limits */}
            <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
                Spending Limits
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Total Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-zinc-400">$</span>
                    <input
                      type="text"
                      value={totalBudgetDollars}
                      onChange={(e) => setTotalBudgetDollars(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-[#07100D] border border-zinc-300 dark:border-[#162E25] rounded pl-7 pr-3 py-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Max Per Order
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-zinc-400">$</span>
                    <input
                      type="text"
                      value={perPurchaseLimitDollars}
                      onChange={(e) => setPerPurchaseLimitDollars(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-[#07100D] border border-zinc-300 dark:border-[#162E25] rounded pl-7 pr-3 py-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Review Above
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-zinc-400">$</span>
                    <input
                      type="text"
                      value={askAboveDollars}
                      onChange={(e) => setAskAboveDollars(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-[#07100D] border border-zinc-300 dark:border-[#162E25] rounded pl-7 pr-3 py-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#0B7A5A]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Permitted Categories */}
            <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono">
                Allowed Item Categories
              </h2>

              <div className="flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.some((c) => c.toLowerCase() === cat.toLowerCase());
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded border cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#0B7A5A] text-white border-[#0B7A5A] font-bold"
                          : "bg-white dark:bg-[#07100D] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#162E25] hover:border-[#0B7A5A]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Summary: 5 cols */}
          <div className="lg:col-span-5">
            <div className="border border-zinc-200 dark:border-[#162E25] bg-white dark:bg-[#0D1C17] rounded-lg p-5 space-y-4 sticky top-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono pb-2.5 border-b border-zinc-200 dark:border-[#162E25]">
                Rules Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Allowance Name</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right truncate max-w-[180px]">
                    {name || "Shopping Budget"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Total Budget</span>
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    ${parseFloat(totalBudgetDollars || "0").toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Max Per Order</span>
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    ${parseFloat(perPurchaseLimitDollars || "0").toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Review Threshold</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                    ${parseFloat(askAboveDollars || "0").toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Valid Until</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {expiryDateText} ({expiryDays} Days)
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-[#162E25]">
                  <span className="text-xs text-zinc-500 block mb-1">Permitted Categories</span>
                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {selectedCategories.join(", ")}
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-zinc-200 dark:border-[#162E25]">
                <button
                  type="button"
                  onClick={handleSaveRules}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#0B7A5A] hover:bg-[#086147] text-white text-sm font-semibold rounded cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving Rules..." : "Save Spending Rules"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConsumerShell>
  );
}
