import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, Package, MessageSquare, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const adminNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Aperçu", tab: "overview" },
  { href: "/admin", icon: Users, label: "GPs", tab: "gps" },
  { href: "/admin", icon: Package, label: "Commandes", tab: "orders" },
  { href: "/admin/messages", icon: MessageSquare, label: "Messages", showBadge: true },
  { href: "/admin", icon: Settings, label: "Plus", tab: "support" },
];

interface AdminMobileNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AdminMobileNav({ activeTab, onTabChange }: AdminMobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  const handleNavClick = (item: typeof adminNavItems[0]) => {
    if (item.href === "/admin/messages") {
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 md:hidden" 
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
    >
      <div 
        className="flex items-center justify-around h-16" 
        style={{ paddingLeft: 'var(--safe-left, 0px)', paddingRight: 'var(--safe-right, 0px)' }}
      >
        {adminNavItems.map((item) => {
          const isActive = item.tab ? activeTab === item.tab : location.pathname === item.href;
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 text-slate-400 transition-colors relative",
                isActive && "text-white"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-5 h-5", isActive && "text-white")} />
                {item.showBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "text-white")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
