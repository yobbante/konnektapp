import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, Package, MessageSquare, MoreHorizontal, Truck, UserCheck, Shield, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { motion } from "framer-motion";

interface AdminMobileNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: "Aperçu", tab: "overview" },
  { icon: Truck, label: "GPs", tab: "gps" },
  { icon: Package, label: "Colis", tab: "orders" },
  { icon: MessageSquare, label: "Messages", href: "/admin/messages", showBadge: true },
  { icon: MoreHorizontal, label: "Plus", tab: "more" },
];

export function AdminMobileNav({ activeTab, onTabChange }: AdminMobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  const handleNavClick = (item: typeof adminNavItems[0]) => {
    if (item.href) {
      navigate(item.href);
    } else if (item.tab && onTabChange) {
      onTabChange(item.tab);
      if (location.pathname !== "/admin") {
        navigate("/admin");
      }
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(240,75%,28%)] border-t border-white/10 md:hidden" 
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
    >
      <div 
        className="flex items-center justify-around h-16" 
        style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}
      >
        {adminNavItems.map((item) => {
          const isActive = item.tab ? activeTab === item.tab : location.pathname === item.href;
          return (
            <motion.button
              key={item.label}
              onClick={() => handleNavClick(item)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-white/50 transition-colors relative",
                isActive && "text-white"
              )}
            >
              <motion.div 
                className="relative"
                animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-white")} />
                {item.showBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </motion.div>
              <span className={cn("text-[10px] font-medium", isActive && "text-white font-semibold")}>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="admin-nav-indicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-white"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
