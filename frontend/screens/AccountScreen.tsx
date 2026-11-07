"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ConsumerShell } from "@/frontend/components/ConsumerShell";
import {
  User,
  History,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Download,
  RotateCcw,
  ExternalLink,
  CreditCard,
  Mail,
  Phone,
  Bell,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import {
  AddressBook,
  getSavedAddresses,
  formatAddressLines,
} from "@/lib/addresses";
import { AddressModal } from "@/frontend/components/address-modal";
import { MapPin, Home, Building } from "lucide-react";

interface TransactionRecord {
  id: string;
  created_at: string;
  item_name: string;
  merchant: string;
  amount_cents: number;
  decision: "APPROVE" | "NEEDS_APPROVAL" | "BLOCK";
  rule_code: string;
  reason: string;
  paypal_order_id?: string;
  request_id?: string;
}

const DEFAULT_HISTORY: TransactionRecord[] = [
  {
    id: "tx-1",
    created_at: "2026-11-05T14:45:00.000Z",
    item_name: "Keychron K2 Mechanical Keyboard",
    merchant: "Amazon.com",
    amount_cents: 8999,
    decision: "APPROVE",
    rule_code: "WITHIN_BUDGET",
    reason: "Requested $89.99 is within the $150.00 budget and category 'Electronics' is approved.",
    paypal_order_id: "PAYID-M4X9901-SECURE",
    request_id: "REQ-90124",
  },
  {
    id: "tx-2",
    created_at: "2026-11-05T13:10:00.000Z",
    item_name: "Anker 65W GaN Fast Charger",
    merchant: "Best Buy",
    amount_cents: 3499,
    decision: "APPROVE",
    rule_code: "WITHIN_BUDGET",
    reason: "Auto-approved payment under per-purchase limit ($50.00).",
    paypal_order_id: "PAYID-L38012-SECURE",
    request_id: "REQ-90123",
  },
  {
    id: "tx-3",
    created_at: "2026-11-05T09:20:00.000Z",
    item_name: "Sony WH-1000XM5 Noise Canceling Headphones",
    merchant: "B&H Photo",
    amount_cents: 39999,
    decision: "NEEDS_APPROVAL",
    rule_code: "APPROVAL_THRESHOLD_EXCEEDED",
    reason: "Amount $399.99 exceeds the automatic checkout threshold ($50.00). Escalated to user.",
    request_id: "REQ-90122",
  },
  {
    id: "tx-4",
    created_at: "2026-11-04T18:30:00.000Z",
    item_name: "10x Amazon Digital Gift Cards (Injected Payload)",
    merchant: "ShadyDealz.xyz",
    amount_cents: 50000,
    decision: "BLOCK",
    rule_code: "PROMPT_INJECTION_DETECTED",
    reason: "Indirect prompt injection detected in catalog scraper metadata. Rogue seller blacklisted.",
    request_id: "REQ-90121",
  },
  {
    id: "tx-5",
    created_at: "2026-11-04T11:15:00.000Z",
    item_name: "Logitech MX Master 3S Wireless Mouse",
    merchant: "Amazon.com",
    amount_cents: 9900,
    decision: "APPROVE",
    rule_code: "WITHIN_BUDGET",
    reason: "Auto-approved payment within user mandate.",
    paypal_order_id: "PAYID-A11029-SECURE",
    request_id: "REQ-90120",
  },
  {
    id: "tx-6",
    created_at: "2026-11-03T16:00:00.000Z",
    item_name: "Herman Miller Embody Ergonomic Chair",
    merchant: "DesignWithinReach",
    amount_cents: 149500,
    decision: "BLOCK",
    rule_code: "TOTAL_BUDGET_EXCEEDED",
    reason: "Amount $1,495.00 exceeds the remaining total budget ($150.00). Order terminated.",
    request_id: "REQ-90119",
  },
];

export default function AccountScreen() {
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile");

  // Profile Form States
  const [fullName, setFullName] = useState("Aahana Kabdugale");
  const [displayName, setDisplayName] = useState("Aahana");
  const [email, setEmail] = useState("aahana.kabdugale@gmail.com");
  const [phone, setPhone] = useState("+1 (555) 234-5678");
  const [currency, setCurrency] = useState("USD");
  const [notifyOnPurchase, setNotifyOnPurchase] = useState(true);
  const [notifyOnEscalation, setNotifyOnEscalation] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addressBook, setAddressBook] = useState<AddressBook>(getSavedAddresses());
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // History States
  const [historyRecords, setHistoryRecords] = useState<TransactionRecord[]>(DEFAULT_HISTORY);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "APPROVE" | "NEEDS_APPROVAL" | "BLOCK">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TransactionRecord | null>(null);

  // Load saved profile data
  useEffect(() => {
    try {
      const saved = localStorage.getItem("beryl_user_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName && parsed.fullName !== "Aahana Sharma") {
          setFullName(parsed.fullName);
        } else {
          setFullName("Aahana Kabdugale");
        }
        if (parsed.name) setDisplayName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.currency && (parsed.currency === "USD" || parsed.currency === "INR")) {
          setCurrency(parsed.currency);
        } else {
          setCurrency("USD");
        }
        if (parsed.notifyOnPurchase !== undefined) setNotifyOnPurchase(parsed.notifyOnPurchase);
        if (parsed.notifyOnEscalation !== undefined) setNotifyOnEscalation(parsed.notifyOnEscalation);
        if (parsed.dailyDigest !== undefined) setDailyDigest(parsed.dailyDigest);
      }
    } catch {
      // fallback
    }

    async function fetchSupabaseUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
          if (user.email.includes("kabdugale")) {
            setFullName("Aahana Kabdugale");
          }
        }
      } catch {
        // ignore
      }
    }
    fetchSupabaseUser();
  }, []);

  // Fetch real audit logs to complement history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/audit");
      if (res.ok) {
        const data = await res.json();
        const records = data.records || data.logs || [];
        if (records.length > 0) {
          const formatted: TransactionRecord[] = records.map((r: any, idx: number) => ({
            id: r.id || `audit-${idx}`,
            created_at: r.created_at || new Date().toISOString(),
            item_name: r.item_name || r.item || "Autonomous Order",
            merchant: r.merchant || "Online Merchant",
            amount_cents: r.amount_cents || 0,
            decision: (r.decision as any) || "APPROVE",
            rule_code: r.rule_code || "WITHIN_BUDGET",
            reason: r.reason || "Processed under active mandate policy.",
            paypal_order_id: r.paypal_order_id,
            request_id: r.request_id,
          }));
          setHistoryRecords([...formatted, ...DEFAULT_HISTORY]);
        }
      }
    } catch {
      // Keep defaults
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle Save Profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const profileData = {
        fullName,
        name: displayName.trim() || fullName.split(" ")[0] || "Aahana",
        email,
        phone,
        currency,
        notifyOnPurchase,
        notifyOnEscalation,
        dailyDigest,
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem("beryl_user_profile", JSON.stringify(profileData));
      window.dispatchEvent(new Event("beryl_profile_updated"));

      toast.success("Account profile updated successfully!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    return historyRecords.filter((rec) => {
      const matchesFilter =
        historyFilter === "ALL" || rec.decision === historyFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.item_name.toLowerCase().includes(q) ||
        rec.merchant.toLowerCase().includes(q) ||
        rec.rule_code.toLowerCase().includes(q) ||
        (rec.paypal_order_id && rec.paypal_order_id.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [historyRecords, historyFilter, searchQuery]);

  // Export CSV
  const exportHistoryCsv = () => {
    const headers = ["Date", "Item", "Merchant", "Amount (USD)", "Decision", "Rule Code", "PayPal Order ID", "Reason"];
    const rows = filteredHistory.map((r) => [
      new Date(r.created_at).toLocaleString(),
      `"${r.item_name.replace(/"/g, '""')}"`,
      `"${r.merchant.replace(/"/g, '""')}"`,
      (r.amount_cents / 100).toFixed(2),
      r.decision,
      r.rule_code,
      r.paypal_order_id || "N/A",
      `"${(r.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `beryl_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("History exported to CSV");
  };

  return (
    <ConsumerShell
      activePath="/dashboard/account"
      maxWidth="max-w-[1100px]"
      title="Account & Profile"
      description="Manage your profile information, spending preferences, and view your complete activity history."
    >
      <div className="space-y-6">
        {/* User Quick Header Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--approvals-card)] border border-[var(--approvals-line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-heading font-bold text-2xl flex items-center justify-center border border-[var(--approvals-accent)]/20 shadow-xs">
              {displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-bold text-[var(--approvals-ink)]">
                  {fullName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Consumer · Air-Gap Active
                </span>
              </div>
              <p className="text-[13px] text-[var(--approvals-mute)] mt-0.5">
                {email} · PayPal Sandbox Linked
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <div className="px-3.5 py-2 rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-right">
              <span className="text-[11px] uppercase tracking-wider text-[var(--approvals-mute)] block font-medium">
                Autonomous Security
              </span>
              <span className="text-[13px] font-semibold text-emerald-600 dark:text-[#3EE0A8] flex items-center gap-1 justify-end">
                <ShieldCheck className="h-3.5 w-3.5" />
                Air-Gapped
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[var(--approvals-line)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-semibold shadow-xs"
                : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)]"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Update Profile Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-semibold shadow-xs"
                : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)]"
            }`}
          >
            <History className="h-4 w-4" />
            <span>See History</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-[var(--approvals-ink)]">
              {historyRecords.length}
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: UPDATE DATA (PROFILE & PREFERENCES)                      */}
        {/* ============================================================== */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--approvals-card)] border border-[var(--approvals-line)] space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--approvals-line)] pb-3">
                  <User className="h-4 w-4 text-[var(--approvals-accent)]" />
                  <h3 className="font-semibold text-[16px] text-[var(--approvals-ink)]">
                    Personal Information
                  </h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[12.5px] font-medium text-[var(--approvals-mute)] mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-[14px] rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-[var(--approvals-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                      placeholder="e.g. Aahana Kabdugale"
                    />
                  </div>

                  <div>
                    <label className="block text-[12.5px] font-medium text-[var(--approvals-mute)] mb-1">
                      Display / Sidebar Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-[14px] rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-[var(--approvals-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                      placeholder="e.g. Aahana"
                    />
                  </div>

                  <div>
                    <label className="block text-[12.5px] font-medium text-[var(--approvals-mute)] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[var(--approvals-mute)]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-[14px] rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-[var(--approvals-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                        placeholder="aahana.kabdugale@gmail.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12.5px] font-medium text-[var(--approvals-mute)] mb-1">
                      Phone Number (for SMS Escalations)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 h-4 w-4 text-[var(--approvals-mute)]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-[14px] rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-[var(--approvals-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Delivery Addresses (Home & Office) */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--approvals-card)] border border-[var(--approvals-line)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--approvals-line)] pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--approvals-brand)]" />
                    <h3 className="font-semibold text-[16px] text-[var(--approvals-ink)]">
                      Saved Delivery Addresses
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="text-xs font-semibold text-[var(--approvals-brand)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Manage / Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Home Card */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    addressBook.defaultDestination === "home"
                      ? "border-[var(--approvals-brand)] bg-[var(--approvals-brand)]/5"
                      : "border-[var(--approvals-line)] bg-[var(--approvals-page)]"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-sm text-[var(--approvals-ink)]">
                        <Home className="h-4 w-4 text-[#0B7A5A]" />
                        <span>Home</span>
                      </div>
                      {addressBook.defaultDestination === "home" && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--approvals-brand)]/15 text-[var(--approvals-brand)] font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--approvals-mute)] leading-relaxed">
                      <strong className="text-[var(--approvals-ink)] font-medium">{addressBook.home.recipient}</strong><br />
                      {formatAddressLines(addressBook.home).line1}<br />
                      {formatAddressLines(addressBook.home).line2}
                    </div>
                  </div>

                  {/* Office Card */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    addressBook.defaultDestination === "office"
                      ? "border-[var(--approvals-brand)] bg-[var(--approvals-brand)]/5"
                      : "border-[var(--approvals-line)] bg-[var(--approvals-page)]"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-sm text-[var(--approvals-ink)]">
                        <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Office</span>
                      </div>
                      {addressBook.defaultDestination === "office" && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--approvals-brand)]/15 text-[var(--approvals-brand)] font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--approvals-mute)] leading-relaxed">
                      <strong className="text-[var(--approvals-ink)] font-medium">{addressBook.office.recipient}</strong><br />
                      {formatAddressLines(addressBook.office).line1}<br />
                      {formatAddressLines(addressBook.office).line2}
                    </div>
                  </div>
                </div>

                <p className="text-[11.5px] text-[var(--approvals-mute)] pt-1">
                  💡 When chatting with BERYL Shopper, prompt with <code className="px-1.5 py-0.5 rounded bg-[var(--approvals-page)] border border-[var(--approvals-line)] font-mono text-[11px] text-[var(--approvals-ink)]">&quot;send to home&quot;</code> or <code className="px-1.5 py-0.5 rounded bg-[var(--approvals-page)] border border-[var(--approvals-line)] font-mono text-[11px] text-[var(--approvals-ink)]">&quot;send to office&quot;</code> to automatically route your order.
                </p>
              </div>

              {/* PayPal Sandbox & Autonomous Air-gap Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--approvals-card)] border border-[var(--approvals-line)] space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--approvals-line)] pb-3">
                  <CreditCard className="h-4 w-4 text-[var(--approvals-accent)]" />
                  <h3 className="font-semibold text-[16px] text-[var(--approvals-ink)]">
                    PayPal Sandbox Integration
                  </h3>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[12.5px] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>PayPal Sandbox Air-Gap Enforced</span>
                  </div>
                  <p className="text-[12px] opacity-90">
                    Your autonomous shopping agent never accesses PayPal secret keys directly. Payments only execute via verified Mandate guard evaluations.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[12.5px] font-medium text-[var(--approvals-mute)] mb-1">
                      Linked Sandbox Buyer Account
                    </label>
                    <input
                      type="text"
                      disabled
                      value="sb-buyer@business.example.com"
                      className="w-full px-3.5 py-2.5 text-[14px] rounded-xl bg-[var(--approvals-page)]/50 border border-[var(--approvals-line)] text-[var(--approvals-mute)] cursor-not-allowed font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[12.5px] font-medium text-[var(--approvals-mute)] mb-1">
                      Default Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-[14px] rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-[var(--approvals-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)] cursor-pointer"
                    >
                      <option value="USD">Dollar ($ USD)</option>
                      <option value="INR">Rupee (₹ INR)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification & Guard Toggles */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--approvals-card)] border border-[var(--approvals-line)] space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--approvals-line)] pb-3">
                <Bell className="h-4 w-4 text-[var(--approvals-accent)]" />
                <h3 className="font-semibold text-[16px] text-[var(--approvals-ink)]">
                  Safety Alerts & Notification Preferences
                </h3>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] cursor-pointer hover:bg-[var(--approvals-card)] transition-colors">
                  <div>
                    <span className="text-[13.5px] font-medium text-[var(--approvals-ink)] block">
                      Notify immediately upon PayPal checkout
                    </span>
                    <span className="text-[12px] text-[var(--approvals-mute)] block">
                      Receive an email receipt each time the agent auto-executes a payment within your mandate budget.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnPurchase}
                    onChange={(e) => setNotifyOnPurchase(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] cursor-pointer hover:bg-[var(--approvals-card)] transition-colors">
                  <div>
                    <span className="text-[13.5px] font-medium text-[var(--approvals-ink)] block">
                      High-Priority alerts for pending sign-offs
                    </span>
                    <span className="text-[12px] text-[var(--approvals-mute)] block">
                      Send urgent notifications when an order crosses your approval threshold ($50.00) or needs human sign-off.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnEscalation}
                    onChange={(e) => setNotifyOnEscalation(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] cursor-pointer hover:bg-[var(--approvals-card)] transition-colors">
                  <div>
                    <span className="text-[13.5px] font-medium text-[var(--approvals-ink)] block">
                      Daily autonomous spending digest
                    </span>
                    <span className="text-[12px] text-[var(--approvals-mute)] block">
                      A daily breakdown of blocked prompt attacks, catalog browsing, and remaining mandate budget.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                  />
                </label>
              </div>
            </div>

            {/* Save Button Row */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--approvals-accent)] text-white hover:opacity-90 font-medium text-[14px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SEE HISTORY (TRANSACTIONS & AUDIT TRAIL)                */}
        {/* ============================================================== */}
        {activeTab === "history" && (
          <div className="space-y-5">
            {/* History Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[var(--approvals-card)] border border-[var(--approvals-line)]">
                <span className="text-[11px] font-medium uppercase text-[var(--approvals-mute)] block">
                  Total Orders
                </span>
                <span className="text-[20px] font-bold text-[var(--approvals-ink)] mt-0.5 block">
                  {historyRecords.length}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[var(--approvals-card)] border border-[var(--approvals-line)]">
                <span className="text-[11px] font-medium uppercase text-[var(--approvals-mute)] block">
                  Auto-Approved
                </span>
                <span className="text-[20px] font-bold text-emerald-600 dark:text-[#3EE0A8] mt-0.5 block">
                  {historyRecords.filter((r) => r.decision === "APPROVE").length}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[var(--approvals-card)] border border-[var(--approvals-line)]">
                <span className="text-[11px] font-medium uppercase text-[var(--approvals-mute)] block">
                  Pending Sign-off
                </span>
                <span className="text-[20px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                  {historyRecords.filter((r) => r.decision === "NEEDS_APPROVAL").length}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[var(--approvals-card)] border border-[var(--approvals-line)]">
                <span className="text-[11px] font-medium uppercase text-[var(--approvals-mute)] block">
                  Attacks Prevented
                </span>
                <span className="text-[20px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                  {historyRecords.filter((r) => r.decision === "BLOCK").length}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-[var(--approvals-card)] border border-[var(--approvals-line)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[var(--approvals-mute)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by item, merchant, or rule code..."
                  className="w-full pl-9 pr-3.5 py-2 text-[13.5px] rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] text-[var(--approvals-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--approvals-brand)]"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["ALL", "APPROVE", "NEEDS_APPROVAL", "BLOCK"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setHistoryFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                      historyFilter === filter
                        ? "bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-semibold"
                        : "text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)]"
                    }`}
                  >
                    {filter === "ALL"
                      ? "All"
                      : filter === "APPROVE"
                      ? "Approved"
                      : filter === "NEEDS_APPROVAL"
                      ? "Escalations"
                      : "Blocked"}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  className="p-2 rounded-lg border border-[var(--approvals-line)] text-[var(--approvals-mute)] hover:text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors cursor-pointer ml-1"
                  title="Refresh history"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={exportHistoryCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--approvals-line)] text-[12px] font-medium text-[var(--approvals-ink)] hover:bg-[var(--approvals-page)] transition-colors cursor-pointer"
                  title="Export to CSV"
                >
                  <Download className="h-3.5 w-3.5 text-[var(--approvals-mute)]" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* History Table / Records */}
            <div className="rounded-2xl bg-[var(--approvals-card)] border border-[var(--approvals-line)] overflow-hidden">
              <div className="divide-y divide-[var(--approvals-line)]">
                {filteredHistory.length === 0 ? (
                  <div className="p-8 text-center text-[var(--approvals-mute)] text-[14px]">
                    No transactions match your search criteria.
                  </div>
                ) : (
                  filteredHistory.map((rec) => {
                    const isApprove = rec.decision === "APPROVE";
                    const isNeedsApproval = rec.decision === "NEEDS_APPROVAL";
                    const isBlock = rec.decision === "BLOCK";

                    return (
                      <div
                        key={rec.id}
                        onClick={() => setSelectedRecord(rec)}
                        className="p-4 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[var(--approvals-page)]/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Status Icon */}
                          <div className="pt-0.5 shrink-0">
                            {isApprove && (
                              <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            )}
                            {isNeedsApproval && (
                              <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <Clock className="h-4 w-4" />
                              </div>
                            )}
                            {isBlock && (
                              <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                <ShieldAlert className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[14.5px] text-[var(--approvals-ink)] truncate">
                                {rec.item_name}
                              </span>
                              <span className="text-[12px] text-[var(--approvals-mute)]">
                                · {rec.merchant}
                              </span>
                            </div>

                            <p className="text-[12px] text-[var(--approvals-mute)] mt-0.5 line-clamp-1">
                              {rec.reason}
                            </p>

                            <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--approvals-mute)]">
                              <span suppressHydrationWarning>{new Date(rec.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              <span className="font-mono">{rec.rule_code}</span>
                              {rec.paypal_order_id && (
                                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                                  {rec.paypal_order_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Status Badge */}
                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                          <span className="font-heading font-bold text-[16px] text-[var(--approvals-ink)]">
                            ${(rec.amount_cents / 100).toFixed(2)}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              isApprove
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : isNeedsApproval
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {rec.decision}
                          </span>

                          <ChevronRight className="h-4 w-4 text-[var(--approvals-mute)] group-hover:text-[var(--approvals-ink)] transition-colors" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--approvals-card)] border border-[var(--approvals-line)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      selectedRecord.decision === "APPROVE"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : selectedRecord.decision === "NEEDS_APPROVAL"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {selectedRecord.decision}
                  </span>
                  <h3 className="text-[18px] font-bold text-[var(--approvals-ink)]">
                    {selectedRecord.item_name}
                  </h3>
                  <p className="text-[13px] text-[var(--approvals-mute)]">
                    Merchant: {selectedRecord.merchant}
                  </p>
                </div>

                <span className="font-heading font-bold text-[22px] text-[var(--approvals-ink)]">
                  ${(selectedRecord.amount_cents / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--approvals-page)] border border-[var(--approvals-line)] space-y-2 text-[13px]">
                <div>
                  <span className="text-[11px] font-medium text-[var(--approvals-mute)] block">
                    Policy Engine Verdict & Reason
                  </span>
                  <p className="font-medium text-[var(--approvals-ink)] mt-0.5">
                    {selectedRecord.reason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--approvals-line)] text-[12px]">
                  <div>
                    <span className="text-[10px] text-[var(--approvals-mute)] uppercase block">
                      Rule Code
                    </span>
                    <span className="font-mono font-medium text-[var(--approvals-ink)]">
                      {selectedRecord.rule_code}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--approvals-mute)] uppercase block">
                      Date & Time
                    </span>
                    <span suppressHydrationWarning className="text-[var(--approvals-ink)]">
                      {new Date(selectedRecord.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedRecord.paypal_order_id && (
                  <div className="pt-2 border-t border-[var(--approvals-line)] text-[12px]">
                    <span className="text-[10px] text-[var(--approvals-mute)] uppercase block">
                      PayPal Sandbox Order ID
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {selectedRecord.paypal_order_id}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--approvals-soft)] text-[var(--approvals-accent)] font-medium text-[13px] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Address Modal */}
        <AddressModal
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
          onSaved={(updated) => setAddressBook(updated)}
        />
      </div>
    </ConsumerShell>
  );
}
