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
  "/client/transporteurs", // Public transporter profiles for clients
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

// Routes réservées aux agents logistiques
const AGENT_ROUTES = ["/agent"];

// Routes réservées aux transporteurs
const TRANSPORTER_ROUTES = [
  "/gp/dashboard",
  "/gp/requests",
  "/gp/order",
  "/transporter/profile",
];

// Routes réservées aux clients
const CLIENT_ROUTES = [
  "/client/dashboard",
  "/client/profile",
];

// Vérifie si le chemin correspond à une route publique
const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some(route => {
    if (route === pathname) return true;
    // Gérer les routes avec paramètres (ex: /offres/:id, /client/transporteurs/:gpId)
    if (pathname.startsWith(route + "/")) return true;
    if (route.endsWith("/") && pathname.startsWith(route)) return true;
    return false;
  });
};

// Vérifie si le chemin correspond à une route admin
const isAdminRoute = (pathname: string): boolean => {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
};

// Vérifie si le chemin correspond à une route transporteur
const isTransporterRoute = (pathname: string): boolean => {
  return TRANSPORTER_ROUTES.some(route => pathname.startsWith(route));
};

// Vérifie si le chemin correspond à une route client
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
        checkRoleAccess(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  const checkRoleAccess = async (userId: string) => {
    const pathname = location.pathname;
    
    // Skip role checks for public routes
    if (isPublicRoute(pathname)) return;

    try {
      // Check admin/moderator roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roles = rolesData?.map(r => r.role) || [];
      const hasAdminAccess = roles.includes("admin") || roles.includes("moderator");
      const isAgent = roles.includes("agent_logistique");

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

      if (isClientRoute(pathname) && isGP && !hasAdminAccess) {
        // GPs accessing client routes - allow it for multi-role switch
        // But they should use switch button to navigate properly
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
          await checkRoleAccess(session.user.id);
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
