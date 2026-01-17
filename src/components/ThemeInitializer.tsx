import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const THEME_STORAGE_KEY = "yobbante-theme-mode";

/**
 * Component that initializes and maintains the theme based on user preference and current route
 * Should be placed inside BrowserRouter
 */
export function ThemeInitializer() {
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY) || "system";
    const path = location.pathname;
    
    // Determine if dark mode should be applied
    const applyDark = () => {
      if (savedMode === "dark") return true;
      if (savedMode === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    // Apply dark mode
    if (applyDark()) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Remove existing role theme classes
    root.classList.remove("theme-admin", "theme-transporter", "theme-client");
    
    // Apply role-based theme class
    if (path.startsWith("/admin")) {
      root.classList.add("theme-admin");
    } else if (path.startsWith("/gp") || path.startsWith("/transporter")) {
      root.classList.add("theme-transporter");
    } else {
      root.classList.add("theme-client");
    }
  }, [location.pathname]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY) || "system";
    
    if (savedMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleChange = (e: MediaQueryListEvent) => {
        const root = document.documentElement;
        if (e.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  return null;
}
