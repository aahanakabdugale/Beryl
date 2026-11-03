"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Tag,
  Clock,
  Sparkles,
  Sliders,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useViewMode } from "@/components/view-mode-context";
import { toast } from "sonner";

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-[#1A332B]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isDeveloper ? "Create Policy Mandate & Guardrail" : "Set Your Shopping Allowance & Limits"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isDeveloper
              ? "Program the boundaries and deterministic constraints for your autonomous agent"
              : "Choose how much your agent can spend and when it needs to ask your permission."}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">Step {step} of 3</span>
        </div>
      </div>

      {/* Split Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Step Form (Col 7) */}
        <div className="lg:col-span-7">
          <Card className="bg-white dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-[#162E25]">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-[#0B7A5A] text-white flex items-center justify-center font-bold text-xs">
                  {step}
                </span>
                <CardTitle className="font-heading text-lg font-bold">
                  {step === 1 && (isDeveloper ? "Budget & Identity" : "Shopping Budget & Name")}
                  {step === 2 && (isDeveloper ? "Purchase Limits & Escalation" : "Item Limits & Review Rules")}
                  {step === 3 && (isDeveloper ? "Categories & Merchants" : "Allowed Stores & Categories")}
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-500">
                {step === 1 && (isDeveloper ? "Name the mandate and set the hard total budget ceiling." : "Name your allowance and set your total shopping budget.")}
                {step === 2 && (isDeveloper ? "Control max single item spending and human review trigger threshold." : "Set maximum price for any single item and when to ask for your approval.")}
                {step === 3 && (isDeveloper ? "Specify approved product taxonomy and trusted seller domains." : "Select which product categories and stores your agent is allowed to shop from.")}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isDeveloper ? "Mandate Name" : "Allowance Label"}
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Shopping Allowance"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isDeveloper ? "Total Budget Cap (USD)" : "Total Shopping Allowance (USD)"}
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={totalBudgetDollars}
                        onChange={(e) => setTotalBudgetDollars(e.target.value)}
                        placeholder="100.00"
                        className="pl-9 text-xs"
                      />
                    </div>
                    {isDeveloper && (
                      <span className="text-[11px] text-zinc-400 font-mono">
                        Stored in policy engine as {totalBudgetCents} integer cents
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isDeveloper ? "Duration / Expiration" : "Valid For"}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["3", "7", "30"].map((d) => (
                        <Button
                          key={d}
                          type="button"
                          variant={expiryDays === d ? "default" : "outline"}
                          onClick={() => setExpiryDays(d)}
                          className={`text-xs h-9 ${
                            expiryDays === d
                              ? "bg-[#0B7A5A] text-white"
                              : "border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          {d} Days
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isDeveloper ? "Per-Purchase Limit (USD)" : "Max Single Item Price (USD)"}
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={perPurchaseLimitDollars}
                        onChange={(e) => setPerPurchaseLimitDollars(e.target.value)}
                        placeholder="30.00"
                        className="pl-9 text-xs"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {isDeveloper
                        ? <span>Purchases above this are strictly <strong className="text-rose-500">BLOCKED</strong>.</span>
                        : "Any item costing more than this will not be purchased."}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isDeveloper ? "Escalation Threshold (USD) — Ask Above" : "Ask Me Before Buying If Over (USD)"}
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-amber-500" />
                      <Input
                        type="number"
                        step="0.01"
                        value={askAboveDollars}
                        onChange={(e) => setAskAboveDollars(e.target.value)}
                        placeholder="20.00"
                        className="pl-9 text-xs"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {isDeveloper
                        ? "Requests in this range trigger the NEEDS_APPROVAL state for human authorization."
                        : "Orders above this amount will pause and ask for your 1-click approval."}
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Permitted Item Categories</Label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {DEFAULT_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-emerald-100 text-[#0B7A5A] border-emerald-500/40 dark:bg-emerald-950 dark:text-[#3EE0A8]"
                                : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
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
                    <Label className="text-xs font-semibold">Allowed Merchant Domains</Label>
                    <Input
                      value={merchantsInput}
                      onChange={(e) => setMerchantsInput(e.target.value)}
                      placeholder="comma-separated domains"
                      className="text-xs font-mono"
                    />
                    <span className="text-[11px] text-zinc-400">
                      Comma separated. Purchases outside these domains will trigger <code className="font-mono text-rose-500">BLOCKED_MERCHANT</code>.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between border-t border-zinc-100 dark:border-[#162E25] pt-4">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="text-xs gap-1.5 h-9"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="bg-[#0B7A5A] hover:bg-[#086147] text-white text-xs gap-1.5 h-9"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleDeployMandate}
                  disabled={submitting}
                  className="bg-[#0B7A5A] hover:bg-[#086147] dark:bg-[#0B7A5A] dark:hover:bg-[#14966F] text-white font-semibold text-xs gap-1.5 h-9"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{submitting ? "Deploying..." : "Deploy Guard Mandate"}</span>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Right Side: Live Mandate Card Preview (Col 5) */}
        <div className="lg:col-span-5 space-y-3 sticky top-6">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Live Mandate Card Preview
          </div>

          <Card className="bg-[#F8FAF9] dark:bg-[#12241E] border-2 border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                {name || "Untitled Mandate"}
              </span>
              <span className="font-mono text-[11px] text-emerald-700 dark:text-[#3EE0A8] bg-emerald-100/80 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full font-bold">
                {expiryDays}d remaining
              </span>
            </div>

            <div>
              <div className="font-heading text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                ${parseFloat(totalBudgetDollars || "0").toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Total autonomous budget allocated
              </div>
            </div>

            {/* Simulated initial progress bar */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
              <div className="bg-[#0B7A5A] dark:bg-[#3EE0A8] h-full" style={{ width: "0%" }} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#0D1C17] border border-zinc-200/60 dark:border-[#1E3A31]">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Max Item</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  ${parseFloat(perPurchaseLimitDollars || "0").toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-[#251E11] border border-amber-500/30">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-mono block">
                  Ask Above
                </span>
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  ${parseFloat(askAboveDollars || "0").toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Allowed Categories</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCategories.length === 0 ? (
                  <span className="text-xs text-rose-500">No categories selected (all items blocked)</span>
                ) : (
                  selectedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 text-[#0B7A5A] dark:text-[#3EE0A8] text-[11px] font-medium"
                    >
                      {cat}
                    </span>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
