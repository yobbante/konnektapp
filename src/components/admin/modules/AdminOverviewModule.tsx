/**
 * Admin Overview Module — KPIs temps réel complets
 */
import { Package, Users, Wallet, AlertTriangle, Shield, PackageOpen, TrendingUp, Clock, FileText, Truck, HeadphonesIcon, Award, Star, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AdminGlobalStats {
  volumeToday: number;
  volumeMonth: number;
  totalEscrow: number;
  totalCommissions: number;
  totalInsurance: number;
  colisInTransit: number;
  colisLitiges: number;
  colisManuel: number;
  colisManuelPercent: number;
  gpActifs: number;
  gpPending: number;
  gpVerified: number;
  gpSuspended: number;
  totalOrders: number;
  deliveredOrders: number;
  avgRating: number;
  anomalies: number;
  // New stats
  totalClients: number;
  totalCustomRequests: number;
  totalFreightRequests: number;
  totalRoutierMissions: number;
  openSupportTickets: number;
  avgKtpScore: number;
  activeSanctions: number;
  totalRevenue: number;
}

interface Props {
  stats: AdminGlobalStats;
  onNavigate: (module: string) => void;
}

export function AdminOverviewModule({ stats, onNavigate }: Props) {
  const kpiRows = [
    {
      title: "📦 Activité",
      items: [
        { label: "Aujourd'hui", value: stats.volumeToday, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", module: "colis" },
        { label: "Ce mois", value: stats.volumeMonth, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", module: "colis" },
        { label: "En transit", value: stats.colisInTransit, icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/10", module: "colis" },
        { label: "Total commandes", value: stats.totalOrders, icon: Package, color: "text-indigo-500", bg: "bg-indigo-500/10", module: "colis" },
        { label: "Livrées", value: stats.deliveredOrders, icon: Package, color: "text-green-500", bg: "bg-green-500/10", module: "colis" },
      ],
    },
    {
      title: "💰 Finance",
      items: [
        { label: "Escrow bloqué", value: `${(stats.totalEscrow / 1000).toFixed(0)}k`, suffix: "FCFA", icon: Wallet, color: "text-amber-500", bg: "bg-amber-500/10", module: "finance" },
        { label: "Commissions", value: `${(stats.totalCommissions / 1000).toFixed(0)}k`, suffix: "FCFA", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", module: "finance" },
        { label: "Assurance", value: `${(stats.totalInsurance / 1000).toFixed(0)}k`, suffix: "FCFA", icon: Shield, color: "text-teal-500", bg: "bg-teal-500/10", module: "assurance" },
        { label: "Revenu total", value: `${(stats.totalRevenue / 1000).toFixed(0)}k`, suffix: "FCFA", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10", module: "finance" },
      ],
    },
    {
      title: "👥 Utilisateurs & Transporteurs",
      items: [
        { label: "Clients", value: stats.totalClients, icon: Users, color: "text-pink-500", bg: "bg-pink-500/10", module: "clients" },
        { label: "Transporteurs", value: stats.gpActifs, icon: Users, color: "text-violet-500", bg: "bg-violet-500/10", module: "transporteurs" },
        { label: "En attente", value: stats.gpPending, icon: Users, color: "text-amber-500", bg: "bg-amber-500/10", module: "kyc", alert: stats.gpPending > 0 },
        { label: "Note moyenne", value: stats.avgRating.toFixed(1), icon: Star, color: "text-amber-500", bg: "bg-amber-500/10", module: "reputation" },
      ],
    },
    {
      title: "📋 Demandes & Support",
      items: [
        { label: "Demandes GP", value: stats.totalCustomRequests, icon: FileText, color: "text-purple-500", bg: "bg-purple-500/10", module: "demandes" },
        { label: "Fret", value: stats.totalFreightRequests, icon: Truck, color: "text-teal-500", bg: "bg-teal-500/10", module: "demandes" },
        { label: "Missions routier", value: stats.totalRoutierMissions, icon: Truck, color: "text-orange-500", bg: "bg-orange-500/10", module: "demandes" },
        { label: "Tickets support", value: stats.openSupportTickets, icon: HeadphonesIcon, color: "text-blue-500", bg: "bg-blue-500/10", module: "support", alert: stats.openSupportTickets > 0 },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Vue d'ensemble</h2>
        <Badge variant="outline" className="text-[10px]">
          <Clock className="w-3 h-3 mr-1" /> Temps réel
        </Badge>
      </div>

      {/* KPI Sections */}
      {kpiRows.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{section.title}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {section.items.map((kpi) => (
              <button
                key={kpi.label}
                onClick={() => onNavigate(kpi.module)}
                className={`p-3 rounded-xl border bg-card hover:shadow-md transition-all text-left ${
                  kpi.alert ? "border-red-300 dark:border-red-800 animate-pulse" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-lg font-bold leading-tight">
                  {kpi.value}
                  {kpi.suffix && <span className="text-[10px] font-normal text-muted-foreground ml-1">{kpi.suffix}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Quick Alerts */}
      {(stats.gpPending > 0 || stats.colisLitiges > 0 || stats.anomalies > 0 || stats.openSupportTickets > 0 || stats.activeSanctions > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">⚠️ Alertes</h3>
          {stats.gpPending > 0 && (
            <button 
              onClick={() => onNavigate("kyc")}
              className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-left"
            >
              <Users className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{stats.gpPending} GP en attente de validation</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">KYC à vérifier</p>
              </div>
            </button>
          )}
          {stats.colisLitiges > 0 && (
            <button 
              onClick={() => onNavigate("litiges")}
              className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-left"
            >
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">{stats.colisLitiges} litige{stats.colisLitiges > 1 ? "s" : ""} actif{stats.colisLitiges > 1 ? "s" : ""}</p>
                <p className="text-xs text-red-600 dark:text-red-400">Résolution requise</p>
              </div>
            </button>
          )}
          {stats.openSupportTickets > 0 && (
            <button 
              onClick={() => onNavigate("support")}
              className="w-full p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-left"
            >
              <HeadphonesIcon className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{stats.openSupportTickets} ticket{stats.openSupportTickets > 1 ? "s" : ""} support ouvert{stats.openSupportTickets > 1 ? "s" : ""}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Réponse en attente</p>
              </div>
            </button>
          )}
          {stats.activeSanctions > 0 && (
            <button 
              onClick={() => onNavigate("reputation")}
              className="w-full p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 flex items-center gap-3 text-left"
            >
              <Shield className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">{stats.activeSanctions} sanction{stats.activeSanctions > 1 ? "s" : ""} active{stats.activeSanctions > 1 ? "s" : ""}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">GP sanctionnés</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* GP Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">🚀 GP Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-border bg-card">
            <p className="text-xs text-muted-foreground">GP Total</p>
            <p className="text-xl font-bold">{stats.gpActifs + stats.gpPending + stats.gpSuspended}</p>
          </div>
          <div className="p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <p className="text-xs text-muted-foreground">Vérifiés</p>
            <p className="text-xl font-bold text-green-600">{stats.gpVerified}</p>
          </div>
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-xl font-bold text-amber-600">{stats.gpPending}</p>
          </div>
          <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <p className="text-xs text-muted-foreground">Suspendus</p>
            <p className="text-xl font-bold text-red-600">{stats.gpSuspended}</p>
          </div>
        </div>
      </div>

      {/* Colis Manuel */}
      {stats.colisManuel > 0 && (
        <button
          onClick={() => onNavigate("manuel")}
          className="w-full p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 flex items-center gap-3 text-left"
        >
          <PackageOpen className="w-5 h-5 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">{stats.colisManuel} colis manuels ({stats.colisManuelPercent}%)</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Hors plateforme — surveiller ratio</p>
          </div>
        </button>
      )}
    </div>
  );
}
