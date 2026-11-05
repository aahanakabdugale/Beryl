"use client";

import React, { useState } from "react";
import { ShieldAlert, KeyRound, Eye, EyeOff, Lock, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useViewMode } from "./view-mode-context";

interface DeveloperGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeveloperGateModal({
  isOpen,
  onClose,
  onSuccess,
}: DeveloperGateModalProps) {
  const { setViewMode } = useViewMode();
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg("Please enter the developer access key.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/verify-dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: passcode.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Developer privileges unlocked. Welcome to Beryl Engine Lab.");
        setViewMode("developer");
        setPasscode("");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(data.error || "Access denied: Invalid developer passcode.");
      }
    } catch {
      setErrorMsg("Network error verifying developer key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0D1C17] border border-zinc-200 dark:border-[#1E3A31] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#152B23] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg leading-tight">
              Developer Lab Security Gate
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Restricted environment with raw policy engine tracing, AG Grid audit logs, and red-team attack simulators.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Developer Authorization Key
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter passcode (e.g. BERYL-DEV-2026)"
                autoFocus
                className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-[#07100D] border border-zinc-200 dark:border-[#1E3A31] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Demo Helper Hint */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-[#12241E] border border-emerald-500/20 text-xs text-emerald-800 dark:text-[#3EE0A8] flex items-center justify-between">
            <span className="text-[11px] font-mono">Demo Key: <strong className="select-all">BERYL-DEV-2026</strong></span>
            <button
              type="button"
              onClick={() => {
                setPasscode("BERYL-DEV-2026");
                setErrorMsg(null);
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              Fill Demo Key
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#152B23] transition-colors cursor-pointer"
            >
              Cancel (Stay in Consumer)
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0B7A5A] hover:bg-[#086147] dark:bg-[#0B7A5A] dark:hover:bg-[#14966F] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? "Verifying..." : "Unlock Developer Lab"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
