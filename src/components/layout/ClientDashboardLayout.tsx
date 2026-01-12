import { ReactNode } from "react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";

interface ClientDashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showNotifications?: boolean;
}

/**
 * Layout dédié au dashboard Client
 * - Header propre au client
 * - Navigation mobile client
 * - Aucun composant transporteur ou admin
 */
export function ClientDashboardLayout({
  children,
  title = "Mon Espace",
  showNotifications = true,
}: ClientDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader title={title} showNotifications={showNotifications} />
      <main className="flex-1">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
