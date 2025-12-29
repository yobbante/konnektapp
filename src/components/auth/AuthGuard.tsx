import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = ["/auth", "/gp", "/gp/inscription", "/"];

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
        if (!PUBLIC_ROUTES.includes(location.pathname)) {
          navigate("/auth", { state: { returnTo: location.pathname }, replace: true });
        }
      } else if (event === "SIGNED_IN" && session) {
        setAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);
      
      if (!session && !isPublicRoute) {
        navigate("/auth", { state: { returnTo: location.pathname }, replace: true });
        setAuthenticated(false);
      } else if (session && location.pathname === "/auth") {
        // Redirect logged-in users away from auth page
        navigate("/", { replace: true });
        setAuthenticated(true);
      } else {
        setAuthenticated(!!session || isPublicRoute);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthenticated(false);
      navigate("/auth", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!authenticated && !PUBLIC_ROUTES.includes(location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
