import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Package, MessageCircle, Truck, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
}

const typeIcons: Record<string, React.ElementType> = {
  order: Package,
  order_status: Package,
  message: MessageCircle,
  gp: Truck,
  account_status: Truck,
  alert: AlertCircle,
  info: Bell,
};

// Types relevant to transporters
const gpRelevantTypes = ["order", "order_status", "message", "gp", "account_status"];

interface GPNotificationsDropdownProps {
  gpProfileId: string;
  isOpen: boolean;
  onClose: () => void;
  onViewOrderDetail?: (orderId: string) => void;
}

export function GPNotificationsDropdown({ gpProfileId, isOpen, onClose, onViewOrderDetail }: GPNotificationsDropdownProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click, tab, or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate close when opening
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, gpProfileId]);

  useEffect(() => {
    // Subscribe to new notifications
    const channel = supabase
      .channel("gp-notifications-dropdown")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (gpRelevantTypes.includes(newNotif.type)) {
            setNotifications((prev) => [newNotif, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gpProfileId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .in("type", gpRelevantTypes)
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read if not already
    if (!notif.read_at) {
      await markAsRead(notif.id);
    }

    onClose();

    // Navigate based on related_type and related_id
    if (notif.related_id && notif.related_type) {
      switch (notif.related_type) {
        case "order":
          if (onViewOrderDetail) {
            onViewOrderDetail(notif.related_id);
          } else {
            navigate(`/gp/order/${notif.related_id}`);
          }
          break;
        case "message":
        case "conversation":
          navigate("/messages");
          break;
        case "custom_request":
          navigate("/gp/demandes");
          break;
        default:
          break;
      }
    } else {
      switch (notif.type) {
        case "message":
          navigate("/messages");
          break;
        case "gp":
        case "account_status":
          navigate("/transporter/profile");
          break;
        default:
          break;
      }
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
      if (unreadIds.length === 0) return;

      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          
          {/* Dropdown */}
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed right-3 top-20 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ 
              width: 'min(calc(100vw - 24px), 340px)',
              maxHeight: 'calc(100vh - 140px)',
              top: 'calc(70px + var(--safe-top, 0px))'
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 px-2">
                    <Check className="w-3 h-3 mr-1" />
                    Tout lire
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {loading ? (
                <div className="p-6 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif, index) => {
                    const Icon = typeIcons[notif.type] || Bell;
                    
                    return (
                      <motion.button
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full p-3 text-left transition-colors hover:bg-accent/50 ${
                          notif.read_at ? "opacity-60" : "bg-primary/5"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            notif.read_at ? "bg-muted" : "bg-primary/10"
                          }`}>
                            <Icon className={`w-4 h-4 ${notif.read_at ? "text-muted-foreground" : "text-primary"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notif.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(notif.created_at), "d MMM, HH:mm", { locale: fr })}
                            </p>
                          </div>
                          {!notif.read_at && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
