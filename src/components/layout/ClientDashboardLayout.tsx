import { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ActiveReservationBanner } from "@/components/client/ActiveReservationBanner";

interface ClientDashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showNotifications?: boolean;
  showBack?: boolean;
}

/**
 * Layout dédié au dashboard Client
 * - Header propre au client (AppHeader unifié)
 * - Bande de notification pour réservations actives (RÈGLE NOTIF-01)
 * - Navigation mobile client
 * - Aucun composant transporteur ou admin
 */
export function ClientDashboardLayout({
  children,
  title = "Mon Espace",
  showNotifications = true,
  showBack = false,
}: ClientDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      {/* RÈGLE NOTIF-01: Bande persistante pour réservations acceptées */}
      <ActiveReservationBanner />
      
      <AppHeader title={title} showNotifications={showNotifications} showBack={showBack} />
      <main className="flex-1">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}

