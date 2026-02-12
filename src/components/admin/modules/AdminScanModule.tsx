/**
 * Admin Scan Module — Scan & Terrain monitoring
 */
import { useState, useEffect } from "react";
import { ScanLine, AlertTriangle, MapPin, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function AdminScanModule() {
  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    const { data } = await supabase
      .from("scan_logs")
      .select("*, order:orders(order_number, origin_city, destination_city)")
      .order("created_at", { ascending: false })
      .limit(50);
    
    const logs = data || [];
    setScanLogs(logs);
    
    // Detect anomalies: duplicate scans, too-fast transitions
    const duplicates = findDuplicateScans(logs);
    setAnomalies(duplicates);
    setLoading(false);
  };

  const findDuplicateScans = (logs: any[]) => {
    const byOrder: Record<string, any[]> = {};
    logs.forEach(l => {
      const key = `${l.order_id}-${l.action}`;
      if (!byOrder[key]) byOrder[key] = [];
      byOrder[key].push(l);
    });
    return Object.entries(byOrder)
      .filter(([_, entries]) => entries.length > 1)
      .map(([key, entries]) => ({ key, count: entries.length, entries }));
  };

  const actionLabels: Record<string, { label: string; color: string }> = {
    deposit: { label: "Dépôt", color: "text-blue-600" },
    collect: { label: "Collecte", color: "text-indigo-600" },
    arrival: { label: "Arrivée", color: "text-purple-600" },
    delivery: { label: "Livraison", color: "text-green-600" },
    weight_check: { label: "Pesée", color: "text-amber-600" },
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-cyan-500" />
          Scan & Terrain
        </h2>
        <Badge variant="secondary" className="text-xs">{scanLogs.length} scans</Badge>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">
              {anomalies.length} anomalie{anomalies.length > 1 ? "s" : ""} détectée{anomalies.length > 1 ? "s" : ""}
            </span>
          </div>
          {anomalies.slice(0, 5).map((a, i) => (
            <p key={i} className="text-xs text-red-600 dark:text-red-400">
              Double scan: {a.key} ({a.count}x)
            </p>
          ))}
        </div>
      )}

      {/* Scan Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(actionLabels).map(([action, info]) => {
          const count = scanLogs.filter(l => l.action === action).length;
          return (
            <div key={action} className="p-3 rounded-xl border bg-card">
              <p className="text-xs text-muted-foreground">{info.label}</p>
              <p className={`text-xl font-bold ${info.color}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Scans */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Derniers scans</h3>
        {scanLogs.slice(0, 20).map(log => {
          const info = actionLabels[log.action] || { label: log.action, color: "text-gray-600" };
          return (
            <div key={log.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                  <ScanLine className={`w-4 h-4 ${info.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{info.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{log.order?.order_number || "—"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.order?.origin_city} → {log.order?.destination_city} · {log.user_role}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(log.created_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}