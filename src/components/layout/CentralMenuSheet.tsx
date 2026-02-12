import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Truck, Settings, Heart, Search,
  LogOut, Home, Package, Gift, History,
  UserPlus, Moon, Sun, BookOpen, Shield,
  MessageCircle, MapPin, LayoutDashboard,
  Users, ClipboardList, AlertTriangle,
  ScanLine, BarChart3, Calendar, DollarSign,
  Eye, X, ArrowLeftRight, Send
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useThemeManager } from "@/hooks/useThemeManager";
import { useState, useEffect } from "react";

interface CentralMenuSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  highlight?: boolean;
}

export function CentralMenuSheet({ children, open, onOpenChange }: CentralMenuSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isGP, isAdmin, isModerator, loading, userId } = useUserRole();
  const { isDark, setMode } = useThemeManager();
  const [gpBusinessName, setGPBusinessName] = useState<string>("");

  useEffect(() => {
    if (isGP && userId) {
      supabase
        .from("gp_profiles")
        .select("business_name")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => { if (data) setGPBusinessName(data.business_name); });
    }
  }, [isGP, userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onOpenChange?.(false);
    navigate("/");
  };

  const handleNavigation = (path: string) => {
    onOpenChange?.(false);
    navigate(path);
  };

  const isInGPMode = location.pathname.startsWith("/gp") || location.pathname.startsWith("/transporter");
  const isInAdminMode = location.pathname.startsWith("/admin");
  const isInRoutierMode = location.pathname.startsWith("/routier");
  const isInAgentMode = location.pathname.startsWith("/agent");
  const hasAdminAccess = isAdmin || isModerator;

  // ── Build grid items based on context ──
  const getGridItems = (): MenuItem[] => {
    if (!isAuthenticated) {
      return [
        { icon: Home, label: "Accueil", href: "/" },
        { icon: Search, label: "Offres", href: "/offres" },
        { icon: MapPin, label: "Suivre", href: "/tracking" },
        { icon: UserPlus, label: "Connexion", href: "/auth", highlight: true },
        { icon: Truck, label: "Transporteur", href: "/transporteur/inscription" },
        { icon: BookOpen, label: "Tutoriels", href: "/tutoriels" },
      ];
    }

    // Admin Terrain mode
    if (isInAdminMode && hasAdminAccess) {
      return [
        { icon: LayoutDashboard, label: "Terrain", href: "/admin" },
        { icon: BarChart3, label: "Bureau", href: "/admin/bureau" },
        { icon: ScanLine, label: "Scan", href: "/admin" },
        { icon: Package, label: "Colis", href: "/admin" },
        { icon: Users, label: "GP", href: "/admin" },
        { icon: AlertTriangle, label: "Alertes", href: "/admin" },
        { icon: ClipboardList, label: "Commandes", href: "/admin/orders" },
        { icon: MessageCircle, label: "Messages", href: "/admin/messages" },
        { icon: Settings, label: "Réglages", href: "/settings" },
      ];
    }

    // GP mode
    if (isInGPMode) {
      return [
        { icon: Home, label: "Aperçu", href: "/gp/apercu" },
        { icon: Package, label: "Demandes", href: "/gp/demandes" },
        { icon: Calendar, label: "Départs", href: "/gp/calendrier" },
        { icon: Send, label: "Envoyer", href: "#gp-send", highlight: true },
        { icon: MessageCircle, label: "Messages", href: "/gp/messages" },
        { icon: DollarSign, label: "Tarifs", href: "/gp/tarification" },
        { icon: History, label: "Historique", href: "/gp/historique" },
        { icon: Shield, label: "KTP & Geo", href: "/gp/ktp-geotrack" },
        { icon: Settings, label: "Réglages", href: "/gp/parametres" },
      ];
    }

    // Routier mode
    if (isInRoutierMode) {
      return [
        { icon: Home, label: "Accueil", href: "/" },
        { icon: Truck, label: "Missions", href: "/routier/demandes" },
        { icon: History, label: "Historique", href: "/routier/historique" },
        { icon: MessageCircle, label: "Messages", href: "/messages" },
        { icon: Settings, label: "Réglages", href: "/settings" },
      ];
    }

    // Agent / Livreur mode
    if (isInAgentMode) {
      return [
        { icon: Home, label: "Dashboard", href: "/agent" },
        { icon: ScanLine, label: "Scan", href: "/agent" },
        { icon: Package, label: "Colis", href: "/agent" },
        { icon: MessageCircle, label: "Messages", href: "/messages" },
        { icon: Settings, label: "Réglages", href: "/settings" },
      ];
    }

    // Client mode (default)
    const items: MenuItem[] = [
      { icon: Home, label: "Accueil", href: "/" },
      { icon: Package, label: "Envoyer", href: "/envoyer" },
      { icon: Search, label: "Offres", href: "/offres" },
      { icon: MapPin, label: "Suivre", href: "/tracking" },
      { icon: Users, label: "Destinataires", href: "/destinataires" },
      { icon: User, label: "Profil", href: "/profil" },
      { icon: MessageCircle, label: "Messages", href: "/messages" },
      { icon: History, label: "Historique", href: "/historique" },
      { icon: Heart, label: "Favoris", href: "/favoris" },
    ];

    return items;
  };

  // ── Extra action buttons (role switch, etc) ──
  const getExtraActions = (): MenuItem[] => {
    const extras: MenuItem[] = [];
    if (!isAuthenticated || isInAdminMode) return extras;

    if (isGP && !isInGPMode) {
      extras.push({ icon: Truck, label: gpBusinessName || "Espace GP", href: "/gp/apercu", highlight: true });
    }
    if (hasAdminAccess && !isInAdminMode) {
      extras.push({ icon: Shield, label: "Admin", href: "/admin", highlight: true });
    }
    if (!isGP && !isInRoutierMode && !isInAgentMode) {
      extras.push({ icon: Truck, label: "Devenir transporteur", href: "/transporteur/inscription", highlight: true });
    }
    return extras;
  };

  const getMenuTitle = () => {
    if (!isAuthenticated) return "Bienvenue sur Konnekt";
    if (isInAdminMode) return "Menu Admin";
    if (isInGPMode) return "Menu GP";
    if (isInRoutierMode) return "Menu Routier";
    if (isInAgentMode) return "Menu Livreur";
    return "Menu Client";
  };

  const gridItems = getGridItems();
  const extraActions = getExtraActions();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-4 pb-0 pt-0 border-t border-border/30"
        style={{
          maxHeight: '65vh',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pt-4 pb-3">
          <h2 className="text-base font-bold">{getMenuTitle()}</h2>
          <button
            onClick={() => onOpenChange?.(false)}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Grid Items */}
        <div className="overflow-y-auto pb-6" style={{ maxHeight: 'calc(65vh - 80px)' }}>
          <div className="grid grid-cols-3 gap-2.5">
            {gridItems.map((item, idx) => (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl transition-colors ${
                  item.highlight
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/60 hover:bg-muted text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Extra role actions */}
          {extraActions.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 mt-3">
              {extraActions.map((item, idx) => (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigation(item.href)}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-primary/10 text-primary"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Bottom actions: dark mode + logout */}
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode(isDark ? "light" : "dark")}
              className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-muted/60 hover:bg-muted text-foreground"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="text-[11px] font-medium">{isDark ? "Mode clair" : "Mode sombre"}</span>
            </motion.button>

            {isAuthenticated && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-destructive/5 hover:bg-destructive/10 text-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[11px] font-medium">Déconnexion</span>
              </motion.button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
