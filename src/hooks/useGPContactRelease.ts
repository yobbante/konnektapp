import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for progressive GP contact information release
 * Based on PRD V1:
 * - Before booking: No address, no phone (public profile only)
 * - After payment: Deposit address + WhatsApp
 * - After delivery confirmation: Reception address + secondary phone
 */

interface GPPublicInfo {
  id: string;
  business_name: string;
  rating: number | null;
  verified_at: string | null;
  city: string;
  country_code: string;
  default_currency: string | null;
  explicit_restrictions: string[] | null;
  gp_type: string;
  description: string | null;
}

interface GPContactInfo {
  deposit_address: string | null;
  whatsapp_number: string | null;
  reception_address: string | null;
  phone_secondary: string | null;
}

interface OrderContext {
  orderId: string;
  status: string;
  paymentStatus: string;
}

interface UseGPContactReleaseResult {
  // Public info (always visible)
  publicInfo: GPPublicInfo | null;
  // Contact info (released progressively)
  contactInfo: GPContactInfo;
  // Release state
  canSeeDepositAddress: boolean;
  canSeeWhatsApp: boolean;
  canSeeReceptionAddress: boolean;
  canSeeSecondaryPhone: boolean;
  // Loading state
  loading: boolean;
  error: string | null;
}

export function useGPContactRelease(
  gpId: string | undefined,
  orderContext?: OrderContext
): UseGPContactReleaseResult {
  const [publicInfo, setPublicInfo] = useState<GPPublicInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<GPContactInfo>({
    deposit_address: null,
    whatsapp_number: null,
    reception_address: null,
    phone_secondary: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate release permissions based on order context
  const hasOrderContext = !!orderContext;
  const isPaid = orderContext?.paymentStatus === "paid";
  // Include 'confirmed' for backwards compatibility
  const isAcceptedOrBeyond = orderContext?.status && 
    ["accepted", "confirmed", "collected", "in_transit", "arrived", "delivered"].includes(orderContext.status);
  const isDelivered = orderContext?.status === "delivered";

  // Release conditions - show contact info as soon as GP accepts (or payment confirmed)
  const canSeeDepositAddress = hasOrderContext && (isPaid || isAcceptedOrBeyond);
  const canSeeWhatsApp = hasOrderContext && (isPaid || isAcceptedOrBeyond);
  const canSeeReceptionAddress = hasOrderContext && isDelivered;
  const canSeeSecondaryPhone = hasOrderContext && isDelivered;

  useEffect(() => {
    if (!gpId) {
      setLoading(false);
      return;
    }

    loadGPInfo();
  }, [gpId, orderContext?.orderId, orderContext?.status, orderContext?.paymentStatus]);

  const loadGPInfo = async () => {
    if (!gpId) return;

    try {
      setLoading(true);
      setError(null);

      // Always load public info from public_gp_profiles view
      const { data: publicData, error: publicError } = await supabase
        .from("public_gp_profiles")
        .select("*")
        .eq("id", gpId)
        .maybeSingle();

      if (publicError) {
        // If view doesn't exist, fallback to gp_profiles
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("gp_profiles")
          .select("id, business_name, rating, verified_at, city, country_code, default_currency, explicit_restrictions, gp_type, description")
          .eq("id", gpId)
          .eq("status", "verified")
          .maybeSingle();

        if (fallbackError) throw fallbackError;
        setPublicInfo(fallbackData);
      } else {
        setPublicInfo(publicData);
      }

      // If we have order context and proper permissions, load contact info
      if (orderContext && (canSeeDepositAddress || canSeeWhatsApp || canSeeReceptionAddress)) {
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            id,
            status,
            payment_status,
            gp_id
          `)
          .eq("id", orderContext.orderId)
          .single();

        if (!orderError && orderData) {
          // Load GP contact details based on permissions
          const { data: gpData } = await supabase
            .from("gp_profiles")
            .select("deposit_address, reception_address, phone, phone_secondary, whatsapp, whatsapp_phone")
            .eq("id", gpId)
            .single();

          if (gpData) {
            setContactInfo({
              deposit_address: canSeeDepositAddress ? gpData.deposit_address : null,
              whatsapp_number: canSeeWhatsApp 
                ? (gpData.whatsapp_phone || gpData.whatsapp || gpData.phone)
                : null,
              reception_address: canSeeReceptionAddress 
                ? (gpData.reception_address || gpData.deposit_address)
                : null,
              phone_secondary: canSeeSecondaryPhone ? gpData.phone_secondary : null,
            });
          }
        }
      }
    } catch (err: any) {
      console.error("Error loading GP info:", err);
      setError(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  return {
    publicInfo,
    contactInfo,
    canSeeDepositAddress,
    canSeeWhatsApp,
    canSeeReceptionAddress,
    canSeeSecondaryPhone,
    loading,
    error,
  };
}

/**
 * Component to display progressive contact info
 */
export function getReleaseMessage(
  hasOrderContext: boolean,
  isPaid: boolean,
  isDelivered: boolean
): string {
  if (!hasOrderContext) {
    return "Réservez pour accéder aux coordonnées du transporteur";
  }
  if (!isPaid) {
    return "Finalisez le paiement pour voir l'adresse de dépôt";
  }
  if (!isDelivered) {
    return "L'adresse de réception sera visible après confirmation de livraison";
  }
  return "Toutes les coordonnées sont disponibles";
}
