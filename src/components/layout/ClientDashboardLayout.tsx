import { ReactNode } from "react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ActiveReservationBanner } from "@/components/client/ActiveReservationBanner";

interface ClientDashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showNotifications?: boolean;
}

/**
 * Layout dédié au dashboard Client
 * - Header propre au client
 * - Bande de notification pour réservations actives (RÈGLE NOTIF-01)
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
      {/* RÈGLE NOTIF-01: Bande persistante pour réservations acceptées */}
      <ActiveReservationBanner />
      
      <MobileHeader title={title} showNotifications={showNotifications} />
      <main className="flex-1">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
