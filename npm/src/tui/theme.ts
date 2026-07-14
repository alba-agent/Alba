/**
 * ALBA colour theme — maps semantic names to chalk/ANSI colours.
 * Exported as a ThemeContext-compatible object so it can be passed into
 * extension command handlers via ctx.ui.theme.
 */

import chalk from "chalk";
import type { ThemeContext } from "../api/ExtensionAPI.js";

export const ALBA_COLORS = {
  accent:  "#00e5ff",   // cyan-aqua — alba signature
  success: "#69ff94",   // soft green
  error:   "#ff5370",   // coral red
  warn:    "#ffcb6b",   // amber
  muted:   "#546e7a",   // slate grey
  header:  "#c792ea",   // soft purple
  dim:     "#37474f",   // dark slate
} as const;

export type AlbaColor = keyof typeof ALBA_COLORS;

export function makeTheme(): ThemeContext {
  return {
    fg(color: string, text: string): string {
      const hex = ALBA_COLORS[color as AlbaColor] ?? color;
      try {
        return chalk.hex(hex)(text);
      } catch {
        return text;
      }
    },
  };
}

/** Convenience — themed prefix for agent output lines */
export const theme = makeTheme();

export const T = {
  accent:  (s: string) => chalk.hex(ALBA_COLORS.accent)(s),
  success: (s: string) => chalk.hex(ALBA_COLORS.success)(s),
  error:   (s: string) => chalk.hex(ALBA_COLORS.error)(s),
  warn:    (s: string) => chalk.hex(ALBA_COLORS.warn)(s),
  muted:   (s: string) => chalk.hex(ALBA_COLORS.muted)(s),
  header:  (s: string) => chalk.hex(ALBA_COLORS.header)(s),
  dim:     (s: string) => chalk.hex(ALBA_COLORS.dim)(s),
  bold:    (s: string) => chalk.bold(s),
};
