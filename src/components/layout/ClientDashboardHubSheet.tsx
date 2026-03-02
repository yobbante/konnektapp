import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package, Clock, Heart, User, History,
  ChevronRight, Settings, LogOut, Home, Bell, HelpCircle,
  Search, Gift, Star, Plus, FileText, Truck
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

interface ClientDashboardHubSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  ongoingCount?: number;
  userName?: string;
}

/**
 * Client Dashboard Hub - Menu central dynamique pour clients
 * Consolide toutes les sections du dashboard client
 */
export function ClientDashboardHubSheet({
  children,
  open,
  onOpenChange,
  ongoingCount = 0,
  userName,
}: ClientDashboardHubSheetProps) {
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

  // Main dashboard sections
  const dashboardSections = [
    {
      title: "Mes envois",
      items: [
        { 
          icon: Package, 
          label: "Envois en cours", 
          path: "/client/dashboard",
          badge: ongoingCount > 0 ? ongoingCount : undefined,
          description: "Suivre mes réservations"
        },
        { 
          icon: History, 
          label: "Historique", 
          path: "/client/dashboard",
          description: "Livraisons passées"
        },
        { 
          icon: FileText, 
          label: "Demande personnalisée", 
          path: "/demande-personnalisee",
          description: "Devis sur mesure"
        },
      ]
    },
    {
      title: "Actions rapides",
      items: [
        { 
          icon: Plus, 
          label: "Nouvel envoi", 
          path: "/demande",
          highlight: true,
          description: "Créer une réservation"
        },
        { 
          icon: Search, 
          label: "Voir les offres", 
          path: "/?offres=1",
          description: "Parcourir les transporteurs"
        },
      ]
    },
    {
      title: "Mon espace",
      items: [
        { 
          icon: Heart, 
          label: "Mes favoris", 
          path: "/favorites",
          description: "Offres sauvegardées"
        },
        { 
          icon: Star, 
          label: "Transporteurs favoris", 
          path: "/favorites/transporters",
          description: "GPs préférés"
        },
        { 
          icon: Gift, 
          label: "Programme fidélité", 
          path: "/loyalty",
          description: "Points & avantages"
        },
        { 
          icon: User, 
          label: "Mon profil", 
          path: "/client/profile",
          description: "Informations personnelles"
        },
      ]
    },
  ];

  // Secondary actions
  const secondaryItems = [
    { icon: Home, label: "Accueil", path: "/" },
    { icon: Bell, label: "Alertes", path: "/alerts" },
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
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left">
                {userName || "Mon Espace"}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                Dashboard Client
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
                  const highlight = 'highlight' in item && item.highlight;
                  return (
                    <motion.button
                      key={itemIdx}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        highlight
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : active
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        highlight || active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {'badge' in item && item.badge && (
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

          {/* Become transporter CTA */}
          <div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavigation("/gp/inscription")}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:from-primary/15 hover:to-secondary/15 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold text-foreground">Devenir transporteur</span>
                <p className="text-xs text-muted-foreground">Gagnez de l'argent en transportant</p>
              </div>
              <ChevronRight className="w-5 h-5 text-primary" />
            </motion.button>
          </div>

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
