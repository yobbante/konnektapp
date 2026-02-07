/**
 * Apple-Style Notification System
 * 
 * Glassmorphic, interactive, clickable notifications with:
 * - Smooth spring animations (iOS-like)
 * - Swipe-to-dismiss (up)
 * - Click-to-navigate (links to existing pages)
 * - Progress countdown bar
 * - Haptic visual feedback
 * - App icon + contextual icons
 * - Grouped stacking
 */

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { 
  X, CheckCircle2, AlertTriangle, Info, MessageCircle, 
  Package, Truck, Shield, Star, Bell, ChevronRight,
  Scan, MapPin, CreditCard, UserCheck, Sparkles
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────
export type NotificationType = 
  | "success" | "error" | "warning" | "info" 
  | "message" | "order" | "scan" | "ktp" 
  | "delivery" | "payment" | "verification";

export interface AppleNotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  appName?: string;
  timestamp?: string;
  link?: string; // Click navigates here
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onDismiss: (id: string) => void;
  senderName?: string;
  senderAvatar?: string;
  icon?: React.ReactNode;
  persistent?: boolean; // No auto-dismiss
}

// ─── Icon & Color Mapping ────────────────────────────────────────
const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  gradient: string;
  glow: string;
  accent: string;
  label: string;
}> = {
  success: {
    icon: CheckCircle2,
    gradient: "from-emerald-400 to-green-500",
    glow: "shadow-emerald-500/25",
    accent: "text-emerald-500",
    label: "Succès",
  },
  error: {
    icon: AlertTriangle,
    gradient: "from-red-400 to-rose-500",
    glow: "shadow-red-500/25",
    accent: "text-red-500",
    label: "Erreur",
  },
  warning: {
    icon: AlertTriangle,
    gradient: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/25",
    accent: "text-amber-500",
    label: "Attention",
  },
  info: {
    icon: Info,
    gradient: "from-blue-400 to-indigo-500",
    glow: "shadow-blue-500/25",
    accent: "text-blue-500",
    label: "Info",
  },
  message: {
    icon: MessageCircle,
    gradient: "from-sky-400 to-blue-500",
    glow: "shadow-sky-500/25",
    accent: "text-sky-500",
    label: "Message",
  },
  order: {
    icon: Package,
    gradient: "from-violet-400 to-purple-500",
    glow: "shadow-violet-500/25",
    accent: "text-violet-500",
    label: "Commande",
  },
  scan: {
    icon: Scan,
    gradient: "from-cyan-400 to-teal-500",
    glow: "shadow-cyan-500/25",
    accent: "text-cyan-500",
    label: "Scan",
  },
  ktp: {
    icon: Shield,
    gradient: "from-primary to-accent",
    glow: "shadow-primary/25",
    accent: "text-primary",
    label: "Travel Pass",
  },
  delivery: {
    icon: Truck,
    gradient: "from-indigo-400 to-blue-500",
    glow: "shadow-indigo-500/25",
    accent: "text-indigo-500",
    label: "Livraison",
  },
  payment: {
    icon: CreditCard,
    gradient: "from-green-400 to-emerald-500",
    glow: "shadow-green-500/25",
    accent: "text-green-500",
    label: "Paiement",
  },
  verification: {
    icon: UserCheck,
    gradient: "from-primary to-accent",
    glow: "shadow-primary/25",
    accent: "text-primary",
    label: "Vérification",
  },
};

// ─── Route mapping for smart navigation ──────────────────────────
const TYPE_TO_ROUTE: Partial<Record<NotificationType, string>> = {
  message: "/messages",
  order: "/historique",
  scan: "/gp/scan",
  ktp: "/profil",
  delivery: "/tracking",
  payment: "/profil",
  verification: "/profil",
};

// ─── Single Notification Component ───────────────────────────────
export function AppleNotification({
  id,
  type,
  title,
  description,
  appName = "Yobbanté",
  timestamp,
  link,
  action,
  duration = 5000,
  onDismiss,
  senderName,
  senderAvatar,
  icon: customIcon,
  persistent = false,
}: AppleNotificationProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const config = NOTIFICATION_CONFIG[type];
  const Icon = config.icon;
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-100, 0], [0, 1]);
  const scale = useTransform(y, [-100, 0], [0.8, 1]);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Auto-dismiss countdown
  useEffect(() => {
    if (persistent || isPaused) return;
    
    const step = 100 / (duration / 50);
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(interval);
          setTimeout(() => onDismiss(id), 150);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration, id, onDismiss, persistent, isPaused]);

  // Click handler — navigate or action
  const handleClick = useCallback(() => {
    const target = link || TYPE_TO_ROUTE[type];
    if (target) {
      navigate(target);
      onDismiss(id);
    } else if (action) {
      action.onClick();
      onDismiss(id);
    }
  }, [link, type, action, navigate, onDismiss, id]);

  // Swipe-to-dismiss
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -50 || info.velocity.y < -300) {
      onDismiss(id);
    }
  };

  const isClickable = !!(link || TYPE_TO_ROUTE[type] || action);
  const timeStr = timestamp || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -80, scale: 0.85, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -60, scale: 0.9, filter: "blur(4px)" }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 300,
        mass: 0.8,
      }}
      style={{ y, opacity, scale }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.4, bottom: 0 }}
      onDragEnd={handleDragEnd}
      onHoverStart={() => setIsPaused(true)}
      onHoverEnd={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onClick={handleClick}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        // Glassmorphism
        "bg-card/80 dark:bg-card/70 backdrop-blur-2xl backdrop-saturate-150",
        // Border + shadow
        "border border-border/50 dark:border-white/10",
        `shadow-2xl ${config.glow}`,
        // Interaction
        isClickable && "cursor-pointer active:scale-[0.98] transition-transform",
        "touch-pan-x"
      )}
    >
      {/* Top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-80",
        config.gradient,
      )} />

      {/* Content */}
      <div className="relative px-4 py-3.5">
        {/* Header row: App name + timestamp */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {/* App icon */}
            <div className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center bg-gradient-to-br",
              config.gradient,
            )}>
              {customIcon || <Icon className="w-3 h-3 text-white" />}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {appName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground/70">{timeStr}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(id);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-foreground/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground/60" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex items-start gap-3">
          {/* Icon / Avatar */}
          {type === "message" && senderAvatar ? (
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-background">
                {senderAvatar.startsWith("http") ? (
                  <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">{senderAvatar}</span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-card" />
            </div>
          ) : (
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br shadow-lg",
              config.gradient, config.glow
            )}>
              {customIcon || <Icon className="w-5 h-5 text-white" />}
            </div>
          )}

          {/* Text */}
          <div className="flex-1 min-w-0">
            {senderName && type === "message" && (
              <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{senderName}</p>
            )}
            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
            
            {/* Action label / CTA */}
            {isClickable && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className={cn("text-[11px] font-semibold", config.accent)}>
                  {action?.label || "Voir les détails"}
                </span>
                <ChevronRight className={cn("w-3 h-3", config.accent)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar (countdown) */}
      {!persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground/5">
          <motion.div
            className={cn("h-full bg-gradient-to-r", config.gradient)}
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      )}

      {/* Subtle glow on hover */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none",
        "bg-gradient-to-b from-white/5 to-transparent"
      )} />
    </motion.div>
  );
}

// ─── Notification Container ──────────────────────────────────────
export function AppleNotificationContainer() {
  const [notifications, setNotifications] = useState<AppleNotificationProps[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Expose globally
  useEffect(() => {
    const show = (notif: Omit<AppleNotificationProps, "id" | "onDismiss">) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setNotifications((prev) => [...prev.slice(-3), { ...notif, id, onDismiss: dismiss }]);
    };

    (window as any).__appleNotify = show;
    // Also keep backward compat
    (window as any).showEnhancedToast = show;

    return () => {
      delete (window as any).__appleNotify;
      delete (window as any).showEnhancedToast;
    };
  }, [dismiss]);

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none"
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
        paddingLeft: '12px',
        paddingRight: '12px',
      }}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <div key={notif.id} className="pointer-events-auto w-full max-w-md">
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

/**
 * Quick helpers for common notification patterns
 */
export const notify = {
  success: (title: string, description?: string, link?: string) =>
    showAppleNotification({ type: "success", title, description, link }),
  
  error: (title: string, description?: string) =>
    showAppleNotification({ type: "error", title, description, duration: 8000 }),
  
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
    showAppleNotification({ type: "payment", title, description }),
};
