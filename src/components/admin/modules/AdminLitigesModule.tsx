/**
 * Admin Litiges Module — Disputes management
 */
import { AdminSupportAndDisputes } from "@/components/admin/AdminSupportAndDisputes";
import { AlertTriangle } from "lucide-react";

export function AdminLitigesModule() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Litiges & Support
      </h2>
      <AdminSupportAndDisputes />
    </div>
  );
}