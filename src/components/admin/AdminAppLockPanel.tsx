/**
 * AdminAppLockPanel — Manage the global launch countdown.
 * Lets admin enable/disable the lock, change launch date, edit title/message,
 * and configure bypass paths and partner access token.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lock, Save, Loader2 } from "lucide-react";

interface Settings {
  id: string;
  is_locked: boolean;
  launch_at: string;
  title: string;
  message: string;
  bypass_paths: string[];
  partner_token: string;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminAppLockPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<Settings | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_lock_settings" as any).select("*").maybeSingle();
      if (data) setS(data as unknown as Settings);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_lock_settings" as any)
        .update({
          is_locked: s.is_locked,
          launch_at: new Date(s.launch_at).toISOString(),
          title: s.title,
          message: s.message,
          bypass_paths: s.bypass_paths,
          partner_token: s.partner_token,
        } as any)
        .eq("id", s.id);
      if (error) throw error;
      toast.success("Configuration enregistrée");
    } catch (e: any) {
      toast.error(e.message || "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Card>
    );
  }

  if (!s) {
    return <Card className="p-6 text-sm text-muted-foreground">Configuration introuvable.</Card>;
  }

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">Verrouillage du site (Countdown)</h3>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
        <div>
          <div className="text-sm font-medium">Verrouillage actif</div>
          <div className="text-xs text-muted-foreground">
            Quand actif, seul l'onboarding partenaire (/t) et les admins ont accès.
          </div>
        </div>
        <Switch
          checked={s.is_locked}
          onCheckedChange={(v) => setS({ ...s, is_locked: v })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Date de lancement</Label>
          <Input
            type="datetime-local"
            value={toLocalInput(s.launch_at)}
            onChange={(e) => setS({ ...s, launch_at: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Jeton partenaire (?partner=…)</Label>
          <Input
            value={s.partner_token}
            onChange={(e) => setS({ ...s, partner_token: e.target.value })}
            className="mt-1 font-mono text-xs"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Titre</Label>
        <Input
          value={s.title}
          onChange={(e) => setS({ ...s, title: e.target.value })}
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Message</Label>
        <Textarea
          value={s.message}
          onChange={(e) => setS({ ...s, message: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Chemins bypass (un par ligne)</Label>
        <Textarea
          value={s.bypass_paths.join("\n")}
          onChange={(e) =>
            setS({
              ...s,
              bypass_paths: e.target.value
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
            })
          }
          rows={4}
          className="mt-1 font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Tous les sous-chemins sont aussi acceptés (ex : `/t` autorise `/t/dashboard`).
        </p>
      </div>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Enregistrer
      </Button>
    </Card>
  );
}
