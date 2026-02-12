import { Link, useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, Package, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GPSendParcelDialog } from "@/components/gp/GPSendParcelDialog";
import { useState } from "react";

interface GPDashboardHeaderProps {
  gpProfile: {
    id: string;
    user_id: string;
    business_name: string;
    gp_type: string;
    subscription: string;
    base_origin_city?: string | null;
    base_origin_country?: string | null;
  };
  onSignOut: () => void;
}

export function GPDashboardHeader({ gpProfile, onSignOut }: GPDashboardHeaderProps) {
  const [showSendDialog, setShowSendDialog] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-md">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-foreground leading-tight">Konnekt</span>
                <span className="text-xs font-semibold text-secondary -mt-1">GP Dashboard</span>
              </div>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* GP Self-Ship Button - Subtle Integration */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSendDialog(true)}
                className="hidden md:flex gap-2 text-xs h-8 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
              >
                <Send className="w-3.5 h-3.5" />
                Envoyer un colis
              </Button>

              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                      {gpProfile.business_name.charAt(0)}
                    </div>
                    <span className="hidden md:inline font-medium">{gpProfile.business_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium text-sm">{gpProfile.business_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{gpProfile.gp_type}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSendDialog(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer un colis
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/gp/settings" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <GPSendParcelDialog 
        open={showSendDialog} 
        onOpenChange={setShowSendDialog} 
        gpProfile={gpProfile} 
      />
    </>
  );
}
