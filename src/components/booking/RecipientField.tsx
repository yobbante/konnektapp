/**
 * RecipientField — MANDATORY recipient selector with Konnekt ID lookup & upsell
 * Used in SmartBookingPage step 1 to link a recipient user
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Search, CheckCircle, X, Users, Star, 
  Phone, Hash, Sparkles, ArrowRight, Eye, Package, TrendingUp,
  Globe
} from "lucide-react";
import { COUNTRY_PHONE_CODES } from "@/lib/phoneCountryCodes";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

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

type SearchMode = "phone" | "konnekt_id";

export function RecipientField({
  recipientName,
  recipientPhone,
  recipientUserId,
  onRecipientChange,
  required = true,
}: RecipientFieldProps) {
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; totalOrders?: number } | null>(null);
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("phone");
  const [konnektIdInput, setKonnektIdInput] = useState("");
  const [showUpsell, setShowUpsell] = useState(false);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [isSelfSelection, setIsSelfSelection] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+221");

  const phoneCodeOptions = Object.entries(COUNTRY_PHONE_CODES)
    .filter(([code]) => code !== "XX")
    .map(([code, prefix]) => ({ code, prefix }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));

  useEffect(() => {
    loadSavedRecipients();
  }, []);

  // Auto-show upsell when recipient is set
  useEffect(() => {
    if (recipientName && recipientPhone) {
      setShowUpsell(true);
    }
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

  const searchByPhone = async (phone: string) => {
    if (phone.length < 8) return;
    setSearching(true);
    setSearchNotFound(false);
    setIsSelfSelection(false);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (data) {
        // Prevent self-selection
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && data.user_id === currentUser.id) {
          setSearchResult(null);
          setSearchNotFound(true);
          setIsSelfSelection(true);
          setSearching(false);
          return;
        }

        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", data.user_id);
          
        setSearchResult({ id: data.user_id, name: data.full_name || "Utilisateur Konnekt", totalOrders: count || 0 });
        onRecipientChange({
          name: data.full_name || recipientName,
          phone,
          userId: data.user_id,
        });
        setSearchNotFound(false);
      } else {
        setSearchResult(null);
        setSearchNotFound(true);
        onRecipientChange({ name: recipientName, phone, userId: null });
      }
    } catch {
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const searchByKonnektId = async (idInput: string) => {
    if (idInput.length < 3) return;
    setSearching(true);
    setSearchNotFound(false);
    try {
      const trimmed = idInput.trim();
      setIsSelfSelection(false);
      // Check if input looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
      
      let data = null;
      
      if (isUUID) {
        // Search by user_id (UUID)
        const { data: byId } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .eq("user_id", trimmed)
          .maybeSingle();
        data = byId;
      }
      
      if (!data) {
        // Search by email (case-insensitive)
        const { data: byEmail } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .ilike("email", trimmed)
          .maybeSingle();
        data = byEmail;
      }

      if (data) {
        // Prevent self-selection: recipient cannot be the sender
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && data.user_id === currentUser.id) {
          setSearchResult(null);
          setSearchNotFound(true);
          setIsSelfSelection(true);
          setSearching(false);
          return;
        }

        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("client_id", data.user_id);

        setSearchResult({ id: data.user_id, name: data.full_name || "Utilisateur Konnekt", totalOrders: count || 0 });
        onRecipientChange({
          name: data.full_name || recipientName,
          phone: data.phone || recipientPhone,
          userId: data.user_id,
        });
        setSearchNotFound(false);
      } else {
        setSearchResult(null);
        setSearchNotFound(true);
      }
    } catch {
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const selectSavedRecipient = (r: SavedRecipient) => {
    onRecipientChange({
      name: r.full_name,
      phone: r.phone || "",
      userId: r.recipient_user_id,
    });
    if (r.recipient_user_id) {
      setSearchResult({ id: r.recipient_user_id, name: r.full_name });
    }
    setShowSaved(false);
    setShowUpsell(true);
  };

  const clearRecipient = () => {
    onRecipientChange({ name: "", phone: "", userId: null });
    setSearchResult(null);
    setShowUpsell(false);
    setSearchNotFound(false);
    setKonnektIdInput("");
  };

  const isValid = recipientName.trim().length > 0 && recipientPhone.trim().length >= 8;

  return (
    <>
      <Card className={`border-2 transition-colors ${
        isValid 
          ? "border-green-500/30 bg-green-50/30 dark:bg-green-900/10" 
          : required 
            ? "border-amber-400/50 bg-amber-50/30 dark:bg-amber-900/10" 
            : "border-border"
      }`}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Destinataire
              {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex items-center gap-1">
              {savedRecipients.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSaved(true)}>
                  <Users className="w-3.5 h-3.5" /> Carnet ({savedRecipients.length})
                </Button>
              )}
              {isValid && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearRecipient}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Tabs */}
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="phone" className="text-xs gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Par téléphone
              </TabsTrigger>
              <TabsTrigger value="konnekt_id" className="text-xs gap-1.5">
                <Hash className="w-3.5 h-3.5" /> ID Konnekt
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="mt-3 space-y-3">
              <Input
                placeholder="Nom du destinataire *"
                value={recipientName}
                onChange={(e) => onRecipientChange({ name: e.target.value, phone: recipientPhone, userId: recipientUserId })}
                className="h-10 rounded-xl text-sm"
              />
              <PhoneInputWithCode
                value={recipientPhone}
                onChange={(v) => {
                  onRecipientChange({ name: recipientName, phone: v, userId: null });
                  setSearchResult(null);
                  setSearchNotFound(false);
                }}
                onBlur={(fullPhone) => searchByPhone(fullPhone)}
                placeholder="Numéro du destinataire *"
                size="md"
                inputClassName="rounded-xl text-sm"
                suffix={searching ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : undefined}
              />
            </TabsContent>

            <TabsContent value="konnekt_id" className="mt-3 space-y-3">
              <div className="relative">
                <Input
                  placeholder="Email ou ID Konnekt du destinataire"
                  value={konnektIdInput}
                  onChange={(e) => {
                    setKonnektIdInput(e.target.value);
                    setSearchNotFound(false);
                  }}
                  className="h-10 rounded-xl text-sm pr-20"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs gap-1"
                  onClick={() => searchByKonnektId(konnektIdInput)}
                  disabled={konnektIdInput.length < 3 || searching}
                >
                  {searching ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" /> Chercher
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Si votre destinataire a un compte Konnekt, il pourra suivre le colis en temps réel
              </p>
            </TabsContent>
          </Tabs>

          {/* Konnekt User Found */}
          <AnimatePresence>
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/40 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">{searchResult.name}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Utilisateur Konnekt — suivi automatique activé</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary text-[10px] shrink-0">Konnekt ✓</Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Not found + manual entry hint */}
          {searchNotFound && !searchResult && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl border ${isSelfSelection ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/50 border-border'}`}
            >
              <p className="text-xs text-muted-foreground">
                {isSelfSelection 
                  ? "⚠️ Vous ne pouvez pas vous sélectionner comme destinataire. Veuillez entrer un autre contact."
                  : searchMode === "konnekt_id" 
                    ? "📱 Aucun compte Konnekt trouvé. Remplissez manuellement via l'onglet Téléphone." 
                    : "📱 Le destinataire recevra un lien de confirmation à la remise."}
              </p>
            </motion.div>
          )}

          {/* Validation indicator */}
          {required && !isValid && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Nom et téléphone du destinataire obligatoires
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══ UPSELL SECTION ═══ */}
      <AnimatePresence>
        {showUpsell && isValid && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {recipientUserId && searchResult ? (
              /* ── Recipient HAS Konnekt account — Dedicated info card ── */
              <Card className="border-primary/20 bg-card overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                <CardContent className="p-4 space-y-3">
                  {/* Identity row */}
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

                  {/* Key benefits — compact row */}
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
              /* ── Recipient does NOT have Konnekt account ── */
              <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent-foreground" />
                    <span className="text-sm font-semibold">Votre destinataire n'est pas sur Konnekt</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    En créant un compte, <strong>{recipientName}</strong> pourra suivre le colis en temps réel, 
                    recevoir des notifications de livraison et accéder à tout l'historique de ses réceptions.
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
