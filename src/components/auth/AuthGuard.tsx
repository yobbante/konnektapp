import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/PageLoader";

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
  "/gp/requests",
  "/gp/order",
  "/transporter/profile",
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

const isClientRoute = (pathname: string): boolean => {
  return CLIENT_ROUTES.some(route => pathname.startsWith(route));
};

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  const checkRoleAccess = async (userId: string, email: string) => {
    const pathname = location.pathname;
    
    if (isPublicRoute(pathname)) return;

    try {
      // ── AGENT EMAIL: always redirect to /agent ──
      if (email.toLowerCase() === AGENT_EMAIL) {
        const isOnAgentRoute = AGENT_ROUTES.some(route => pathname.startsWith(route));
        if (!isOnAgentRoute) {
          navigate("/agent", { replace: true });
          return;
        }
        return;
      }

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

      // Check if user is GP
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const isGP = !!gpProfile;

      // Enforce strict route access
      if (isAdminRoute(pathname) && !hasAdminAccess) {
        console.warn("Access denied: Admin route requires admin/moderator role");
        navigate(isGP ? "/gp/dashboard" : "/client/dashboard", { replace: true });
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
        navigate("/client/dashboard", { replace: true });
        return;
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
        navigate("/auth", { state: { returnTo: location.pathname }, replace: true });
        setAuthenticated(false);
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
