import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, Settings, Users, Truck, Package, 
  MessageSquare, AlertTriangle, Shield, Award, LogOut, Home, Route, Cog, Building
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminDropdownMenuProps {
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

export function AdminDropdownMenu({ onTabChange, activeTab }: AdminDropdownMenuProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
    navigate("/");
  };

  const menuItems = [
    { id: "overview", label: "Aperçu", icon: Home },
    { id: "stats", label: "Statistiques", icon: Settings },
    { id: "gps", label: "Transporteurs", icon: Truck },
    { id: "orders", label: "Commandes", icon: Package, isLink: true, href: "/admin/orders" },
    { id: "departures", label: "Départs", icon: Route, isLink: true, href: "/admin/departures" },
    { id: "messages", label: "Messages", icon: MessageSquare, isLink: true, href: "/admin/messages" },
    { id: "logistics", label: "Logistique Interne", icon: Truck },
    { id: "moving", label: "Déménagements", icon: Building },
    { id: "support", label: "Support & Litiges", icon: AlertTriangle },
    { id: "reputation", label: "Réputation", icon: Award },
    { id: "permissions", label: "Rôles & Permissions", icon: Shield },
    { id: "config", label: "Configuration", icon: Cog },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-inherit">
          <span className="hidden sm:inline mr-1">Menu</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Administration
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => {
              if ((item as any).isLink && (item as any).href) {
                navigate((item as any).href);
              } else {
                onTabChange?.(item.id);
              }
              setIsOpen(false);
            }}
            className={activeTab === item.id ? "bg-accent" : ""}
          >
            <item.icon className="w-4 h-4 mr-2" />
            {item.label}
          </DropdownMenuItem>
        ))}
        
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
  );
}
