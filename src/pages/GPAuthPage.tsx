/**
 * /gp/auth?token=[token] — Consommation d'un lien magique GP.
 *
 * 1. Cherche le token dans auth_tokens
 * 2. Si trouvé, non expiré et non utilisé → marque used=true, crée la
 *    session localStorage (24h) et redirige vers /gp/[ref_gp]
 * 3. Sinon → message "lien expiré ou déjà utilisé"
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { setGpSession, normalizeRef } from "@/lib/gpSession";

const NAVY = "#0A1628";
const GOLD = "#C97B3A";

export default function GPAuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const token = params.get("token") || "";

  /* Force light mode */
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => { if (hadDark) root.classList.add("dark"); };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setError(true); return; }

      const { data, error: err } = await supabase
        .from("auth_tokens")
        .select("token, phone, ref_gp, expires_at, used")
        .eq("token", token)
        .maybeSingle();
      if (!active) return;

      const valid =
        !err && data &&
        !data.used &&
        new Date(data.expires_at).getTime() > Date.now();

      if (!valid || !data) { setError(true); return; }

      // Consommer le token
      await supabase
        .from("auth_tokens")
        .update({ used: true })
        .eq("token", token);
      if (!active) return;

      const ref = normalizeRef(data.ref_gp);
      setGpSession(ref, data.phone || "");
      navigate(`/gp/${ref}`, { replace: true });
    })();
    return () => { active = false; };
  }, [token, navigate]);

  if (!error) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <Helmet>
          <title>Connexion GP — Konnekt</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto" style={{ color: GOLD }} />
          <p className="text-sm text-black/50 mt-3">Connexion en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-6" style={{ backgroundColor: "#F8FAFC" }}>
      <Helmet>
        <title>Lien expiré — Konnekt GP</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-sm border border-black/10 p-8">
        <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto" style={{ backgroundColor: "rgba(201,123,58,0.12)" }}>
          <AlertTriangle className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <h1 className="text-xl font-bold mt-5" style={{ color: NAVY }}>Lien expiré</h1>
        <p className="text-sm text-black/60 mt-2">Ce lien a expiré ou a déjà été utilisé.</p>
        <Link to="/gp/connexion" className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 font-bold text-sm text-white" style={{ backgroundColor: GOLD }}>
          Obtenir un nouveau lien
        </Link>
      </div>
    </div>
  );
}
