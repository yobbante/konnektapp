import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Wifi, WifiOff, Bell, BellOff, 
  CheckCircle, XCircle, AlertCircle, Loader2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationStatus() {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<"loading" | "active" | "inactive" | "error">("loading");
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [checking, setChecking] = useState(false);

  const checkServiceWorker = async () => {
    setChecking(true);
    try {
      if (!("serviceWorker" in navigator)) {
        setServiceWorkerStatus("inactive");
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      const pushSW = registrations.find(reg => 
        reg.active?.scriptURL.includes("sw-push.js")
      );

      if (pushSW && pushSW.active) {
        setSwRegistration(pushSW);
        setServiceWorkerStatus("active");
      } else {
        setServiceWorkerStatus("inactive");
      }
    } catch (error) {
      console.error("Error checking service worker:", error);
      setServiceWorkerStatus("error");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkServiceWorker();
  }, []);

  const getOverallStatus = () => {
    if (!isSupported) return "unsupported";
    if (permission === "denied") return "blocked";
    if (permission === "granted" && serviceWorkerStatus === "active") return "active";
    if (permission === "granted" && serviceWorkerStatus !== "active") return "partial";
    return "inactive";
  };

  const status = getOverallStatus();

  const statusConfig = {
    active: {
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      icon: CheckCircle,
      label: "Actives",
      description: "Les notifications push fonctionnent correctement"
    },
    partial: {
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      icon: AlertCircle,
      label: "Partiellement actives",
      description: "Les permissions sont accordées mais le service worker n'est pas actif"
    },
    inactive: {
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-muted",
      icon: BellOff,
      label: "Inactives",
      description: "Activez les notifications pour recevoir des alertes en temps réel"
    },
    blocked: {
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      icon: XCircle,
      label: "Bloquées",
      description: "Les notifications sont bloquées. Modifiez les paramètres de votre navigateur."
    },
    unsupported: {
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-muted",
      icon: WifiOff,
      label: "Non supportées",
      description: "Votre navigateur ne supporte pas les notifications push"
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={`${config.border} ${config.bg}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Bell className={`w-5 h-5 ${config.color}`} />
            Statut des notifications push
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={checkServiceWorker}
            disabled={checking}
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{config.label}</span>
              <Badge 
                variant={status === "active" ? "success" : status === "blocked" ? "destructive" : "secondary"}
                className="text-xs"
              >
                {status === "active" ? "OK" : status === "blocked" ? "Bloqué" : "Inactif"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </motion.div>

        {/* Detailed Status */}
        <div className="space-y-2 pt-2 border-t border-border">
          {/* Browser Support */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Support navigateur</span>
            <div className="flex items-center gap-1.5">
              {isSupported ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Supporté</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">Non supporté</span>
                </>
              )}
            </div>
          </div>

          {/* Permission Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Permission</span>
            <div className="flex items-center gap-1.5">
              {permission === "granted" ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Accordée</span>
                </>
              ) : permission === "denied" ? (
                <>
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">Refusée</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-500">En attente</span>
                </>
              )}
            </div>
          </div>

          {/* Service Worker Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Service Worker</span>
            <div className="flex items-center gap-1.5">
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">Vérification...</span>
                </>
              ) : serviceWorkerStatus === "active" ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Actif</span>
                </>
              ) : serviceWorkerStatus === "error" ? (
                <>
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">Erreur</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-500">Inactif</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {status === "inactive" && isSupported && (
          <Button onClick={requestPermission} className="w-full mt-2">
            <Bell className="w-4 h-4 mr-2" />
            Activer les notifications
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
