import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, ArrowLeft, Plus, UserPlus, Phone, MessageSquare,
  Send, CheckCheck, Search, Zap, FileText, RefreshCw, Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChatView } from "@/components/messaging/ChatView";
import { useUserRole } from "@/hooks/useUserRole";
import { UnifiedAdminLayout } from "@/components/layout/UnifiedAdminLayout";
import { AdminNewConversationDialog } from "@/components/admin/AdminNewConversationDialog";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  client_id: string;
  gp_id: string;
  order_id: string | null;
  last_message_at: string | null;
  client_name?: string;
  gp_name?: string;
  order_number?: string;
}

interface KonnektSignup {
  id: string;
  sender_phone: string;
  message_body: string | null;
  created_at: string;
}

type WaFilter = "all" | "unread" | "onboarding" | "registered";

interface WaThread {
  telephone: string;
  ref_gp: string | null;
  gp_name: string;
  last_message: string;
  last_at: string;
  unread: number;
  status: "onboarding" | "registered" | "unknown";
}

interface Template {
  id: string;
  category: string;
  template_key: string;
  content: string;
  icon?: string | null;
}

// Fallback templates used if the message_templates table is empty
const DEFAULT_TEMPLATES: Template[] = [
  { id: "d1", category: "Accueil", template_key: "welcome", content: "Salam ! Bienvenue sur Konnekt. Comment pouvons-nous vous aider aujourd'hui ?" },
  { id: "d2", category: "Devis", template_key: "quote", content: "Bonjour, pour établir un devis, merci de nous préciser la nature du colis, son poids approximatif et la destination." },
  { id: "d3", category: "Patience", template_key: "wait", content: "Un agent vous contacte sous 2h. Merci de votre patience. Que souhaitez-vous faire ensuite ?" },
  { id: "d4", category: "Onboarding", template_key: "onboard", content: "Votre inscription a bien été reçue. Notre équipe l'active sous 24h. En attendant, vous pouvez déjà publier un départ." },
  { id: "d5", category: "Départ", template_key: "departure", content: "Pour déclarer un départ : DEP [ville] [date] [kg]. Exemple : DEP Paris 15/06 25kg." },
  { id: "d6", category: "Clôture", template_key: "close", content: "Parfait, nous restons disponibles. Bonne journée et merci de votre confiance !" },
];

export default function AdminMessages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasAdminAccess, loading: roleLoading, userId } = useUserRole();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get("conversation")
  );
  const [selectedContactName, setSelectedContactName] = useState<string>("Conversation");
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "conversations" | "onboarding">("whatsapp");
  const [signups, setSignups] = useState<KonnektSignup[]>([]);
  const [waThreads, setWaThreads] = useState<WaThread[]>([]);
  const [waFilter, setWaFilter] = useState<WaFilter>("all");
  const [waSelected, setWaSelected] = useState<WaThread | null>(null);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);

  useEffect(() => {
    if (!roleLoading && !hasAdminAccess) navigate("/");
  }, [roleLoading, hasAdminAccess, navigate]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchConversations();
      fetchSignups();
      fetchWaThreads();
      fetchTemplates();
    }
  }, [hasAdminAccess]);

  // Realtime refresh of WhatsApp threads
  useEffect(() => {
    if (!hasAdminAccess) return;
    const channel = supabase
      .channel("admin-gp-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "gp_messages" }, () => {
        fetchWaThreads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hasAdminAccess]);

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase
        .from("message_templates")
        .select("id, category, template_key, content, icon, sender_type, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      const rows = ((data as any[]) || []).filter((t) => t.sender_type === "gp" || t.sender_type === "both");
      if (rows.length > 0) {
        setTemplates(rows.map((t) => ({ id: t.id, category: t.category, template_key: t.template_key, content: t.content, icon: t.icon })));
      }
    } catch (e) {
      console.error("templates error", e);
    }
  };

  const fetchWaThreads = useCallback(async () => {
    try {
      const { data: msgs } = await (supabase as any)
        .from("gp_messages")
        .select("ref_gp, telephone, message, direction, lu, created_at")
        .order("created_at", { ascending: false });
      const rows = (msgs as any[]) || [];

      // Conversations bot WhatsApp (entrants GP + réponses bot)
      const { data: inbound } = await (supabase as any)
        .from("whatsapp_inbound_messages")
        .select("sender_phone, message_body, bot_reply, created_at")
        .order("created_at", { ascending: false });
      const inRows = (inbound as any[]) || [];

      const { data: regEvents } = await (supabase as any)
        .from("gp_onboarding_events")
        .select("ref_gp, event");
      const registeredRefs = new Set(
        ((regEvents as any[]) || []).filter((e) => e.event === "registered").map((e) => e.ref_gp)
      );
      const knownRefs = new Set(((regEvents as any[]) || []).map((e) => e.ref_gp));

      const keyOf = (phone?: string | null) => normPhone(phone || "");

      const map = new Map<string, WaThread>();
      for (const r of rows) {
        const key = keyOf(r.telephone) || r.ref_gp;
        if (!key) continue;
        if (!map.has(key)) {
          const status: WaThread["status"] = registeredRefs.has(r.ref_gp)
            ? "registered"
            : knownRefs.has(r.ref_gp)
            ? "onboarding"
            : "unknown";
          map.set(key, {
            telephone: r.telephone,
            ref_gp: r.ref_gp,
            gp_name: r.ref_gp || r.telephone,
            last_message: r.message || "",
            last_at: r.created_at,
            unread: 0,
            status,
          });
        }
        const t = map.get(key)!;
        if (!r.lu && r.direction === "in") t.unread += 1;
      }

      // Ajoute / fusionne les conversations bot WhatsApp par numéro
      for (const r of inRows) {
        if (!r.sender_phone) continue;
        const key = keyOf(r.sender_phone);
        if (!key) continue;
        const last = r.bot_reply || r.message_body || "";
        if (!map.has(key)) {
          map.set(key, {
            telephone: r.sender_phone,
            ref_gp: null,
            gp_name: r.sender_phone,
            last_message: last,
            last_at: r.created_at,
            unread: 0,
            status: "unknown",
          });
        } else {
          const t = map.get(key)!;
          // garde le message le plus récent comme aperçu
          if (new Date(r.created_at).getTime() > new Date(t.last_at).getTime()) {
            t.last_message = last;
            t.last_at = r.created_at;
          }
        }
      }

      const threads = Array.from(map.values()).sort(
        (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
      );
      const refs = threads.map((t) => t.ref_gp).filter(Boolean);
      if (refs.length > 0) {
        const { data: profs } = await supabase
          .from("gp_profiles")
          .select("reference, business_name")
          .in("reference", refs as string[]);
        const nameMap = new Map(((profs as any[]) || []).map((p) => [p.reference, p.business_name]));
        threads.forEach((t) => {
          if (t.ref_gp && nameMap.get(t.ref_gp)) t.gp_name = nameMap.get(t.ref_gp);
        });
      }
      setWaThreads(threads);
      // keep selected thread fresh
      setWaSelected((prev) => (prev ? threads.find((t) => normPhone(t.telephone) === normPhone(prev.telephone)) || prev : prev));
    } catch (error) {
      console.error("Error fetching WhatsApp threads:", error);
    }
  }, []);

  const fetchSignups = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("whatsapp_inbound_messages")
        .select("id, sender_phone, message_body, created_at")
        .eq("tag", "konnekt_signup")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSignups((data as KonnektSignup[]) || []);
    } catch (error) {
      console.error("Error fetching signups:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`*, orders (order_number)`)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const conversationsWithNames = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { data: clientProfile } = await supabase
            .from("profiles").select("full_name").eq("user_id", conv.client_id).single();
          const { data: gpProfile } = await supabase
            .from("gp_profiles").select("business_name").eq("id", conv.gp_id).single();
          return {
            ...conv,
            client_name: clientProfile?.full_name || "Client",
            gp_name: gpProfile?.business_name || "Transporteur",
            order_number: conv.orders?.order_number,
          };
        })
      );
      setConversations(conversationsWithNames);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv.id);
    setSelectedContactName(`${conv.client_name} ↔ ${conv.gp_name}`);
  };

  const handleConversationCreated = (conversationId: string, contactName: string) => {
    setSelectedConversation(conversationId);
    setSelectedContactName(contactName);
    fetchConversations();
  };

  const totalUnread = waThreads.reduce((a, t) => a + t.unread, 0);

  const filteredThreads = waThreads.filter((t) => {
    if (waFilter === "unread" && t.unread === 0) return false;
    if (waFilter === "onboarding" && t.status !== "onboarding") return false;
    if (waFilter === "registered" && t.status !== "registered") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (t.gp_name || "").toLowerCase().includes(q) ||
        (t.telephone || "").toLowerCase().includes(q) ||
        (t.ref_gp || "").toLowerCase().includes(q) ||
        (t.last_message || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasDetail = !!selectedConversation || (activeTab === "whatsapp" && !!waSelected);

  if (roleLoading || loading) {
    return (
      <UnifiedAdminLayout activeModule="overview" standalone activeRoute="messages">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </UnifiedAdminLayout>
    );
  }
  if (!hasAdminAccess) return null;

  return (
    <UnifiedAdminLayout activeModule="overview" standalone activeRoute="messages">
      <div className="rounded-2xl border border-border bg-card overflow-hidden h-[calc(100vh-9rem)] flex">
        {/* ===== LEFT: conversation list ===== */}
        <div className={`w-full md:w-[340px] border-r border-border flex flex-col ${hasDetail ? "hidden md:flex" : "flex"}`}>
          {/* List header */}
          <div className="p-3 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <span className="font-bold">Messagerie</span>
                {totalUnread > 0 && <Badge className="bg-red-500 text-[10px]">{totalUnread} non lus</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { fetchWaThreads(); fetchConversations(); }}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowNewConversation(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un contact, un message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 rounded-full bg-muted/50 border-0"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-2 pt-2 gap-1">
            {([
              { id: "whatsapp", label: "WhatsApp", count: totalUnread },
              { id: "conversations", label: "App", count: conversations.length },
              { id: "onboarding", label: "Onboarding", count: signups.length },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full ${activeTab === tab.id ? "bg-white/25" : "bg-background"}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* WhatsApp filters */}
          {activeTab === "whatsapp" && (
            <div className="flex gap-1.5 flex-wrap px-3 py-2">
              {([
                { id: "all", label: "Tous" },
                { id: "unread", label: "Non lus" },
                { id: "onboarding", label: "Onboarding" },
                { id: "registered", label: "Inscrits" },
              ] as { id: WaFilter; label: string }[]).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setWaFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    waFilter === f.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* List body */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "whatsapp" && (
              filteredThreads.length === 0 ? (
                <EmptyList icon={<MessageSquare className="w-12 h-12" />} text="Aucun message" />
              ) : (
                filteredThreads.map((t) => (
                  <button
                    key={t.telephone || t.ref_gp}
                    onClick={() => { setSelectedConversation(null); setWaSelected(t); }}
                    className={`w-full p-3 text-left border-b border-border/60 transition-colors hover:bg-accent/50 ${
                      waSelected?.telephone === t.telephone ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={t.gp_name} green />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{t.gp_name}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtDate(t.last_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{t.last_message || "—"}</p>
                          {t.unread > 0 && <Badge className="bg-red-500 text-[10px] h-5 min-w-5 flex-shrink-0">{t.unread}</Badge>}
                        </div>
                        {t.status !== "unknown" && (
                          <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                            t.status === "registered" ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600"
                          }`}>
                            {t.status === "registered" ? "Inscrit" : "Onboarding"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
            )}

            {activeTab === "conversations" && (
              conversations.length === 0 ? (
                <EmptyList icon={<MessageCircle className="w-12 h-12" />} text="Aucune conversation" />
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-3 text-left border-b border-border/60 transition-colors hover:bg-accent/50 ${
                      selectedConversation === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={conv.client_name || "C"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{conv.client_name}</p>
                          {conv.order_number && <Badge variant="secondary" className="text-[10px]">{conv.order_number}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">↔ {conv.gp_name}</p>
                        {conv.last_message_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(conv.last_message_at)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
            )}

            {activeTab === "onboarding" && (
              signups.length === 0 ? (
                <EmptyList icon={<UserPlus className="w-12 h-12" />} text="Aucune inscription en attente" />
              ) : (
                signups.map((s) => (
                  <div key={s.id} className="w-full p-3 border-b border-border/60">
                    <div className="flex items-start gap-3">
                      <Avatar name={s.sender_phone} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{s.sender_phone}</p>
                          <Badge className="text-[10px]">Konnekt</Badge>
                        </div>
                        {s.message_body && <p className="text-xs text-muted-foreground truncate mt-1">{s.message_body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{fmtDate(s.created_at)}</p>
                        <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => navigate("/admin/terrain")}>
                          Valider dans Terrain
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* ===== RIGHT: detail ===== */}
        <div className={`flex-1 min-w-0 ${hasDetail ? "flex" : "hidden md:flex"} flex-col`}>
          {selectedConversation && userId ? (
            <ChatView
              conversationId={selectedConversation}
              currentUserId={userId}
              userType="client"
              onBack={() => setSelectedConversation(null)}
              contactName={selectedContactName}
            />
          ) : activeTab === "whatsapp" && waSelected ? (
            <WaThreadDetail
              key={waSelected.telephone}
              thread={waSelected}
              templates={templates}
              onBack={() => setWaSelected(null)}
              onSent={fetchWaThreads}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminNewConversationDialog
        open={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onConversationCreated={handleConversationCreated}
      />
    </UnifiedAdminLayout>
  );
}

/* ============ WhatsApp thread detail with composer + templates ============ */
function WaThreadDetail({
  thread, templates, onBack, onSent,
}: {
  thread: WaThread;
  templates: Template[];
  onBack: () => void;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"libre" | "templates">("libre");
  const [sending, setSending] = useState(false);
  const [treated, setTreated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("gp_messages")
      .select("id, message, direction, created_at, lu")
      .eq("telephone", thread.telephone)
      .order("created_at", { ascending: true });
    setMessages((data as any[]) || []);
    await (supabase as any)
      .from("gp_messages")
      .update({ lu: true })
      .eq("telephone", thread.telephone)
      .eq("direction", "in")
      .eq("lu", false);
  }, [thread.telephone]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime for this thread
  useEffect(() => {
    const channel = supabase
      .channel(`wa-thread-${thread.telephone}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gp_messages", filter: `telephone=eq.${thread.telephone}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [thread.telephone, load]);

  const lastInbound = [...messages].reverse().find((m) => m.direction === "in");
  const windowOpen = lastInbound ? (Date.now() - new Date(lastInbound.created_at).getTime()) < 24 * 3600 * 1000 : false;

  const send = async (deliver = false) => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("gp_messages").insert({
        ref_gp: thread.ref_gp,
        telephone: thread.telephone,
        message: body,
        direction: "out",
        lu: true,
      });
      if (error) throw error;
      setText("");
      await load();
      onSent();
      if (deliver) {
        const num = (thread.telephone || "").replace(/[^0-9]/g, "");
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(body)}`, "_blank");
      } else {
        toast({ title: "Message enregistré", description: "Réponse sauvegardée dans la conversation." });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Envoi impossible", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const openWa = () => {
    const num = (thread.telephone || "").replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden w-8 h-8" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar name={thread.gp_name} green />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{thread.gp_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {thread.telephone}
              {thread.status === "registered" && " · Inscrit"}
              {thread.status === "onboarding" && " · Onboarding"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTreated((v) => !v)}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
              treated ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" /> {treated ? "Traité" : "À traiter"}
          </button>
          <Button size="sm" variant="outline" className="h-8" onClick={openWa}>
            <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Window status */}
      <div className="px-4 py-1.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className={`text-[11px] font-medium flex items-center gap-1 ${windowOpen ? "text-green-600" : "text-amber-600"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${windowOpen ? "bg-green-500" : "bg-amber-500"}`} />
          {windowOpen ? "Fenêtre ouverte (< 24h)" : "Fenêtre fermée — utilisez un template"}
        </span>
        {thread.ref_gp && <span className="text-[11px] text-muted-foreground">Réf {thread.ref_gp}</span>}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[hsl(0,0%,97%)] dark:bg-background">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-8">Aucun message</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.direction === "out"
                  ? "ml-auto bg-[hsl(96,44%,68%)] text-foreground rounded-br-sm"
                  : "bg-white text-foreground rounded-bl-sm dark:bg-card"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.message}</p>
              <p className="text-[10px] opacity-60 mt-1 flex items-center justify-end gap-1">
                {fmtTime(m.created_at)}
                {m.direction === "out" && <CheckCheck className="w-3 h-3" />}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Composer mode toggle */}
      <div className="flex gap-2 px-3 pt-2">
        <button
          onClick={() => setMode("libre")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            mode === "libre" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Message libre
        </button>
        <button
          onClick={() => setMode("templates")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            mode === "templates" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <FileText className="w-4 h-4" /> Templates
        </button>
      </div>

      {/* Semi-automatic quick replies */}
      <AnimatePresence>
        {mode === "templates" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3"
          >
            <div className="flex gap-2 overflow-x-auto py-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => { setText(tpl.content); setMode("libre"); }}
                  className="flex-shrink-0 max-w-[220px] text-left bg-muted hover:bg-accent rounded-xl p-2.5 transition-colors"
                >
                  <p className="text-[10px] font-semibold text-primary flex items-center gap-1 mb-0.5">
                    <Zap className="w-3 h-3" /> {tpl.category}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.content}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message..."
            rows={1}
            className="flex-1 resize-none min-h-[44px] max-h-32 rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(false); }
            }}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11 rounded-full flex-shrink-0"
            disabled={sending || !text.trim()}
            onClick={() => send(true)}
            title="Envoyer via WhatsApp"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
          </Button>
          <Button
            size="icon"
            className="h-11 w-11 rounded-full flex-shrink-0"
            disabled={sending || !text.trim()}
            onClick={() => send(false)}
            title="Enregistrer la réponse"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Bot className="w-3 h-3" /> Entrée pour enregistrer · bouton vert pour ouvrir WhatsApp · Maj+Entrée = nouvelle ligne
        </p>
      </div>
    </div>
  );
}

/* ============ small helpers ============ */
function Avatar({ name, green }: { name: string; green?: boolean }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
      green ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"
    }`}>
      {initials || <Phone className="w-5 h-5" />}
    </div>
  );
}

function EmptyList({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="p-8 text-center">
      <div className="text-muted-foreground/40 mx-auto mb-3 w-fit">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function normPhone(p: string) {
  const d = (p || "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : d;
}

export { AdminMessages };
