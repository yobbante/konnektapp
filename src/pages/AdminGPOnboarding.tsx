// Admin GP Onboarding Tracking — link_opened & registered events by ref_gp / konnekt_user_id.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, MousePointerClick, UserCheck, Link2 } from "lucide-react";

interface OnboardingEvent {
  id: string;
  ref_gp: string;
  event: string;
  konnekt_user_id: string | null;
  occurred_at: string;
}

interface OnboardingTrack {
  reference: string;
  form_completed_at: string | null;
  whatsapp_clicked_at: string | null;
  whatsapp_confirmed_at: string | null;
}

export default function AdminGPOnboarding() {
  const [events, setEvents] = useState<OnboardingEvent[]>([]);
  const [tracks, setTracks] = useState<Record<string, OnboardingTrack>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gp_onboarding_events" as any)
      .select("id, ref_gp, event, konnekt_user_id, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(2000);
    setEvents((data as unknown as OnboardingEvent[]) || []);

    const { data: tr } = await supabase
      .from("transporteurs" as any)
      .select("reference, form_completed_at, whatsapp_clicked_at, whatsapp_confirmed_at");
    const map: Record<string, OnboardingTrack> = {};
    ((tr as unknown as OnboardingTrack[]) || []).forEach((t) => {
      if (t.reference) map[t.reference.toUpperCase()] = t;
    });
    setTracks(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const opened = events.filter((e) => e.event === "link_opened");
    const registered = events.filter((e) => e.event === "registered");
    const uniqueOpenedRefs = new Set(opened.map((e) => e.ref_gp));
    const uniqueRegRefs = new Set(registered.map((e) => e.ref_gp));
    const rate =
      uniqueOpenedRefs.size > 0
        ? Math.round((uniqueRegRefs.size / uniqueOpenedRefs.size) * 100)
        : 0;
    return {
      opened: opened.length,
      registered: registered.length,
      uniqueOpened: uniqueOpenedRefs.size,
      uniqueReg: uniqueRegRefs.size,
      rate,
    };
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.ref_gp?.toLowerCase().includes(q) ||
        (e.konnekt_user_id || "").toLowerCase().includes(q)
    );
  }, [events, search]);

  return (
    <div className="min-h-screen bg-background p-4 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold">Onboarding GP — Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Suivi des liens d'invitation par référence GP
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MousePointerClick className="w-4 h-4" />
            <span className="text-xs">Liens ouverts</span>
          </div>
          <p className="text-2xl font-bold">{stats.opened}</p>
          <p className="text-xs text-muted-foreground">{stats.uniqueOpened} GP uniques</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <UserCheck className="w-4 h-4" />
            <span className="text-xs">Inscriptions</span>
          </div>
          <p className="text-2xl font-bold">{stats.registered}</p>
          <p className="text-xs text-muted-foreground">{stats.uniqueReg} GP uniques</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Link2 className="w-4 h-4" />
            <span className="text-xs">Taux conversion</span>
          </div>
          <p className="text-2xl font-bold">{stats.rate}%</p>
          <p className="text-xs text-muted-foreground">ouvert → inscrit</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-xs">Total événements</span>
          </div>
          <p className="text-2xl font-bold">{events.length}</p>
        </Card>
      </div>

      <Input
        placeholder="Rechercher par réf GP ou Konnekt user ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Aucun événement</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf GP</TableHead>
                <TableHead>Inscrit</TableHead>
                <TableHead>Formulaire ✓</TableHead>
                <TableHead>WA cliqué</TableHead>
                <TableHead>WA confirmé ✅</TableHead>
                <TableHead>Konnekt User ID</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const t = tracks[(e.ref_gp || "").toUpperCase()];
                return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono font-medium">{e.ref_gp}</TableCell>
                  <TableCell>
                    <Badge
                      variant={e.event === "registered" ? "default" : "secondary"}
                    >
                      {e.event === "registered" ? "Inscrit" : "Lien ouvert"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtShort(t?.form_completed_at)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtShort(t?.whatsapp_clicked_at)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtShort(t?.whatsapp_confirmed_at)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.konnekt_user_id || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(e.occurred_at).toLocaleString("fr-FR")}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
