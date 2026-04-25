import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, History, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const STATUS_FLOW = ["pending", "validated", "in_progress", "completed", "declined"] as const;
type Status = typeof STATUS_FLOW[number];

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  validated: "Validé",
  in_progress: "En cours",
  completed: "Terminé",
  declined: "Refusé",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  validated: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  in_progress: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  completed: "bg-green-500/10 text-green-600 border-green-500/30",
  declined: "bg-red-500/10 text-red-600 border-red-500/30",
};

interface InterestRow {
  id: string;
  status: string;
  created_at: string;
  admin_notes: string | null;
  gp_id: string;
  custom_request_id: string;
  gp_profiles: { business_name: string; phone: string } | null;
  custom_requests: {
    request_number: string;
    origin_city: string;
    destination_city: string;
    weight_estimate: number | null;
    description: string | null;
  } | null;
}

export default function AdminTransporterInterests() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [selected, setSelected] = useState<InterestRow | null>(null);
  const [comment, setComment] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const interestsQ = useQuery({
    queryKey: ["admin-interests", filter],
    queryFn: async (): Promise<InterestRow[]> => {
      let q = supabase
        .from("transporter_interests")
        .select(`
          id, status, created_at, admin_notes, gp_id, custom_request_id,
          gp_profiles:gp_id (business_name, phone),
          custom_requests:custom_request_id (request_number, origin_city, destination_city, weight_estimate, description)
        `)
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) || [];
    },
  });

  const historyQ = useQuery({
    queryKey: ["interest-history", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transporter_interest_history" as any)
        .select("*")
        .eq("interest_id", selected!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ newStatus, cmt }: { newStatus: Status; cmt: string }) => {
      if (!selected) return;
      const { data: auth } = await supabase.auth.getUser();
      const { error: e1 } = await supabase
        .from("transporter_interests")
        .update({ status: newStatus, admin_notes: adminNotes || selected.admin_notes })
        .eq("id", selected.id);
      if (e1) throw e1;
      const { error: e2 } = await (supabase.from("transporter_interest_history" as any) as any).insert({
        interest_id: selected.id,
        old_status: selected.status,
        new_status: newStatus,
        comment: cmt || null,
        changed_by: auth.user?.id,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-interests"] });
      qc.invalidateQueries({ queryKey: ["interest-history"] });
      setComment("");
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background p-4 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Intérêts transporteurs</h1>
          <p className="text-sm text-muted-foreground">Gestion du pipeline pending → completed</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          Tous
        </Button>
        {STATUS_FLOW.map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {/* Liste */}
      {interestsQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (interestsQ.data?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Aucun intérêt {filter !== "all" ? `au statut « ${STATUS_LABEL[filter]} »` : ""}</Card>
      ) : (
        <div className="space-y-2">
          {interestsQ.data!.map((row) => (
            <Card
              key={row.id}
              className="p-4 cursor-pointer hover:bg-muted/40 transition"
              onClick={() => {
                setSelected(row);
                setAdminNotes(row.admin_notes || "");
                setComment("");
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{row.gp_profiles?.business_name || "Transporteur"}</span>
                    <Badge variant="outline" className="text-[10px]">{row.custom_requests?.request_number}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {row.custom_requests?.origin_city} → {row.custom_requests?.destination_city}
                    {row.custom_requests?.weight_estimate ? ` · ${row.custom_requests.weight_estimate} kg` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(row.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                  </p>
                </div>
                <Badge className={STATUS_COLOR[row.status]} variant="outline">
                  {STATUS_LABEL[row.status] || row.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gérer l'intérêt</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-5">
              <Card className="p-3 bg-muted/40">
                <div className="text-sm font-semibold">{selected.gp_profiles?.business_name}</div>
                <div className="text-xs text-muted-foreground">{selected.gp_profiles?.phone}</div>
                <div className="mt-2 text-sm">
                  {selected.custom_requests?.request_number} — {selected.custom_requests?.origin_city} → {selected.custom_requests?.destination_city}
                </div>
                {selected.custom_requests?.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selected.custom_requests.description}</p>
                )}
              </Card>

              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Note admin (persistante)
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Note interne..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Commentaire pour cet historique</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ex: validé après vérif KYC"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Changer le statut</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FLOW.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selected.status === s ? "default" : "outline"}
                      disabled={selected.status === s || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ newStatus: s, cmt: comment })}
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1 mb-2">
                  <History className="w-3.5 h-3.5" /> Historique
                </h3>
                {historyQ.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (historyQ.data?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun changement enregistré.</p>
                ) : (
                  <div className="space-y-2">
                    {historyQ.data!.map((h) => (
                      <div key={h.id} className="text-xs border-l-2 border-primary/40 pl-3 py-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[h.old_status] || h.old_status || "—"}</Badge>
                          <span>→</span>
                          <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[h.new_status] || h.new_status}</Badge>
                          <span className="text-muted-foreground ml-auto">
                            {format(new Date(h.created_at), "d MMM HH:mm", { locale: fr })}
                          </span>
                        </div>
                        {h.comment && <p className="mt-1 text-muted-foreground">{h.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
