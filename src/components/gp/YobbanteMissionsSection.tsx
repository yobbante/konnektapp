/**
 * YobbanteMissionsSection — Affiche les missions Yobbante du GP
 * Source: table `dossiers` WHERE assigned_transporteur_ref = gp.reference
 * AND status NOT IN ('DELIVERED','CANCELLED')
 */
import { useEffect, useState } from "react";
import { Package, RefreshCw, Scale, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Dossier {
  id: string;
  ref: string;
  ville: string | null;
  poids: number | null;
  status: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  CREATED: { label: "À collecter", cls: "bg-blue-500/10 text-blue-600" },
  TO_COLLECT: { label: "À collecter", cls: "bg-blue-500/10 text-blue-600" },
  COLLECTED: { label: "Collecté", cls: "bg-indigo-500/10 text-indigo-600" },
  WEIGHT_PENDING: { label: "Poids à enregistrer", cls: "bg-orange-500/10 text-orange-600" },
  IN_TRANSIT: { label: "En transit", cls: "bg-violet-500/10 text-violet-600" },
};

export function YobbanteMissionsSection({ reference }: { reference: string | null }) {
  const [missions, setMissions] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!reference) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("dossiers" as any)
      .select("id, ref, ville, poids, status")
      .eq("assigned_transporteur_ref", reference)
      .not("status", "in", "(DELIVERED,CANCELLED)")
      .order("created_at", { ascending: false });
    setMissions((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [reference]);

  if (!reference) return null;
  if (!loading && missions.length === 0) return null;

  return (
    <Card className="border-primary/20" style={{ background: "linear-gradient(135deg, hsl(165 47% 45% / 0.06), transparent)" }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Mes missions Yobbanté</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground py-2">Chargement…</p>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => {
              const st = STATUS_LABELS[m.status] || { label: m.status, cls: "bg-muted text-muted-foreground" };
              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-background/60 border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{m.ref}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {m.ville || "—"} · <Scale className="w-3 h-3" /> {m.poids ?? "?"}kg
                      </p>
                    </div>
                  </div>
                  <Badge className={`text-[11px] shrink-0 ${st.cls}`}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
