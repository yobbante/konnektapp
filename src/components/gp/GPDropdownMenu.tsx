import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, Package, Truck, Wallet, 
  Plus, User, Settings, LogOut, Home, BarChart3, MessageSquare
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

interface GPDropdownMenuProps {
  onTabChange?: (tab: string) => void;
  activeTab?: string;
  onCreateOffer?: () => void;
}

export function GPDropdownMenu({ onTabChange, activeTab, onCreateOffer }: GPDropdownMenuProps) {
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
    { id: "offers", label: "Mes offres", icon: Package },
    { id: "orders", label: "Mes missions", icon: Truck },
    { id: "wallet", label: "Portefeuille", icon: Wallet },
    { id: "stats", label: "Statistiques", icon: BarChart3 },
    { id: "messages", label: "Messages", icon: MessageSquare, route: "/messages" },
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
          <Truck className="w-4 h-4" />
          Espace Transporteur
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {onCreateOffer && (
          <>
            <DropdownMenuItem
              onClick={() => {
                onCreateOffer();
                setIsOpen(false);
              }}
              className="text-primary font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle offre
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => {
              if (item.route) {
                navigate(item.route);
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
        
        <DropdownMenuItem onClick={() => navigate("/gp/parametres")}>
          <User className="w-4 h-4 mr-2" />
          Mon profil
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </DropdownMenuItem>
        
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
