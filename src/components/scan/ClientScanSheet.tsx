/**
 * ClientScanSheet — Mobile-optimized scan sheet
 * 
 * Opens as a bottom sheet from mobile nav.
 * All scan logic is in UnifiedScanInterface → ScanHeart → scan-engine.
 */
import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSwipeDown } from "@/hooks/useSwipeDown";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedScanInterface } from "./UnifiedScanInterface";

interface ClientScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const [clientContext, setClientContext] = useState<{
    userId: string;
    fullName: string | null;
  } | null>(null);

  const swipe = useSwipeDown(() => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    loadClientContext();
  }, [open]);

  const loadClientContext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    setClientContext({
      userId: user.id,
      fullName: profile?.full_name || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl p-0 border-0 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0B1218 0%, #0F1923 40%, #15232F 100%)",
          transform: swipe.translateY > 0 ? `translateY(${swipe.translateY}px)` : undefined,
          transition: swipe.isDragging ? "none" : "transform 0.3s ease-out",
          opacity: swipe.translateY > 0 ? Math.max(0.5, 1 - swipe.translateY / 400) : 1,
          touchAction: "none",
        }}
      >
        {/* Swipe handle — larger touch target for mobile */}
        <div
          onTouchStart={swipe.onTouchStart}
          onTouchMove={swipe.onTouchMove}
          onTouchEnd={swipe.onTouchEnd}
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          <div className="w-12 h-1.5 rounded-full bg-white/25" />
        </div>

        {clientContext ? (
          <UnifiedScanInterface
            role="client"
            clientContext={clientContext}
            isSheet
            onRefresh={loadClientContext}
          />
        ) : (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
