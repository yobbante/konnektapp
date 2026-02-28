import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export type RoleTheme = "client" | "transporter" | "routier" | "admin" | null;

/**
 * Hook to apply role-based theme classes automatically based on current route
 * Routier gets its own green theme, distinct from GP transporter blue
 */
export function useRoleTheme(): RoleTheme {
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const path = location.pathname;
    
    // Remove existing role theme classes
    root.classList.remove("theme-admin", "theme-transporter", "theme-client", "theme-routier");
    
    // Apply role-based theme class
    if (path.startsWith("/admin")) {
      root.classList.add("theme-admin");
    } else if (path.startsWith("/routier")) {
      root.classList.add("theme-routier");
    } else if (path.startsWith("/gp") || path.startsWith("/transporter")) {
      root.classList.add("theme-transporter");
    } else {
      root.classList.add("theme-client");
    }
  }, [location.pathname]);

  const path = location.pathname;
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/routier")) return "routier";
  if (path.startsWith("/gp") || path.startsWith("/transporter")) return "transporter";
  return "client";
}
