import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, Package, Truck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSmartRedirect } from "@/hooks/useSmartRedirect";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserType = "client" | "transporter" | null;

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { detectUserRoleAndRedirect } = useSmartRedirect();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<UserType>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Connexion réussie",
          description: "Redirection en cours...",
        });

        // Redirection intelligente basée sur le rôle
        if (data.user) {
          await detectUserRoleAndRedirect(data.user.id);
        }
      } else {
        if (!formData.fullName || !formData.phone) {
          toast({
            title: "Erreur",
            description: "Veuillez remplir tous les champs",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.fullName,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          await supabase
            .from("profiles")
            .update({ phone: formData.phone })
            .eq("user_id", data.user.id);
        }

        toast({
          title: "Inscription réussie",
          description: "Redirection en cours...",
        });

        // Redirection vers le profil client
        if (data.user) {
          navigate("/client/profile");
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      
      // Messages d'erreur personnalisés
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

  const handleUserTypeSelect = (type: UserType) => {
    if (type === "transporter") {
      // Rediriger directement vers l'inscription transporteur
      navigate("/gp/inscription");
    } else {
      setSelectedUserType(type);
      setIsLogin(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader showNotifications={false} />

      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold mb-1">
            {isLogin ? "Connexion" : selectedUserType ? "Créer un compte Client" : "Rejoignez Yobbanté Connect"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin 
              ? "Accédez à votre espace" 
              : selectedUserType 
                ? "Envoyez vos colis en toute simplicité"
                : "Choisissez votre profil"
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Mode Sélection de type (inscription uniquement) */}
          {!isLogin && !selectedUserType && (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground mb-4">
                Je souhaite m'inscrire en tant que :
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleUserTypeSelect("client")}
                className="w-full p-6 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">Client</h3>
                    <p className="text-sm text-muted-foreground">
                      Je veux envoyer des colis
                    </p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleUserTypeSelect("transporter")}
                className="w-full p-6 rounded-2xl border-2 border-border bg-card hover:border-secondary hover:bg-secondary/5 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Truck className="w-7 h-7 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">Transporteur / Partenaire</h3>
                    <p className="text-sm text-muted-foreground">
                      Je veux proposer mes services
                    </p>
                  </div>
                </div>
              </motion.button>

              <div className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Déjà inscrit ?{" "}
                  <button 
                    onClick={() => setIsLogin(true)} 
                    className="text-primary font-medium hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Mode Connexion ou Inscription Client */}
          {(isLogin || selectedUserType === "client") && (
            <>
              {/* Tab Switcher */}
              <div className="flex rounded-xl bg-muted p-1 mb-6">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setSelectedUserType(null);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    isLogin 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground"
                  }`}
                >
                  Connexion
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setSelectedUserType(null);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    !isLogin 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground"
                  }`}
                >
                  Inscription
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="mobile-card">
                      <Label className="text-xs text-muted-foreground">Nom complet</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Votre nom complet"
                          className="pl-10 h-11"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mobile-card">
                      <Label className="text-xs text-muted-foreground">Téléphone</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="+221 77 123 45 67"
                          className="pl-10 h-11"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="mobile-card">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      className="pl-10 h-11"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="mobile-card">
                  <Label className="text-xs text-muted-foreground">Mot de passe</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button type="button" className="text-sm text-primary">
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <>
                      {isLogin ? "Se connecter" : "Créer mon compte"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Transporteur CTA */}
              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Vous êtes transporteur ?
                </p>
                <Link to="/gp/inscription">
                  <Button variant="secondary" className="w-full">
                    <Truck className="w-4 h-4 mr-2" />
                    Devenir transporteur partenaire
                  </Button>
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <MobileNav />
    </div>
  );
}
