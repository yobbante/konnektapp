/**
 * AdminGPApprovalPanel — Enhanced GP approval with pricing/route/currency verification
 * Shows complete GP registration data for admin review before approval
 */
import { useState, useEffect } from "react";
import { 
  Shield, CheckCircle, XCircle, Clock, MapPin, DollarSign,
  Route, Lock, User, Phone, Mail, Eye, Scale, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateTiers, type GPPricingConfig } from "@/lib/gpPricingEngine";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingGP {
  id: string;
  user_id: string;
  business_name: string;
  gp_type: string;
  city: string;
  country_code: string;
  phone: string;
  whatsapp_phone: string | null;
  base_origin_city: string | null;
  base_origin_country: string | null;
  base_destination_city: string | null;
  base_destination_country: string | null;
  base_price_per_kg: number | null;
  default_currency: string | null;
  description: string | null;
  created_at: string;
  status: string;
  user_email?: string;
  user_name?: string;
}

export function AdminGPApprovalPanel() {
  const { toast } = useToast();
  const [pendingGPs, setPendingGPs] = useState<PendingGP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGP, setSelectedGP] = useState<PendingGP | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [forfaitPrices, setForfaitPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPendingGPs();
  }, []);

  const loadPendingGPs = async () => {
    try {
      const { data, error } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Load user profiles for email/name
      const userIds = (data || []).map(gp => gp.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Load forfait prices from weight tiers
      const gpIds = (data || []).map(gp => gp.id);
      const { data: tiers } = await supabase
        .from("gp_weight_tiers")
        .select("gp_id, min_weight, max_weight, price_per_kg")
        .in("gp_id", gpIds)
        .eq("min_weight", 23)
        .eq("max_weight", 23);

      const forfaitMap: Record<string, number> = {};
      (tiers || []).forEach(t => {
        forfaitMap[t.gp_id] = t.price_per_kg;
      });
      setForfaitPrices(forfaitMap);

      const enriched: PendingGP[] = (data || []).map(gp => {
        const profile = profileMap.get(gp.user_id);
        return {
          ...gp,
          user_email: profile?.email || null,
          user_name: profile?.full_name || null,
        };
      });

      setPendingGPs(enriched);
    } catch (err) {
      console.error("Error loading pending GPs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (gpId: string, decision: "verified" | "rejected") => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updates: Record<string, any> = {
        status: decision,
      };

      if (decision === "verified") {
        updates.verified_at = new Date().toISOString();
        updates.price_locked_at = new Date().toISOString();
        updates.navette_locked_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("gp_profiles")
        .update(updates)
        .eq("id", gpId);

      if (error) throw error;

      toast({ 
        title: decision === "verified" 
          ? "✅ GP validé — Prix et navette verrouillés" 
          : "❌ GP refusé" 
      });
      
      setSelectedGP(null);
      setAdminNotes("");
      loadPendingGPs();
    } catch (err) {
      console.error("Error processing approval:", err);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pendingGPs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
          <p className="font-semibold">Tout est à jour</p>
          <p className="text-sm text-muted-foreground">Aucun GP en attente de validation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Validation GP ({pendingGPs.length})
        </h3>
      </div>

      {pendingGPs.map(gp => {
        const forfait = forfaitPrices[gp.id] || 0;
        const currency = gp.default_currency || "XOF";
        const currSym = getCurrencySymbol(currency as any);
        const hasRoute = gp.base_origin_city && gp.base_destination_city;
        const hasPrice = gp.base_price_per_kg && gp.base_price_per_kg > 0;

        return (
          <Card key={gp.id} className="border-amber-300/50">
            <CardContent className="p-4 space-y-3">
              {/* GP Identity */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm">{gp.business_name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{gp.city}, {gp.country_code}</span>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(gp.created_at), "d MMM HH:mm", { locale: fr })}</span>
                  </div>
                  {gp.user_email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="w-3 h-3" /> {gp.user_email}
                    </div>
                  )}
                </div>
                <Badge className="bg-amber-500 text-white text-[10px]">En attente</Badge>
              </div>

              {/* Verification Checklist */}
              <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
                <VerifyRow 
                  label="Navette" 
                  ok={!!hasRoute}
                  value={hasRoute ? `${gp.base_origin_city} → ${gp.base_destination_city}` : "Non renseigné"}
                  icon={Route}
                />
                <VerifyRow 
                  label="Prix/kg" 
                  ok={!!hasPrice}
                  value={hasPrice ? `${gp.base_price_per_kg?.toLocaleString()} ${currSym}/kg` : "Non renseigné"}
                  icon={DollarSign}
                />
                <VerifyRow 
                  label="Forfait 23kg" 
                  ok={forfait > 0}
                  value={forfait > 0 ? `${forfait.toLocaleString()} ${currSym}` : "Non renseigné"}
                  icon={Scale}
                />
                <VerifyRow 
                  label="Devise" 
                  ok={!!currency}
                  value={currency}
                  icon={Lock}
                />
                <VerifyRow 
                  label="Téléphone" 
                  ok={!!gp.phone}
                  value={gp.phone || "Non renseigné"}
                  icon={Phone}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedGP(gp)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Détails
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleApproval(gp.id, "verified")}
                  disabled={processing || !hasRoute || !hasPrice}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Valider
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApproval(gp.id, "rejected")}
                  disabled={processing}
                >
                  <XCircle className="w-3 h-3" />
                </Button>
              </div>

              {(!hasRoute || !hasPrice) && (
                <div className="flex items-center gap-2 text-xs text-amber-600 p-2 bg-amber-50/50 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Informations incomplètes — impossible de valider</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Detail Dialog */}
      <Dialog open={!!selectedGP} onOpenChange={() => setSelectedGP(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Validation : {selectedGP?.business_name}
            </DialogTitle>
          </DialogHeader>
          {selectedGP && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="font-medium">{selectedGP.gp_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Devise</p>
                  <p className="font-medium">{selectedGP.default_currency || "XOF"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Navette</p>
                  <p className="font-medium">
                    {selectedGP.base_origin_city || "?"} → {selectedGP.base_destination_city || "?"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Prix/kg</p>
                  <p className="font-medium">{selectedGP.base_price_per_kg || "?"}</p>
                </div>
              </div>

              {selectedGP.description && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{selectedGP.description}</p>
                </>
              )}

              <Separator />
              <Textarea
                placeholder="Notes admin (motif de refus, correction demandée...)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="h-20"
              />

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleApproval(selectedGP.id, "verified")}
                  disabled={processing}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Valider & Verrouiller
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleApproval(selectedGP.id, "rejected")}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Refuser
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VerifyRow({ label, ok, value, icon: Icon }: { label: string; ok: boolean; value: string; icon: any }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={ok ? "font-medium" : "text-amber-500"}>{value}</span>
        {ok ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        )}
      </div>
    </div>
  );
}
