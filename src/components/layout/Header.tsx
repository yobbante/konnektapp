import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Package, Truck, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountrySelector } from "@/components/CountrySelector";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/demande", label: "Envoyer un colis" },
  { href: "/gp", label: "Devenir GP" },
  { href: "/tracking", label: "Suivi" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-md">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground leading-tight">Yobbanté</span>
              <span className="text-xs font-semibold text-secondary -mt-1">GP</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant={location.pathname === link.href ? "nav-active" : "nav"}
                  size="sm"
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <CountrySelector />
            </div>
            
            <Link to="/auth" className="hidden sm:block">
              <Button variant="outline" size="sm">
                <User className="w-4 h-4" />
                Connexion
              </Button>
            </Link>
            
            <Link to="/gp/inscription" className="hidden md:block">
              <Button variant="gold" size="sm">
                <Truck className="w-4 h-4" />
                Espace GP
              </Button>
            </Link>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
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
              className="lg:hidden overflow-hidden border-t border-border/50"
            >
              <div className="py-4 space-y-2">
                {navLinks.map((link) => (
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
                <div className="pt-4 space-y-2 border-t border-border/50">
                  <CountrySelector />
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <User className="w-4 h-4" />
                      Connexion
                    </Button>
                  </Link>
                  <Link to="/gp/inscription" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="gold" className="w-full">
                      <Truck className="w-4 h-4" />
                      Espace GP
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
