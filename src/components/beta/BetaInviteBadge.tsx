// Beta invite badge — affiché en haut du mini-dashboard transporteur.
import { Rocket } from "lucide-react";

export function BetaInviteBadge() {
  return (
    <div
      className="rounded-[10px] border px-4 py-3 flex items-start gap-2.5"
      style={{
        background: "rgba(59,130,246,0.08)",
        borderColor: "rgba(59,130,246,0.2)",
      }}
    >
      <Rocket className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#3B82F6" }} />
      <div className="text-[12px] leading-relaxed" style={{ color: "#3B82F6" }}>
        <span className="font-semibold">Vous êtes en accès bêta.</span>{" "}
        L'app complète arrive bientôt. En attendant, vos missions Yobbante
        apparaissent ici.
      </div>
    </div>
  );
}
