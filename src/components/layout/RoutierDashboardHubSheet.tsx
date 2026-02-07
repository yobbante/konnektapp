import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Package,
  Clock,
  History,
  Car,
  DollarSign,
  User,
  Settings,
  LogOut,
  MessageSquare,
  HelpCircle,
  FileText,
  Home,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoutierDashboardHubSheetProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingCount?: number;
  activeOrdersCount?: number;
  gpProfile: {
    id: string;
    business_name: string;
    gp_type: string;
    status: string;
  };
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof Package;
  path: string;
  badge?: number;
  variant?: "default" | "destructive";
}

/**
 * RoutierDashboardHubSheet - Menu hub central pour transporteurs routiers
 * 
 * Sections:
 * - Opérations (demandes, en cours, historique)
 * - Gestion (véhicules, tarifs, profil)
 * - Compte (paramètres, wallet, support)
 */
export function RoutierDashboardHubSheet({
  children,
  open,
  onOpenChange,
  pendingCount = 0,
  activeOrdersCount = 0,
  gpProfile,
}: RoutierDashboardHubSheetProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const menuSections: MenuSection[] = [
    {
      title: "Opérations",
      items: [
        { id: "demandes", label: "Nouvelles demandes", icon: Package, path: "/routier/demandes", badge: pendingCount },
        { id: "en-cours", label: "Transports en cours", icon: Clock, path: "/routier/en-cours", badge: activeOrdersCount },
        { id: "historique", label: "Historique", icon: History, path: "/routier/historique" },
      ],
    },
    {
      title: "Gestion",
      items: [
        { id: "vehicules", label: "Mes véhicules", icon: Car, path: "/routier/vehicules" },
        { id: "tarifs", label: "Tarification", icon: DollarSign, path: "/routier/tarification" },
        { id: "profil", label: "Profil public", icon: User, path: "/routier/profil-public" },
      ],
    },
    {
      title: "Compte",
      items: [
        { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages" },
        { id: "wallet", label: "Portefeuille", icon: Wallet, path: "/routier/wallet" },
        { id: "settings", label: "Paramètres", icon: Settings, path: "/settings" },
        { id: "support", label: "Support", icon: HelpCircle, path: "/support" },
        { id: "legal", label: "CGU & Légal", icon: FileText, path: "/legal" },
      ],
    },
  ];

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
    navigate("/");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="p-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <SheetTitle className="text-white text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">{gpProfile.business_name}</p>
                <p className="text-xs opacity-80">Transport Routier</p>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Quick Home Link */}
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleNavigate("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Accueil Konnekt
            </Button>
          </div>

          <Separator />

          {/* Menu Sections */}
          {menuSections.map((section) => (
            <div key={section.title} className="p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.path)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Separator />

          {/* Logout */}
          <div className="p-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
