/**
 * useGPGeolocation - Passive geolocation tracking for GP transporters
 * 
 * V3 — Aligned with State Machine V2:
 * - After check-in (checked_in), system auto-detects departure → in_transit
 * - When GP arrives at destination country → arrived_destination
 * - GP only needs to scan at DEPOSIT and DELIVERY. Everything else is automatic.
 * 
 * Checks position every 30 minutes when tracking is active.
 * Uses reverse geocoding to detect country.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const GEOCODING_API = "https://nominatim.openstreetmap.org/reverse";

interface GeolocationState {
  consentGiven: boolean;
  trackingActive: boolean;
  lastCountry: string | null;
  lastCity: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastCheckAt: string | null;
  loading: boolean;
}

export function useGPGeolocation(gpId: string | null, userId: string | null) {
  const { toast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<GeolocationState>({
    consentGiven: false,
    trackingActive: false,
    lastCountry: null,
    lastCity: null,
    lastLat: null,
    lastLng: null,
    lastCheckAt: null,
    loading: true,
  });

  useEffect(() => {
    if (!gpId || !userId) return;
    loadConsent();
  }, [gpId, userId]);

  useEffect(() => {
    if (state.trackingActive && state.consentGiven && gpId) {
      performGeoCheck();
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
          lastLat: data.last_position_lat,
          lastLng: data.last_position_lng,
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
      setState(s => ({ ...s, consentGiven: true, trackingActive: true }));
      toast({ title: "✅ Géolocalisation activée", description: "Les statuts seront mis à jour automatiquement" });
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
      toast({ title: active ? "📍 Tracking activé" : "⏸️ Tracking en pause" });
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const revokeConsent = async () => {
    if (!gpId) return;
    try {
      await supabase
        .from("gp_geolocation_consent")
        .update({ consent_given: false, tracking_active: false })
        .eq("gp_id", gpId);
      setState(s => ({ ...s, consentGiven: false, trackingActive: false }));
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
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
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
        lastLat: lat,
        lastLng: lng,
        lastCheckAt: new Date().toISOString(),
      }));

      // Auto-update order statuses based on V2 state machine
      await checkAndUpdateOrders(country, city, lat, lng);
    } catch (err) {
      console.error("Geo check error:", err);
    }
  }, [gpId, state.consentGiven]);

  /**
   * V3 — State Machine V2 aligned auto-transitions:
   * 
   * checked_in + GP left origin country → scheduled_departure → in_transit
   * scheduled_departure + GP left origin → in_transit  
   * in_transit + GP entered destination country → arrived_destination
   * 
   * GP only manually scans at: deposit (→ checked_in) and delivery (→ delivery_confirmed)
   */
  const checkAndUpdateOrders = async (
    detectedCountry: string,
    detectedCity: string,
    lat: number,
    lng: number
  ) => {
    if (!gpId) return;

    try {
      // Get active orders aligned with V2 state machine
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id, status, origin_country, destination_country, order_number, client_id")
        .eq("gp_id", gpId)
        .in("status", [
          "checked_in",           // After deposit scan → waiting for departure
          "scheduled_departure",  // Departure scheduled → waiting for transit
          "in_transit",           // In transit → waiting for arrival
        ]);

      if (!activeOrders || activeOrders.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      const normalizedCountry = detectedCountry.toLowerCase().trim();

      const ordersToTransit: string[] = [];
      const ordersToArrived: string[] = [];

      for (const order of activeOrders) {
        const originNorm = (order.origin_country || "").toLowerCase().trim();
        const destNorm = (order.destination_country || "").toLowerCase().trim();

        // Rule 1: checked_in/scheduled_departure + left origin → in_transit
        if (
          (order.status === "checked_in" || order.status === "scheduled_departure") &&
          normalizedCountry !== originNorm &&
          originNorm
        ) {
          ordersToTransit.push(order.id);
        }

        // Rule 2: in_transit + entered destination → arrived_destination
        if (
          order.status === "in_transit" &&
          normalizedCountry === destNorm &&
          destNorm
        ) {
          ordersToArrived.push(order.id);
        }
      }

      // Execute auto-transitions
      for (const orderId of ordersToTransit) {
        // For checked_in, we need to go through scheduled_departure first if state machine requires
        const order = activeOrders.find(o => o.id === orderId);
        if (!order) continue;

        if (order.status === "checked_in") {
          // checked_in → scheduled_departure → in_transit (two steps)
          await supabase.from("orders").update({ status: "scheduled_departure" }).eq("id", orderId);
          // Small delay then transit
          await supabase.from("orders").update({ status: "in_transit" }).eq("id", orderId);
        } else {
          // scheduled_departure → in_transit
          await supabase.from("orders").update({ status: "in_transit" }).eq("id", orderId);
        }

        if (user) {
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            status: "in_transit",
            changed_by: user.id,
            changed_by_type: "system",
            notes: `🌍 Auto-GeoTrack: GP a quitté ${order?.origin_country} → Transit automatique (${detectedCountry})`,
          });
        }

        // Notify client
        if (order?.client_id) {
          await supabase.from("notifications").insert({
            user_id: order.client_id,
            type: "order_status",
            title: "🚚 Colis en transit !",
            message: `Votre colis ${order.order_number} est en route vers sa destination.`,
            related_type: "order",
            related_id: orderId,
          });
        }
      }

      for (const orderId of ordersToArrived) {
        const order = activeOrders.find(o => o.id === orderId);
        if (!order) continue;

        await supabase.from("orders").update({ status: "arrived_destination" }).eq("id", orderId);

        try {
          await supabase
            .from("order_logistics_options")
            .update({
              logistics_status: "awaiting_admin_delivery",
              gp_arrived_at: new Date().toISOString(),
            })
            .eq("order_id", orderId);
        } catch { /* ignore if no logistics options */ }

        if (user) {
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            status: "arrived_destination",
            changed_by: user.id,
            changed_by_type: "system",
            notes: `🌍 Auto-GeoTrack: GP arrivé au pays de destination (${detectedCountry}) — Mission dernier km créée`,
          });
        }

        if (order.client_id) {
          await supabase.from("notifications").insert({
            user_id: order.client_id,
            type: "order_status",
            title: "🎉 Colis arrivé à destination !",
            message: `Votre transporteur est arrivé au ${detectedCountry}. Livraison en préparation. Commande ${order.order_number}`,
            related_type: "order",
            related_id: orderId,
          });
        }
      }

      // Log the geo check
      const allAffected = [...ordersToTransit, ...ordersToArrived];
      const actionTriggered = ordersToTransit.length > 0
        ? "auto_transit"
        : ordersToArrived.length > 0
        ? "auto_arrived"
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
