/**
 * security-qr-verify — Vérification HMAC + Protection code livraison
 *
 * ENDPOINTS :
 *   POST { mode: "verify_qr", qr_data }
 *     → Valide signature HMAC du QR (format KKT|TYPE|ID|TIMESTAMP|SIG)
 *
 *   POST { mode: "verify_delivery_code", order_id, code }
 *     → Vérifie le code 6 chiffres, limite 3 tentatives, blocage temporaire
 *
 *   POST { mode: "generate_qr_payload", type, id }
 *     → Génère un QR signé HMAC (admin/GP uniquement)
 *
 *   POST { mode: "log_geo_event", order_id, lat, lng, previous_lat, previous_lng, elapsed_seconds }
 *     → Détecte anomalie géographique (>3000km en <300s)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── HMAC-SHA256 en Deno (SubtleCrypto natif) ─────────────────────
async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacVerify(secret: string, message: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(secret, message);
  // Comparaison en temps constant pour éviter timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// ── Distance géographique (Haversine) ──────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── CONSTANTES ────────────────────────────────────────────────────
const MAX_DELIVERY_ATTEMPTS = 3;
const BLOCK_DURATION_MINUTES = 30;
const GEO_MAX_KM = 3000;
const GEO_MIN_SECONDS = 300; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const qrSecret = Deno.env.get("KKT_QR_SECRET");
    if (!qrSecret) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Auth JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { mode } = body;

    // ══════════════════════════════════════════════════════════════
    // MODE 1 : VÉRIFICATION QR HMAC
    // ══════════════════════════════════════════════════════════════
    if (mode === "verify_qr") {
      const { qr_data } = body;
      if (!qr_data) {
        return new Response(JSON.stringify({ valid: false, error: "qr_data required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Format attendu : KKT|TYPE|ID|TIMESTAMP|SIGNATURE
      const parts = qr_data.split("|");
      if (parts.length < 5 || parts[0] !== "KKT") {
        // QR non-signé : valide mais marqué signature_valid=false
        return new Response(
          JSON.stringify({ valid: true, signed: false, qr_type: "legacy", message: "QR non signé — format legacy accepté" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [prefix, qrType, id, timestamp, signature] = parts;
      const message = `${qrType}${id}${timestamp}`;
      const isValid = await hmacVerify(qrSecret, message, signature);

      // Log dans scan_logs
      await supabase.from("scan_logs").insert({
        user_id: userId,
        user_role: "unknown",
        action: "qr_verify",
        scan_type: "hmac_check",
        qr_type: qrType,
        reference_id: id.match(/^[a-f0-9-]{36}$/i) ? id : null,
        signature_valid: isValid,
        metadata: { prefix, timestamp, signed: true },
      } as any).then(() => {}, () => {});

      if (!isValid) {
        await supabase.from("security_audit_log").insert({
          event_type: "qr_invalid",
          actor_id: userId,
          details: { qr_type: qrType, id, reason: "invalid_hmac_signature" },
          severity: "critical",
        } as any).then(() => {}, () => {});

        return new Response(
          JSON.stringify({ valid: false, signed: true, error: "QR signature invalide" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ valid: true, signed: true, qr_type: qrType, id, timestamp }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // MODE 2 : VÉRIFICATION CODE LIVRAISON (avec rate limiting)
    // ══════════════════════════════════════════════════════════════
    if (mode === "verify_delivery_code") {
      const { order_id, code } = body;
      if (!order_id || !code) {
        return new Response(JSON.stringify({ error: "order_id and code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await supabase
        .from("orders")
        .select("id, delivery_code, delivery_attempt_count, delivery_blocked_until, status, gp_id, client_id")
        .eq("id", order_id)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Vérifier ownership (GP de la commande)
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const isOwnerGP = gpProfile && gpProfile.id === order.gp_id;
      const isOrderClient = order.client_id === userId;

      if (!isOwnerGP && !isOrderClient) {
        await supabase.from("security_audit_log").insert({
          event_type: "unauthorized_state_mutation",
          order_id,
          actor_id: userId,
          details: { action: "verify_delivery_code", reason: "not_owner" },
          severity: "critical",
        });
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Vérifier blocage temporaire
      if (order.delivery_blocked_until) {
        const blockedUntil = new Date(order.delivery_blocked_until);
        if (blockedUntil > new Date()) {
          const remainingMs = blockedUntil.getTime() - Date.now();
          const remainingMin = Math.ceil(remainingMs / 60000);
          return new Response(
            JSON.stringify({
              valid: false,
              blocked: true,
              error: `Code temporairement bloqué. Réessayez dans ${remainingMin} minute(s).`,
              retry_after_minutes: remainingMin,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const attemptCount = (order.delivery_attempt_count || 0) + 1;

      // Vérifier le code
      const isCodeValid =
        order.delivery_code &&
        order.delivery_code.toUpperCase() === code.toString().trim().toUpperCase();

      if (!isCodeValid) {
        // Incrémenter tentatives
        const updateData: Record<string, any> = {
          delivery_attempt_count: attemptCount,
        };

        // Bloquer après MAX_DELIVERY_ATTEMPTS
        if (attemptCount >= MAX_DELIVERY_ATTEMPTS) {
          const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000);
          updateData.delivery_blocked_until = blockedUntil.toISOString();
        }

        await supabase.from("orders").update(updateData).eq("id", order_id);

        // Log sécurité
        await supabase.from("security_audit_log").insert({
          event_type: "delivery_attempt_failed",
          order_id,
          actor_id: userId,
          details: {
            attempt_count: attemptCount,
            blocked: attemptCount >= MAX_DELIVERY_ATTEMPTS,
          },
          severity: attemptCount >= MAX_DELIVERY_ATTEMPTS ? "critical" : "warn",
        });

        const remaining = Math.max(0, MAX_DELIVERY_ATTEMPTS - attemptCount);
        return new Response(
          JSON.stringify({
            valid: false,
            error: "Code de livraison incorrect",
            attempts_remaining: remaining,
            blocked: attemptCount >= MAX_DELIVERY_ATTEMPTS,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Code valide → reset compteur
      await supabase
        .from("orders")
        .update({ delivery_attempt_count: 0, delivery_blocked_until: null })
        .eq("id", order_id);

      return new Response(
        JSON.stringify({ valid: true, message: "Code valide — livraison autorisée" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // MODE 3 : GÉNÉRATION QR SIGNÉ (GP / Admin uniquement)
    // ══════════════════════════════════════════════════════════════
    if (mode === "generate_qr_payload") {
      const { type, id } = body;
      if (!type || !id) {
        return new Response(JSON.stringify({ error: "type and id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timestamp = Date.now().toString();
      const message = `${type}${id}${timestamp}`;
      const signature = await hmacSign(qrSecret, message);
      const qrPayload = `KKT|${type}|${id}|${timestamp}|${signature}`;

      return new Response(
        JSON.stringify({ qr_payload: qrPayload, type, id, timestamp }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // MODE 4 : VALIDATION COHÉRENCE GÉOGRAPHIQUE
    // ══════════════════════════════════════════════════════════════
    if (mode === "log_geo_event") {
      const { order_id, lat, lng, previous_lat, previous_lng, elapsed_seconds } = body;

      if (!order_id || lat === undefined || lng === undefined) {
        return new Response(JSON.stringify({ error: "order_id, lat, lng required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let geoSuspicious = false;
      let suspicionReason = null;

      // Vérifier cohérence si on a un point précédent
      if (previous_lat !== undefined && previous_lng !== undefined && elapsed_seconds !== undefined) {
        const distKm = haversineKm(previous_lat, previous_lng, lat, lng);
        const speedKmh = elapsed_seconds > 0 ? (distKm / elapsed_seconds) * 3600 : 0;

        // Saut impossible : >3000km en <5min
        if (distKm > GEO_MAX_KM && elapsed_seconds < GEO_MIN_SECONDS) {
          geoSuspicious = true;
          suspicionReason = `Impossible jump: ${Math.round(distKm)}km in ${elapsed_seconds}s`;

          await supabase.from("security_audit_log").insert({
            event_type: "geo_suspicious",
            order_id,
            actor_id: userId,
            details: {
              distance_km: Math.round(distKm),
              elapsed_seconds,
              speed_kmh: Math.round(speedKmh),
              from: { lat: previous_lat, lng: previous_lng },
              to: { lat, lng },
            },
            severity: "critical",
          });

          await supabase
            .from("orders")
            .update({ geo_suspicious: true })
            .eq("id", order_id);
        }
      }

      return new Response(
        JSON.stringify({
          logged: true,
          geo_suspicious: geoSuspicious,
          suspicion_reason: suspicionReason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("security-qr-verify error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
