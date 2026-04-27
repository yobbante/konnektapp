/**
 * SiteLock — Global launch countdown overlay.
 *
 * Behavior:
 *  - Reads `app_lock_settings` (singleton, public read).
 *  - If `is_locked = true` AND now < launch_at, renders a countdown overlay
 *    on every route EXCEPT bypass paths and partner-token holders.
 *  - Bypass paths default to `/t*` (Yobbanté partners onboarding) and `/auth`.
 *  - Partner token: `?partner=<token>` stored in localStorage to grant access
 *    on subsequent visits.
 *  - Admins are never locked out.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Sparkles } from "lucide-react";

interface LockSettings {
  is_locked: boolean;
  launch_at: string;
  title: string;
  message: string;
  bypass_paths: string[];
  partner_token: string;
}

const PARTNER_KEY = "kkt_partner_access";

function pathMatches(pathname: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    if (!p) return false;
    if (p === pathname) return true;
    if (pathname.startsWith(p + "/")) return true;
    return false;
  });
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, diff };
}

export function SiteLock({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const [settings, setSettings] = useState<LockSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPartnerAccess, setHasPartnerAccess] = useState<boolean>(() => {
    try { return localStorage.getItem(PARTNER_KEY) === "1"; } catch { return false; }
  });

  // Load settings + admin flag in parallel
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: cfg }, { data: userRes }] = await Promise.all([
        supabase.from("app_lock_settings" as any).select("*").maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (!mounted) return;
      if (cfg) setSettings(cfg as unknown as LockSettings);
      if (userRes?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userRes.user.id);
        const adminRoles = ["admin", "moderator"];
        setIsAdmin(!!roles?.some((r: any) => adminRoles.includes(r.role)));
      }
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, [location.pathname]);

  // Honor ?partner=<token>
  useEffect(() => {
    const token = params.get("partner");
    if (token && settings?.partner_token && token === settings.partner_token) {
      try { localStorage.setItem(PARTNER_KEY, "1"); } catch {}
      setHasPartnerAccess(true);
    }
  }, [params, settings]);

  const launchDate = useMemo(
    () => (settings ? new Date(settings.launch_at) : new Date("2027-06-01T00:00:00Z")),
    [settings]
  );
  const cd = useCountdown(launchDate);

  const isBypassPath = useMemo(
    () => settings ? pathMatches(location.pathname, settings.bypass_paths) : true,
    [settings, location.pathname]
  );

  const shouldLock = useMemo(() => {
    if (!loaded || !settings) return false;
    if (!settings.is_locked) return false;
    if (cd.diff <= 0) return false;
    if (isAdmin) return false;
    if (hasPartnerAccess) return false;
    if (isBypassPath) return false;
    return true;
  }, [loaded, settings, cd.diff, isAdmin, hasPartnerAccess, isBypassPath]);

  if (!loaded) {
    // Avoid flashing children before we know the lock state
    return <div className="min-h-screen bg-background" />;
  }

  if (!shouldLock) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Soft background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.18),transparent_55%)] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] tracking-wider uppercase">
          <Lock className="w-3 h-3" /> Lancement officiel
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {settings?.title || "Konnekt arrive bientôt"}
        </h1>

        <p className="text-sm sm:text-base text-white/65 leading-relaxed">
          {settings?.message}
        </p>

        {/* Countdown */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: "Jours", value: cd.days },
            { label: "Heures", value: cd.hours },
            { label: "Min", value: cd.minutes },
            { label: "Sec", value: cd.seconds },
          ].map((t) => (
            <div key={t.label} className="bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums">
                {String(t.value).padStart(2, "0")}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{t.label}</div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <p className="text-xs text-white/45 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Accès anticipé réservé aux partenaires Yobbanté
          </p>
          <a
            href="/t"
            className="inline-block text-xs px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-white/90 transition"
          >
            Je suis transporteur partenaire
          </a>
        </div>
      </div>
    </div>
  );
}
