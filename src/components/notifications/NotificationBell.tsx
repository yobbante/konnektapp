import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Truck, Package, MessageCircle, AlertCircle, Shield, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { hapticLight } from "@/lib/haptics";

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
  message: MessageCircle,
  gp: Truck,
  alert: AlertCircle,
  info: Bell,
  dispute: Shield,
  account_status: Truck,
  order_status: Package,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { hasAdminAccess, isGP } = useUserRole();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.read_at).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read if not already
    if (!notif.read_at) {
      await markAsRead(notif.id);
    }

    // Close popover
    setOpen(false);

    // For order-related notifications, fetch the tracking code to navigate properly
    const navigateToTracking = async (orderId: string) => {
      try {
        const { data: order } = await supabase
          .from("orders")
          .select("tracking_code, order_number")
          .eq("id", orderId)
          .single();
        
        if (order) {
          const code = order.tracking_code || order.order_number;
          navigate(`/tracking?code=${code}`);
        } else {
          navigate("/client/dashboard");
        }
      } catch {
        navigate("/client/dashboard");
      }
    };

    // Navigate based on related_type and related_id, considering admin role
    if (notif.related_id && notif.related_type) {
      switch (notif.related_type) {
        case "order":
          // Admin goes to admin order detail, others to tracking with proper code
          if (hasAdminAccess) {
            navigate(`/admin/order/${notif.related_id}`);
          } else {
            await navigateToTracking(notif.related_id);
          }
          break;
        case "offer":
          navigate(`/offres/${notif.related_id}`);
          break;
        case "message":
        case "conversation":
          // Admin goes to admin messages, GP to GP messages, others to regular messages
          if (hasAdminAccess) {
            navigate(`/admin/messages?conversation=${notif.related_id}`);
          } else if (isGP) {
            navigate(`/gp/messages?conversation=${notif.related_id}`);
          } else {
            navigate("/messages");
          }
          break;
        case "custom_request":
          if (hasAdminAccess) {
            navigate("/admin");
          } else {
            navigate("/client/dashboard");
          }
          break;
        case "gp":
        case "transporter":
        case "gp_profile":
          if (hasAdminAccess) {
            navigate(`/admin/gp/${notif.related_id}`);
          } else {
            navigate(`/gp/${notif.related_id}`);
          }
          break;
        case "dispute":
          if (hasAdminAccess) {
            navigate("/admin");
          } else {
            await navigateToTracking(notif.related_id);
          }
          break;
        default:
          // Generic handling based on type
          if (notif.type === "order" || notif.type === "order_status") {
            if (hasAdminAccess) {
              navigate("/admin/orders");
            } else if (notif.related_id) {
              await navigateToTracking(notif.related_id);
            } else {
              navigate("/client/dashboard");
            }
          } else if (notif.type === "message") {
            if (hasAdminAccess) {
              navigate("/admin/messages");
            } else if (isGP) {
              navigate("/gp/messages");
            } else {
              navigate("/messages");
            }
          }
      }
    } else {
      // Fallback navigation based on notification type
      switch (notif.type) {
        case "order":
        case "order_status":
          if (hasAdminAccess) {
            navigate("/admin/orders");
          } else {
            navigate("/client/dashboard");
          }
          break;
        case "message":
          if (hasAdminAccess) {
            navigate("/admin/messages");
          } else if (isGP) {
            navigate("/gp/messages");
          } else {
            navigate("/messages");
          }
          break;
        case "gp":
        case "account_status":
          navigate("/gp/dashboard");
          break;
        case "dispute":
          if (hasAdminAccess) {
            navigate("/admin");
          } else {
            navigate("/client/dashboard");
          }
          break;
        default:
          // Do nothing, just mark as read
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
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5"
              >
                <Badge variant="destructive" className="h-5 min-w-5 text-xs p-0 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              <Check className="w-3 h-3 mr-1" />
              Tout lire
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notif, index) => {
                const Icon = typeIcons[notif.type] || Bell;
                const isClickable = notif.related_id || ["order", "message", "gp"].includes(notif.type);
                
                return (
                  <motion.button
                    key={notif.id}
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ 
                      duration: 0.35, 
                      ease: [0.25, 0.46, 0.45, 0.94],
                      delay: index * 0.03
                    }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                      notif.read_at ? "opacity-60" : "bg-primary/5"
                    } ${isClickable ? "cursor-pointer" : ""}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notif.read_at ? "bg-muted" : "bg-primary/10"
                      }`}>
                        <Icon className={`w-4 h-4 ${notif.read_at ? "text-muted-foreground" : "text-primary"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{notif.title}</p>
                          {!notif.read_at && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {format(new Date(notif.created_at), "d MMM, HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
