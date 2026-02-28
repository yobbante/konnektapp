/**
 * SharedSettingsComponents — Factorized UI atoms for Client & GP settings pages
 */
import { useState } from "react";
import { ChevronRight, Eye, EyeOff, Key } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

/* ─── Section wrapper ─── */
export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{title}</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">{children}</div>
    </section>
  );
}

/* ─── Navigation row ─── */
export function SettingsRow({ icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", label, desc, onClick, right }: {
  icon: any; iconColor?: string; iconBg?: string; label: string; desc?: string; onClick?: () => void; right?: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="text-left">
          <p className="font-medium text-sm">{label}</p>
          {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {right || <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

/* ─── Toggle row ─── */
export function ToggleRow({ icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", label, desc, checked, onToggle }: {
  icon: any; iconColor?: string; iconBg?: string; label: string; desc?: string; checked: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3.5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <Label className="font-medium text-sm cursor-pointer">{label}</Label>
          {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}

/* ─── Password change dialog ─── */
export function PasswordChangeDialog({ open, onOpenChange, userEmail }: {
  open: boolean; onOpenChange: (v: boolean) => void; userEmail: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });

  const handleSubmit = async () => {
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    if (form.newPassword.length < 8) {
      toast({ title: "Erreur", description: "Minimum 8 caractères", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.newPassword });
      if (error) throw error;
      toast({ title: "Mot de passe modifié ✓" });
      onOpenChange(false);
      setForm({ newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5" />Changer le mot de passe</DialogTitle>
          <DialogDescription>{userEmail}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs">Nouveau mot de passe</Label>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="••••••••" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Confirmer</Label>
            <Input type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading || !form.newPassword || !form.confirmPassword}>
            {loading ? <MiniLoader size="sm" /> : "Modifier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Forgot password dialog ─── */
export function ForgotPasswordDialog({ open, onOpenChange, userEmail }: {
  open: boolean; onOpenChange: (v: boolean) => void; userEmail: string;
}) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "Email envoyé", description: "Vérifiez votre boîte mail" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSent(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>Un lien sera envoyé à {userEmail}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {sent ? (
            <p className="text-sm text-emerald-500 font-medium text-center">✓ Email envoyé — vérifiez votre boîte mail</p>
          ) : (
            <Button className="w-full" onClick={handleSend} disabled={loading}>
              {loading ? <MiniLoader size="sm" /> : "Envoyer le lien"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Notification preferences hook ─── */
export interface NotificationPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  new_message_alerts: boolean;
  new_offer_alerts: boolean;
  order_status_alerts: boolean;
  marketing_emails: boolean;
}

export const defaultNotificationPrefs: NotificationPrefs = {
  email_notifications: true,
  push_notifications: true,
  new_message_alerts: true,
  new_offer_alerts: true,
  order_status_alerts: true,
  marketing_emails: false,
};

export async function loadNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("email_notifications, push_notifications, new_message_alerts, new_offer_alerts, order_status_alerts, marketing_emails")
    .eq("user_id", userId)
    .single();

  return data ? {
    email_notifications: data.email_notifications ?? true,
    push_notifications: data.push_notifications ?? true,
    new_message_alerts: data.new_message_alerts ?? true,
    new_offer_alerts: data.new_offer_alerts ?? true,
    order_status_alerts: data.order_status_alerts ?? true,
    marketing_emails: data.marketing_emails ?? false,
  } : defaultNotificationPrefs;
}

export async function saveNotificationPref(userId: string, key: string, value: boolean) {
  await supabase.from("notification_preferences").upsert({
    user_id: userId,
    [key]: value,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}
