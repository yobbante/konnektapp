import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Wallet, TrendingUp, X, Bell, FileWarning, Award, Star } from "lucide-react";
import { useState } from "react";

interface Notification {
  id: string;
  type: "mission" | "payment" | "zone" | "document" | "badge" | "feedback";
  title: string;
  message: string;
  time: string;
  priority?: "high" | "medium" | "low";
}

interface SmartNotificationsProps {
  pendingMissions: number;
  lastPayment?: { amount: number; date: string };
  highDemandZone?: string;
  documentsExpiring?: { name: string; daysLeft: number }[];
  nextBadge?: { name: string; progress: number };
  recentFeedback?: { rating: number; comment?: string };
}

export function SmartNotifications({ 
  pendingMissions, 
  lastPayment, 
  highDemandZone,
  documentsExpiring = [],
  nextBadge,
  recentFeedback
}: SmartNotificationsProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const notifications: Notification[] = [];

  // Document expiry alerts (high priority)
  documentsExpiring.forEach((doc, index) => {
    if (!dismissed.includes(`doc-${index}`) && doc.daysLeft <= 30) {
      notifications.push({
        id: `doc-${index}`,
        type: "document",
        title: "Document bientôt expiré",
        message: `${doc.name} expire dans ${doc.daysLeft} jours`,
        time: "Important",
        priority: doc.daysLeft <= 7 ? "high" : "medium",
      });
    }
  });

  // New missions available
  if (pendingMissions > 0 && !dismissed.includes("mission")) {
    notifications.push({
      id: "mission",
      type: "mission",
      title: "Nouvelles missions",
      message: `${pendingMissions} mission${pendingMissions > 1 ? 's' : ''} disponible${pendingMissions > 1 ? 's' : ''} dans votre zone`,
      time: "Maintenant",
      priority: "medium",
    });
  }

  // Recent payment
  if (lastPayment && !dismissed.includes("payment")) {
    notifications.push({
      id: "payment",
      type: "payment",
      title: "Paiement effectué",
      message: `+${lastPayment.amount.toLocaleString()} FCFA reçu`,
      time: lastPayment.date,
    });
  }

  // High demand zone
  if (highDemandZone && !dismissed.includes("zone")) {
    notifications.push({
      id: "zone",
      type: "zone",
      title: "Zone à forte demande",
      message: `Beaucoup de demandes vers ${highDemandZone}`,
      time: "Aujourd'hui",
    });
  }

  // Next badge progress
  if (nextBadge && nextBadge.progress >= 80 && !dismissed.includes("badge")) {
    notifications.push({
      id: "badge",
      type: "badge",
      title: "Prochain badge proche !",
      message: `Encore ${100 - nextBadge.progress}% pour obtenir "${nextBadge.name}"`,
      time: "Motivation",
    });
  }

  // Recent feedback
  if (recentFeedback && !dismissed.includes("feedback")) {
    notifications.push({
      id: "feedback",
      type: "feedback",
      title: "Nouveau feedback client",
      message: `Note de ${recentFeedback.rating}/5${recentFeedback.comment ? ` - "${recentFeedback.comment.slice(0, 30)}..."` : ''}`,
      time: "Récent",
    });
  }

  const dismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "mission": return MapPin;
      case "payment": return Wallet;
      case "zone": return TrendingUp;
      case "document": return FileWarning;
      case "badge": return Award;
      case "feedback": return Star;
      default: return Bell;
    }
  };

  const getColor = (type: string, priority?: string) => {
    if (priority === "high") return "bg-destructive/10 text-destructive border-destructive/30";
    switch (type) {
      case "mission": return "bg-secondary/10 text-secondary border-secondary/30";
      case "payment": return "bg-success/10 text-success border-success/30";
      case "zone": return "bg-warning/10 text-warning border-warning/30";
      case "document": return "bg-warning/10 text-warning border-warning/30";
      case "badge": return "bg-accent/10 text-accent border-accent/30";
      case "feedback": return "bg-primary/10 text-primary border-primary/30";
      default: return "bg-primary/10 text-primary border-primary/30";
    }
  };

  if (notifications.length === 0) return null;

  // Sort by priority
  const sortedNotifications = [...notifications].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority || 'low'] || 2) - (priorityOrder[b.priority || 'low'] || 2);
  });

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {sortedNotifications.slice(0, 3).map((notif, index) => {
          const Icon = getIcon(notif.type);
          const colorClass = getColor(notif.type, notif.priority);

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

      {notifications.length > 3 && (
        <p className="text-xs text-center text-muted-foreground">
          +{notifications.length - 3} autres notifications
        </p>
      )}
    </div>
  );
}
