/**
 * Admin Overview Module — KPIs temps réel
 */
import { Package, Users, Wallet, ScanLine, AlertTriangle, Shield, PackageOpen, TrendingUp, Clock } from "lucide-react";
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
}

interface Props {
  stats: AdminGlobalStats;
  onNavigate: (module: string) => void;
}

export function AdminOverviewModule({ stats, onNavigate }: Props) {
  const kpis = [
    { label: "Volume aujourd'hui", value: stats.volumeToday, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", module: "colis" },
    { label: "Volume mensuel", value: stats.volumeMonth, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", module: "colis" },
    { label: "Escrow bloqué", value: `${(stats.totalEscrow / 1000).toFixed(0)}k`, suffix: "FCFA", icon: Wallet, color: "text-amber-500", bg: "bg-amber-500/10", module: "finance" },
    { label: "Commissions", value: `${(stats.totalCommissions / 1000).toFixed(0)}k`, suffix: "FCFA", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", module: "finance" },
    { label: "Assurance collectée", value: `${(stats.totalInsurance / 1000).toFixed(0)}k`, suffix: "FCFA", icon: Shield, color: "text-teal-500", bg: "bg-teal-500/10", module: "assurance" },
    { label: "En transit", value: stats.colisInTransit, icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/10", module: "colis" },
    { label: "En litige", value: stats.colisLitiges, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", module: "litiges", alert: stats.colisLitiges > 0 },
    { label: "Colis manuel", value: `${stats.colisManuel} (${stats.colisManuelPercent}%)`, icon: PackageOpen, color: "text-orange-500", bg: "bg-orange-500/10", module: "manuel" },
    { label: "GP actifs", value: stats.gpActifs, icon: Users, color: "text-violet-500", bg: "bg-violet-500/10", module: "gp" },
    { label: "Anomalies", value: stats.anomalies, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-500/10", module: "scan", alert: stats.anomalies > 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Vue d'ensemble</h2>
        <Badge variant="outline" className="text-[10px]">
          <Clock className="w-3 h-3 mr-1" /> Temps réel
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => onNavigate(kpi.module)}
            className={`p-3 rounded-xl border bg-card hover:shadow-md transition-all text-left ${
              kpi.alert ? "border-red-300 dark:border-red-800" : "border-border"
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

      {/* Quick Alerts */}
      {(stats.gpPending > 0 || stats.colisLitiges > 0 || stats.anomalies > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Alertes</h3>
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
        </div>
      )}

      {/* GP Summary */}
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
  );
}