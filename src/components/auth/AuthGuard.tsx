import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/PageLoader";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = [
  "/auth", 
  "/gp", 
  "/onboarding",
  "/gp/inscription", 
  "/transporteur/inscription",
  "/gp/bagages/inscription",
  "/routier/inscription",
  "/tracking",
  "/offres",
  "/install",
  "/",
  "/client/transporteurs",
  "/track",
  "/deliver",
  "/public-tracking",
  "/t",
];

// Routes réservées aux admins
const ADMIN_ROUTES = [
  "/admin",
  "/admin/departures",
  "/admin/orders",
  "/admin/gp",
  "/admin/order",
  "/admin/messages",
  "/admin/search",
];

const AGENT_ROUTES = ["/agent"];

const TRANSPORTER_ROUTES = [
  "/gp/dashboard",
  "/gp/apercu",
  "/gp/colis",
  "/gp/demandes",
  "/gp/en-cours",
  "/gp/historique",
  "/gp/calendrier",
  "/gp/depart",
  "/gp/tarification",
  "/gp/scan",
  "/gp/messages",
  "/gp/parametres",
  "/gp/wallet",
  "/gp/profil-public",
  "/gp/requests",
  "/gp/order",
  "/gp/distribution",
  "/gp/ktp-geotrack",
  "/gp/performances",
  "/gp/premium",
  "/transporter/profile",
];

const MOBILITY_ROUTES = [
  "/mobility/dashboard",
  "/mobility/apercu",
  "/mobility/publier",
  "/mobility/scan-ticket",
  "/mobility/wallet",
  "/mobility/vehicules",
  "/mobility/ticket",
];

// Routes EXCLUSIVEMENT client — un GP n'y a JAMAIS accès
const CLIENT_ONLY_ROUTES = [
  "/profil",
  "/client",
  "/favoris",
  "/favorites",
  "/saved-searches",
  "/historique",
  "/destinataires",
  "/scan",
  "/envoyer",
  "/demande",
  "/reservation",
  "/booking",
  "/order",
  "/payer-supplement",
  "/confirmer-reception",
  "/assurance",
  "/loyalty",
];

const CLIENT_ROUTES = [
  "/client/dashboard",
  "/client/profile",
];



const isPublicRoute = (pathname: string): boolean => {
  if (isTransporterRoute(pathname) || isMobilityRoute(pathname)) return false;
  return PUBLIC_ROUTES.some(route => {
    if (route === pathname) return true;
    if (pathname.startsWith(route + "/")) return true;
    if (route.endsWith("/") && pathname.startsWith(route)) return true;
    return false;
  });
};

const isAdminRoute = (pathname: string): boolean => {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
};

const isTransporterRoute = (pathname: string): boolean => {
  return TRANSPORTER_ROUTES.some(route => pathname.startsWith(route));
};

// Une route est "protégée connue" si elle correspond à un espace nécessitant une session.
// Les routes inconnues (404) ne le sont pas → on laisse la page 404 s'afficher pour les visiteurs.
const isKnownProtectedRoute = (pathname: string): boolean => {
  if (isMobilityRoute(pathname)) return true;
  if (isAdminRoute(pathname)) return true;
  if (isTransporterRoute(pathname)) return true;
  if (AGENT_ROUTES.some(route => pathname.startsWith(route))) return true;
  return false;
};

const isMobilityRoute = (pathname: string): boolean => {
  return MOBILITY_ROUTES.some(route => pathname.startsWith(route));
};

const isClientRoute = (pathname: string): boolean => {
  return CLIENT_ROUTES.some(route => pathname.startsWith(route));
};

const isClientOnlyRoute = (pathname: string): boolean => {
  return CLIENT_ONLY_ROUTES.some(route => {
    if (route === pathname) return true;
    if (pathname.startsWith(route + "/")) return true;
    return false;
  });
};

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let deferred: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setAuthError(false);
    const timeout = setTimeout(() => {
      if (!isMounted) return;
      setAuthenticated(false);
      setAuthError(true);
      setLoading(false);
    }, 15000);
    const run = async () => {
      await checkAuth();
      if (isMounted) clearTimeout(timeout);
    };
    void run();
    // Never issue auth/database requests while the auth callback holds its lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      clearTimeout(deferred);
      deferred = setTimeout(() => { if (isMounted) void run(); }, 0);
    });
    return () => {
      isMounted = false;
      clearTimeout(timeout);
      clearTimeout(deferred);
      subscription.unsubscribe();
    };
  }, [location.pathname, attempt]);

  const checkRoleAccess = async (userId: string, email: string) => {
    const pathname = location.pathname;
    // A Cloud account must not hijack the separate invitation/session flow.
    if (/^\/gp\/(?:connexion|login|auth|GP\d+)$/i.test(pathname) || pathname.startsWith("/onboarding/")) return;

    try {
      // Resolve authoritative roles before transporter onboarding/isolation.
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (rolesError) throw rolesError;
      const roles = rolesData?.map(r => r.role) || [];
      const hasAdminAccess = roles.includes("admin") || roles.includes("moderator");
      const isAgent = roles.includes("agent_logistique");
      if (hasAdminAccess) return;

      // Check if user is GP BEFORE public route early return
      // GP users must be redirected even from public routes like "/"
      const [gpRes, mobilityRes] = await Promise.all([
        supabase
          .from("gp_profiles")
          .select("id, price_locked_at, gp_type, status")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("mobility_profiles")
          .select("id, status")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (gpRes.error) throw gpRes.error;
      if (mobilityRes.error) throw mobilityRes.error;
      const gpProfileEarly = gpRes.data;
      const mobilityProfile = mobilityRes.data;

      // GP Occasionnel = client, skip all GP routing logic
      const isOccasionnel = gpProfileEarly?.gp_type === "occasionnel";
      const isGPEarly = !!gpProfileEarly && !isOccasionnel;
      // GP registration is only complete when pricing is locked
      const isGPRegistrationComplete = isGPEarly && (
        gpProfileEarly?.status === "verified" || !!gpProfileEarly?.price_locked_at
      );
      const isMobilityTransporter = !!mobilityProfile;

      // ── MOBILITY TRANSPORTER: redirect to mobility dashboard, block client routes ──
      if (isMobilityTransporter && !isGPEarly) {
        // If on mobility registration page, let them stay
        if (pathname.startsWith("/mobility/inscription")) {
          return;
        }
        // Redirect from public/client routes to mobility dashboard
        if (pathname === "/" || pathname === "/offres" || isClientOnlyRoute(pathname) || isClientRoute(pathname)) {
          navigate("/mobility/apercu", { replace: true });
          return;
        }
        // Allow mobility routes
        if (isMobilityRoute(pathname)) {
          return;
        }
        // Block GP transporter routes
        if (isTransporterRoute(pathname)) {
          navigate("/mobility/apercu", { replace: true });
          return;
        }
        // For other non-public, non-admin routes, redirect to mobility
        if (!isPublicRoute(pathname) && !isAdminRoute(pathname)) {
          // Check admin access before blocking
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          const roles = rolesData?.map(r => r.role) || [];
          const hasAdminAccess = roles.includes("admin") || roles.includes("moderator");
          if (!hasAdminAccess) {
            navigate("/mobility/apercu", { replace: true });
            return;
          }
        }
        if (isPublicRoute(pathname) && pathname !== "/" && pathname !== "/offres") {
          return;
        }
      }

      // ── GP with INCOMPLETE registration on public routes → let them stay (e.g. on /gp/bagages/inscription) ──
      if (isGPEarly && !isGPRegistrationComplete && !isAdminRoute(pathname) && !isMobilityRoute(pathname)) {
        // If they're on the registration page, let them continue
        if (pathname.startsWith("/gp/bagages/inscription") || pathname.startsWith("/gp/inscription") || pathname.startsWith("/transporteur/inscription")) {
          return;
        }
        // Otherwise redirect them back to complete registration
        navigate("/gp/bagages/inscription", { replace: true });
        return;
      }

      // ── GP with COMPLETE registration on public client-facing routes → redirect to GP dashboard ──
      if (isGPRegistrationComplete && (pathname === "/" || pathname === "/offres" || isClientOnlyRoute(pathname))) {
        navigate("/gp/apercu", { replace: true });
        return;
      }

      if (isPublicRoute(pathname)) return;

      // Reuse GP profile from earlier check — only treat as GP if registration is complete
      const isGP = isGPRegistrationComplete;

      if (isAdminRoute(pathname) && !hasAdminAccess) {
        console.warn("Access denied: Admin route requires admin/moderator role");
        toast.error("Accès non autorisé");
        navigate(isGP ? "/gp/dashboard" : isMobilityTransporter ? "/mobility/apercu" : "/client/dashboard", { replace: true });
        return;
      }

      // Agent route enforcement — strict redirect
      const isOnAgentRoute = AGENT_ROUTES.some(route => pathname.startsWith(route));
      if (isOnAgentRoute && !isAgent && !hasAdminAccess) {
        console.warn("Access denied: Agent route requires agent_logistique role");
        navigate("/", { replace: true });
        return;
      }

      // Agent strict isolation: if agent and NOT admin, force to /agent
      if (isAgent && !hasAdminAccess && !isOnAgentRoute && !isPublicRoute(pathname)) {
        navigate("/agent", { replace: true });
        return;
      }

      if (isTransporterRoute(pathname) && !isGP && !hasAdminAccess) {
        console.warn("Access denied: Transporter route requires GP profile");
        navigate(isMobilityTransporter ? "/mobility/apercu" : "/client/dashboard", { replace: true });
        return;
      }

      // ── GP STRICT ISOLATION: GP users CANNOT access client-only routes ──
      if (isGP && !hasAdminAccess) {
        // Block access to client-only routes
        if (isClientOnlyRoute(pathname) || isClientRoute(pathname)) {
          console.warn("Access denied: GP users cannot access client routes");
          navigate("/gp/apercu", { replace: true });
          return;
        }
        // Also block "/" for authenticated GPs — redirect to GP dashboard
        if (pathname === "/") {
          navigate("/gp/apercu", { replace: true });
          return;
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isPublic = isPublicRoute(location.pathname);
      
      if (!session && !isPublic) {
        // Visiteur non connecté sur une route protégée connue (admin, transporteur, agent)
        if (isKnownProtectedRoute(location.pathname)) {
          const message = isAdminRoute(location.pathname)
            ? "Accès réservé aux administrateurs"
            : undefined;
          navigate("/auth", {
            state: { returnTo: location.pathname, message },
            replace: true,
          });
          setAuthenticated(false);
        } else {
          // Route inconnue (404) → laisser la page s'afficher pour les visiteurs
          setAuthenticated(true);
        }
      } else {
        setAuthenticated(!!session || isPublic);
        if (session) {
          await checkRoleAccess(session.user.id, session.user.email || "");
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthError(true);
      setAuthenticated(false);
      if (!isPublicRoute(location.pathname)) {
        navigate("/auth", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (authError && !isPublicRoute(location.pathname)) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p>Impossible de vérifier votre accès. Veuillez réessayer.</p>
      <Button onClick={() => setAttempt(value => value + 1)}>Réessayer</Button>
    </div>;
  }

  if (loading) {
    return <PageLoader message="Vérification de l'authentification..." />;
  }

  if (!authenticated && !isPublicRoute(location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
