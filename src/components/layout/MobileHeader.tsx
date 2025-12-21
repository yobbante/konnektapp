import { Link } from "react-router-dom";
import { Package, Shield, Truck, User, LogOut, Menu, Heart, Search } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import { usePageTheme } from "@/hooks/usePageTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { VerifiedBadge } from "@/components/ui/verified-badge";

interface MobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
}

export function MobileHeader({ title, showNotifications = true }: MobileHeaderProps) {
  const { isAdmin, isGP, isAuthenticated, loading, isProfileComplete } = useUserRole();
  const { logoBackground, logoColor } = usePageTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl ${logoBackground} flex items-center justify-center transition-colors`}>
            <Package className={`w-5 h-5 ${logoColor}`} />
          </div>
          {title ? (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{title}</span>
              {isProfileComplete && <VerifiedBadge size="sm" />}
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-tight">Yobbanté</span>
              <span className="text-xs font-semibold text-primary -mt-0.5">GP</span>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-2">
          {showNotifications && <NotificationBell />}
          
          {isProfileComplete && !title && <VerifiedBadge size="sm" />}

          {/* Hamburger Menu - Always visible */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col h-full pt-6">
                <div className="space-y-1">
                  <Link to="/" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Package className="w-4 h-4 mr-2" />
                      Accueil
                    </Button>
                  </Link>
                  <Link to="/offres" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Truck className="w-4 h-4 mr-2" />
                      Offres
                    </Button>
                  </Link>
                  <Link to="/demande" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Package className="w-4 h-4 mr-2" />
                      Envoyer un colis
                    </Button>
                  </Link>
                  <Link to="/tracking" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Truck className="w-4 h-4 mr-2" />
                      Suivi
                    </Button>
                  </Link>
                  <Link to="/favorites" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Heart className="w-4 h-4 mr-2" />
                      Mes favoris
                    </Button>
                  </Link>
                  <Link to="/saved-searches" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Search className="w-4 h-4 mr-2" />
                      Mes alertes
                    </Button>
                  </Link>
                </div>

                {!loading && (
                  <div className="mt-6 pt-6 border-t border-border space-y-1">
                    {isAuthenticated ? (
                      <>
                        {isAdmin && (
                          <Link to="/admin" onClick={() => setMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start text-destructive">
                              <Shield className="w-4 h-4 mr-2" />
                              Dashboard Admin
                            </Button>
                          </Link>
                        )}
                        {isGP ? (
                          <>
                            <Link to="/gp/dashboard" onClick={() => setMenuOpen(false)}>
                              <Button variant="ghost" className="w-full justify-start text-secondary">
                                <Truck className="w-4 h-4 mr-2" />
                                Dashboard Transporteur
                              </Button>
                            </Link>
                            <Link to="/transporter/profile" onClick={() => setMenuOpen(false)}>
                              <Button variant="ghost" className="w-full justify-start">
                                <User className="w-4 h-4 mr-2" />
                                Mon profil
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link to="/profile" onClick={() => setMenuOpen(false)}>
                              <Button variant="ghost" className="w-full justify-start">
                                <User className="w-4 h-4 mr-2" />
                                Mon profil
                              </Button>
                            </Link>
                            <Link to="/client/dashboard" onClick={() => setMenuOpen(false)}>
                              <Button variant="ghost" className="w-full justify-start text-primary">
                                <Package className="w-4 h-4 mr-2" />
                                Mes envois
                              </Button>
                            </Link>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-destructive" 
                          onClick={() => { handleSignOut(); setMenuOpen(false); }}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Déconnexion
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link to="/auth" onClick={() => setMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            <User className="w-4 h-4 mr-2" />
                            Connexion
                          </Button>
                        </Link>
                        <Link to="/gp/inscription" onClick={() => setMenuOpen(false)}>
                          <Button variant="default" className="w-full justify-start">
                            <Truck className="w-4 h-4 mr-2" />
                            Devenir Transporteur
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
