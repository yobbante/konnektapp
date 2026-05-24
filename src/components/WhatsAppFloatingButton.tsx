import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";

/**
 * Bouton WhatsApp flottant — visible sur toutes les pages Konnekt
 * Caché sur les pages Yobbanté (admin).
 */
export function WhatsAppFloatingButton() {
  const { pathname } = useLocation();
  // Pages Yobbanté = espace admin → on masque
  if (pathname.startsWith("/admin")) return null;

  return (
    <a
      href="https://wa.me/221781221891"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Besoin d'aide ? Écrivez-nous sur WhatsApp"
      title="Besoin d'aide ? Écrivez-nous sur WhatsApp"
      className="group fixed bottom-6 right-6 w-14 h-14 rounded-full grid place-items-center text-white transition-transform hover:scale-105 active:scale-95"
      style={{
        backgroundColor: "#25D366",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: 9999,
      }}
    >
      <MessageCircle className="w-7 h-7" strokeWidth={2} />
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-foreground text-background text-xs font-medium px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
        Besoin d'aide ? Écrivez-nous sur WhatsApp
      </span>
    </a>
  );
}
