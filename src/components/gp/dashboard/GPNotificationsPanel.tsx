import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Check, Package, MessageCircle, Luggage, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  gp: Luggage,
  account_status: Luggage,
  alert: AlertCircle,
  info: Bell,
};

// Types relevant to transporters
const gpRelevantTypes = ["order", "order_status", "message", "gp", "account_status"];

interface GPNotificationsPanelProps {
  gpProfileId: string;
  onViewOrderDetail?: (orderId: string) => void;
}

export function GPNotificationsPanel({ gpProfileId, onViewOrderDetail }: GPNotificationsPanelProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("gp-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Only add if relevant to GP
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
        .limit(20);

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

    // Navigate based on related_type and related_id - GP specific paths
    if (notif.related_id && notif.related_type) {
      switch (notif.related_type) {
        case "order":
          // Use callback to view order detail in dashboard
          if (onViewOrderDetail) {
            onViewOrderDetail(notif.related_id);
          } else {
            navigate(`/gp/order/${notif.related_id}`);
          }
          break;
        case "message":
        case "conversation":
          navigate("/gp/messages");
          break;
        case "custom_request":
          navigate("/gp/demandes");
          break;
        default:
          break;
      }
    } else {
      // Fallback navigation based on notification type
      switch (notif.type) {
        case "order":
        case "order_status":
          // Stay in dashboard, show orders tab
          break;
        case "message":
          navigate("/gp/messages");
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
              <Check className="w-3 h-3 mr-1" />
              Tout lire
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.map((notif, index) => {
              const Icon = typeIcons[notif.type] || Bell;
              
              return (
                <motion.button
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full p-4 text-left transition-colors hover:bg-accent/50 ${
                    notif.read_at ? "opacity-60" : "bg-primary/5"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notif.read_at ? "bg-muted" : "bg-primary/10"
                    }`}>
                      <Icon className={`w-4 h-4 ${notif.read_at ? "text-muted-foreground" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notif.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
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
      </CardContent>
    </Card>
  );
}
