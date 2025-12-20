import { Link } from "react-router-dom";
import { Package, Shield, Truck, User, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface MobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
}

export function MobileHeader({ title, showNotifications = true }: MobileHeaderProps) {
  const { isAdmin, isGP, isAuthenticated, loading } = useUserRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          {title ? (
            <span className="font-semibold text-foreground">{title}</span>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-tight">Yobbanté</span>
              <span className="text-xs font-semibold text-primary -mt-0.5">GP</span>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-2">
          {showNotifications && <NotificationBell />}
          
          {!loading && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isAuthenticated ? (
                  <>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                          <Shield className="w-4 h-4 text-destructive" />
                          Dashboard Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isGP && (
                      <DropdownMenuItem asChild>
                        <Link to="/gp/dashboard" className="flex items-center gap-2 cursor-pointer">
                          <Truck className="w-4 h-4 text-primary" />
                          Dashboard GP
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {!isGP && (
                      <DropdownMenuItem asChild>
                        <Link to="/client/dashboard" className="flex items-center gap-2 cursor-pointer">
                          <Package className="w-4 h-4 text-primary" />
                          Mes envois
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Déconnexion
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/auth" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" />
                        Connexion
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/gp/inscription" className="flex items-center gap-2 cursor-pointer">
                        <Truck className="w-4 h-4" />
                        Devenir GP
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
