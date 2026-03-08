/**
 * GPNavetteManager — Manage GP navettes (shuttle routes)
 * Standard: 1 navette, Premium: up to 3, Pro: up to 5
 * Subscribers get auto-approved changes, others go through admin review
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Route, Plus, Trash2, Star, ArrowRight, Clock, CheckCircle2, AlertTriangle, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { isGPPremium } from "@/lib/premiumGating";

interface Navette {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  is_primary: boolean;
  is_active: boolean;
}

interface ChangeRequest {
  id: string;
  status: string;
  old_origin_city: string;
  old_destination_city: string;
  new_origin_city: string;
  new_destination_city: string;
  created_at: string;
}

interface Props {
  gpId: string;
  subscription: string;
}

function getMaxNavettes(sub: string): number {
  if (sub === "pro") return 5;
  if (sub === "premium") return 3;
  return 1;
}

export function GPNavetteManager({ gpId, subscription }: Props) {
  const { toast } = useToast();
  const [navettes, setNavettes] = useState<Navette[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ origin_city: "", origin_country: "France", destination_city: "", destination_country: "Sénégal" });
  const [changeForm, setChangeForm] = useState({ new_origin_city: "", new_origin_country: "France", new_destination_city: "", new_destination_country: "Sénégal", justification: "" });

  const isPremiumOrPro = isGPPremium(subscription);
  const maxNavettes = getMaxNavettes(subscription);
  const canAdd = navettes.length < maxNavettes;

  useEffect(() => { loadData(); }, [gpId]);

  const loadData = async () => {
    const [navRes, reqRes] = await Promise.all([
      supabase.from("gp_navettes").select("*").eq("gp_id", gpId).order("is_primary", { ascending: false }),
      supabase.from("gp_navette_change_requests").select("*").eq("gp_id", gpId).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setNavettes(navRes.data || []);
    setPendingRequests(reqRes.data || []);
    setLoading(false);
  };

  const addNavette = async () => {
    if (!form.origin_city.trim() || !form.destination_city.trim()) {
      toast({ title: "Erreur", description: "Remplissez les villes", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isPrimary = navettes.length === 0;
      const { error } = await supabase.from("gp_navettes").insert({
        gp_id: gpId,
        origin_city: form.origin_city.trim(),
        origin_country: form.origin_country,
        destination_city: form.destination_city.trim(),
        destination_country: form.destination_country,
        is_primary: isPrimary,
      });
      if (error) throw error;

      // Also update gp_profiles base if primary
      if (isPrimary) {
        await supabase.from("gp_profiles").update({
          base_origin_city: form.origin_city.trim(),
          base_origin_country: form.origin_country,
          base_destination_city: form.destination_city.trim(),
          base_destination_country: form.destination_country,
        }).eq("id", gpId);
      }

      toast({ title: "Navette ajoutée ✓" });
      setForm({ origin_city: "", origin_country: "France", destination_city: "", destination_country: "Sénégal" });
      setShowAdd(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const requestChange = async (navette: Navette) => {
    if (!changeForm.new_origin_city.trim() || !changeForm.new_destination_city.trim()) {
      toast({ title: "Erreur", description: "Remplissez les nouvelles villes", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (isPremiumOrPro) {
        // Auto-approved for subscribers
        await supabase.from("gp_navettes").update({
          origin_city: changeForm.new_origin_city.trim(),
          origin_country: changeForm.new_origin_country,
          destination_city: changeForm.new_destination_city.trim(),
          destination_country: changeForm.new_destination_country,
          updated_at: new Date().toISOString(),
        }).eq("id", navette.id);

        // Update profile if primary
        if (navette.is_primary) {
          await supabase.from("gp_profiles").update({
            base_origin_city: changeForm.new_origin_city.trim(),
            base_origin_country: changeForm.new_origin_country,
            base_destination_city: changeForm.new_destination_city.trim(),
            base_destination_country: changeForm.new_destination_country,
          }).eq("id", gpId);
        }

        // Log in change requests for history
        await supabase.from("gp_navette_change_requests").insert({
          gp_id: gpId,
          old_origin_city: navette.origin_city,
          old_origin_country: navette.origin_country,
          old_destination_city: navette.destination_city,
          old_destination_country: navette.destination_country,
          new_origin_city: changeForm.new_origin_city.trim(),
          new_origin_country: changeForm.new_origin_country,
          new_destination_city: changeForm.new_destination_city.trim(),
          new_destination_country: changeForm.new_destination_country,
          justification: changeForm.justification || "Auto-approuvé (abonnement " + subscription + ")",
          status: "approved",
          auto_approved: true,
          reviewed_at: new Date().toISOString(),
        });

        toast({ title: "✅ Navette modifiée", description: "Changement appliqué automatiquement" });
      } else {
        // Standard: submit request for admin review
        await supabase.from("gp_navette_change_requests").insert({
          gp_id: gpId,
          old_origin_city: navette.origin_city,
          old_origin_country: navette.origin_country,
          old_destination_city: navette.destination_city,
          old_destination_country: navette.destination_country,
          new_origin_city: changeForm.new_origin_city.trim(),
          new_origin_country: changeForm.new_origin_country,
          new_destination_city: changeForm.new_destination_city.trim(),
          new_destination_country: changeForm.new_destination_country,
          justification: changeForm.justification,
          status: "pending",
        });

        toast({ title: "Demande envoyée", description: "Votre demande sera examinée par l'équipe." });
      }

      setShowChangeRequest(null);
      setChangeForm({ new_origin_city: "", new_origin_country: "France", new_destination_city: "", new_destination_country: "Sénégal", justification: "" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteNavette = async (navette: Navette) => {
    if (navette.is_primary && navettes.length > 1) {
      toast({ title: "Erreur", description: "Supprimez d'abord les navettes secondaires", variant: "destructive" });
      return;
    }
    await supabase.from("gp_navettes").delete().eq("id", navette.id);
    toast({ title: "Navette supprimée" });
    loadData();
  };

  const setPrimary = async (navette: Navette) => {
    await supabase.from("gp_navettes").update({ is_primary: false }).eq("gp_id", gpId);
    await supabase.from("gp_navettes").update({ is_primary: true }).eq("id", navette.id);
    await supabase.from("gp_profiles").update({
      base_origin_city: navette.origin_city,
      base_origin_country: navette.origin_country,
      base_destination_city: navette.destination_city,
      base_destination_country: navette.destination_country,
    }).eq("id", gpId);
    toast({ title: "Navette principale définie ✓" });
    loadData();
  };

  if (loading) return <div className="h-20 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Route className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Mes navettes</p>
            <p className="text-[10px] text-muted-foreground">{navettes.length}/{maxNavettes} utilisées</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!isPremiumOrPro && maxNavettes === 1 && (
            <Badge variant="outline" className="text-[9px] gap-1 h-5">
              <Crown className="w-2.5 h-2.5" /> Premium = 3
            </Badge>
          )}
          {canAdd && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setShowAdd(true)}>
              <Plus className="w-3 h-3" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-600">Demande(s) en attente</span>
          </div>
          {pendingRequests.map(req => (
            <p key={req.id} className="text-[10px] text-muted-foreground">
              {req.old_origin_city} → {req.old_destination_city} ⟶ {req.new_origin_city} → {req.new_destination_city}
            </p>
          ))}
        </div>
      )}

      {/* Navette list */}
      <div className="space-y-2">
        {navettes.map(nav => (
          <div key={nav.id} className={`rounded-xl border p-3 transition-all ${nav.is_primary ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {nav.is_primary && <Star className="w-3 h-3 text-primary flex-shrink-0" />}
                <span className="text-sm font-medium truncate">{nav.origin_city}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{nav.destination_city}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!nav.is_primary && navettes.length > 1 && (
                  <button onClick={() => setPrimary(nav)} className="text-[10px] text-primary hover:underline px-1">
                    Principale
                  </button>
                )}
                <button onClick={() => {
                  setChangeForm({
                    new_origin_city: nav.origin_city,
                    new_origin_country: nav.origin_country,
                    new_destination_city: nav.destination_city,
                    new_destination_country: nav.destination_country,
                    justification: "",
                  });
                  setShowChangeRequest(nav.id);
                }} className="text-[10px] text-muted-foreground hover:text-foreground px-1">
                  Modifier
                </button>
                {navettes.length > 1 && !nav.is_primary && (
                  <button onClick={() => deleteNavette(nav)} className="text-[10px] text-destructive hover:underline px-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground">{nav.origin_country}</span>
              <span className="text-[10px] text-muted-foreground">→</span>
              <span className="text-[10px] text-muted-foreground">{nav.destination_country}</span>
              {nav.is_primary && <Badge variant="outline" className="text-[9px] h-4 ml-auto">Principale</Badge>}
            </div>

            {/* Change request form */}
            <AnimatePresence>
              {showChangeRequest === nav.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Nouvelle origine</Label>
                        <Input className="h-8 text-xs" value={changeForm.new_origin_city} onChange={e => setChangeForm(f => ({ ...f, new_origin_city: e.target.value }))} placeholder="Ville" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Nouvelle destination</Label>
                        <Input className="h-8 text-xs" value={changeForm.new_destination_city} onChange={e => setChangeForm(f => ({ ...f, new_destination_city: e.target.value }))} placeholder="Ville" />
                      </div>
                    </div>
                    {!isPremiumOrPro && (
                      <div>
                        <Label className="text-[10px]">Justification</Label>
                        <Textarea className="text-xs min-h-[50px]" value={changeForm.justification} onChange={e => setChangeForm(f => ({ ...f, justification: e.target.value }))} placeholder="Raison du changement..." />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {isPremiumOrPro ? (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Changement automatique
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600">
                          <AlertTriangle className="w-3 h-3" /> Soumis à validation
                        </div>
                      )}
                      <div className="flex gap-1.5 ml-auto">
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setShowChangeRequest(null)}>Annuler</Button>
                        <Button size="sm" className="h-7 text-[10px]" onClick={() => requestChange(nav)} disabled={saving}>
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : isPremiumOrPro ? "Appliquer" : "Envoyer"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {navettes.length === 0 && !showAdd && (
          <div className="text-center py-6 text-muted-foreground">
            <Route className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Aucune navette configurée</p>
            <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px] gap-1" onClick={() => setShowAdd(true)}>
              <Plus className="w-3 h-3" /> Ajouter une navette
            </Button>
          </div>
        )}
      </div>

      {/* Add navette form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold">Nouvelle navette</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Ville d'origine</Label>
                  <Input className="h-8 text-xs" value={form.origin_city} onChange={e => setForm(f => ({ ...f, origin_city: e.target.value }))} placeholder="Paris" />
                </div>
                <div>
                  <Label className="text-[10px]">Ville de destination</Label>
                  <Input className="h-8 text-xs" value={form.destination_city} onChange={e => setForm(f => ({ ...f, destination_city: e.target.value }))} placeholder="Dakar" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Pays d'origine</Label>
                  <Input className="h-8 text-xs" value={form.origin_country} onChange={e => setForm(f => ({ ...f, origin_country: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-[10px]">Pays de destination</Label>
                  <Input className="h-8 text-xs" value={form.destination_country} onChange={e => setForm(f => ({ ...f, destination_country: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={() => setShowAdd(false)}>Annuler</Button>
                <Button size="sm" className="flex-1 h-7 text-[10px]" onClick={addNavette} disabled={saving}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ajouter"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade hint */}
      {!canAdd && !isPremiumOrPro && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-400/20">
          <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            Passez Premium pour gérer jusqu'à 3 navettes, ou Pro pour 5
          </p>
        </div>
      )}
    </div>
  );
}
