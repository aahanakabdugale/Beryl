"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`h-8 w-20 ${className}`} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={`inline-flex items-center p-0.5 rounded-md bg-[#E4ECE7] dark:bg-[#060D0A] border border-[#CCD8D1] dark:border-[#162B21] text-[10px] font-mono font-bold tracking-wider uppercase ${className}`}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          !isDark
            ? "bg-white text-[#0B1914] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-extrabold"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
        }`}
        aria-pressed={!isDark}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
          isDark
            ? "bg-[#0F221A] text-[#3EE0A8] border border-[#1E3F31] shadow-[0_1px_2px_rgba(0,0,0,0.2)] font-extrabold"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
        }`}
        aria-pressed={isDark}
      >
        Dark
      </button>
    </div>
  );
}

export default ThemeToggle;
