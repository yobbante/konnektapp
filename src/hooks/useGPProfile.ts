/**
 * useGPProfile — Single source of truth for GP profile data
 * Used across dashboard, departures, registration sync
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface GPProfileData {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  base_origin_city: string | null;
  base_origin_country: string | null;
  base_destination_city: string | null;
  base_destination_country: string | null;
  base_price_per_kg: number | null;
  default_currency: string | null;
  deposit_address: string | null;
  reception_address: string | null;
  phone: string;
  whatsapp_phone: string | null;
  explicit_restrictions: string[] | null;
  rating: number | null;
  total_deliveries: number | null;
  verified_at: string | null;
  kyc_level: number;
  kyc_status: string;
  withdrawal_limit: number;
  id_document_url: string | null;
  selfie_url: string | null;
  business_registration_url: string | null;
}

export function useGPProfile() {
  const navigate = useNavigate();
  const [gpProfile, setGpProfile] = useState<GPProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, base_origin_city, base_origin_country, base_destination_city, base_destination_country, base_price_per_kg, default_currency, deposit_address, reception_address, phone, whatsapp_phone, explicit_restrictions, rating, total_deliveries, verified_at, kyc_level, kyc_status, withdrawal_limit, id_document_url, selfie_url, business_registration_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile as GPProfileData);

      // Load order counts
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("gp_id", profile.id);

      setPendingCount(orders?.filter(o => o.status === "pending").length || 0);
      setActiveCount(orders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);
    } catch (error) {
      console.error("Error loading GP profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = gpProfile?.status === "verified";
  const isPending = gpProfile?.status === "pending";

  const gpRoute = gpProfile ? {
    originCity: gpProfile.base_origin_city || "",
    originCountry: gpProfile.base_origin_country || "",
    destinationCity: gpProfile.base_destination_city || "",
    destinationCountry: gpProfile.base_destination_country || "",
  } : null;

  const gpPricing = gpProfile ? {
    basePricePerKg: gpProfile.base_price_per_kg || 0,
    currency: gpProfile.default_currency || "XOF",
  } : null;

  return {
    gpProfile,
    loading,
    pendingCount,
    activeCount,
    isVerified,
    isPending,
    gpRoute,
    gpPricing,
    reload: loadProfile,
  };
}
