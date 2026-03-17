import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission | null;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  serviceWorkerReady: boolean;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      
      // Register service worker for push notifications
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      // Check if already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration();
      
      if (existingRegistration) {
        console.log("[Push] Service worker already registered:", existingRegistration);
        setServiceWorkerReady(true);
        return existingRegistration;
      }

      // The PWA plugin registers the main SW, but we need to ensure push is ready
      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] Service worker ready:", registration);
      setServiceWorkerReady(true);
      return registration;
    } catch (error) {
      console.error("[Push] Service worker registration failed:", error);
      return null;
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "Les notifications push ne sont pas supportées sur ce navigateur",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        // Ensure service worker is ready
        await registerServiceWorker();
        
        toast({
          title: "Notifications activées ✓",
          description: "Vous recevrez des alertes même quand l'app est fermée",
        });
        return true;
      } else if (result === "denied") {
        toast({
          title: "Notifications bloquées",
          description: "Activez les notifications dans les paramètres de votre navigateur",
          variant: "destructive",
        });
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported, toast]);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted") {
      console.log("Cannot show notification - not supported or not granted");
      return;
    }

    try {
      // Try to use service worker notification first (works when app is closed)
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration && serviceWorkerReady) {
        // Cast to any to use ServiceWorkerRegistration.showNotification with all options
        await registration.showNotification(title, {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          requireInteraction: false,
          tag: options?.tag || `konnekt-${Date.now()}`,
          ...options,
        } as NotificationOptions);
      } else {
        // Fallback to regular notification
        const notification = new Notification(title, {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          requireInteraction: false,
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }, [isSupported, permission, serviceWorkerReady]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    serviceWorkerReady,
  };
}

// Enhanced hook that also listens for realtime events
interface UseRealtimePushNotificationsProps {
  userId: string | null;
  enabled?: boolean;
}

export function useRealtimePushNotifications({ 
  userId, 
  enabled = true 
}: UseRealtimePushNotificationsProps) {
  const { isSupported, permission, requestPermission, showNotification } = usePushNotifications();

  useEffect(() => {
    if (!userId || !enabled || permission !== "granted") return;

    // Subscribe to new offers matching saved searches
    const offersChannel = supabase
      .channel(`offers-push-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gp_offers",
        },
        (payload) => {
          const offer = payload.new;
          showNotification("Nouvelle offre disponible", {
            body: `${offer.origin_city} → ${offer.destination_city} • ${offer.price_per_kg} FCFA/kg`,
            tag: `offer-${offer.id}`,
            data: { type: "offer", id: offer.id },
          });
        }
      )
      .subscribe();

    // Subscribe to order status changes for the user
    const ordersChannel = supabase
      .channel(`orders-push-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `client_id=eq.${userId}`,
        },
        (payload) => {
          const order = payload.new;
          const oldOrder = payload.old;
          
          // Only notify on status change
          if (order.status !== oldOrder.status) {
            const statusLabels: Record<string, string> = {
              pending: "en attente",
              accepted: "acceptée",
              collected: "collectée",
              in_transit: "en transit",
              delivered: "livrée",
              cancelled: "annulée",
            };
            
            const statusLabel = statusLabels[order.status] || order.status;
            
            showNotification(`Commande ${statusLabel}`, {
              body: `Votre commande ${order.order_number} est maintenant ${statusLabel}`,
              tag: `order-${order.id}`,
              data: { type: "order", id: order.id },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(offersChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [userId, enabled, permission, showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
}
