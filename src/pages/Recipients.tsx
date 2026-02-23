/**
 * Recipients Page — Manage saved recipients
 * Add by phone/QR, accept/reject requests, saved list
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Phone, QrCode, Search, Trash2, Star, StarOff, Check, X, Clock, UserPlus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";

interface Recipient {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  is_favorite: boolean;
  recipient_user_id: string | null;
  created_at: string;
}

interface RecipientRequest {
  id: string;
  requester_id: string;
  target_user_id: string;
  requester_name: string | null;
  status: string;
  created_at: string;
}

export default function Recipients() {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<RecipientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Add form
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [recipientsRes, requestsRes] = await Promise.all([
      supabase.from("recipients").select("*").eq("owner_id", user.id).order("is_favorite", { ascending: false }).order("full_name"),
      supabase.from("recipient_requests").select("*").eq("target_user_id", user.id).eq("status", "pending"),
    ]);

    setRecipients(recipientsRes.data || []);
    setIncomingRequests(requestsRes.data || []);
    setLoading(false);
  };

  const searchByPhone = async (phone: string) => {
    if (phone.length < 8) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("phone", phone.trim())
        .maybeSingle();
      
      if (data) {
        setFoundUser({ id: data.user_id, name: data.full_name || "Utilisateur Konnekt" });
        if (!addName) setAddName(data.full_name || "");
      } else {
        setFoundUser(null);
      }
    } catch {
      setFoundUser(null);
    } finally {
      setSearching(false);
    }
  };

  const addRecipient = async () => {
    if (!userId || !addName.trim()) return;
    try {
      const { error } = await supabase.from("recipients").insert({
        owner_id: userId,
        full_name: addName.trim(),
        phone: addPhone.trim() || null,
        recipient_user_id: foundUser?.id || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Ce destinataire existe déjà", variant: "destructive" });
        } else throw error;
        return;
      }

      // If found a Konnekt user, send a request
      if (foundUser?.id && foundUser.id !== userId) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
        await supabase.from("recipient_requests").insert({
          requester_id: userId,
          target_user_id: foundUser.id,
          requester_name: profile?.full_name || "Utilisateur",
        }).then(() => {});
      }

      toast({ title: "✅ Destinataire ajouté" });
      setShowAddSheet(false);
      setAddName("");
      setAddPhone("");
      setFoundUser(null);
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from("recipients").update({ is_favorite: !current }).eq("id", id);
    loadData();
  };

  const deleteRecipient = async (id: string) => {
    await supabase.from("recipients").delete().eq("id", id);
    toast({ title: "Destinataire supprimé" });
    loadData();
  };

  const handleRequest = async (requestId: string, accept: boolean) => {
    await supabase.from("recipient_requests").update({ status: accept ? "accepted" : "rejected" }).eq("id", requestId);
    toast({ title: accept ? "Demande acceptée" : "Demande refusée" });
    loadData();
  };

  const filtered = recipients.filter(r =>
    !searchQuery || r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.phone?.includes(searchQuery) || r.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <MobileHeader title="Destinataires" />

      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Mes destinataires
            <Badge variant="secondary" className="text-xs">{recipients.length}</Badge>
          </h1>
          <Button size="sm" onClick={() => setShowAddSheet(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>

        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Demandes reçues ({incomingRequests.length})
            </h3>
            {incomingRequests.map(req => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{req.requester_name || "Utilisateur"}</p>
                  <p className="text-xs text-muted-foreground">Veut vous ajouter comme destinataire</p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleRequest(req.id, true)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRequest(req.id, false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un destinataire..."
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun destinataire</p>
            <Button variant="link" size="sm" onClick={() => setShowAddSheet(true)}>
              Ajouter votre premier destinataire
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-xl border bg-card flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{r.full_name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{r.full_name}</p>
                    {r.recipient_user_id && (
                      <Badge className="bg-primary/20 text-primary text-[10px] px-1.5">Konnekt</Badge>
                    )}
                  </div>
                  {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                  {r.nickname && <p className="text-xs text-muted-foreground italic">{r.nickname}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFavorite(r.id, r.is_favorite)}>
                    {r.is_favorite ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <StarOff className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRecipient(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Recipient Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader>
            <SheetTitle className="text-left">Ajouter un destinataire</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <PhoneInputWithCode
                value={addPhone}
                onChange={(v) => { setAddPhone(v); setFoundUser(null); }}
                onBlur={(v) => searchByPhone(v)}
                suffix={searching ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : undefined}
              />
            </div>

            {foundUser && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">{foundUser.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Utilisateur Konnekt — suivi automatique</p>
                </div>
                <Badge className="bg-primary/20 text-primary text-[10px]">Konnekt</Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nom complet *</Label>
              <Input
                placeholder="Nom du destinataire"
                className="h-11"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>

            <Button
              className="w-full h-11"
              disabled={!addName.trim()}
              onClick={addRecipient}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
