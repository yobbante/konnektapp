/**
 * useGPGeolocation - Passive geolocation tracking for GP transporters
 * 
 * V2 Vision: Auto-detect country changes to trigger status updates:
 * - If GP leaves origin country → orders become "in_transit"
 * - If GP enters destination country → orders become "arrived"
 * 
 * Checks position every 60 minutes when tracking is active.
 * Uses reverse geocoding to detect country.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
const GEOCODING_API = "https://nominatim.openstreetmap.org/reverse";

interface GeolocationState {
  consentGiven: boolean;
  trackingActive: boolean;
  lastCountry: string | null;
  lastCity: string | null;
  lastCheckAt: string | null;
  loading: boolean;
}

interface GeoPosition {
  lat: number;
  lng: number;
  country: string;
  city: string;
}

export function useGPGeolocation(gpId: string | null, userId: string | null) {
  const { toast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<GeolocationState>({
    consentGiven: false,
    trackingActive: false,
    lastCountry: null,
    lastCity: null,
    lastCheckAt: null,
    loading: true,
  });

  // Load consent state
  useEffect(() => {
    if (!gpId || !userId) return;
    loadConsent();
  }, [gpId, userId]);

  // Start/stop interval based on tracking state
  useEffect(() => {
    if (state.trackingActive && state.consentGiven && gpId) {
      // Initial check
      performGeoCheck();
      // Set interval
      intervalRef.current = setInterval(performGeoCheck, CHECK_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.trackingActive, state.consentGiven, gpId]);

  const loadConsent = async () => {
    if (!gpId) return;
    try {
      const { data } = await supabase
        .from("gp_geolocation_consent")
        .select("*")
        .eq("gp_id", gpId)
        .maybeSingle();

      if (data) {
        setState({
          consentGiven: data.consent_given,
          trackingActive: data.tracking_active,
          lastCountry: data.last_detected_country,
          lastCity: data.last_detected_city,
          lastCheckAt: data.last_check_at,
          loading: false,
        });
      } else {
        setState(s => ({ ...s, loading: false }));
      }
    } catch (err) {
      console.error("Error loading geo consent:", err);
      setState(s => ({ ...s, loading: false }));
    }
  };

  const giveConsent = async () => {
    if (!gpId || !userId) return;

    try {
      const { error } = await supabase
        .from("gp_geolocation_consent")
        .upsert({
          gp_id: gpId,
          user_id: userId,
          consent_given: true,
          consent_given_at: new Date().toISOString(),
          tracking_active: true,
        }, { onConflict: "gp_id" });

      if (error) throw error;

      setState(s => ({
        ...s,
        consentGiven: true,
        trackingActive: true,
      }));

      toast({ title: "✅ Géolocalisation activée", description: "Vos statuts seront mis à jour automatiquement" });
    } catch (err) {
      console.error("Consent error:", err);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const toggleTracking = async (active: boolean) => {
    if (!gpId) return;

    try {
      await supabase
        .from("gp_geolocation_consent")
        .update({ tracking_active: active })
        .eq("gp_id", gpId);

      setState(s => ({ ...s, trackingActive: active }));
      toast({ 
        title: active ? "📍 Tracking activé" : "⏸️ Tracking en pause",
      });
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const revokeConsent = async () => {
    if (!gpId) return;

    try {
      await supabase
        .from("gp_geolocation_consent")
        .update({ 
          consent_given: false, 
          tracking_active: false,
        })
        .eq("gp_id", gpId);

      setState(s => ({
        ...s,
        consentGiven: false,
        trackingActive: false,
      }));

      toast({ title: "Géolocalisation désactivée" });
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, // Low accuracy = less battery
        timeout: 15000,
        maximumAge: 300000, // 5 min cache OK
      });
    });
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<{ country: string; city: string }> => {
    try {
      const response = await fetch(
        `${GEOCODING_API}?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
        { headers: { "User-Agent": "KonnektApp/1.0" } }
      );
      const data = await response.json();
      return {
        country: data.address?.country || "Inconnu",
        city: data.address?.city || data.address?.town || data.address?.village || "Inconnu",
      };
    } catch {
      return { country: "Inconnu", city: "Inconnu" };
    }
  };

  const performGeoCheck = useCallback(async () => {
    if (!gpId || !state.consentGiven) return;

    try {
      const position = await getCurrentPosition();
      const { latitude: lat, longitude: lng } = position.coords;
      const { country, city } = await reverseGeocode(lat, lng);

      // Update consent record with latest position
      await supabase
        .from("gp_geolocation_consent")
        .update({
          last_detected_country: country,
          last_detected_city: city,
          last_position_lat: lat,
          last_position_lng: lng,
          last_check_at: new Date().toISOString(),
        })
        .eq("gp_id", gpId);

      setState(s => ({
        ...s,
        lastCountry: country,
        lastCity: city,
        lastCheckAt: new Date().toISOString(),
      }));

      // Check if country changed and auto-update order statuses
      await checkAndUpdateOrders(country, city, lat, lng);

    } catch (err) {
      console.error("Geo check error:", err);
    }
  }, [gpId, state.consentGiven]);

  const checkAndUpdateOrders = async (
    detectedCountry: string,
    detectedCity: string,
    lat: number,
    lng: number
  ) => {
    if (!gpId) return;

    try {
      // Get active orders for this GP
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id, status, origin_country, destination_country, order_number")
        .eq("gp_id", gpId)
        .in("status", ["collected", "in_transit"]);

      if (!activeOrders || activeOrders.length === 0) return;

      const ordersToTransit: string[] = [];
      const ordersToArrived: string[] = [];
      const normalizedCountry = detectedCountry.toLowerCase().trim();

      for (const order of activeOrders) {
        const originNorm = (order.origin_country || "").toLowerCase().trim();
        const destNorm = (order.destination_country || "").toLowerCase().trim();

        // Rule 1: GP left origin country → "in_transit"
        if (order.status === "collected" && normalizedCountry !== originNorm && originNorm) {
          ordersToTransit.push(order.id);
        }

        // Rule 2: GP entered destination country → "arrived" (keep in_transit → arrived)
        if (order.status === "in_transit" && normalizedCountry === destNorm && destNorm) {
          ordersToArrived.push(order.id);
        }
      }

      // Apply auto-status changes
      const { data: { user } } = await supabase.auth.getUser();

      if (ordersToTransit.length > 0) {
        for (const orderId of ordersToTransit) {
          await supabase.from("orders").update({ status: "in_transit" }).eq("id", orderId);
          if (user) {
            await supabase.from("order_status_history").insert({
              order_id: orderId,
              status: "in_transit",
              changed_by: user.id,
              changed_by_type: "system",
              notes: `🌍 Auto-détection géolocalisation: GP a quitté le pays d'origine (${detectedCountry})`,
            });
          }
        }
      }

      if (ordersToArrived.length > 0) {
        for (const orderId of ordersToArrived) {
          // Update logistics options to trigger admin delivery workflow
          await supabase
            .from("order_logistics_options")
            .update({
              logistics_status: "awaiting_admin_delivery",
              gp_arrived_at: new Date().toISOString(),
            })
            .eq("order_id", orderId);

          // Log the arrival in order history
          if (user) {
            await supabase.from("order_status_history").insert({
              order_id: orderId,
              status: "in_transit" as any,
              changed_by: user.id,
              changed_by_type: "system",
              notes: `🌍 GeoTrack™: GP arrivé au pays de destination (${detectedCountry}) — Mission dernier km créée`,
            });
          }

          // Notify client
          const order = activeOrders.find(o => o.id === orderId);
          if (order) {
            const { data: orderData } = await supabase
              .from("orders")
              .select("client_id")
              .eq("id", orderId)
              .single();
            if (orderData) {
              await supabase.from("notifications").insert({
                user_id: orderData.client_id,
                type: "order_status",
                title: "🎉 Colis arrivé à destination !",
                message: `Votre transporteur est arrivé au ${detectedCountry}. La livraison dernier km est en préparation. Commande ${order.order_number}`,
                related_type: "order",
                related_id: orderId,
              });
            }
          }
        }
      }

      // Log the geo check
      const allAffected = [...ordersToTransit, ...ordersToArrived];
      const actionTriggered = ordersToTransit.length > 0 
        ? "status_in_transit" 
        : ordersToArrived.length > 0 
        ? "status_arrived" 
        : null;

      await supabase.from("gp_geolocation_logs").insert({
        gp_id: gpId,
        detected_country: detectedCountry,
        detected_city: detectedCity,
        latitude: lat,
        longitude: lng,
        action_triggered: actionTriggered,
        orders_affected: allAffected.length > 0 ? allAffected : null,
      });

    } catch (err) {
      console.error("Auto-update error:", err);
    }
  };

  return {
    ...state,
    giveConsent,
    toggleTracking,
    revokeConsent,
    performGeoCheck,
  };
}
