import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Wallet, TrendingUp, X, Bell } from "lucide-react";
import { useState } from "react";

interface Notification {
  id: string;
  type: "course" | "payment" | "zone";
  title: string;
  message: string;
  time: string;
}

interface SmartNotificationsProps {
  pendingCourses: number;
  lastPayment?: { amount: number; date: string };
  highDemandZone?: string;
}

export function SmartNotifications({ 
  pendingCourses, 
  lastPayment, 
  highDemandZone 
}: SmartNotificationsProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const notifications: Notification[] = [];

  if (pendingCourses > 0 && !dismissed.includes("course")) {
    notifications.push({
      id: "course",
      type: "course",
      title: "Nouvelles courses proches",
      message: `${pendingCourses} course${pendingCourses > 1 ? 's' : ''} disponible${pendingCourses > 1 ? 's' : ''} dans votre zone`,
      time: "Maintenant",
    });
  }

  if (lastPayment && !dismissed.includes("payment")) {
    notifications.push({
      id: "payment",
      type: "payment",
      title: "Paiement effectué",
      message: `+${lastPayment.amount.toLocaleString()} FCFA reçu`,
      time: lastPayment.date,
    });
  }

  if (highDemandZone && !dismissed.includes("zone")) {
    notifications.push({
      id: "zone",
      type: "zone",
      title: "Zone à forte demande",
      message: `Beaucoup de demandes vers ${highDemandZone}`,
      time: "Aujourd'hui",
    });
  }

  const dismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "course": return MapPin;
      case "payment": return Wallet;
      case "zone": return TrendingUp;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "course": return "bg-secondary/10 text-secondary border-secondary/30";
      case "payment": return "bg-success/10 text-success border-success/30";
      case "zone": return "bg-warning/10 text-warning border-warning/30";
      default: return "bg-primary/10 text-primary border-primary/30";
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notif, index) => {
          const Icon = getIcon(notif.type);
          const colorClass = getColor(notif.type);

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-3 rounded-xl border ${colorClass}`}
            >
              <button
                onClick={() => dismiss(notif.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <div className="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
