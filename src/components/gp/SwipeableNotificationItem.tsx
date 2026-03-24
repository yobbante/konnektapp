import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Bell, Check, Package, MessageCircle, Luggage, AlertCircle, X, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_id: string | null;
  related_type: string | null;
  read_at: string | null;
  created_at: string;
  persistent?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  order: Package,
  order_status: Package,
  message: MessageCircle,
  gp: Luggage,
  account_status: Luggage,
  alert: AlertCircle,
  info: Bell,
};

interface SwipeableNotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function SwipeableNotificationItem({ 
  notification, 
  onMarkAsRead,
  onDismiss 
}: SwipeableNotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ["rgba(239, 68, 68, 0.2)", "transparent", "rgba(34, 197, 94, 0.2)"]
  );

  // Y axis for swipe up to dismiss
  const y = useMotionValue(0);

  const Icon = typeIcons[notification.type] || Bell;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Swipe up to dismiss
    if (info.offset.y < -60 && onDismiss) {
      onDismiss(notification.id);
      return;
    }
    if (info.offset.x > 80) {
      // Swipe right - mark as read
      onMarkAsRead(notification.id);
    } else if (info.offset.x < -80 && onDismiss) {
      // Swipe left - dismiss (optional)
      onDismiss(notification.id);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      style={{ background }}
      className="relative overflow-hidden"
    >
      {/* Swipe indicators */}
      <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center text-green-500 opacity-50">
        <Check className="w-5 h-5" />
      </div>
      {onDismiss && (
        <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center text-red-500 opacity-50">
          <X className="w-5 h-5" />
        </div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`
          bg-card p-3 relative z-10 cursor-grab active:cursor-grabbing
          ${notification.read_at ? "opacity-60" : "bg-primary/5"}
        `}
        onClick={toggleExpand}
      >
        <div className="flex gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            notification.read_at ? "bg-muted" : "bg-primary/10"
          }`}>
            <Icon className={`w-4 h-4 ${notification.read_at ? "text-muted-foreground" : "text-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{notification.title}</p>
              {!notification.read_at && (
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
            <motion.p 
              className={`text-xs text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}
              animate={{ height: isExpanded ? 'auto' : 'auto' }}
            >
              {notification.message}
            </motion.p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: fr })}
              </p>
              {notification.message.length > 80 && (
                <button 
                  className="text-[10px] text-primary hover:underline"
                  onClick={toggleExpand}
                >
                  {isExpanded ? "Réduire" : "Voir plus"}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Swipe hint for new users */}
        {!notification.read_at && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        )}
      </motion.div>
    </motion.div>
  );
}
