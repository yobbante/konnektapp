import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldX, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { FULL_RESTRICTIONS_LIST } from "@/components/gp/RestrictionsManager";

export default function GPRestrictionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromGate = searchParams.get("from") === "gate";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, default_currency, explicit_restrictions")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/transporteur/inscription"); return; }
      setGpProfile(profile);
      setRestrictions(profile.explicit_restrictions || []);

      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", profile.id)
        .eq("status", "pending");
      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRestriction = async (restrictionId: string) => {
    if (!gpProfile) return;
    const newRestrictions = restrictions.includes(restrictionId)
      ? restrictions.filter(r => r !== restrictionId)
      : [...restrictions, restrictionId];

    try {
      await supabase.from("gp_profiles").update({ explicit_restrictions: newRestrictions }).eq("id", gpProfile.id);
      setRestrictions(newRestrictions);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) return <PageLoader message="Chargement des restrictions..." />;
  if (!gpProfile) return null;

  const categories = [
    { id: "all", label: "Tout" },
    { id: "critical", label: "⛔ Critiques" },
    { id: "legal", label: "⚖️ Légal" },
    { id: "safety", label: "🔥 Sécurité" },
    { id: "valuable", label: "💎 Valeur" },
    { id: "special", label: "📦 Spécial" },
  ];

  const filteredRestrictions = activeCategory === "all"
    ? FULL_RESTRICTIONS_LIST
    : activeCategory === "critical"
    ? FULL_RESTRICTIONS_LIST.filter(r => r.severity === "critical")
    : FULL_RESTRICTIONS_LIST.filter(r => r.category === activeCategory);

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeTab="restrictions">
      <div className="px-4 py-4 space-y-5 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldX className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-bold">Mes restrictions</h2>
          </div>
          <Badge variant="destructive" className="text-xs">
            {restrictions.length} active{restrictions.length > 1 ? "s" : ""}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Indiquez tout ce que vous <strong>ne transportez PAS</strong>. Au moins une restriction est obligatoire.
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Restrictions list */}
        <Card>
          <CardContent className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredRestrictions.map((restriction) => {
              const Icon = restriction.icon;
              const isSelected = restrictions.includes(restriction.id);
              return (
                <div
                  key={restriction.id}
                  onClick={() => toggleRestriction(restriction.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
                    ${isSelected ? 'border-destructive/50 bg-destructive/5' : 'border-border hover:bg-muted/50'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-destructive/10' : 'bg-muted'}`}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isSelected ? 'text-destructive' : ''}`}>
                      {restriction.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {restriction.description}
                    </p>
                  </div>
                  <Switch
                    checked={isSelected}
                    onCheckedChange={() => toggleRestriction(restriction.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Validate button when coming from gate */}
        {fromGate && (
          <div className="fixed bottom-6 left-4 right-4 z-50">
            <Button
              className="w-full h-14 text-base gap-2 shadow-lg"
              disabled={restrictions.length === 0}
              onClick={() => navigate("/gp/apercu?validated=restrictions")}
            >
              <CheckCircle2 className="w-5 h-5" />
              {restrictions.length === 0 ? "Ajoutez au moins 1 restriction" : `Valider (${restrictions.length} restriction${restrictions.length > 1 ? 's' : ''})`}
            </Button>
          </div>
        )}
      </div>
    </GPDashboardLayout>
  );
}
