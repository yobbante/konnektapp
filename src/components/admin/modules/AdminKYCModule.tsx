/**
 * Admin KYC Module — GP verification & approval
 */
import { UserCheck } from "lucide-react";
import { AdminGPApprovalPanel } from "@/components/admin/AdminGPApprovalPanel";
import { AdminNavetteApprovals } from "@/components/admin/AdminNavetteApprovals";

export function AdminKYCModule() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-green-500" />
        KYC & Vérification GP
      </h2>
      <AdminGPApprovalPanel />
      <AdminNavetteApprovals />
    </div>
  );
}