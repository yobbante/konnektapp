/**
 * Admin Parametres Module — Global settings
 */
import { Settings } from "lucide-react";
import { AdminConfigPanel } from "@/components/admin/AdminConfigPanel";
import { AdminMessageTemplates } from "@/components/admin/AdminMessageTemplates";
import { AdminAutoMessageTemplates } from "@/components/admin/AdminAutoMessageTemplates";
import { AdminPermissionsManager } from "@/components/admin/AdminPermissionsManager";
import { AdminActiveCities } from "@/components/admin/AdminActiveCities";

export function AdminParametresModule() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-500" />
        Paramètres Globaux
      </h2>
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