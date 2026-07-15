import { useState, useEffect, useCallback } from "react";

export type ThemeName = "midnight" | "solarized" | "neon" | "ice" | "matrix";

export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  accent: string;
  success: string;
  error: string;
  warn: string;
  muted: string;
}

const THEME_PRESETS: Record<ThemeName, ThemeColors> = {
  midnight: {
    bg: "#0a0a0f",
    surface: "#12121a",
    border: "#1e1e2e",
    accent: "#00e5ff",
    success: "#69ff94",
    error: "#ff5370",
    warn: "#ffcb6b",
    muted: "#546e7a",
  },
  solarized: {
    bg: "#002b36",
    surface: "#073642",
    border: "#586e75",
    accent: "#268bd2",
    success: "#859900",
    error: "#dc322f",
    warn: "#b58900",
    muted: "#93a1a1",
  },
  neon: {
    bg: "#0a0a0a",
    surface: "#121212",
    border: "#00ff88",
    accent: "#00ff88",
    success: "#00ff88",
    error: "#ff006e",
    warn: "#ffea00",
    muted: "#5a5a5a",
  },
  ice: {
    bg: "#0c1420",
    surface: "#162440",
    border: "#2a3b5f",
    accent: "#00d4ff",
    success: "#4ade80",
    error: "#f87171",
    warn: "#fde047",
    muted: "#64748b",
  },
  matrix: {
    bg: "#000000",
    surface: "#001100",
    border: "#003300",
    accent: "#00ff00",
    success: "#00ff00",
    error: "#ff0000",
    warn: "#ffff00",
    muted: "#005500",
  },
};

// CSS variables for each theme
const THEME_VARS: Record<ThemeName, Record<string, string>> = {
  midnight: {
    "--color-alba-bg": "#0a0a0f",
    "--color-alba-surface": "#12121a",
    "--color-alba-border": "#1e1e2e",
    "--color-alba-accent": "#00e5ff",
  },
  solarized: {
    "--color-alba-bg": "#002b36",
    "--color-alba-surface": "#073642",
    "--color-alba-border": "#586e75",
    "--color-alba-accent": "#268bd2",
  },
  neon: {
    "--color-alba-bg": "#0a0a0a",
    "--color-alba-surface": "#121212",
    "--color-alba-border": "#00ff88",
    "--color-alba-accent": "#00ff88",
  },
  ice: {
    "--color-alba-bg": "#0c1420",
    "--color-alba-surface": "#162440",
    "--color-alba-border": "#2a3b5f",
    "--color-alba-accent": "#00d4ff",
  },
  matrix: {
    "--color-alba-bg": "#000000",
    "--color-alba-surface": "#001100",
    "--color-alba-border": "#003300",
    "--color-alba-accent": "#00ff00",
  },
};

const STORAGE_KEY = "alba-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    return stored ?? "midnight";
  });

  useEffect(() => {
    const vars = THEME_VARS[theme];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
  }, []);

  const nextTheme = useCallback(() => {
    const themes: ThemeName[] = ["midnight", "solarized", "neon", "ice", "matrix"];
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  }, [theme]);

  return {
    theme,
    colors: THEME_PRESETS[theme],
    setTheme,
    nextTheme,
    themes: Object.keys(THEME_PRESETS) as ThemeName[],
  };
}