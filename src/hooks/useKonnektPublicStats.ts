/**
 * useKonnektPublicStats — Chiffres publics affichés sur /gp et autres landings.
 *
 * - transporteurs : gp_profiles avec status='verified'
 * - livraisons    : orders avec status='delivered'
 * - pays          : pays distincts des trajets GP actifs (departure_country / arrival_country)
 *
 * Renvoie des fallbacks qualitatifs tant que la donnée n'est pas chargée
 * (ou en cas d'erreur), pour éviter le flash "0".
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KonnektPublicStats {
  transporteurs: string;
  livraisons: string;
  pays: string;
  loading: boolean;
}

const FALLBACK: KonnektPublicStats = {
  transporteurs: "Des centaines",
  livraisons: "Garanti",
  pays: "Partout",
  loading: true,
};

function format(n: number, suffix = "+"): string {
  if (n <= 0) return "—";
  if (n < 10) return `${n}`;
  if (n < 100) return `${Math.floor(n / 10) * 10}${suffix}`;
  if (n < 1000) return `${Math.floor(n / 100) * 100}${suffix}`;
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k${suffix}`;
}

export function useKonnektPublicStats(): KonnektPublicStats {
  const [stats, setStats] = useState<KonnektPublicStats>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [gpRes, ordersRes, tripsRes] = await Promise.all([
          supabase
            .from("gp_profiles")
            .select("id", { count: "exact", head: true })
            .eq("status", "verified"),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", "delivered"),
          supabase
            .from("gp_routes")
            .select("origin_country, destination_country")
            .eq("is_active", true)
            .limit(1000),
        ]);

        if (cancelled) return;

        const countries = new Set<string>();
        (tripsRes.data || []).forEach((t: any) => {
          if (t.origin_country) countries.add(String(t.origin_country).toUpperCase());
          if (t.destination_country) countries.add(String(t.destination_country).toUpperCase());
        });

        const tCount = gpRes.count ?? 0;
        const oCount = ordersRes.count ?? 0;

        setStats({
          transporteurs: tCount > 0 ? format(tCount) : FALLBACK.transporteurs,
          livraisons: oCount > 0 ? format(oCount) : FALLBACK.livraisons,
          pays: countries.size > 0 ? `${countries.size}` : FALLBACK.pays,
          loading: false,
        });
      } catch {
        if (!cancelled) setStats({ ...FALLBACK, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
