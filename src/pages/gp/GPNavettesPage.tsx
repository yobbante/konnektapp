/**
 * GPNavettesPage — Full navette management page
 * Each navette has: origin/destination cities, phone_secondary, address_origin, address_destination
 * Phone 1 and Address 1 come from the GP profile automatically
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Route, Plus, Trash2, Star, ArrowRight, ArrowLeft, Crown, Loader2, Phone, MapPin, Edit3, Save, X, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { isGPPremium, getMaxNavettes } from "@/lib/premiumGating";
import { motion, AnimatePresence } from "framer-motion";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";

interface Navette {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  phone_secondary: string | null;
  address_origin: string | null;
  address_destination: string | null;
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

export default function GPNavettesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [navettes, setNavettes] = useState<Navette[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    origin_city: "", origin_country: "France",
    destination_city: "", destination_country: "Sénégal",
    phone_secondary: "", address_origin: "", address_destination: "",
  });

  const [editForm, setEditForm] = useState({
    origin_city: "", origin_country: "",
    destination_city: "", destination_country: "",
    phone_secondary: "", address_origin: "", address_destination: "",
    justification: "",
  });

  const subscription = gpProfile?.subscription || "standard";
  const isPremiumOrPro = isGPPremium(subscription);
  const maxNavettes = getMaxNavettes(subscription);
  const canAdd = navettes.length < maxNavettes;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: gp } = await supabase.from("gp_profiles")
      .select("id, subscription, phone, deposit_address, reception_address, business_name")
      .eq("user_id", user.id).maybeSingle();
    if (!gp) { navigate("/gp/inscription"); return; }
    setGpProfile(gp);

    const [navRes, reqRes] = await Promise.all([
      supabase.from("gp_navettes").select("*").eq("gp_id", gp.id).order("is_primary", { ascending: false }),
      supabase.from("gp_navette_change_requests").select("*").eq("gp_id", gp.id).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setNavettes((navRes.data as any[]) || []);
    setPendingRequests(reqRes.data || []);
    setLoading(false);
  };

  const addNavette = async () => {
    if (!form.origin_city.trim() || !form.destination_city.trim()) {
      toast({ title: "Villes requises", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isPrimary = navettes.length === 0;
      const { error } = await supabase.from("gp_navettes").insert({
        gp_id: gpProfile.id,
        origin_city: form.origin_city.trim(),
        origin_country: form.origin_country,
        destination_city: form.destination_city.trim(),
        destination_country: form.destination_country,
        phone_secondary: form.phone_secondary || null,
        address_origin: form.address_origin || null,
        address_destination: form.address_destination || null,
        is_primary: isPrimary,
      } as any);
      if (error) throw error;

      if (isPrimary) {
        await supabase.from("gp_profiles").update({
          base_origin_city: form.origin_city.trim(),
          base_origin_country: form.origin_country,
          base_destination_city: form.destination_city.trim(),
          base_destination_country: form.destination_country,
        }).eq("id", gpProfile.id);
      }

      toast({ title: "Navette ajoutée ✓" });
      setForm({ origin_city: "", origin_country: "France", destination_city: "", destination_country: "Sénégal", phone_secondary: "", address_origin: "", address_destination: "" });
      setShowAdd(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (navette: Navette) => {
    if (!editForm.origin_city.trim() || !editForm.destination_city.trim()) {
      toast({ title: "Villes requises", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const citiesChanged = editForm.origin_city !== navette.origin_city || editForm.destination_city !== navette.destination_city;

      if (citiesChanged && !isPremiumOrPro) {
        // Standard: submit change request for cities
        await supabase.from("gp_navette_change_requests").insert({
          gp_id: gpProfile.id,
          old_origin_city: navette.origin_city, old_origin_country: navette.origin_country,
          old_destination_city: navette.destination_city, old_destination_country: navette.destination_country,
          new_origin_city: editForm.origin_city.trim(), new_origin_country: editForm.origin_country,
          new_destination_city: editForm.destination_city.trim(), new_destination_country: editForm.destination_country,
          justification: editForm.justification, status: "pending",
        });
        // Still update phone/address immediately
        await supabase.from("gp_navettes").update({
          phone_secondary: editForm.phone_secondary || null,
          address_origin: editForm.address_origin || null,
          address_destination: editForm.address_destination || null,
          updated_at: new Date().toISOString(),
        } as any).eq("id", navette.id);
        toast({ title: "Demande de changement envoyée", description: "Les coordonnées ont été mises à jour." });
      } else {
        // Premium auto-approve OR only phone/address changed
        await supabase.from("gp_navettes").update({
          origin_city: editForm.origin_city.trim(),
          origin_country: editForm.origin_country,
          destination_city: editForm.destination_city.trim(),
          destination_country: editForm.destination_country,
          phone_secondary: editForm.phone_secondary || null,
          address_origin: editForm.address_origin || null,
          address_destination: editForm.address_destination || null,
          updated_at: new Date().toISOString(),
        } as any).eq("id", navette.id);

        if (citiesChanged && isPremiumOrPro) {
          await supabase.from("gp_navette_change_requests").insert({
            gp_id: gpProfile.id,
            old_origin_city: navette.origin_city, old_origin_country: navette.origin_country,
            old_destination_city: navette.destination_city, old_destination_country: navette.destination_country,
            new_origin_city: editForm.origin_city.trim(), new_origin_country: editForm.origin_country,
            new_destination_city: editForm.destination_city.trim(), new_destination_country: editForm.destination_country,
            justification: "Auto-approuvé (abonnement " + subscription + ")",
            status: "approved", auto_approved: true, reviewed_at: new Date().toISOString(),
          });
        }

        if (navette.is_primary) {
          await supabase.from("gp_profiles").update({
            base_origin_city: editForm.origin_city.trim(),
            base_origin_country: editForm.origin_country,
            base_destination_city: editForm.destination_city.trim(),
            base_destination_country: editForm.destination_country,
          }).eq("id", gpProfile.id);
        }

        toast({ title: "Navette mise à jour ✓" });
      }

      setEditingId(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteNavette = async (navette: Navette) => {
    if (navette.is_primary && navettes.length > 1) {
      toast({ title: "Supprimez d'abord les navettes secondaires", variant: "destructive" });
      return;
    }
    await supabase.from("gp_navettes").delete().eq("id", navette.id);
    toast({ title: "Navette supprimée" });
    loadData();
  };

  const setPrimary = async (navette: Navette) => {
    await supabase.from("gp_navettes").update({ is_primary: false }).eq("gp_id", gpProfile.id);
    await supabase.from("gp_navettes").update({ is_primary: true }).eq("id", navette.id);
    await supabase.from("gp_profiles").update({
      base_origin_city: navette.origin_city, base_origin_country: navette.origin_country,
      base_destination_city: navette.destination_city, base_destination_country: navette.destination_country,
    }).eq("id", gpProfile.id);
    toast({ title: "Navette principale définie ✓" });
    loadData();
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Route className="w-5 h-5 text-primary-foreground" />
            <h1 className="text-primary-foreground font-bold text-sm">Mes navettes</h1>
          </div>
          <Badge variant="secondary" className="text-[10px]">{navettes.length}/{maxNavettes}</Badge>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-24 max-w-lg mx-auto">
        {/* Info banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Tél. 1 :</strong> {gpProfile.phone || "—"} (compte) &nbsp;·&nbsp;
              <strong>Adresse 1 :</strong> {gpProfile.deposit_address || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Le téléphone et l'adresse principale sont ceux de votre compte. Chaque navette peut avoir un téléphone et des adresses secondaires.
            </p>
          </CardContent>
        </Card>

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <Card className="border-amber-400/30 bg-amber-500/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600">Demande(s) en attente</span>
              </div>
              {pendingRequests.map(req => (
                <p key={req.id} className="text-[11px] text-muted-foreground">
                  {req.old_origin_city} → {req.old_destination_city} ⟶ <strong>{req.new_origin_city} → {req.new_destination_city}</strong>
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Navette list */}
        <div className="space-y-3">
          {navettes.map(nav => (
            <Card key={nav.id} className={nav.is_primary ? "border-primary/30 shadow-sm" : ""}>
              <CardContent className="p-4 space-y-3">
                {editingId === nav.id ? (
                  /* ─── Edit mode ─── */
                  <div className="space-y-3">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-primary" /> Modifier la navette
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Ville départ</Label>
                        <SearchableCitySelect
                          value={editForm.origin_city}
                          countryCode={editForm.origin_country}
                          onSelect={(city, country) => setEditForm(f => ({ ...f, origin_city: city, origin_country: country }))}
                          placeholder="Ville départ"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Ville arrivée</Label>
                        <SearchableCitySelect
                          value={editForm.destination_city}
                          countryCode={editForm.destination_country}
                          onSelect={(city, country) => setEditForm(f => ({ ...f, destination_city: city, destination_country: country }))}
                          placeholder="Ville arrivée"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <Separator />
                    <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Coordonnées
                    </p>

                    <div>
                      <Label className="text-[10px]">Téléphone 1 (compte)</Label>
                      <Input className="h-8 text-xs bg-muted/50 text-muted-foreground cursor-not-allowed" readOnly value={gpProfile?.phone || "—"} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Téléphone 2 (cette navette)</Label>
                      <Input className="h-8 text-xs" placeholder="+33 6 12 34 56 78" value={editForm.phone_secondary}
                        onChange={e => setEditForm(f => ({ ...f, phone_secondary: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">📍 Adresse départ</Label>
                        <Input className="h-8 text-xs" placeholder="Adresse de dépôt" value={editForm.address_origin}
                          onChange={e => setEditForm(f => ({ ...f, address_origin: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-[10px]">📍 Adresse arrivée</Label>
                        <Input className="h-8 text-xs" placeholder="Adresse de réception" value={editForm.address_destination}
                          onChange={e => setEditForm(f => ({ ...f, address_destination: e.target.value }))} />
                      </div>
                    </div>

                    {!isPremiumOrPro && (editForm.origin_city !== nav.origin_city || editForm.destination_city !== nav.destination_city) && (
                      <div>
                        <Label className="text-[10px]">Justification du changement de ville</Label>
                        <Textarea className="text-xs min-h-[50px]" value={editForm.justification}
                          onChange={e => setEditForm(f => ({ ...f, justification: e.target.value }))} placeholder="Raison du changement..." />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {isPremiumOrPro ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Changement automatique
                        </span>
                      ) : (editForm.origin_city !== nav.origin_city || editForm.destination_city !== nav.destination_city) ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600">
                          <AlertTriangle className="w-3 h-3" /> Soumis à validation admin
                        </span>
                      ) : null}
                      <div className="flex gap-1.5 ml-auto">
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3 mr-1" /> Annuler
                        </Button>
                        <Button size="sm" className="h-7 text-[10px]" onClick={() => saveEdit(nav)} disabled={saving}>
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" /> Enregistrer</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── View mode ─── */
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {nav.is_primary && <Star className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                        <span className="text-sm font-semibold truncate">{nav.origin_city}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-semibold truncate">{nav.destination_city}</span>
                      </div>
                      {nav.is_primary && <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">Principale</Badge>}
                    </div>

                    <div className="text-[10px] text-muted-foreground">{nav.origin_country} → {nav.destination_country}</div>

                    {/* Contact info */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Tél. 1:</span>
                        <span>{gpProfile?.phone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Tél. 2:</span>
                        <span>{nav.phone_secondary || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Départ:</span>
                        <span className="truncate">{nav.address_origin || "—"}</span>
                      </div>
                      <div></div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Arrivée:</span>
                        <span className="truncate">{nav.address_destination || "—"}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {!nav.is_primary && navettes.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setPrimary(nav)}>
                          <Star className="w-3 h-3" /> Principale
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => {
                        setEditForm({
                          origin_city: nav.origin_city, origin_country: nav.origin_country,
                          destination_city: nav.destination_city, destination_country: nav.destination_country,
                          phone_secondary: nav.phone_secondary || "", address_origin: nav.address_origin || "",
                          address_destination: nav.address_destination || "", justification: "",
                        });
                        setEditingId(nav.id);
                      }}>
                        <Edit3 className="w-3 h-3" /> Modifier
                      </Button>
                      {navettes.length > 1 && !nav.is_primary && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-destructive hover:text-destructive" onClick={() => deleteNavette(nav)}>
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {navettes.length === 0 && !showAdd && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Route className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-3">Aucune navette configurée</p>
                <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1">
                  <Plus className="w-4 h-4" /> Ajouter ma première navette
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add navette form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <Card className="border-primary/30 shadow-md">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-primary" /> Nouvelle navette
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Ville départ *</Label>
                      <SearchableCitySelect
                        value={form.origin_city}
                        countryCode={form.origin_country}
                        onSelect={(city, country) => setForm(f => ({ ...f, origin_city: city, origin_country: country }))}
                        placeholder="Ville départ"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Ville arrivée *</Label>
                      <SearchableCitySelect
                        value={form.destination_city}
                        countryCode={form.destination_country}
                        onSelect={(city, country) => setForm(f => ({ ...f, destination_city: city, destination_country: country }))}
                        placeholder="Ville arrivée"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Coordonnées pour cette navette
                  </p>

                  <div>
                    <Label className="text-[10px]">Téléphone 1 (compte) — non modifiable</Label>
                    <Input className="h-8 text-xs bg-muted/50 text-muted-foreground cursor-not-allowed" readOnly value={gpProfile?.phone || "—"} />
                  </div>
                  <div>
                    <Label className="text-[10px]">Téléphone 2 (optionnel)</Label>
                    <Input className="h-8 text-xs" placeholder="+33 6 12 34 56 78" value={form.phone_secondary}
                      onChange={e => setForm(f => ({ ...f, phone_secondary: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">📍 Adresse départ</Label>
                      <Input className="h-8 text-xs" placeholder="Adresse de dépôt" value={form.address_origin}
                        onChange={e => setForm(f => ({ ...f, address_origin: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-[10px]">📍 Adresse arrivée</Label>
                      <Input className="h-8 text-xs" placeholder="Adresse de réception" value={form.address_destination}
                        onChange={e => setForm(f => ({ ...f, address_destination: e.target.value }))} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button className="flex-1 h-9 text-xs" onClick={addNavette} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ajouter"}
                    </Button>
                    <Button variant="outline" className="h-9 text-xs" onClick={() => setShowAdd(false)}>Annuler</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add button */}
        {canAdd && !showAdd && navettes.length > 0 && (
          <Button variant="outline" className="w-full gap-2 h-10" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Ajouter une navette ({navettes.length}/{maxNavettes})
          </Button>
        )}

        {/* Upgrade CTA */}
        {!canAdd && !isPremiumOrPro && (
          <Card className="border-amber-400/30 bg-gradient-to-r from-amber-500/5 to-amber-600/5">
            <CardContent className="p-3 flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold">Limite atteinte</p>
                <p className="text-[10px] text-muted-foreground">Passez Premium pour 3 navettes ou Pro pour 5</p>
              </div>
              <Button size="sm" className="h-7 text-[10px]" onClick={() => navigate("/gp/premium")}>Voir les offres</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
