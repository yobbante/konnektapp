import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/PageLoader";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = [
  "/auth", 
  "/gp", 
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

// Super admin email — only sees admin dashboards
const SUPER_ADMIN_EMAIL = "workbasse@outlook.fr";
// Agent email — always redirected to /agent
const AGENT_EMAIL = "bass96@live.fr";

const isPublicRoute = (pathname: string): boolean => {
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

  useEffect(() => {
    let isMounted = true;
    
    const doCheck = async () => {
      if (!isMounted) return;
      await checkAuth();
    };
    doCheck();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_OUT" || !session) {
        setAuthenticated(false);
        if (!isPublicRoute(location.pathname)) {
          navigate("/auth", { state: { returnTo: location.pathname }, replace: true });
        }
      } else if (event === "SIGNED_IN" && session) {
        setAuthenticated(true);
        checkRoleAccess(session.user.id, session.user.email || "");
      }
    });

    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [location.pathname]);

  const checkRoleAccess = async (userId: string, email: string) => {
    const pathname = location.pathname;

    try {
      // ── AGENT EMAIL: always redirect to /agent, even from public routes ──
      if (email.toLowerCase() === AGENT_EMAIL) {
        const isOnAgentRoute = AGENT_ROUTES.some(route => pathname.startsWith(route));
        if (!isOnAgentRoute) {
          navigate("/agent", { replace: true });
          return;
        }
        return;
      }

      // Check if user is GP BEFORE public route early return
      // GP users must be redirected even from public routes like "/"
      const [gpRes, mobilityRes] = await Promise.all([
        supabase
          .from("gp_profiles")
          .select("id, price_locked_at, gp_type")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("mobility_profiles")
          .select("id, status")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const gpProfileEarly = gpRes.data;
      const mobilityProfile = mobilityRes.data;

      // GP Occasionnel = client, skip all GP routing logic
      const isOccasionnel = gpProfileEarly?.gp_type === "occasionnel";
      const isGPEarly = !!gpProfileEarly && !isOccasionnel;
      // GP registration is only complete when pricing is locked
      const isGPRegistrationComplete = isGPEarly && !!gpProfileEarly?.price_locked_at;
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
      if (isGPEarly && !isGPRegistrationComplete) {
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

      // Check admin/moderator roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roles = rolesData?.map(r => r.role) || [];
      const hasAdminAccess = roles.includes("admin") || roles.includes("moderator");
      const isAgent = roles.includes("agent_logistique");

      // ── SUPER ADMIN: only admin dashboards ──
      if (email.toLowerCase() === SUPER_ADMIN_EMAIL && hasAdminAccess) {
        if (!isAdminRoute(pathname) && pathname !== "/settings") {
          navigate("/admin", { replace: true });
          return;
        }
        return;
      }

      // Reuse GP profile from earlier check — only treat as GP if registration is complete
      const isGP = isGPRegistrationComplete;

      // Enforce strict route access
      if (isAdminRoute(pathname) && !hasAdminAccess) {
        console.warn("Access denied: Admin route requires admin/moderator role");
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
      console.error("Role check error:", error);
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
      setAuthenticated(false);
      if (!isPublicRoute(location.pathname)) {
        navigate("/auth", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader message="Vérification de l'authentification..." />;
  }

  if (!authenticated && !isPublicRoute(location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
