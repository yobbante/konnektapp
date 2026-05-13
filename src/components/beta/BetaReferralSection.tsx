// Section parrainage — lien d'invitation transporteur Konnekt beta.
import { useState } from "react";
import { Copy, Check, Users } from "lucide-react";
import { toast } from "sonner";

interface Props {
  gpReference: string;
  invitedCount?: number;
}

export function BetaReferralSection({ gpReference, invitedCount = 0 }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `https://konnektapp.lovable.app/t?ref=${gpReference}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Lien copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <section className="px-6 max-w-xl mx-auto mt-10 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">
          Invitez des transporteurs
        </h2>
      </div>
      <p className="text-[12px] text-foreground/60 mb-3">
        Chaque transporteur invité = 1 mission offerte
      </p>

      <button
        onClick={copy}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition px-3 py-2.5"
      >
        <span className="text-[12px] text-primary truncate font-mono">{link}</span>
        {copied ? (
          <Check className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
        ) : (
          <Copy className="w-4 h-4 text-primary shrink-0" />
        )}
      </button>

      <p
        className="text-[11px] mt-2 tabular-nums"
        style={{ color: "hsl(var(--muted-foreground))", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
      >
        {invitedCount} transporteur{invitedCount > 1 ? "s" : ""} invité{invitedCount > 1 ? "s" : ""}
      </p>
    </section>
  );
}
