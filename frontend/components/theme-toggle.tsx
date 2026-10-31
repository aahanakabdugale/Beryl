"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-8 w-24 rounded-full border border-black/10 dark:border-white/10 bg-transparent ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
        isDark
          ? "border-emerald-500/30 bg-[#0D1C17] text-[#3EE0A8] hover:bg-[#132620]"
          : "border-black/10 bg-white/80 text-zinc-700 hover:bg-zinc-100 shadow-xs"
      } ${className}`}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-[#3EE0A8]" />
          <span>Light mode</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-zinc-600" />
          <span>Dark mode</span>
        </>
      )}
    </button>
  );
}
