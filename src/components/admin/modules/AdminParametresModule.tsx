/**
 * Admin Parametres Module — Global settings
 */
import { Settings, LineChart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminConfigPanel } from "@/components/admin/AdminConfigPanel";
import { AdminMessageTemplates } from "@/components/admin/AdminMessageTemplates";
import { AdminAutoMessageTemplates } from "@/components/admin/AdminAutoMessageTemplates";
import { AdminPermissionsManager } from "@/components/admin/AdminPermissionsManager";
import { AdminActiveCities } from "@/components/admin/AdminActiveCities";
import { AdminAppLockPanel } from "@/components/admin/AdminAppLockPanel";
import { Card } from "@/components/ui/card";

export function AdminParametresModule() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        Paramètres Globaux
      </h2>
      <AdminAppLockPanel />

      {/* Beta tracking shortcut — visible since /t flow is live in beta */}
      <Link to="/admin/beta-tracking" className="block">
        <Card className="p-4 flex items-center justify-between gap-3 border-primary/25 bg-gradient-to-br from-primary/5 to-transparent hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <LineChart className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">Tracking Bêta Transporteurs</div>
              <p className="text-xs text-muted-foreground truncate">
                Funnel /t · cohortes par source · réclamations de comptes
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Card>
      </Link>

      <AdminConfigPanel />
      <AdminActiveCities />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <AdminMessageTemplates />
        <AdminAutoMessageTemplates />
      </div>
      <AdminPermissionsManager />
    </div>
  );
}
