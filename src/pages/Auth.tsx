import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSmartRedirect } from "@/hooks/useSmartRedirect";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { InteractiveAuthForm, AuthFormData } from "@/components/auth/InteractiveAuthForm";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

// Read entry flow data from session
function getEntryFlowData() {
  const phone = sessionStorage.getItem("entry_phone") || "";
  const role = sessionStorage.getItem("entry_role") || "";
  let country: { code: string; name: string; flag: string; dialCode: string; currency: string } | null = null;
  try {
    const raw = sessionStorage.getItem("entry_country");
    if (raw) country = JSON.parse(raw);
  } catch {}
  return { phone, role, country };
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { detectUserRoleAndRedirect } = useSmartRedirect();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  // Get pre-filled data from entry flow
  const entryFlow = useMemo(() => getEntryFlowData(), []);

  // Set mode from URL param
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "login" || modeParam === "signup") {
      setMode(modeParam === "signup" ? "register" : "login");
    }
  }, [searchParams]);

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await detectUserRoleAndRedirect(user.id);
      }
      setCheckingSession(false);
    };
    checkExistingSession();
  }, [detectUserRoleAndRedirect]);

  // Check for pending booking state and redirect accordingly
  const handlePostAuthRedirect = async (userId: string) => {
    // V2: Check for complete booking state first (smart auth flow)
    const completeBooking = sessionStorage.getItem("pending_booking_complete");
    if (completeBooking) {
      try {
        const state = JSON.parse(completeBooking);
        // Only use if less than 30 minutes old
        if (Date.now() - state.timestamp < 30 * 60 * 1000 && state.returnPath) {
          // Keep the state - it will be used when returning to booking page
          toast({
            title: "Connexion réussie",
            description: "Finalisation de votre réservation...",
          });
          navigate(state.returnPath);
          return;
        }
      } catch {
        sessionStorage.removeItem("pending_booking_complete");
      }
    }

    const stored = sessionStorage.getItem("pending_booking_state");
    if (stored) {
      try {
        const state = JSON.parse(stored);
        // Only use if less than 30 minutes old
        if (Date.now() - state.timestamp < 30 * 60 * 1000 && state.returnPath) {
          sessionStorage.removeItem("pending_booking_state");
          toast({
            title: "Connexion réussie",
            description: "Reprise de votre réservation...",
          });
          navigate(state.returnPath);
          return;
        }
      } catch {
        sessionStorage.removeItem("pending_booking_state");
      }
    }
    // Default: role-based redirect
    await detectUserRoleAndRedirect(userId);
  };

  const handleSubmit = async (data: AuthFormData) => {
    setLoading(true);

    try {
      if (mode === "login") {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        toast({
          title: "Connexion réussie",
          description: "Redirection en cours...",
        });

        if (authData.user) {
          await handlePostAuthRedirect(authData.user.id);
        }
      } else {
        if (!data.fullName || !data.phone) {
          toast({
            title: "Erreur",
            description: "Veuillez remplir tous les champs",
            variant: "destructive",
          });
          return;
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: data.fullName,
            }
          }
        });

        if (error) throw error;

        if (authData.user) {
          const profileUpdate: Record<string, any> = { phone: data.phone };
          if (entryFlow.country) {
            profileUpdate.country_code = entryFlow.country.code;
          }
          // Save city from entry flow
          const entryCity = sessionStorage.getItem("entry_city");
          if (entryCity) {
            profileUpdate.residence_city = entryCity;
          }
          await supabase
            .from("profiles")
            .update(profileUpdate)
            .eq("user_id", authData.user.id);
        }

        toast({
          title: "Inscription réussie",
          description: "Redirection en cours...",
        });

        if (authData.user) {
          await handlePostAuthRedirect(authData.user.id);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      
      let errorMessage = "Une erreur est survenue";
      if (error.message?.includes("already registered")) {
        errorMessage = "Cet email est déjà utilisé. Essayez de vous connecter.";
      } else if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email ou mot de passe incorrect";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransporterSelect = () => {
    navigate("/transporteur/inscription");
  };

  if (checkingSession) {
    return <TransportPageLoader message="Vérification..." vehicle="package" />;
  }

  return (
    <div 
      className="min-h-screen bg-background flex flex-col overflow-hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <AppHeader showNotifications={false} />

      <main className="flex-1 flex flex-col justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <InteractiveAuthForm
            mode={mode}
            onModeChange={setMode}
            onSubmit={handleSubmit}
            onTransporterSelect={handleTransporterSelect}
            loading={loading}
            prefillPhone={entryFlow.phone}
            prefillCountry={entryFlow.country?.code || "SN"}
          />
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
