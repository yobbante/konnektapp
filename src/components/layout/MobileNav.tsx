import { Link, useLocation } from "react-router-dom";
import { Home, Search, Package, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Accueil" },
  { href: "/offres", icon: Search, label: "Offres" },
  { href: "/demande", icon: Package, label: "Envoyer" },
  { href: "/tracking", icon: Search, label: "Suivi" },
  { href: "/auth", icon: User, label: "Compte" },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn("bottom-nav-item flex-1", isActive && "active")}
            >
              <item.icon className={cn(isActive && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// GP specific bottom nav
const gpNavItems = [
  { href: "/gp/dashboard", icon: Home, label: "Accueil", tab: "overview" },
  { href: "/gp/dashboard", icon: Package, label: "Offres", tab: "offers" },
  { href: "/gp/dashboard", icon: Search, label: "Commandes", tab: "orders" },
  { href: "/gp/dashboard", icon: Wallet, label: "Wallet", tab: "wallet" },
];

interface GPMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function GPMobileNav({ activeTab, onTabChange }: GPMobileNavProps) {
  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around">
        {gpNavItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={cn("bottom-nav-item flex-1", isActive && "active")}
            >
              <item.icon className={cn(isActive && "text-primary")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
