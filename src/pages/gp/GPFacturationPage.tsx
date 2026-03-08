/**
 * GPFacturationPage — Historique de facturation & paramètres de facturation GP
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft, FileText, Download, Receipt, Crown,
  Calendar, CreditCard, CheckCircle, Clock, XCircle,
  ChevronRight, Wallet, Settings, Filter,
} from "lucide-react";

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

const PAYMENT_METHODS: Record<string, string> = {
  mobile_money: "Mobile Money",
  card: "Carte bancaire",
  bank_transfer: "Virement",
  wallet: "Portefeuille Konnekt",
};

export default function GPFacturationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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

    const { data: invoiceData } = await supabase
      .from("subscription_invoices" as any)
      .select("*")
      .eq("gp_id", profile.id)
      .order("created_at", { ascending: false });

    setInvoices((invoiceData as any[]) || []);
    setLoading(false);
  };

  const filteredInvoices = useMemo(() => {
    if (filterStatus === "all") return invoices;
    return invoices.filter(i => i.status === filterStatus);
  }, [invoices, filterStatus]);

  const totalPaid = useMemo(() => {
    return invoices
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [invoices]);

  const currentPlan = gpProfile?.subscription || "standard";
  const planInfo = PLAN_LABELS[currentPlan] || PLAN_LABELS.standard;
  const currency = gpProfile?.default_currency || "XOF";

  const formatAmount = (amount: number) => {
    if (currency === "XOF" || currency === "XAF") {
      return `${amount.toLocaleString("fr-FR")} CFA`;
    }
    return `${amount.toLocaleString("fr-FR")} ${currency}`;
  };

  if (loading) return <GPDashboardLayout gpProfile={{ id: "", business_name: "", gp_type: "", status: "" }}><PageLoader /></GPDashboardLayout>;

  return (
    <GPDashboardLayout gpProfile={gpProfile}>
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/gp/parametres")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Facturation</h1>
            <p className="text-xs text-muted-foreground">Historique et paramètres de paiement</p>
          </div>
        </div>

        {/* Current plan summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${planInfo.bg} flex items-center justify-center`}>
                <Crown className={`w-5 h-5 ${planInfo.color}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">Plan actuel</p>
                <Badge variant="outline" className={`${planInfo.color} ${planInfo.bg} border-transparent text-[10px]`}>
                  {planInfo.label}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/gp/premium")}>
              <Settings className="w-3.5 h-3.5" />
              Gérer
            </Button>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-xl bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Factures</p>
              <p className="text-lg font-bold">{invoices.length}</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total payé</p>
              <p className="text-lg font-bold">{formatAmount(totalPaid)}</p>
            </div>
          </div>
        </motion.div>

        {/* Payment settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Paramètres de paiement</p>
          </div>
          <Separator />
          <button
            className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors"
            onClick={() => toast({ title: "Bientôt disponible", description: "La gestion des moyens de paiement arrive bientôt." })}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Moyen de paiement</p>
                <p className="text-[11px] text-muted-foreground">Mobile Money par défaut</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <Separator />
          <button
            className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors"
            onClick={() => toast({ title: "Bientôt disponible", description: "Les informations de facturation seront bientôt modifiables." })}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Informations de facturation</p>
                <p className="text-[11px] text-muted-foreground">Nom, adresse, numéro fiscal</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <Separator />
          <button
            className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors"
            onClick={() => toast({ title: "Bientôt disponible", description: "Le renouvellement automatique sera bientôt configurable." })}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-violet-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Renouvellement auto</p>
                <p className="text-[11px] text-muted-foreground">Activé — prochain le 1er du mois</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Invoices list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Historique des factures</p>
            <div className="flex gap-1">
              {["all", "paid", "pending"].map(s => (
                <Button
                  key={s}
                  variant={filterStatus === s ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-[10px] px-2"
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "Tout" : s === "paid" ? "Payées" : "En attente"}
                </Button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-2">
              <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">Aucune facture</p>
              <p className="text-xs text-muted-foreground/70">
                {filterStatus !== "all" 
                  ? "Aucune facture avec ce filtre" 
                  : "Vos factures apparaîtront ici après votre premier paiement"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <AnimatePresence>
                {filteredInvoices.map((invoice, idx) => {
                  const statusInfo = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusInfo.icon;
                  const planLabel = PLAN_LABELS[invoice.plan] || PLAN_LABELS.standard;

                  return (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                    >
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
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-sm">{formatAmount(invoice.amount)}</p>
                            <div className="flex items-center gap-1 justify-end">
                              <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                              <span className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {selectedInvoice?.id === invoice.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
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
                                  <p className="text-xs font-medium">
                                    {PAYMENT_METHODS[invoice.payment_method || ""] || invoice.payment_method || "—"}
                                  </p>
                                </div>
                                {invoice.payment_reference && (
                                  <div className="col-span-2">
                                    <p className="text-[10px] text-muted-foreground">Référence</p>
                                    <p className="text-xs font-mono">{invoice.payment_reference}</p>
                                  </div>
                                )}
                                {invoice.description && (
                                  <div className="col-span-2">
                                    <p className="text-[10px] text-muted-foreground">Description</p>
                                    <p className="text-xs">{invoice.description}</p>
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-1.5 text-xs mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast({ title: "Téléchargement", description: "La facture PDF sera bientôt disponible." });
                                }}
                              >
                                <Download className="w-3.5 h-3.5" />
                                Télécharger la facture
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
        </motion.div>
      </div>
    </GPDashboardLayout>
  );
}
