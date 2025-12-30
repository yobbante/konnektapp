import { useEffect } from "react";

type DashboardRole = "admin" | "partner" | "client";

interface DashboardTheme {
  role: DashboardRole;
  bgClass: string;
  accentClass: string;
  textClass: string;
  panelClass: string;
  headerBgClass: string;
  buttonClass: string;
}

const themes: Record<DashboardRole, DashboardTheme> = {
  admin: {
    role: "admin",
    bgClass: "bg-[hsl(240,75%,28%)]",
    accentClass: "bg-[hsl(24,85%,62%)]",
    textClass: "text-[hsl(0,0%,96%)]",
    panelClass: "bg-[hsl(210,100%,55%)]",
    headerBgClass: "bg-[hsl(240,75%,28%)]",
    buttonClass: "bg-[hsl(24,85%,62%)] hover:bg-[hsl(24,85%,55%)] text-white",
  },
  partner: {
    role: "partner",
    bgClass: "bg-[hsl(210,100%,55%)]",
    accentClass: "bg-[hsl(210,100%,55%)]",
    textClass: "text-[hsl(0,0%,96%)]",
    panelClass: "bg-[hsl(185,60%,88%)]",
    headerBgClass: "bg-[hsl(210,100%,55%)]",
    buttonClass: "bg-[hsl(210,100%,45%)] hover:bg-[hsl(210,100%,40%)] text-white",
  },
  client: {
    role: "client",
    bgClass: "bg-[hsl(185,60%,88%)]",
    accentClass: "bg-[hsl(210,100%,55%)]",
    textClass: "text-[hsl(240,75%,28%)]",
    panelClass: "bg-[hsl(0,0%,96%)]",
    headerBgClass: "bg-[hsl(185,60%,88%)]",
    buttonClass: "bg-[hsl(210,100%,55%)] hover:bg-[hsl(210,100%,45%)] text-white",
  },
};

export function useDashboardTheme(role: DashboardRole) {
  useEffect(() => {
    // Set the data attribute on root for CSS variable overrides
    document.documentElement.setAttribute("data-dashboard-role", role);
    
    return () => {
      document.documentElement.removeAttribute("data-dashboard-role");
    };
  }, [role]);

  return themes[role];
}

export function getDashboardTheme(role: DashboardRole): DashboardTheme {
  return themes[role];
}
