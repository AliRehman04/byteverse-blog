"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg bg-muted hover:bg-border transition-colors"
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {mounted ? (
        theme === "dark" ? <Sun size={18} /> : <Moon size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
}
