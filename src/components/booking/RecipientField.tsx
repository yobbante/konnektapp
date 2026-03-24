/**
 * RecipientField — Unified smart recipient search
 * Single search bar that accepts: phone number, email, name, or Konnekt ID (KKT-...)
 * Auto-detects input type and searches accordingly.
 * Handles duplicate names by showing multiple results with disambiguation.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Search, CheckCircle, X, Users, Star,
  Sparkles, ArrowRight, Eye, Package, TrendingUp, Loader2, MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getKonnektId, isKonnektId, parseKonnektId } from "@/lib/konnektId";

interface RecipientFieldProps {
  recipientName: string;
  recipientPhone: string;
  recipientUserId: string | null;
  onRecipientChange: (data: {
    name: string;
    phone: string;
    userId: string | null;
  }) => void;
  required?: boolean;
}

interface SavedRecipient {
  id: string;
  full_name: string;
  phone: string | null;
  recipient_user_id: string | null;
  is_favorite: boolean;
}

interface ProfileResult {
  user_id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
}

type DetectedType = "phone" | "email" | "uuid" | "konnekt_id" | "name";

function detectInputType(input: string): DetectedType {
  const trimmed = input.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return "uuid";
  if (isKonnektId(trimmed)) return "konnekt_id";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^[+\d][\d\s\-()]{6,}$/.test(trimmed.replace(/\s/g, ""))) return "phone";
  return "name";
}

function getPlaceholderHint(type: DetectedType): string {
  switch (type) {
    case "phone": return "Recherche par téléphone...";
    case "email": return "Recherche par email...";
    case "uuid": return "Recherche par UUID...";
    case "konnekt_id": return "🆔 Recherche par ID Konnekt...";
    case "name": return "👤 Recherche par nom...";
  }
}

export function RecipientField({
  recipientName,
  recipientPhone,
  recipientUserId,
  onRecipientChange,
  required = true,
}: RecipientFieldProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; phone?: string; city?: string; totalOrders?: number } | null>(null);
  const [multipleResults, setMultipleResults] = useState<ProfileResult[]>([]);
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [isSelfSelection, setIsSelfSelection] = useState(false);
  const [detectedType, setDetectedType] = useState<DetectedType>("name");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [showManualFields, setShowManualFields] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { loadSavedRecipients(); }, []);

  useEffect(() => {
    if (recipientName && recipientPhone) setShowUpsell(true);
  }, [recipientName, recipientPhone]);

  const loadSavedRecipients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("recipients")
      .select("id, full_name, phone, recipient_user_id, is_favorite")
      .eq("owner_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("full_name")
      .limit(20);
    setSavedRecipients(data || []);
  };

  const selectProfile = async (profile: ProfileResult) => {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("client_id", profile.user_id);

    const result = {
      id: profile.user_id,
      name: profile.full_name || "Utilisateur Konnekt",
      phone: profile.phone || undefined,
      city: profile.city || undefined,
      totalOrders: count || 0,
    };
    setSearchResult(result);
    setMultipleResults([]);
    onRecipientChange({
      name: result.name,
      phone: result.phone || recipientPhone,
      userId: result.id,
    });
    setShowManualFields(false);
  };

  const smartSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;

    setSearching(true);
    setSearchNotFound(false);
    setIsSelfSelection(false);
    setMultipleResults([]);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const type = detectInputType(trimmed);
      let results: ProfileResult[] = [];

      if (type === "phone") {
        const normalized = trimmed.replace(/[\s\-()]/g, "");
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, city")
          .eq("phone", normalized)
          .limit(1);
        results = data || [];

        if (results.length === 0 && normalized.length >= 8) {
          const { data: partial } = await supabase
            .from("profiles")
            .select("user_id, full_name, phone, city")
            .ilike("phone", `%${normalized.slice(-8)}`)
            .limit(1);
          results = partial || [];
        }
      } else if (type === "email") {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, city")
          .ilike("email", trimmed)
          .limit(1);
        results = data || [];
      } else if (type === "uuid") {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, city")
          .eq("user_id", trimmed)
          .limit(1);
        results = data || [];
      } else if (type === "konnekt_id") {
        // Parse KKT-XXXXXXXX → prefix search on user_id
        const prefix = parseKonnektId(trimmed);
        if (prefix) {
          const { data } = await supabase
            .from("profiles")
            .select("user_id, full_name, phone, city")
            .ilike("user_id", `${prefix}%`)
            .limit(5);
          results = data || [];
        }
      } else {
        // Name search — return MULTIPLE results for disambiguation
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, city")
          .ilike("full_name", `%${trimmed}%`)
          .limit(10);
        results = data || [];
      }

      // Filter out self
      if (currentUser) {
        const selfResults = results.filter(r => r.user_id === currentUser.id);
        results = results.filter(r => r.user_id !== currentUser.id);

        if (results.length === 0 && selfResults.length > 0) {
          setSearchResult(null);
          setSearchNotFound(true);
          setIsSelfSelection(true);
          return;
        }
      }

      if (results.length === 1) {
        // Single result → auto-select
        await selectProfile(results[0]);
      } else if (results.length > 1) {
        // Multiple results → show disambiguation list
        setMultipleResults(results);
        setSearchResult(null);
      } else {
        setSearchResult(null);
        setSearchNotFound(true);
        if (type === "phone") {
          setManualPhone(trimmed.replace(/[\s\-()]/g, ""));
          setShowManualFields(true);
        } else if (type === "name") {
          setManualName(trimmed);
          setShowManualFields(true);
        } else {
          setShowManualFields(true);
        }
      }
    } catch {
      setSearchResult(null);
      setSearchNotFound(true);
      setShowManualFields(true);
    } finally {
      setSearching(false);
    }
  }, [onRecipientChange, recipientPhone]);

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    const type = detectInputType(value);
    setDetectedType(type);
    // No auto-search — user must press the search button
  };

  const handleManualSearch = () => {
    if (searchQuery.trim().length >= 3) {
      smartSearch(searchQuery);
    }
  };

  const selectSavedRecipient = (r: SavedRecipient) => {
    onRecipientChange({ name: r.full_name, phone: r.phone || "", userId: r.recipient_user_id });
    if (r.recipient_user_id) {
      setSearchResult({ id: r.recipient_user_id, name: r.full_name });
    }
    setSearchQuery(r.full_name);
    setShowSaved(false);
    setShowUpsell(true);
    setShowManualFields(false);
  };

  const clearRecipient = () => {
    onRecipientChange({ name: "", phone: "", userId: null });
    setSearchResult(null);
    setMultipleResults([]);
    setSearchQuery("");
    setShowUpsell(false);
    setSearchNotFound(false);
    setManualName("");
    setManualPhone("");
    setShowManualFields(false);
  };

  const handleManualChange = (name: string, phone: string) => {
    setManualName(name);
    setManualPhone(phone);
    onRecipientChange({ name, phone, userId: null });
  };

  const isValid = recipientName.trim().length > 0 && recipientPhone.trim().length >= 8;

  return (
    <>
      <Card className={`border-2 transition-all duration-300 ${
        isValid
          ? "border-green-500/30 bg-green-50/30 dark:bg-green-900/10"
          : required
            ? "border-primary/30"
            : "border-border"
      }`}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Destinataire
              {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex items-center gap-1">
              {savedRecipients.length > 0 && !searchResult && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={() => setShowSaved(true)}>
                  <Users className="w-3.5 h-3.5" /> Carnet
                </Button>
              )}
              {(isValid || searchResult) && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearRecipient}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* ═══ SMART SEARCH BAR ═══ */}
          {!searchResult ? (
            <div className="space-y-3">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Téléphone, email, nom ou ID Konnekt..."
                    value={searchQuery}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleManualSearch(); } }}
                    className="pl-10 h-12 rounded-xl text-sm bg-muted/40 border-0 focus-visible:ring-primary"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleManualSearch}
                  disabled={searchQuery.trim().length < 3 || searching}
                  className="h-12 px-4 rounded-xl"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Type detection hint */}
              {searchQuery.length >= 2 && !searching && !searchNotFound && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] text-muted-foreground pl-1"
                >
                  {getPlaceholderHint(detectedType)}
                </motion.p>
              )}

              {/* Quick saved recipients (horizontal) */}
              {!searchQuery && savedRecipients.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                  {savedRecipients.slice(0, 5).map(r => (
                    <button
                      key={r.id}
                      onClick={() => selectSavedRecipient(r)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 border border-border hover:border-primary/30 transition-all flex-shrink-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{r.full_name.charAt(0)}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium truncate max-w-[80px]">{r.full_name}</p>
                        {r.recipient_user_id && (
                          <p className="text-[9px] text-primary">Konnekt ✓</p>
                        )}
                      </div>
                      {r.is_favorite && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {/* ═══ MULTIPLE RESULTS DISAMBIGUATION ═══ */}
              {multipleResults.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1.5"
                >
                  <p className="text-[11px] text-muted-foreground font-medium px-1">
                    {multipleResults.length} résultats — sélectionnez le bon :
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {multipleResults.map((p) => (
                      <button
                        key={p.user_id}
                        onClick={() => selectProfile(p)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/60 transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {(p.full_name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.full_name || "Utilisateur"}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {p.city && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {p.city}
                              </span>
                            )}
                            {p.phone && (
                              <span>···{p.phone.slice(-4)}</span>
                            )}
                            <span className="font-mono text-primary/70">{getKonnektId(p.user_id)}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            /* ═══ FOUND RESULT ═══ */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/40 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 truncate">{searchResult.name}</p>
                <p className="text-[11px] text-green-600 dark:text-green-400">
                  Membre Konnekt · Suivi automatique activé
                </p>
              </div>
              <Badge className="bg-primary/20 text-primary text-[10px] shrink-0">Konnekt ✓</Badge>
            </motion.div>
          )}

          {/* Self-selection error */}
          <AnimatePresence>
            {isSelfSelection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                  <p className="text-xs text-destructive font-medium">
                    Vous ne pouvez pas vous sélectionner comme destinataire
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Not found → manual fields */}
          <AnimatePresence>
            {searchNotFound && !isSelfSelection && showManualFields && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3"
              >
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    Aucun compte trouvé — remplissez manuellement :
                  </p>
                </div>
                <Input
                  placeholder="Nom du destinataire *"
                  value={manualName}
                  onChange={(e) => handleManualChange(e.target.value, manualPhone)}
                  className="h-10 rounded-xl text-sm"
                />
                <Input
                  placeholder="Téléphone avec indicatif (ex: +221...)"
                  value={manualPhone}
                  onChange={(e) => handleManualChange(manualName, e.target.value)}
                  className="h-10 rounded-xl text-sm"
                  type="tel"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation */}
          {required && !isValid && !searchQuery && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              Cherchez ou saisissez votre destinataire
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══ UPSELL / INFO SECTION ═══ */}
      <AnimatePresence>
        {showUpsell && isValid && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {recipientUserId && searchResult ? (
              <Card className="border-primary/20 bg-card overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <span className="text-sm font-bold text-primary">
                        {searchResult.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{searchResult.name}</p>
                      <p className="text-[11px] text-muted-foreground">Membre Konnekt</p>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> Vérifié
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Eye className="w-3 h-3 text-primary" />
                      <span>Suivi temps réel</span>
                    </div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Package className="w-3 h-3 text-primary" />
                      <span>Notifications</span>
                    </div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      <span>Historique</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent-foreground" />
                    <span className="text-sm font-semibold">Destinataire sans compte Konnekt</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    En créant un compte, <strong>{recipientName}</strong> pourra suivre le colis en temps réel
                    et recevoir des notifications de livraison.
                  </p>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border border-border/50">
                    <div className="flex -space-x-1">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Eye className="w-3 h-3 text-primary" />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Package className="w-3 h-3 text-primary" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex-1">
                      Suivi • Notifications • Historique
                    </p>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Un lien d'inscription sera envoyé par SMS à la livraison
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Recipients Sheet */}
      <Sheet open={showSaved} onOpenChange={setShowSaved}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[60vh]">
          <SheetHeader>
            <SheetTitle className="text-left flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Mes destinataires
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 py-3 overflow-y-auto">
            {savedRecipients.map(r => (
              <button
                key={r.id}
                onClick={() => selectSavedRecipient(r)}
                className="w-full text-left p-3 rounded-xl border bg-card hover:border-primary/30 transition-all flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{r.full_name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.full_name}</span>
                    {r.is_favorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    {r.recipient_user_id && <Badge className="bg-primary/20 text-primary text-[10px] px-1">Konnekt</Badge>}
                  </div>
                  {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                </div>
              </button>
            ))}
            {savedRecipients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun destinataire enregistré
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
