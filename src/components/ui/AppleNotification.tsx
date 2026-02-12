/**
 * Konnekt Notification System — Comfy & Precise
 * 
 * Clean, minimal pill-style notifications:
 * - Soft background with subtle left accent
 * - Swipe-to-dismiss (up)
 * - Click-to-navigate when link exists, otherwise auto-dismiss
 * - Smooth spring animations
 * - Compact single-line layout
 */

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  X, CheckCircle2, AlertTriangle, Info, MessageCircle,
  Package, Truck, Shield, Scan, CreditCard, UserCheck,
  ChevronRight
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────
export type NotificationType =
  "success" | "error" | "warning" | "info" |
  "message" | "order" | "scan" | "ktp" |
  "delivery" | "payment" | "verification";

export interface AppleNotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  appName?: string;
  timestamp?: string;
  link?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onDismiss: (id: string) => void;
  senderName?: string;
  senderAvatar?: string;
  icon?: React.ReactNode;
  persistent?: boolean;
}

// ─── Config ──────────────────────────────────────────────────────
const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  accent: string;
  bg: string;
  iconColor: string;
  label: string;
}> = {
  success: {
    icon: CheckCircle2,
    accent: "bg-success",
    bg: "bg-success/8 dark:bg-success/15",
    iconColor: "text-success",
    label: "Succès"
  },
  error: {
    icon: AlertTriangle,
    accent: "bg-destructive",
    bg: "bg-destructive/8 dark:bg-destructive/15",
    iconColor: "text-destructive",
    label: "Erreur"
  },
  warning: {
    icon: AlertTriangle,
    accent: "bg-warning",
    bg: "bg-warning/8 dark:bg-warning/15",
    iconColor: "text-warning",
    label: "Attention"
  },
  info: {
    icon: Info,
    accent: "bg-primary",
    bg: "bg-primary/8 dark:bg-primary/15",
    iconColor: "text-primary",
    label: "Info"
  },
  message: {
    icon: MessageCircle,
    accent: "bg-primary",
    bg: "bg-primary/8 dark:bg-primary/15",
    iconColor: "text-primary",
    label: "Message"
  },
  order: {
    icon: Package,
    accent: "bg-secondary",
    bg: "bg-secondary/8 dark:bg-secondary/15",
    iconColor: "text-secondary",
    label: "Commande"
  },
  scan: {
    icon: Scan,
    accent: "bg-accent",
    bg: "bg-accent/8 dark:bg-accent/15",
    iconColor: "text-accent",
    label: "Scan"
  },
  ktp: {
    icon: Shield,
    accent: "bg-primary",
    bg: "bg-primary/8 dark:bg-primary/15",
    iconColor: "text-primary",
    label: "Travel Pass"
  },
  delivery: {
    icon: Truck,
    accent: "bg-primary",
    bg: "bg-primary/8 dark:bg-primary/15",
    iconColor: "text-primary",
    label: "Livraison"
  },
  payment: {
    icon: CreditCard,
    accent: "bg-success",
    bg: "bg-success/8 dark:bg-success/15",
    iconColor: "text-success",
    label: "Paiement"
  },
  verification: {
    icon: UserCheck,
    accent: "bg-primary",
    bg: "bg-primary/8 dark:bg-primary/15",
    iconColor: "text-primary",
    label: "Vérification"
  }
};

// ─── Route mapping ───────────────────────────────────────────────
const TYPE_TO_ROUTE: Partial<Record<NotificationType, string>> = {
  message: "/messages",
  order: "/historique",
  scan: "/gp/scan",
  ktp: "/profil",
  delivery: "/tracking",
  payment: "/profil",
  verification: "/profil"
};

// ─── Single Notification ─────────────────────────────────────────
export function AppleNotification({
  id,
  type,
  title,
  description,
  link,
  action,
  duration = 3000,
  onDismiss,
  senderName,
  senderAvatar,
  icon: customIcon,
  persistent = false
}: AppleNotificationProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const config = NOTIFICATION_CONFIG[type];
  const Icon = config.icon;
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-80, 0], [0, 1]);
  const scale = useTransform(y, [-80, 0], [0.9, 1]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (persistent || isPaused) return;
    const step = 100 / (duration / 50);
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(interval);
          setTimeout(() => onDismiss(id), 100);
          return 0;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [duration, id, onDismiss, persistent, isPaused]);

  const handleClick = useCallback(() => {
    const target = link || TYPE_TO_ROUTE[type];
    if (target) {
      navigate(target);
    }
    if (action) {
      action.onClick();
    }
    onDismiss(id);
  }, [link, type, action, navigate, onDismiss, id]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -40 || info.velocity.y < -250) {
      onDismiss(id);
    }
  };

  const hasRedirect = !!(link || TYPE_TO_ROUTE[type]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -60, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.7 }}
      style={{ y, opacity, scale }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.3, bottom: 0 }}
      onDragEnd={handleDragEnd}
      onHoverStart={() => setIsPaused(true)}
      onHoverEnd={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onClick={handleClick}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        "bg-card/95 dark:bg-card/90 backdrop-blur-xl",
        "border border-border/60 dark:border-border/40",
        "shadow-lg",
        hasRedirect ? "cursor-pointer active:scale-[0.98]" : "cursor-default",
        "transition-transform touch-pan-x"
      )}
    >
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl", config.accent)} />

      {/* Content */}
      <div className="flex items-center gap-3 pl-4 pr-3 py-3">
        {/* Icon */}
        {type === "message" && senderAvatar ? (
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-background">
              {senderAvatar.startsWith("http") ? (
                <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{senderAvatar}</span>
              )}
            </div>
          </div>
        ) : (
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            config.bg
          )}>
            {customIcon || <Icon className={cn("w-4.5 h-4.5", config.iconColor)} />}
          </div>
        )}

        {/* Text */}
        <div className="flex-1 min-w-0">
          {senderName && type === "message" && (
            <p className="text-[11px] text-muted-foreground font-medium">{senderName}</p>
          )}
          <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{title}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>

        {/* Right section: arrow or dismiss */}
        {hasRedirect ? (
          <ChevronRight className={cn("w-4 h-4 flex-shrink-0", config.iconColor)} />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(id);
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Bottom progress */}
      {!persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border/30">
          <motion.div
            className={cn("h-full", config.accent)}
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Notification Container ──────────────────────────────────────
export function AppleNotificationContainer() {
  const [notifications, setNotifications] = useState<AppleNotificationProps[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const show = (notif: Omit<AppleNotificationProps, "id" | "onDismiss">) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setNotifications((prev) => [...prev.slice(-3), { ...notif, id, onDismiss: dismiss }]);
    };

    (window as any).__appleNotify = show;
    (window as any).showEnhancedToast = show;

    return () => {
      delete (window as any).__appleNotify;
      delete (window as any).showEnhancedToast;
    };
  }, [dismiss]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-center gap-1.5 pointer-events-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)',
        paddingLeft: '8px',
        paddingRight: '8px'
      }}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <div key={notif.id} className="pointer-events-auto w-full max-w-sm">
            <AppleNotification {...notif} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Public API ──────────────────────────────────────────────────
export function showAppleNotification(notif: Omit<AppleNotificationProps, "id" | "onDismiss">) {
  if ((window as any).__appleNotify) {
    (window as any).__appleNotify(notif);
  }
}

export const notify = {
  success: (title: string, description?: string, link?: string) =>
    showAppleNotification({ type: "success", title, description, link }),

  error: (title: string, description?: string) =>
    showAppleNotification({ type: "error", title, description, duration: 6000 }),

  warning: (title: string, description?: string) =>
    showAppleNotification({ type: "warning", title, description }),

  info: (title: string, description?: string, link?: string) =>
    showAppleNotification({ type: "info", title, description, link }),

  message: (senderName: string, preview: string, link?: string) =>
    showAppleNotification({
      type: "message",
      title: preview,
      senderName,
      link: link || "/messages"
    }),

  order: (title: string, description?: string, link?: string) =>
    showAppleNotification({ type: "order", title, description, link }),

  scan: (title: string, description?: string) =>
    showAppleNotification({ type: "scan", title, description, link: "/gp/scan" }),

  ktp: (title: string, description?: string) =>
    showAppleNotification({ type: "ktp", title, description, link: "/profil" }),

  delivery: (title: string, description?: string, orderId?: string) =>
    showAppleNotification({
      type: "delivery",
      title,
      description,
      link: orderId ? `/tracking` : undefined
    }),

  payment: (title: string, description?: string) =>
    showAppleNotification({ type: "payment", title, description })
};
