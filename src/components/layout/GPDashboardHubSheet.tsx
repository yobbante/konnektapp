import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Clock, Calendar, DollarSign, User, History,
  ChevronRight, Settings, LogOut, Home, Bell, HelpCircle,
  Truck, Star, FileText, Eye, Wallet
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface GPDashboardHubSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  pendingCount?: number;
  activeOrdersCount?: number;
  gpProfile?: {
    business_name: string;
    gp_type: string;
    status: string;
  };
}

/**
 * GP Dashboard Hub - Menu central dynamique pour transporteurs
 * Consolide tous les onglets du dashboard avec redirections intelligentes
 */
export function GPDashboardHubSheet({
  children,
  open,
  onOpenChange,
  pendingCount = 0,
  activeOrdersCount = 0,
  gpProfile,
}: GPDashboardHubSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onOpenChange?.(false);
    navigate("/");
  };

  const handleNavigation = (path: string) => {
    onOpenChange?.(false);
    navigate(path);
  };

  // Check which section is active
  const isActive = (path: string) => location.pathname === path;

  // Dashboard operational sections
  const dashboardSections = [
    {
      title: "Opérations",
      items: [
        { 
          icon: Package, 
          label: "Nouvelles demandes", 
          path: "/gp/demandes",
          badge: pendingCount > 0 ? pendingCount : undefined,
          description: "Réservations à traiter"
        },
        { 
          icon: Clock, 
          label: "En cours", 
          path: "/gp/en-cours",
          badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
          description: "Missions actives"
        },
        { 
          icon: History, 
          label: "Historique", 
          path: "/gp/historique",
          description: "Livraisons terminées"
        },
      ]
    },
    {
      title: "Planification",
      items: [
        { 
          icon: Calendar, 
          label: "Calendrier / Départs", 
          path: "/gp/calendrier",
          description: "Gérer vos voyages"
        },
        { 
          icon: DollarSign, 
          label: "Tarification", 
          path: "/gp/tarification",
          description: "Prix et forfaits"
        },
        { 
          icon: Wallet, 
          label: "Wallet", 
          path: "/gp/wallet",
          description: "Solde et retraits"
        },
      ]
    },
    {
      title: "Profil & Visibilité",
      items: [
        { 
          icon: Eye, 
          label: "Aperçu profil public", 
          path: "/gp/profil-public",
          description: "Vue client"
        },
        { 
          icon: FileText, 
          label: "Demandes personnalisées", 
          path: "/gp/requests",
          description: "Devis sur mesure"
        },
      ]
    },
  ];

  // Secondary actions (settings, account)
  const secondaryItems = [
    { icon: Home, label: "Retour à l'accueil", path: "/" },
    { icon: Settings, label: "Paramètres", path: "/settings" },
    { icon: HelpCircle, label: "Aide & Support", path: "/settings" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl px-0"
      >
        <SheetHeader className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left">
                {gpProfile?.business_name || "Dashboard GP"}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {gpProfile?.gp_type === "bagages_international" ? "GP via Bagages" : 
                 gpProfile?.gp_type === "routier" ? "Transport Routier" : "Transporteur"}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-20 px-4 space-y-5">
          {dashboardSections.map((section, idx) => (
            <div key={idx}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item, itemIdx) => {
                  const active = isActive(item.path);
                  return (
                    <motion.button
                      key={itemIdx}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </motion.button>
                  );
                })}
              </div>
              {idx < dashboardSections.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}

          <Separator />

          {/* Secondary navigation */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Navigation
            </p>
            <div className="space-y-1">
              {secondaryItems.map((item, idx) => (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
