"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { BerylLogo } from "@/components/beryl-logo";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Field validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const supabase = createClient();

  const validateEmail = (val: string) => {
    if (!val.trim()) return "Email address is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) return "Please enter a valid email address";
    return null;
  };

  const validatePassword = (val: string) => {
    if (!val) return "Password is required";
    if (authMode === "signup" && val.length < 6) {
      return "Password must be at least 6 characters";
    }
    return null;
  };

  const emailError = emailTouched ? validateEmail(email) : null;
  const passwordError = passwordTouched ? validatePassword(password) : null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    setFormError(null);

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setFormError(error.message);
        toast.error(error.message);
      } else {
        toast.success("Welcome back to BERYL!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      const msg = "Failed to sign in. Please try again.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    setFormError(null);

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setFormError(error.message);
        toast.error(error.message);
      } else {
        toast.success("Account created! Check your email or use Instant Demo.");
      }
    } catch {
      const msg = "Failed to sign up. Please try again.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setEmailTouched(true);
    setFormError(null);
    const emailErr = validateEmail(email);
    if (emailErr) {
      toast.error("Please enter your email address first so we can send the reset link.");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      });
      if (error) {
        setFormError(error.message);
        toast.error(error.message);
      } else {
        setResetSent(true);
        toast.success(`Password reset link sent to ${email}`);
      }
    } catch {
      const msg = "Failed to send reset instructions. Please try again.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const toggleAuthMode = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setFormError(null);
    setEmailTouched(false);
    setPasswordTouched(false);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden selection:bg-[#3ddc9f]/30">
      {/* Main Split Layout: Left (Light Form) & Right (Dark Showcase) */}
      <main className="h-full min-h-screen lg:min-h-0 grid grid-cols-1 lg:grid-cols-2">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Light surface with 48px grid                */}
        {/* ========================================================= */}
        <section className="relative flex flex-col justify-between p-6 sm:p-8 lg:px-12 lg:py-8 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#f3f8f5] bg-grid-auth-light text-[#0d2018] h-full border-r border-[#0B7A5A]/10">
          {/* Top Bar inside Left Column */}
          <div className="flex items-center justify-between w-full">
            {/* Logo Lockup: Vault gem icon + BERYL wordmark */}
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] rounded-lg p-1 -m-1"
            >
              <BerylLogo size={32} />
              <span className="font-space text-xl font-bold tracking-[-0.02em] text-[#0d2018] group-hover:opacity-90 transition-opacity">
                BERYL
              </span>
            </Link>

            {/* Mobile-only "Return to website" (on desktop it is shifted to the dark side) */}
            <div className="lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4b6358] hover:text-[#0b7a5a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] rounded-md px-2 py-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Return to website</span>
              </Link>
            </div>
          </div>

          {/* Form Block: Centered vertically, max-width 400px */}
          <div className="w-full max-w-[400px] mx-auto my-auto py-4 sm:py-6">
            {/* Heading & Sub-line */}
            <div className="space-y-2">
              <h1 className="font-space text-[34px] sm:text-[38px] font-bold tracking-[-0.02em] leading-tight text-[#0d2018]">
                {authMode === "signin" ? "Sign in" : "Create account"}
              </h1>
              <p className="text-sm font-sans text-[#4b6358]">
                {authMode === "signin" ? (
                  <>
                    New user?{" "}
                    <button
                      type="button"
                      onClick={() => toggleAuthMode("signup")}
                      className="text-[#0b7a5a] font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] rounded-xs"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => toggleAuthMode("signin")}
                      className="text-[#0b7a5a] font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] rounded-xs"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Segmented Switch (Tabs-style toggle) */}
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="grid grid-cols-2 p-1 rounded-xl bg-[#eef4f0] border border-[#cfdcd4] my-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signin"}
                onClick={() => toggleAuthMode("signin")}
                className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] cursor-pointer ${
                  authMode === "signin"
                    ? "bg-white text-[#0d2018] shadow-xs font-semibold"
                    : "text-[#4b6358] hover:text-[#0d2018]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signup"}
                onClick={() => toggleAuthMode("signup")}
                className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] cursor-pointer ${
                  authMode === "signup"
                    ? "bg-white text-[#0d2018] shadow-xs font-semibold"
                    : "text-[#4b6358] hover:text-[#0d2018]"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Password Reset Confirmation Banner */}
            {resetSent && (
              <div
                role="status"
                className="p-3.5 mb-5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-[#0b7a5a]"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Password reset link sent to <strong>{email}</strong>. Please check your inbox or spam folder.
                </span>
              </div>
            )}

            {/* Form-level Error Banner */}
            {formError && (
              <div
                role="alert"
                className="p-3.5 mb-5 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-[#b3202f]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form with Animated Tab Swap */}
            <form onSubmit={authMode === "signin" ? handleSignIn : handleSignUp} noValidate>
              <AnimatePresence mode="wait">
                <motion.div
                  key={authMode}
                  initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#4b6358]"
                    >
                      Email address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailTouched) setFormError(null);
                      }}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "email-error" : undefined}
                      className={`h-12 w-full rounded-[12px] bg-[#eef4f0] border text-[#0d2018] px-4 text-sm font-sans placeholder:text-[#4b6358]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] transition-all ${
                        emailError
                          ? "border-[#b3202f]"
                          : "border-[#cfdcd4]"
                      }`}
                    />
                    {emailError && (
                      <p
                        id="email-error"
                        role="alert"
                        className="text-xs text-[#b3202f] font-medium"
                      >
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="auth-password"
                        className="block text-xs font-semibold uppercase tracking-wider text-[#4b6358]"
                      >
                        Password
                      </label>
                      {authMode === "signin" && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={resetLoading}
                          className="text-xs font-medium text-[#0b7a5a] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] rounded-xs disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          {resetLoading && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                          <span>Forgot password?</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordTouched) setFormError(null);
                        }}
                        onBlur={() => setPasswordTouched(true)}
                        placeholder={authMode === "signin" ? "Your password" : "At least 6 characters"}
                        autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                        required
                        aria-invalid={Boolean(passwordError)}
                        aria-describedby={passwordError ? "password-error" : undefined}
                        className={`pr-12 h-12 w-full rounded-[12px] bg-[#eef4f0] border text-[#0d2018] px-4 text-sm font-sans placeholder:text-[#4b6358]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] transition-all ${
                          passwordError
                            ? "border-[#b3202f]"
                            : "border-[#cfdcd4]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-1 top-1 bottom-1 w-11 flex items-center justify-center text-[#4b6358] hover:text-[#0b7a5a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] rounded-lg cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p
                        id="password-error"
                        role="alert"
                        className="text-xs text-[#b3202f] font-medium"
                      >
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Primary Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-full bg-[#0b7a5a] hover:bg-[#0d8c67] hover:-translate-y-[1px] active:translate-y-0 text-white font-sans font-semibold text-[15px] shadow-[0_4px_14px_rgba(11,122,90,0.35)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <span>{authMode === "signin" ? "Sign in" : "Create Account"}</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </form>
          </div>

          {/* Left Footer Content: Directly within the light UI canvas (no separate white bar) */}
          <div className="w-full pt-4 text-xs text-[#4b6358] select-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>Copyright © 2026 BERYL. All rights reserved.</div>
            {/* Mobile-only secondary links when right column is hidden */}
            <div className="flex items-center gap-2 lg:hidden text-xs">
              <Link href="/" className="hover:text-[#0b7a5a]">Terms of Use</Link>
              <span>·</span>
              <Link href="/" className="hover:text-[#0b7a5a]">Privacy Policy</Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Dark Decorative Showcase (Hidden < 1024px) */}
        {/* ========================================================= */}
        <section className="hidden lg:flex relative flex-col justify-between p-8 lg:p-12 overflow-hidden bg-[#04130e] bg-grid-auth-dark text-[#eaf7f0] select-none h-full border-l border-[#0B7A5A]/20">
          {/* Seamless Edge Transition Glow between Light and Dark */}
          <div
            className="absolute inset-y-0 left-0 w-14 pointer-events-none bg-gradient-to-r from-emerald-500/10 via-emerald-500/3 to-transparent z-10"
            aria-hidden="true"
          />

          {/* Radial Emerald Glow Aura behind Gem */}
          <div
            className="absolute pointer-events-none rounded-full blur-3xl opacity-80 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "360px",
              height: "360px",
              background: "radial-gradient(circle, rgba(61,220,159,0.18) 0%, rgba(61,220,159,0.04) 55%, transparent 75%)",
            }}
            aria-hidden="true"
          />

          {/* Top Bar of Right Column: "Return to website" shifted here */}
          <div className="relative z-10 w-full flex items-center justify-end">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#a9c4b8] hover:text-[#3ddc9f] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc9f] rounded-md px-2.5 py-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Return to website</span>
            </Link>
          </div>

          {/* Center Showcase */}
          <div className="relative z-10 my-auto flex flex-col items-center max-w-md w-full mx-auto space-y-7">
            {/* Floating Vault Gem Icon (96px, +-6px vertical float) */}
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: [-6, 6, -6],
                    }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
              className="drop-shadow-2xl"
            >
              <BerylLogo size={96} />
            </motion.div>

            {/* Mandate Glass Card (340px wide, 18px radius, 22px padding) */}
            <div className="w-[340px] max-w-full rounded-[18px] p-[22px] bg-[#0a1f18]/85 backdrop-blur-md border border-[#1f4034] shadow-2xl space-y-3">
              {/* Header Label */}
              <div className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#3ddc9f] uppercase">
                MANDATE
              </div>

              {/* Title */}
              <div className="font-space text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[#eaf7f0] leading-tight">
                Auto-approve up to $30
              </div>

              {/* 8px Animated Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[#12382b] overflow-hidden">
                <motion.div
                  className="h-full bg-[#3ddc9f] rounded-full"
                  initial={shouldReduceMotion ? { width: "62%" } : { width: "0%" }}
                  animate={{ width: "62%" }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
                />
              </div>

              {/* Caption */}
              <p className="text-[13px] text-[#a9c4b8] font-sans pt-1">
                Above the limit, BERYL asks you first.
              </p>
            </div>

            {/* Three Small Verdict Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider text-[#3ddc9f] bg-[#3ddc9f]/10 border border-[#3ddc9f]/40 uppercase">
                APPROVED
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider text-[#f5b73b] bg-[#f5b73b]/10 border border-[#f5b73b]/40 uppercase">
                ASK YOU FIRST
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider text-[#ff6b7a] bg-[#ff6b7a]/10 border border-[#ff6b7a]/40 uppercase">
                BLOCKED
              </span>
            </div>
          </div>

          {/* Right Footer Content: Directly within the dark UI canvas (matching reference pic) */}
          <div className="relative z-10 w-full pt-4 flex items-center justify-end text-xs text-[#a9c4b8] select-none">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="hover:text-[#3ddc9f] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3ddc9f] rounded-xs"
              >
                Terms of Use
              </Link>
              <span aria-hidden="true">·</span>
              <Link
                href="/"
                className="hover:text-[#3ddc9f] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3ddc9f] rounded-xs"
              >
                Privacy Policy
              </Link>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-[#3ddc9f]">
                PayPal Sandbox Verified
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
