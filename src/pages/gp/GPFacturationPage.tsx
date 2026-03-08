/**
 * GPFacturationPage — Facturation complète GP
 * Wallet summary + commissions + ledger + invoices
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft, FileText, Download, Receipt, Crown,
  Calendar, CreditCard, CheckCircle, Clock, XCircle,
  ChevronRight, Wallet, Settings, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Banknote, ShieldCheck, Percent,
} from "lucide-react";

// ─── Types ───
interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_reference: string | null;
  description: string | null;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  type: string;
  amount_fcfa: number;
  amount_display: number;
  currency_display: string;
  description: string | null;
  reference: string | null;
  status: string;
  created_at: string;
}

interface EscrowEntry {
  id: string;
  amount: number;
  commission_amount: number;
  net_to_gp: number;
  currency: string;
  status: string;
  order_id: string;
  released_at: string | null;
  created_at: string;
}

interface WalletData {
  balance: number;
  pending_balance: number;
  locked_balance: number;
  total_earned: number;
  total_withdrawn: number;
  commission_rate: number;
  commission_due: number;
  debt_balance: number;
  currency: string;
}

// ─── Constants ───
const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  standard: { label: "Standard", color: "text-muted-foreground", bg: "bg-muted" },
  premium: { label: "Premium", color: "text-amber-600", bg: "bg-amber-500/10" },
  pro: { label: "Pro", color: "text-violet-600", bg: "bg-violet-500/10" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  paid: { label: "Payée", icon: CheckCircle, color: "text-emerald-500" },
  pending: { label: "En attente", icon: Clock, color: "text-amber-500" },
  failed: { label: "Échouée", icon: XCircle, color: "text-destructive" },
  refunded: { label: "Remboursée", icon: Receipt, color: "text-blue-500" },
};

const LEDGER_ICONS: Record<string, { icon: any; color: string; bg: string; sign: string }> = {
  earning: { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/10", sign: "+" },
  commission: { icon: Percent, color: "text-amber-500", bg: "bg-amber-500/10", sign: "-" },
  withdrawal: { icon: ArrowUpRight, color: "text-blue-500", bg: "bg-blue-500/10", sign: "-" },
  payout: { icon: Banknote, color: "text-emerald-500", bg: "bg-emerald-500/10", sign: "+" },
  debt: { icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10", sign: "-" },
};

const ESCROW_STATUS: Record<string, { label: string; color: string }> = {
  held: { label: "Bloqué", color: "text-amber-500" },
  released: { label: "Libéré", color: "text-emerald-500" },
  refunded: { label: "Remboursé", color: "text-blue-500" },
  cancelled: { label: "Annulé", color: "text-muted-foreground" },
};

export default function GPFacturationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [escrows, setEscrows] = useState<EscrowEntry[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: profile } = await supabase
      .from("gp_profiles")
      .select("id, business_name, gp_type, status, subscription, default_currency")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) { navigate("/gp/inscription"); return; }
    setGpProfile(profile);

    // Parallel fetches
    const [walletRes, invoiceRes, ledgerRes, escrowRes] = await Promise.all([
      supabase.from("gp_wallets").select("*").eq("gp_id", profile.id).maybeSingle(),
      supabase.from("subscription_invoices" as any).select("*").eq("gp_id", profile.id).order("created_at", { ascending: false }),
      supabase.from("konnekt_ledger").select("*").eq("gp_id", profile.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("escrow_transactions").select("*").eq("gp_id", profile.id).order("created_at", { ascending: false }).limit(30),
    ]);

    setWallet(walletRes.data as any);
    setInvoices((invoiceRes.data as any[]) || []);
    setLedger((ledgerRes.data as any[]) || []);
    setEscrows((escrowRes.data as any[]) || []);
    setLoading(false);
  };

  const currentPlan = gpProfile?.subscription || "standard";
  const planInfo = PLAN_LABELS[currentPlan] || PLAN_LABELS.standard;
  const currency = wallet?.currency || gpProfile?.default_currency || "XOF";

  const fmt = (amount: number, cur?: string) => {
    const c = cur || currency;
    if (c === "XOF" || c === "XAF") return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
    return `${amount.toLocaleString("fr-FR")} ${c}`;
  };

  const totalCommissions = useMemo(() => {
    return escrows.reduce((s, e) => s + (e.commission_amount || 0), 0);
  }, [escrows]);

  const totalEscrowHeld = useMemo(() => {
    return escrows.filter(e => e.status === "held").reduce((s, e) => s + e.amount, 0);
  }, [escrows]);

  if (loading) return <GPDashboardLayout gpProfile={{ id: "", business_name: "", gp_type: "", status: "" }}><PageLoader /></GPDashboardLayout>;

  return (
    <GPDashboardLayout gpProfile={gpProfile}>
      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/gp/parametres")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Facturation</h1>
            <p className="text-xs text-muted-foreground">Finances, commissions & factures</p>
          </div>
          <Badge variant="outline" className={`${planInfo.color} ${planInfo.bg} border-transparent text-[10px]`}>
            <Crown className="w-3 h-3 mr-1" />
            {planInfo.label}
          </Badge>
        </div>

        {/* Wallet Summary Card */}
        {wallet && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mon portefeuille</p>
            </div>

            <div className="text-center py-2">
              <p className="text-3xl font-bold tracking-tight">{fmt(wallet.balance)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Solde disponible</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-xl bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">En attente</p>
                <p className="text-sm font-bold">{fmt(wallet.pending_balance)}</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">Total gagné</p>
                <p className="text-sm font-bold text-emerald-500">{fmt(wallet.total_earned)}</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-muted/50">
                <p className="text-[9px] text-muted-foreground uppercase">Retiré</p>
                <p className="text-sm font-bold">{fmt(wallet.total_withdrawn)}</p>
              </div>
            </div>

            {/* Commission & debt info */}
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Taux commission</p>
                  <p className="text-sm font-bold">{wallet.commission_rate}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Dette</p>
                  <p className="text-sm font-bold">{wallet.debt_balance > 0 ? fmt(wallet.debt_balance) : "0"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview" className="text-xs">Résumé</TabsTrigger>
            <TabsTrigger value="ledger" className="text-xs">Mouvements</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs">Factures</TabsTrigger>
          </TabsList>

          {/* ─── Overview tab ─── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Escrow summary */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escrow</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-[10px] text-muted-foreground">Fonds bloqués</p>
                  <p className="text-lg font-bold text-amber-600">{fmt(totalEscrowHeld)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-muted-foreground">Commissions totales</p>
                  <p className="text-lg font-bold text-emerald-600">{fmt(totalCommissions)}</p>
                </div>
              </div>

              {/* Recent escrows */}
              {escrows.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Dernières opérations escrow</p>
                  {escrows.slice(0, 5).map(e => {
                    const st = ESCROW_STATUS[e.status] || ESCROW_STATUS.held;
                    return (
                      <div key={e.id} className="flex items-center justify-between py-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${e.status === "released" ? "bg-emerald-500" : e.status === "held" ? "bg-amber-500" : "bg-muted-foreground"}`} />
                          <span className="text-muted-foreground">{format(new Date(e.created_at), "d MMM", { locale: fr })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{fmt(e.net_to_gp, e.currency)}</span>
                          <span className={`text-[10px] ${st.color}`}>{st.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {escrows.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Aucune opération escrow</p>
              )}
            </motion.div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Mouvements</p>
                <p className="text-2xl font-bold">{ledger.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Factures</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </TabsContent>

          {/* ─── Ledger tab ─── */}
          <TabsContent value="ledger" className="space-y-3 mt-4">
            {ledger.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-2">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">Aucun mouvement</p>
                <p className="text-xs text-muted-foreground/70">Vos transactions apparaîtront ici automatiquement</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {ledger.map((entry, idx) => {
                  const info = LEDGER_ICONS[entry.type] || LEDGER_ICONS.earning;
                  const Icon = info.icon;
                  return (
                    <div key={entry.id}>
                      {idx > 0 && <Separator />}
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${info.bg} flex items-center justify-center`}>
                            <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{entry.description || entry.type}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(entry.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
                              {entry.reference && <span className="ml-1 font-mono">#{entry.reference.slice(0, 8)}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${info.sign === "+" ? "text-emerald-500" : "text-foreground"}`}>
                            {info.sign}{fmt(entry.amount_fcfa)}
                          </p>
                          {entry.currency_display !== "XOF" && (
                            <p className="text-[10px] text-muted-foreground">{fmt(entry.amount_display, entry.currency_display)}</p>
                          )}
                          <Badge variant="outline" className="text-[9px] mt-0.5">
                            {entry.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── Invoices tab ─── */}
          <TabsContent value="invoices" className="space-y-3 mt-4">
            {invoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-2">
                <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">Aucune facture</p>
                <p className="text-xs text-muted-foreground/70">
                  {currentPlan === "standard"
                    ? "Passez à Premium ou Pro pour recevoir des factures mensuelles"
                    : "Vos factures apparaîtront ici après votre premier paiement"}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <AnimatePresence>
                  {invoices.map((invoice, idx) => {
                    const statusInfo = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusInfo.icon;
                    const planLabel = PLAN_LABELS[invoice.plan] || PLAN_LABELS.standard;

                    return (
                      <motion.div key={invoice.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}>
                        {idx > 0 && <Separator />}
                        <button
                          className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${planLabel.bg} flex items-center justify-center`}>
                              <Receipt className={`w-4 h-4 ${planLabel.color}`} />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-sm">{invoice.invoice_number}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {format(new Date(invoice.created_at), "d MMM yyyy", { locale: fr })}
                                {" · "}
                                <span className={planLabel.color}>{planLabel.label}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{fmt(invoice.amount, invoice.currency)}</p>
                            <div className="flex items-center gap-1 justify-end">
                              <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                              <span className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</span>
                            </div>
                          </div>
                        </button>

                        <AnimatePresence>
                          {selectedInvoice?.id === invoice.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-3 space-y-2">
                                <Separator />
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Période</p>
                                    <p className="text-xs font-medium">
                                      {format(new Date(invoice.period_start), "d MMM", { locale: fr })} — {format(new Date(invoice.period_end), "d MMM yyyy", { locale: fr })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Paiement</p>
                                    <p className="text-xs font-medium">{invoice.payment_method || "—"}</p>
                                  </div>
                                  {invoice.payment_reference && (
                                    <div className="col-span-2">
                                      <p className="text-[10px] text-muted-foreground">Référence</p>
                                      <p className="text-xs font-mono">{invoice.payment_reference}</p>
                                    </div>
                                  )}
                                </div>
                                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2"
                                  onClick={(e) => { e.stopPropagation(); toast({ title: "Téléchargement", description: "La facture PDF sera bientôt disponible." }); }}>
                                  <Download className="w-3.5 h-3.5" /> Télécharger
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </GPDashboardLayout>
  );
}
