import { Link, useLocation } from "react-router-dom";
import { Home, Search, Package, Wallet, User, MessageCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Accueil" },
  { href: "/offres", icon: Search, label: "Offres" },
  { href: "/demande", icon: Package, label: "Envoyer" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/client/profile", icon: User, label: "Profil" },
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

// Transporteur specific bottom nav
const gpNavItems = [
  { icon: Home, label: "Accueil", tab: "overview" },
  { icon: Package, label: "Offres", tab: "offers" },
  { icon: Search, label: "Missions", tab: "orders" },
  { icon: BarChart3, label: "Stats", tab: "stats" },
  { icon: User, label: "Profil", tab: "profile" },
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
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
