import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { 
  Bell, Volume2, Vibrate, Smartphone, CheckCircle, XCircle, 
  Loader2, TestTube2, WifiOff, Wifi
} from "lucide-react";

interface NotificationTestPanelProps {
  userId: string | null;
}

export function NotificationTestPanel({ userId }: NotificationTestPanelProps) {
  const [testingSound, setTestingSound] = useState(false);
  const [testingVibrate, setTestingVibrate] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [testingOffline, setTestingOffline] = useState(false);
  
  const { playSound, vibrate, notify } = useNotificationSound();
  const { isSupported, permission, requestPermission, showNotification, serviceWorkerReady } = usePushNotifications();

  // Test sound
  const handleTestSound = () => {
    setTestingSound(true);
    playSound();
    toast({
      title: "🔊 Son joué",
      description: "Si vous avez entendu le son, la notification sonore fonctionne !",
    });
    setTimeout(() => setTestingSound(false), 1000);
  };

  // Test vibration
  const handleTestVibrate = () => {
    setTestingVibrate(true);
    vibrate([200, 100, 200, 100, 200]);
    toast({
      title: "📳 Vibration envoyée",
      description: "Si votre appareil a vibré, les notifications tactiles fonctionnent !",
    });
    setTimeout(() => setTestingVibrate(false), 1000);
  };

  // Test combined notification
  const handleTestCombined = () => {
    notify({ sound: true, vibrate: [100, 50, 100, 50, 200] });
    toast({
      title: "🔔 Notification complète",
      description: "Son + vibration envoyés simultanément !",
    });
  };

  // Test browser push notification
  const handleTestPush = async () => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "Les notifications push ne sont pas supportées sur cet appareil.",
        variant: "destructive",
      });
      return;
    }

    if (permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "Permission refusée",
          description: "Activez les notifications dans les paramètres de votre navigateur.",
          variant: "destructive",
        });
        return;
      }
    }

    setTestingPush(true);
    
    // Show browser notification
    showNotification("🚀 Test Notification Push", {
      body: "Cette notification confirme que les push fonctionnent sur votre appareil !",
      icon: "/pwa-192x192.png",
      tag: "test-notification",
    });

    toast({
      title: "Push envoyé",
      description: "Vérifiez vos notifications système.",
    });

    setTimeout(() => setTestingPush(false), 2000);
  };

  // Test database notification (in-app)
  const handleTestDatabaseNotification = async () => {
    if (!userId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour tester les notifications en base.",
        variant: "destructive",
      });
      return;
    }

    setTestingPush(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "🔔 Test notification in-app",
          message: "Cette notification vérifie le système temps réel. Regardez l'icône de notification dans l'en-tête !",
          type: "system",
        });

      if (error) throw error;

      toast({
        title: "Notification créée",
        description: "Vérifiez le badge sur l'icône de notification.",
      });
    } catch (error) {
      console.error("Error creating test notification:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification test.",
        variant: "destructive",
      });
    } finally {
      setTestingPush(false);
    }
  };

  // Test offline mode notification
  const handleTestOfflineNotification = () => {
    setTestingOffline(true);
    
    // Store a test notification in localStorage for offline sync
    const offlineQueue = JSON.parse(localStorage.getItem("offline_notification_queue") || "[]");
    offlineQueue.push({
      id: Date.now(),
      type: "test",
      title: "Test hors-ligne",
      message: "Cette notification a été créée en mode test hors-ligne",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("offline_notification_queue", JSON.stringify(offlineQueue));
    
    notify({ sound: true, vibrate: [100, 100, 100] });
    
    toast({
      title: "Mode hors-ligne simulé",
      description: "Notification stockée localement. Elle sera synchronisée à la reconnexion.",
    });
    
    setTimeout(() => setTestingOffline(false), 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube2 className="w-5 h-5" />
          Test des notifications
        </CardTitle>
        <CardDescription>
          Vérifiez que toutes les notifications fonctionnent correctement sur votre appareil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Push:</span>
            {isSupported ? (
              permission === "granted" ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  OK
                </Badge>
              ) : (
                <Badge variant="secondary">Non activé</Badge>
              )
            ) : (
              <Badge variant="outline">Non supporté</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Wifi className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Service Worker:</span>
            {serviceWorkerReady ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Prêt
              </Badge>
            ) : (
              <Badge variant="secondary">En attente</Badge>
            )}
          </div>
        </div>

        {/* Test Buttons */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tests individuels
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Sound Test */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleTestSound}
                disabled={testingSound}
              >
                {testingSound ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Volume2 className="w-5 h-5 text-blue-500" />
                )}
                <span className="text-xs">Tester le son</span>
              </Button>
            </motion.div>

            {/* Vibration Test */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleTestVibrate}
                disabled={testingVibrate}
              >
                {testingVibrate ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Vibrate className="w-5 h-5 text-orange-500" />
                )}
                <span className="text-xs">Tester vibration</span>
              </Button>
            </motion.div>

            {/* Push Test */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleTestPush}
                disabled={testingPush || !isSupported}
              >
                {testingPush ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bell className="w-5 h-5 text-green-500" />
                )}
                <span className="text-xs">Push navigateur</span>
              </Button>
            </motion.div>

            {/* Offline Test */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleTestOfflineNotification}
                disabled={testingOffline}
              >
                {testingOffline ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <WifiOff className="w-5 h-5 text-purple-500" />
                )}
                <span className="text-xs">Mode hors-ligne</span>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Full Test Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tests complets
          </h4>
          
          <Button
            variant="default"
            className="w-full gap-2"
            onClick={handleTestCombined}
          >
            <Volume2 className="w-4 h-4" />
            Son + Vibration
          </Button>

          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={handleTestDatabaseNotification}
            disabled={testingPush || !userId}
          >
            {testingPush ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Notification temps réel (in-app)
          </Button>
        </div>

        {/* Help Text */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Astuce mobile:</strong> Assurez-vous que le mode silencieux est désactivé 
            et que les notifications sont autorisées dans les paramètres de votre appareil.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
