/**
 * UnifiedAdminLayout — Konnekt Admin V2+
 * 
 * Sidebar (desktop) + Bottom nav (mobile)
 * 15 modules: Overview, Colis, GP, Finance, Scan, Litiges, Assurance, Manuel, Taux, Paramètres, KYC, Clients, Demandes, Reputation, Support
 */
import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Package, Users, Wallet, ScanLine,
  AlertTriangle, Shield, PackageOpen, ArrowLeftRight,
  Settings, UserCheck, RefreshCw, Search, ChevronLeft,
  ChevronRight, MoreHorizontal, FileText, Award, HeadphonesIcon, UserRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type AdminModule =
  | "overview" | "colis" | "gp" | "transporteurs" | "finance" | "scan"
  | "litiges" | "assurance" | "manuel" | "taux" | "parametres" | "kyc"
  | "clients" | "demandes" | "reputation" | "support" | "mobility";

interface ModuleItem {
  id: AdminModule;
  label: string;
  icon: React.ElementType;
  color: string;
  group: string;
}

const ALL_MODULES: ModuleItem[] = [
  // Core
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: "text-blue-500", group: "core" },
  { id: "colis", label: "Colis", icon: Package, color: "text-emerald-500", group: "core" },
  { id: "transporteurs", label: "Transporteurs", icon: Users, color: "text-violet-500", group: "core" },
  { id: "clients", label: "Clients", icon: UserRound, color: "text-pink-500", group: "core" },
  // Operations
  { id: "finance", label: "Finance", icon: Wallet, color: "text-amber-500", group: "ops" },
  { id: "demandes", label: "Demandes", icon: FileText, color: "text-purple-500", group: "ops" },
  { id: "scan", label: "Scan", icon: ScanLine, color: "text-cyan-500", group: "ops" },
  { id: "manuel", label: "Manuel", icon: PackageOpen, color: "text-orange-500", group: "ops" },
  // Governance
  { id: "litiges", label: "Litiges", icon: AlertTriangle, color: "text-red-500", group: "gov" },
  { id: "reputation", label: "Réputation", icon: Award, color: "text-amber-500", group: "gov" },
  { id: "support", label: "Support", icon: HeadphonesIcon, color: "text-blue-500", group: "gov" },
  { id: "kyc", label: "KYC", icon: UserCheck, color: "text-green-500", group: "gov" },
  // Config
  { id: "assurance", label: "Assurance", icon: Shield, color: "text-teal-500", group: "config" },
  { id: "taux", label: "Taux", icon: ArrowLeftRight, color: "text-indigo-500", group: "config" },
  { id: "parametres", label: "Paramètres", icon: Settings, color: "text-gray-500", group: "config" },
];

const BOTTOM_NAV_ITEMS: AdminModule[] = ["overview", "colis", "scan", "finance", "transporteurs"];

const GROUP_LABELS: Record<string, string> = {
  core: "Principal",
  ops: "Opérations",
  gov: "Gouvernance",
  config: "Configuration",
};

interface UnifiedAdminLayoutProps {
  children: ReactNode;
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  subtitle?: string;
}

export function UnifiedAdminLayout({
  children,
  activeModule,
  onModuleChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  refreshing = false,
  subtitle,
}: UnifiedAdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const activeItem = ALL_MODULES.find(m => m.id === activeModule);
  const moreModules = ALL_MODULES.filter(m => !BOTTOM_NAV_ITEMS.includes(m.id));
  const groups = ["core", "ops", "gov", "config"];

  return (
    <div className="min-h-screen bg-background flex">
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 sticky top-0 h-screen z-40",
        sidebarCollapsed ? "w-16" : "w-56"
      )}>
        {/* Sidebar Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-sm">Konnekt Admin</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Module List - Grouped */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {groups.map((group) => {
            const groupModules = ALL_MODULES.filter(m => m.group === group);
            return (
              <div key={group} className="mb-2">
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                    {GROUP_LABELS[group]}
                  </p>
                )}
                {sidebarCollapsed && <div className="h-px bg-border mx-2 my-1" />}
                {groupModules.map((mod) => {
                  const isActive = activeModule === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => onModuleChange(mod.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      title={sidebarCollapsed ? mod.label : undefined}
                    >
                      <mod.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : mod.color)} />
                      {!sidebarCollapsed && <span>{mod.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">Konnekt Admin V3</p>
          </div>
        )}
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header
          className="sticky top-0 z-50 bg-gradient-to-r from-[hsl(240,75%,20%)] to-[hsl(240,60%,30%)] text-white shadow-lg"
          style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}
        >
          <div className="px-4 py-2.5 flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2.5 md:hidden">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Konnekt Admin</h1>
                {subtitle && <p className="text-[10px] text-white/50">{subtitle}</p>}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {activeItem && (
                <>
                  <activeItem.icon className="w-5 h-5" />
                  <h1 className="text-lg font-bold">{activeItem.label}</h1>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 h-8 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm rounded-lg"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={refreshing}
                className="bg-white/10 hover:bg-white/20 w-8 h-8 rounded-lg"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
          {/* Mobile search */}
          <div className="px-4 pb-2.5 sm:hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
              <Input
                placeholder="Rechercher colis, GP, commandes..."
                className="pl-8 h-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm rounded-lg"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-4 max-w-7xl mx-auto w-full pb-24 md:pb-4">
          {children}
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(240,75%,18%)] border-t border-white/10 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16">
          {BOTTOM_NAV_ITEMS.map((modId) => {
            const mod = ALL_MODULES.find(m => m.id === modId)!;
            const isActive = activeModule === modId;
            const isScan = modId === "scan";

            return (
              <motion.button
                key={modId}
                whileTap={{ scale: 0.9 }}
                onClick={() => onModuleChange(modId)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                  isScan ? "" : isActive ? "text-white" : "text-white/40"
                )}
              >
                {isScan ? (
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 shadow-lg",
                    isActive ? "bg-cyan-500 text-white" : "bg-white/15 text-white/60 border border-white/20"
                  )}>
                    <ScanLine className="w-6 h-6" />
                  </div>
                ) : (
                  <mod.icon className="w-5 h-5" />
                )}
                <span className={cn("text-[9px] font-medium", isScan && isActive && "text-cyan-400")}>
                  {mod.label}
                </span>
              </motion.button>
            );
          })}
          {/* More button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMoreSheetOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-white/40"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[9px] font-medium">Plus</span>
          </motion.button>
        </div>
      </nav>

      {/* ===== MORE SHEET (MOBILE) ===== */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader>
            <SheetTitle className="text-left">Modules Admin</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            {groups.map((group) => {
              const groupModules = moreModules.filter(m => m.group === group);
              if (groupModules.length === 0) return null;
              return (
                <div key={group}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
                    {GROUP_LABELS[group]}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {groupModules.map((mod) => {
                      const isActive = activeModule === mod.id;
                      return (
                        <button
                          key={mod.id}
                          onClick={() => {
                            onModuleChange(mod.id);
                            setMoreSheetOpen(false);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                            isActive ? "bg-primary/10 border border-primary/30" : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          <mod.icon className={cn("w-5 h-5", isActive ? "text-primary" : mod.color)} />
                          <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{mod.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
