/**
 * Apple-style Toaster — bridges shadcn useToast() into Apple notifications
 * 
 * This replaces the default shadcn Toaster with our AppleNotification system.
 * All existing toast() calls will render as Apple-style notifications.
 */

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { showAppleNotification, type NotificationType } from "@/components/ui/AppleNotification";

// Map toast variants to notification types
function mapVariant(variant?: string, title?: string): NotificationType {
  if (variant === "destructive") return "error";
  
  // Infer type from title content (common patterns in the app)
  const t = typeof title === "string" ? title.toLowerCase() : "";
  if (t.includes("✅") || t.includes("succès") || t.includes("réussi") || t.includes("ajouté") || t.includes("mis à jour") || t.includes("supprimé") || t.includes("enregistr") || t.includes("envoyé") || t.includes("activé")) return "success";
  if (t.includes("erreur") || t.includes("échoué") || t.includes("impossible")) return "error";
  if (t.includes("attention") || t.includes("⚠")) return "warning";
  if (t.includes("message")) return "message";
  if (t.includes("commande") || t.includes("réservation") || t.includes("colis")) return "order";
  if (t.includes("scan")) return "scan";
  if (t.includes("ktp") || t.includes("travel pass") || t.includes("trust")) return "ktp";
  if (t.includes("livr")) return "delivery";
  if (t.includes("paie") || t.includes("commission")) return "payment";
  if (t.includes("vérifi") || t.includes("inscription")) return "verification";
  
  return "info";
}

// Infer a link from the toast title/description
function inferLink(title?: string, description?: string): string | undefined {
  const text = `${typeof title === "string" ? title : ""} ${typeof description === "string" ? description : ""}`.toLowerCase();
  
  if (text.includes("inscription") || text.includes("profil")) return "/profil";
  if (text.includes("message")) return "/messages";
  if (text.includes("commande") || text.includes("réservation")) return "/historique";
  if (text.includes("scan")) return "/gp/scan";
  if (text.includes("livr")) return "/tracking";
  if (text.includes("template")) return undefined; // Admin action, no nav
  if (text.includes("favoris")) return "/favoris";
  
  return undefined;
}

export function AppleToaster() {
  const { toasts, dismiss } = useToast();

  useEffect(() => {
    toasts.forEach((t) => {
      if (!t.open) return;

      const titleStr = typeof t.title === "string" ? t.title : 
                       (t.title as any)?.props?.children || String(t.title || "");
      const descStr = typeof t.description === "string" ? t.description :
                      (t.description as any)?.props?.children || (t.description ? String(t.description) : undefined);

      showAppleNotification({
        type: mapVariant(t.variant, titleStr),
        title: titleStr,
        description: descStr,
        link: inferLink(titleStr, descStr),
        duration: t.variant === "destructive" ? 6000 : 3000,
      });

      // Dismiss from shadcn queue so it doesn't stack
      dismiss(t.id);
    });
  }, [toasts, dismiss]);

  return null; // No DOM — AppleNotificationContainer handles rendering
}
