import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Truck, Settings, Heart, Bell, Search, FileText,
  LogOut, HelpCircle, Shield, ChevronRight, Star, Home,
  Package, Gift, History, UserPlus
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
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";

interface CentralMenuSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Menu Central (Hub) - Le cerveau de la navigation secondaire
 * Contenu dynamique selon: connecté/non connecté, client/GP/admin
 */
export function CentralMenuSheet({ children, open, onOpenChange }: CentralMenuSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isGP, isAdmin, isModerator, loading, userId } = useUserRole();
  const [gpBusinessName, setGPBusinessName] = useState<string>("");

  useEffect(() => {
    if (isGP && userId) {
      fetchGPInfo();
    }
  }, [isGP, userId]);

  const fetchGPInfo = async () => {
    const { data } = await supabase
      .from("gp_profiles")
      .select("business_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setGPBusinessName(data.business_name);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onOpenChange?.(false);
    navigate("/");
  };

  const handleNavigation = (path: string) => {
    onOpenChange?.(false);
    navigate(path);
  };

  // Determine current context
  const isInGPMode = location.pathname.startsWith("/gp") || location.pathname.startsWith("/transporter");
  const isInAdminMode = location.pathname.startsWith("/admin");

  // Menu items based on auth and role
  const getMenuSections = () => {
    // Non-authenticated user
    if (!isAuthenticated) {
      return [
        {
          title: "Découvrir",
          items: [
            { icon: Search, label: "Voir les offres", href: "/offres" },
            { icon: Package, label: "Suivre un colis", href: "/tracking" },
          ]
        },
        {
          title: "Rejoindre",
          items: [
            { icon: UserPlus, label: "Créer un compte", href: "/auth" },
            { icon: Truck, label: "Devenir transporteur", href: "/gp/inscription" },
          ]
        }
      ];
    }

    // Authenticated - build sections based on role
    const sections = [];

    // Quick Access (always shown for authenticated users)
    sections.push({
      title: "Accès rapide",
      items: [
        { icon: Home, label: "Accueil", href: "/" },
        { icon: Search, label: "Offres disponibles", href: "/offres" },
        { icon: Package, label: "Envoyer un colis", href: "/envoyer" },
      ]
    });

    // Role-specific section
    if (isGP && !isInGPMode) {
      sections.push({
        title: "Espace Transporteur",
        items: [
          { icon: Truck, label: gpBusinessName || "Dashboard GP", href: "/gp/demandes", highlight: true },
        ]
      });
    }

    if ((isAdmin || isModerator) && !isInAdminMode) {
      sections.push({
        title: "Administration",
        items: [
          { icon: Shield, label: "Dashboard Admin", href: "/admin", highlight: true },
        ]
      });
    }

    // Client features
    if (!isInGPMode && !isInAdminMode) {
      sections.push({
        title: "Mon espace",
        items: [
          { icon: User, label: "Mon profil", href: "/client/dashboard" },
          { icon: Heart, label: "Mes favoris", href: "/favorites" },
          { icon: History, label: "Historique", href: "/client/dashboard" },
          { icon: Gift, label: "Programme fidélité", href: "/loyalty" },
        ]
      });
    }

    // Settings & Help (always)
    sections.push({
      title: "Paramètres",
      items: [
        { icon: Bell, label: "Notifications", href: "/settings" },
        { icon: Settings, label: "Paramètres", href: "/settings" },
        { icon: HelpCircle, label: "Aide & Support", href: "/settings" },
      ]
    });

    // Become GP (only for non-GP clients)
    if (!isGP && isAuthenticated) {
      sections.push({
        title: "Opportunités",
        items: [
          { icon: Truck, label: "Devenir transporteur", href: "/gp/inscription", highlight: true },
        ]
      });
    }

    return sections;
  };

  const menuSections = getMenuSections();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl px-0"
      >
        <SheetHeader className="px-4 pb-4">
          <SheetTitle className="text-left">
            {isAuthenticated ? "Menu" : "Bienvenue sur Yobbanté"}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-20 px-4 space-y-6">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item, itemIdx) => (
                  <motion.button
                    key={itemIdx}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      item.highlight
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
              {idx < menuSections.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}

          {/* Logout button for authenticated users */}
          {isAuthenticated && (
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
