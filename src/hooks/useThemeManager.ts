import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export type ThemeMode = "light" | "dark" | "system";
export type RoleTheme = "client" | "transporter" | "admin" | null;

interface ThemeManagerState {
  mode: ThemeMode;
  roleTheme: RoleTheme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = "yobbante-theme-mode";

export function useThemeManager(): ThemeManagerState {
  const location = useLocation();
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
      return stored || "system";
    }
    return "system";
  });

  const [isDark, setIsDark] = useState(false);
  const [roleTheme, setRoleTheme] = useState<RoleTheme>(null);

  // Determine role theme based on current route
  useEffect(() => {
    const path = location.pathname;
    
    if (path.startsWith("/admin")) {
      setRoleTheme("admin");
    } else if (path.startsWith("/gp") || path.startsWith("/transporter")) {
      setRoleTheme("transporter");
    } else {
      setRoleTheme("client");
    }
  }, [location.pathname]);

  // Apply theme mode
  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (dark: boolean) => {
      setIsDark(dark);
      
      if (dark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      
      // Apply role-specific theme class
      root.classList.remove("theme-admin", "theme-transporter", "theme-client");
      if (roleTheme) {
        root.classList.add(`theme-${roleTheme}`);
      }
    };

    if (mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      applyTheme(mode === "dark");
    }
  }, [mode, roleTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  return {
    mode,
    roleTheme,
    isDark,
    setMode,
  };
}
