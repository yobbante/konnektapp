/**
 * Admin Taux Module — Exchange rates management
 */
import { ArrowLeftRight } from "lucide-react";
import { ExchangeRatesManager } from "@/components/admin/ExchangeRatesManager";

export function AdminTauxModule() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
        Taux de Change
      </h2>
      <ExchangeRatesManager />
    </div>
  );
}