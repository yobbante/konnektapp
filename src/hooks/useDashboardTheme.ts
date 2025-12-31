// Simplified dashboard theme - only header colors differ
type DashboardRole = "admin" | "partner" | "client";

interface DashboardHeaderTheme {
  role: DashboardRole;
  headerBgClass: string;
  headerTextClass: string;
}

const headerThemes: Record<DashboardRole, DashboardHeaderTheme> = {
  admin: {
    role: "admin",
    headerBgClass: "bg-[hsl(240,75%,28%)]",
    headerTextClass: "text-white",
  },
  partner: {
    role: "partner",
    headerBgClass: "bg-[hsl(210,100%,55%)]",
    headerTextClass: "text-white",
  },
  client: {
    role: "client",
    headerBgClass: "bg-[hsl(185,60%,88%)]",
    headerTextClass: "text-[hsl(240,75%,28%)]",
  },
};

export function useDashboardTheme(role: DashboardRole) {
  return headerThemes[role];
}

export function getDashboardTheme(role: DashboardRole): DashboardHeaderTheme {
  return headerThemes[role];
}
