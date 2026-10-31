"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BerylLogo } from "@/components/beryl-gem";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { Sparkles, Shield, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back to BERYL!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Check your email or try Demo login.");
      }
    } catch {
      toast.error("Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = async () => {
    setDemoLoading(true);
    try {
      // Sign in as demo user or create demo session
      const { error } = await supabase.auth.signInWithPassword({
        email: "demo@beryl.dev",
        password: "demo-password-123",
      });

      if (error) {
        // If not registered yet, try anonymous/mock entry
        document.cookie = "beryl_demo_mode=true; path=/; max-age=86400";
        toast.success("Entering Sandbox Demo Mode");
        router.push("/dashboard");
      } else {
        toast.success("Logged in as Demo User!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F7F5] dark:bg-[#07100D] flex flex-col justify-between p-4 sm:p-8 bg-grid-faint">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/">
          <BerylLogo size={28} />
        </Link>
        <ThemeToggle />
      </div>

      {/* Center Auth Card */}
      <div className="max-w-md w-full mx-auto my-auto py-12">
        <Card className="bg-white/95 dark:bg-[#0D1C17] border-zinc-200/80 dark:border-[#1A332B] shadow-xl">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto mb-2">
              <span className="inline-flex p-2.5 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/60 text-[#0B7A5A] dark:text-[#3EE0A8]">
                <Shield className="h-6 w-6" />
              </span>
            </div>
            <CardTitle className="font-heading text-2xl font-bold tracking-tight">
              Access BERYL Guard
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Deterministic policy guardrails for autonomous finance
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Quick Demo Access Button */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-[#122720] border border-emerald-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#0B7A5A] dark:text-[#3EE0A8]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Hackathon Reviewer / Judge
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                Skip registration and jump straight into the live interactive shopping sandbox.
              </p>
              <Button
                onClick={handleInstantDemoLogin}
                disabled={demoLoading}
                className="w-full bg-[#0B7A5A] hover:bg-[#086147] dark:bg-[#0B7A5A] dark:hover:bg-[#14966F] text-white font-semibold text-xs h-9 rounded-lg cursor-pointer"
              >
                {demoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Enter Live Demo</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-400 font-mono">
                or account credentials
              </span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-100 dark:bg-[#132720]">
                <TabsTrigger value="signin" className="text-xs font-medium">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-xs font-medium">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3 pt-3">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="text-xs h-9"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-50 dark:text-zinc-900 font-medium text-xs h-9 mt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In with Email"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 pt-3">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="text-xs h-9"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-50 dark:text-zinc-900 font-medium text-xs h-9 mt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="justify-center border-t border-zinc-100 dark:border-[#162E25] pt-4">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
              ← Return to Home
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-zinc-400 py-4">
        Protected by BERYL Policy Guard & PayPal Sandbox
      </div>
    </div>
  );
}
