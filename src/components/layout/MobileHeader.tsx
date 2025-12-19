import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface MobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
}

export function MobileHeader({ title, showNotifications = true }: MobileHeaderProps) {
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

        {showNotifications && <NotificationBell />}
      </div>
    </header>
  );
}
