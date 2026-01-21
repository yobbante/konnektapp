import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Package, Truck, User, Shield, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountrySelector } from "@/components/CountrySelector";
import { useUserRole } from "@/hooks/useUserRole";
import { usePageTheme } from "@/hooks/usePageTheme";
import { supabase } from "@/integrations/supabase/client";
import { TrustLevelBadge, calculateTrustLevel } from "@/components/ui/trust-level-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Nav links - "Devenir GP" only for non-transporters
const getNavLinks = (isGP: boolean) => [
  { href: "/", label: "Accueil" },
  { href: "/demande", label: "Envoyer un colis" },
  ...(!isGP ? [{ href: "/gp", label: "Devenir GP" }] : []),
  { href: "/tracking", label: "Suivi" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAdminAccess, isGP, isAuthenticated, loading, isProfileComplete } = useUserRole();
  const { logoBackground, logoColor } = usePageTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl ${logoBackground} flex items-center justify-center shadow-md transition-colors`}>
              <Package className={`w-5 h-5 ${logoColor}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="font-bold text-lg text-foreground leading-tight">Yobbanté</span>
                <span className="text-xs font-semibold text-secondary -mt-1">GP</span>
              </div>
              {isAuthenticated && (
                <TrustLevelBadge 
                  level={calculateTrustLevel({ profileCompletion: isProfileComplete ? 100 : 50 })} 
                  size="sm" 
                />
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {getNavLinks(isGP).map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant={location.pathname === link.href ? "nav-active" : "nav"}
                  size="sm"
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            
            {/* Admin Link - visible for admin and moderator */}
            {hasAdminAccess && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === "/admin" ? "nav-active" : "nav"}
                  size="sm"
                  className="text-primary font-semibold"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            
            {/* GP Dashboard Link - Visible uniquement pour les utilisateurs qui ont demandé à être GP */}
            {isGP && (
              <Link to="/gp/dashboard">
                <Button
                  variant={location.pathname === "/gp/dashboard" ? "nav-active" : "nav"}
                  size="sm"
                >
                  <Truck className="w-4 h-4" />
                  Dashboard GP
                </Button>
              </Link>
            )}
            {/* Client Dashboard Link - Pour les clients non-GP */}
            {isAuthenticated && !isGP && !hasAdminAccess && (
              <Link to="/client/dashboard">
                <Button
                  variant={location.pathname.startsWith("/client") ? "nav-active" : "nav"}
                  size="sm"
                >
                  <Package className="w-4 h-4" />
                  Mes envois
                </Button>
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <CountrySelector />
            </div>
            
            {!loading && (
              <>
                {isAuthenticated ? (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <User className="w-4 h-4" />
                        Mon compte
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-72">
                      <SheetHeader>
                        <SheetTitle>Mon compte</SheetTitle>
                      </SheetHeader>
                      <div className="py-4 space-y-2">
                        {hasAdminAccess && (
                          <Link to="/admin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                            <Shield className="w-5 h-5 text-primary" />
                            <span className="font-medium">Dashboard Admin</span>
                          </Link>
                        )}
                        {isGP ? (
                          <>
                            <Link to="/gp/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                              <Truck className="w-5 h-5 text-primary" />
                              <span className="font-medium">Dashboard Transporteur</span>
                            </Link>
                            <Link to="/gp/profil" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                              <User className="w-5 h-5 text-secondary" />
                              <span className="font-medium">Mon profil GP</span>
                            </Link>
                          </>
                        ) : isAuthenticated ? (
                          <>
                            <Link to="/client/profile" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                              <User className="w-5 h-5 text-secondary" />
                              <span className="font-medium">Mon profil</span>
                            </Link>
                            <Link to="/client/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                              <Package className="w-5 h-5" />
                              <span className="font-medium">Mes envois</span>
                            </Link>
                          </>
                        ) : null}
                        <div className="pt-4 border-t border-border mt-4">
                          <button 
                            onClick={handleSignOut} 
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 transition-colors text-destructive w-full"
                          >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Déconnexion</span>
                          </button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : (
                  <>
                    <Link to="/auth" className="hidden sm:block">
                      <Button variant="outline" size="sm">
                        <User className="w-4 h-4" />
                        Connexion
                      </Button>
                    </Link>
                    
                    <Link to="/gp/inscription" className="hidden md:block">
                      <Button variant="gold" size="sm">
                        <Truck className="w-4 h-4" />
                        Devenir Transporteur
                      </Button>
                    </Link>
                  </>
                )}
              </>
            )}

            {/* Menu Toggle - Always visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/50"
            >
              <div className="py-4 space-y-2">
                {getNavLinks(isGP).map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={location.pathname === link.href ? "nav-active" : "nav"}
                      className="w-full justify-start"
                    >
                      {link.label}
                    </Button>
                  </Link>
                ))}
                
                {/* Admin & GP Links in mobile menu */}
                {hasAdminAccess && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="nav" className="w-full justify-start text-primary font-semibold">
                      <Shield className="w-4 h-4" />
                      Dashboard Admin
                    </Button>
                  </Link>
                )}
                {isGP && (
                  <Link to="/gp/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="nav" className="w-full justify-start">
                      <Truck className="w-4 h-4" />
                      Dashboard GP
                    </Button>
                  </Link>
                )}
                {isAuthenticated && !isGP && !hasAdminAccess && (
                  <Link to="/client/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="nav" className="w-full justify-start">
                      <Package className="w-4 h-4" />
                      Mes envois
                    </Button>
                  </Link>
                )}
                
                <div className="pt-4 space-y-2 border-t border-border/50">
                  <CountrySelector />
                  {isAuthenticated ? (
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </Button>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full">
                          <User className="w-4 h-4" />
                          Connexion
                        </Button>
                      </Link>
                      <Link to="/gp/inscription" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="gold" className="w-full">
                          <Truck className="w-4 h-4" />
                          Devenir Transporteur
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
