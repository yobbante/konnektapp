import { useLocation } from "react-router-dom";

type PageTheme = "home" | "gp" | "client" | "admin" | "default";

interface ThemeConfig {
  logoColor: string;
  logoBackground: string;
  accentColor: string;
}

const themeConfigs: Record<PageTheme, ThemeConfig> = {
  home: {
    logoColor: "text-primary-foreground",
    logoBackground: "bg-primary", // Teal/vert
    accentColor: "primary",
  },
  gp: {
    logoColor: "text-white",
    logoBackground: "bg-secondary", // Orange
    accentColor: "secondary",
  },
  client: {
    logoColor: "text-white",
    logoBackground: "bg-primary", // Teal
    accentColor: "primary",
  },
  admin: {
    logoColor: "text-white",
    logoBackground: "bg-destructive", // Rouge
    accentColor: "destructive",
  },
  default: {
    logoColor: "text-primary-foreground",
    logoBackground: "bg-secondary", // Orange sur autres pages
    accentColor: "secondary",
  },
};

export function usePageTheme(): ThemeConfig {
  const location = useLocation();
  const pathname = location.pathname;

  let theme: PageTheme = "default";

  if (pathname === "/" || pathname === "") {
    theme = "home";
  } else if (pathname.startsWith("/gp")) {
    theme = "gp";
  } else if (pathname.startsWith("/client")) {
    theme = "client";
  } else if (pathname.startsWith("/admin")) {
    theme = "admin";
  }

  return themeConfigs[theme];
}
