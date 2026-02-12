import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, Settings, Users, Truck, Package, 
  MessageSquare, AlertTriangle, Shield, Award, LogOut, Home, Route, Cog, Building, UserCheck,
  BarChart3, FileText, Wallet
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

interface AdminDropdownMenuProps {
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

const menuSections = [
  {
    title: "Opérations",
    items: [
      { id: "overview", label: "Aperçu", icon: Home },
      { id: "gps", label: "Transporteurs", icon: Truck },
      { id: "orders", label: "Commandes", icon: Package, isLink: true, href: "/admin/orders" },
      { id: "departures", label: "Départs", icon: Route, isLink: true, href: "/admin/departures" },
    ],
  },
  {
    title: "Logistique",
    items: [
      { id: "logistics", label: "Logistique Interne", icon: Truck },
      { id: "agents", label: "Livreurs Konnekt", icon: UserCheck },
      { id: "moving", label: "Déménagements", icon: Building },
    ],
  },
  {
    title: "Communication",
    items: [
      { id: "messages", label: "Messages", icon: MessageSquare, isLink: true, href: "/admin/messages" },
      { id: "support", label: "Support & Litiges", icon: AlertTriangle },
    ],
  },
  {
    title: "Gouvernance",
    items: [
      { id: "finance", label: "Finance & Wallets", icon: Wallet },
      { id: "stats", label: "Statistiques", icon: BarChart3 },
      { id: "reputation", label: "Réputation", icon: Award },
      { id: "permissions", label: "Rôles & Permissions", icon: Shield },
      { id: "config", label: "Configuration", icon: Cog },
    ],
  },
];

export function AdminDropdownMenu({ onTabChange, activeTab }: AdminDropdownMenuProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
    navigate("/");
  };

  const handleItemClick = (item: any) => {
    if (item.isLink && item.href) {
      navigate(item.href);
    } else {
      onTabChange?.(item.id);
    }
    setIsOpen(false);
  };

  // On mobile, use a Sheet for better UX
  return (
    <>
      {/* Desktop: Dropdown */}
      <div className="hidden md:block">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-inherit rounded-xl">
              <span className="mr-1">Menu</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Administration
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {menuSections.flatMap((section) =>
              section.items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={activeTab === item.id ? "bg-accent" : ""}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Retour au site
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile: Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-white/10 border-white/20 hover:bg-white/20 text-inherit rounded-xl">
              <ChevronDown className="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
            <SheetHeader className="pb-3 border-b border-border/50">
              <SheetTitle className="text-left text-lg flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[hsl(240,75%,28%)]/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[hsl(240,75%,28%)]" />
                </div>
                Admin Konnekt
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-full pb-24 space-y-5 pt-4">
              {menuSections.map((section, idx) => (
                <div key={section.title}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {section.title}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleItemClick(item)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          activeTab === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          activeTab === item.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>
                  {idx < menuSections.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}

              {/* Actions */}
              <Separator />
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { navigate("/"); setIsOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted"
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium text-sm">Retour au site</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 text-destructive"
              >
                <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium text-sm">Déconnexion</span>
              </motion.button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
