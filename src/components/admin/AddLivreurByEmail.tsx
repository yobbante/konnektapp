import { useState } from "react";
import { Truck, Loader2, Plus, CheckCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AddLivreurByEmail() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setSuccess(false);

    try {
      // Find user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          title: "Utilisateur introuvable",
          description: "Aucun compte trouvé avec cet email. L'utilisateur doit d'abord créer un compte.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if already has the role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("role", "agent_logistique" as any)
        .maybeSingle();

      if (existingRole) {
        toast({
          title: "Déjà livreur",
          description: `${profile.full_name || email} est déjà un Livreur Konnekt.`,
        });
        setLoading(false);
        return;
      }

      // Assign agent_logistique role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: "agent_logistique" as any });

      if (roleError) throw roleError;

      toast({
        title: "Livreur ajouté ✓",
        description: `${profile.full_name || email} est maintenant Livreur Konnekt. Il sera redirigé vers son dashboard à sa prochaine connexion.`,
      });
      setSuccess(true);
      setEmail("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error adding livreur:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le livreur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-500" />
          Ajouter un Livreur Konnekt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Saisissez l'email d'un utilisateur existant pour lui attribuer le rôle de livreur. 
          Il sera automatiquement redirigé vers son dashboard livreur.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="email@exemple.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={loading || !email.trim()}
            className="gap-1.5 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {success ? "Ajouté" : "Ajouter"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
