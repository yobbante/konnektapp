/**
 * GPScanSheet — Thin wrapper around UnifiedScanInterface
 * 
 * Opens as a bottom sheet from mobile nav.
 * All scan logic is in UnifiedScanInterface → ScanHeart → scan-engine.
 */
import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSwipeDown } from "@/hooks/useSwipeDown";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedScanInterface } from "./UnifiedScanInterface";

interface GPScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpId?: string;
  isVerified?: boolean;
}

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 55%, #1A2B3A 100%)";

export function GPScanSheet({ open, onOpenChange, gpId, isVerified }: GPScanSheetProps) {
  const [gpContext, setGpContext] = useState<{
    gpId: string;
    businessName: string;
    gpType: string;
    verified: boolean;
    rating: number | null;
    totalDeliveries: number | null;
    baseOriginCity: string | null;
    baseDestinationCity: string | null;
  } | null>(null);

  const swipe = useSwipeDown(() => onOpenChange(false));

  useEffect(() => {
    if (!open || !gpId) return;
    loadGpContext();
  }, [open, gpId]);

  const loadGpContext = async () => {
    if (!gpId) return;
    const { data } = await supabase
      .from("gp_profiles")
      .select("id, business_name, gp_type, status, rating, total_deliveries, verified_at, base_origin_city, base_destination_city")
      .eq("id", gpId)
      .maybeSingle();

    if (data) {
      setGpContext({
        gpId: data.id,
        businessName: data.business_name,
        gpType: data.gp_type,
        verified: !!data.verified_at,
        rating: data.rating,
        totalDeliveries: data.total_deliveries,
        baseOriginCity: data.base_origin_city,
        baseDestinationCity: data.base_destination_city,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[75vh] rounded-t-3xl p-0 border-0 overflow-hidden"
        style={{
          background: BG,
          transform: swipe.translateY > 0 ? `translateY(${swipe.translateY}px)` : undefined,
          transition: swipe.isDragging ? "none" : "transform 0.3s ease-out",
          opacity: swipe.translateY > 0 ? Math.max(0.5, 1 - swipe.translateY / 400) : 1,
        }}
      >
        {/* Swipe handle */}
        <div {...{onTouchStart: swipe.onTouchStart, onTouchMove: swipe.onTouchMove, onTouchEnd: swipe.onTouchEnd}} className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {gpContext ? (
          <UnifiedScanInterface
            role="gp"
            gpContext={gpContext}
            isSheet
            onRefresh={loadGpContext}
          />
        ) : (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
