import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveCity {
  id: string;
  city: string;
  country_code: string;
  country_name: string;
  flag: string;
  is_active: boolean;
  sort_order: number;
}

// Fallback cities if DB fetch fails (matches the initial seed)
const FALLBACK_CITIES: ActiveCity[] = [
  { id: "1", city: "Dakar", country_code: "SN", country_name: "Sénégal", flag: "🇸🇳", is_active: true, sort_order: 0 },
  { id: "2", city: "Paris", country_code: "FR", country_name: "France", flag: "🇫🇷", is_active: true, sort_order: 32 },
  { id: "3", city: "Abidjan", country_code: "CI", country_name: "Côte d'Ivoire", flag: "🇨🇮", is_active: true, sort_order: 1 },
];

let cachedCities: ActiveCity[] | null = null;

export function useActiveCities() {
  const [cities, setCities] = useState<ActiveCity[]>(cachedCities || []);
  const [loading, setLoading] = useState(!cachedCities);

  useEffect(() => {
    if (cachedCities) return;
    
    const fetch = async () => {
      const { data, error } = await supabase
        .from("platform_active_cities")
        .select("id, city, country_code, country_name, flag, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (error || !data?.length) {
        cachedCities = FALLBACK_CITIES;
      } else {
        cachedCities = data as ActiveCity[];
      }
      setCities(cachedCities);
      setLoading(false);
    };
    fetch();
  }, []);

  return { cities, loading };
}

// For admin: fetch ALL cities including inactive
export function useAllPlatformCities() {
  const [cities, setCities] = useState<ActiveCity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_active_cities")
      .select("id, city, country_code, country_name, flag, is_active, sort_order")
      .order("sort_order");

    if (!error && data) {
      setCities(data as ActiveCity[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCities(); }, []);

  return { cities, loading, refetch: fetchCities };
}

// Invalidate cache when admin makes changes
export function invalidateCityCache() {
  cachedCities = null;
}
