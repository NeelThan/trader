"use client";

/**
 * ThemeToggle - Light/Dark mode toggle
 *
 * Self-contained component using next-themes.
 * Shows sun icon in dark mode, moon icon in light mode.
 */

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export type ThemeToggleProps = {
  /** Size variant */
  size?: "sm" | "default" | "icon";
  /** Additional class names */
  className?: string;
};

export function ThemeToggle({ size = "icon", className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={() => setTheme(nextTheme)}
      className={className}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
