import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Truck, Settings, Heart, Bell, Search, 
  LogOut, HelpCircle, ChevronRight, Home,
  Package, Gift, History, UserPlus, Moon, Sun,
  BookOpen, Shield, MessageCircle, MapPin,
  LayoutDashboard, Users, ClipboardList, AlertTriangle,
  ScanLine, BarChart3
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useThemeManager } from "@/hooks/useThemeManager";
import { useState, useEffect } from "react";

interface CentralMenuSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CentralMenuSheet({ children, open, onOpenChange }: CentralMenuSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isGP, isAdmin, isModerator, loading, userId } = useUserRole();
  const { isDark, setMode } = useThemeManager();
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

  const toggleDarkMode = () => {
    setMode(isDark ? "light" : "dark");
  };

  const isInGPMode = location.pathname.startsWith("/gp") || location.pathname.startsWith("/transporter");
  const isInAdminMode = location.pathname.startsWith("/admin");
  const isInRoutierMode = location.pathname.startsWith("/routier");
  const hasAdminAccess = isAdmin || isModerator;

  const getMenuSections = () => {
    if (!isAuthenticated) {
      return [
        {
          title: "Navigation",
          items: [
            { icon: Home, label: "Accueil", href: "/" },
            { icon: Search, label: "Voir les offres", href: "/offres" },
            { icon: MapPin, label: "Suivre un colis", href: "/tracking" },
          ]
        },
        {
          title: "Commencer",
          items: [
            { icon: UserPlus, label: "Connexion / Inscription", href: "/auth", highlight: true },
            { icon: Truck, label: "Devenir transporteur", href: "/transporteur/inscription" },
          ]
        },
        {
          title: "Aide",
          items: [
            { icon: BookOpen, label: "Tutoriels", href: "/tutoriels" },
            { icon: HelpCircle, label: "Aide & Support", href: "/settings" },
          ]
        }
      ];
    }

    const sections = [];

    // ─── ADMIN MODE: admin-specific menu ───
    if (isInAdminMode && hasAdminAccess) {
      sections.push({
        title: "Admin — Terrain",
        items: [
          { icon: LayoutDashboard, label: "Dashboard Terrain", href: "/admin" },
          { icon: ScanLine, label: "Scan & Actions", href: "/admin" },
          { icon: Package, label: "Colis actifs", href: "/admin" },
          { icon: Truck, label: "GP & Logistique", href: "/admin" },
          { icon: AlertTriangle, label: "Alertes & Litiges", href: "/admin" },
        ]
      });
      sections.push({
        title: "Admin — Bureau",
        items: [
          { icon: BarChart3, label: "Dashboard Bureau", href: "/admin/bureau" },
          { icon: ClipboardList, label: "Commandes", href: "/admin/orders" },
          { icon: Users, label: "Transporteurs", href: "/admin/bureau" },
          { icon: MessageCircle, label: "Messages", href: "/admin/messages" },
          { icon: Shield, label: "Permissions", href: "/admin/bureau" },
        ]
      });
      sections.push({
        title: "Outils",
        items: [
          { icon: Settings, label: "Paramètres", href: "/settings" },
        ]
      });
      return sections;
    }

    // ─── GP MODE ───
    if (isInGPMode) {
      sections.push({
        title: "Menu GP",
        items: [
          { icon: Home, label: "Aperçu", href: "/gp/apercu" },
          { icon: Package, label: "Demandes", href: "/gp/demandes" },
          { icon: History, label: "Départs", href: "/gp/calendrier" },
          { icon: MessageCircle, label: "Messages", href: "/gp/messages" },
        ]
      });
      sections.push({
        title: "Gestion",
        items: [
          { icon: Search, label: "Tarifs", href: "/gp/tarification" },
          { icon: History, label: "Historique", href: "/gp/historique" },
          { icon: Shield, label: "KTP & Geo", href: "/gp/ktp-geotrack" },
          { icon: MapPin, label: "Profil public", href: "/gp/profil-public" },
          { icon: Settings, label: "Réglages", href: "/gp/parametres" },
        ]
      });
    } else if (isInRoutierMode) {
      sections.push({
        title: "Konnekt Routier",
        items: [
          { icon: Home, label: "Accueil Konnekt", href: "/" },
          { icon: Truck, label: "Mes missions", href: "/routier/demandes" },
          { icon: History, label: "Historique", href: "/routier/historique" },
          { icon: MessageCircle, label: "Messages", href: "/messages" },
        ]
      });
    } else {
      // ─── CLIENT MODE: client-specific menu ───
      sections.push({
        title: "Envois",
        items: [
          { icon: Home, label: "Accueil", href: "/" },
          { icon: Package, label: "Envoyer un colis", href: "/envoyer" },
          { icon: Search, label: "Offres disponibles", href: "/offres" },
          { icon: MapPin, label: "Suivre un colis", href: "/tracking" },
        ]
      });
      sections.push({
        title: "Mon espace",
        items: [
          { icon: User, label: "Mon profil", href: "/profil" },
          { icon: MessageCircle, label: "Messages", href: "/messages" },
          { icon: History, label: "Historique", href: "/historique" },
          { icon: Heart, label: "Mes favoris", href: "/favoris" },
          { icon: Bell, label: "Alertes sauvegardées", href: "/saved-searches" },
        ]
      });
      sections.push({
        title: "Récompenses",
        items: [
          { icon: Gift, label: "Programme fidélité", href: "/loyalty", highlight: true },
        ]
      });
    }

    // Cross-role access buttons (only in client/GP mode, not admin)
    if (!isInAdminMode) {
      if (isGP && !isInGPMode) {
        sections.push({
          title: "Espace Transporteur",
          items: [
            { icon: Truck, label: gpBusinessName || "Dashboard GP", href: "/gp/apercu", highlight: true },
          ]
        });
      }

      if (hasAdminAccess) {
        sections.push({
          title: "Administration",
          items: [
            { icon: Shield, label: "Konnekt Admin", href: "/admin", highlight: true },
          ]
        });
      }

      if (!isGP && isAuthenticated && !isInRoutierMode) {
        sections.push({
          title: "Opportunités",
          items: [
            { icon: Truck, label: "Devenir transporteur", href: "/transporteur/inscription", highlight: true },
          ]
        });
      }
    }

    sections.push({
      title: "Aide",
      items: [
        { icon: BookOpen, label: "Tutoriels", href: "/tutoriels" },
        { icon: Settings, label: "Paramètres", href: "/settings" },
      ]
    });

    return sections;
  };

  const menuSections = getMenuSections();

  // Determine menu title based on context
  const getMenuTitle = () => {
    if (!isAuthenticated) return "Bienvenue sur Konnekt";
    if (isInAdminMode) return "Menu Admin";
    if (isInGPMode) return "Menu GP";
    if (isInRoutierMode) return "Menu Routier";
    return "Menu Client";
  };

  // Determine menu icon color based on context
  const getMenuIconClass = () => {
    if (isInAdminMode) return "bg-[hsl(240,75%,28%)]/10 text-[hsl(240,75%,28%)]";
    if (isInGPMode) return "bg-primary/10 text-primary";
    return "bg-[hsl(185,60%,45%)]/10 text-[hsl(185,60%,45%)]";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl px-0"
        style={{
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <SheetHeader className="px-4 pb-3 border-b border-border/50">
          <SheetTitle className="text-left text-lg flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${getMenuIconClass()}`}>
              {isInAdminMode ? <Shield className="w-4 h-4" /> : <Package className="w-4 h-4" />}
            </div>
            {getMenuTitle()}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-24 px-4 space-y-5">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <div className="space-y-0.5">
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
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      item.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
              {idx < menuSections.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}

          {/* Dark Mode Toggle */}
          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={toggleDarkMode}
              className="w-full justify-start gap-3"
            >
              {isDark ? (
                <>
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">Mode clair</span>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">Mode sombre</span>
                </>
              )}
            </Button>
          </div>

          {/* Logout */}
          {isAuthenticated && (
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">Se déconnecter</span>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
