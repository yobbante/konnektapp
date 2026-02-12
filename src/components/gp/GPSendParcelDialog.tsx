/**
 * GPSendParcelDialog — Simplified booking for GP as client
 * GP sends a parcel to another GP. Pre-filled with GP's own data.
 * Ultra-simplified: just pick destination GP, weight, nature, done.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Search, Send, User, MapPin, Scale, ChevronRight, Star, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

interface GPSendParcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpProfile: {
    id: string;
    user_id: string;
    business_name: string;
    base_origin_city?: string | null;
    base_origin_country?: string | null;
  };
}

interface AvailableOffer {
  id: string;
  gp_id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  price_per_kg: number;
  currency: string;
  available_capacity: number;
  gp_name: string;
  gp_rating: number | null;
  gp_verified: boolean;
}

export function GPSendParcelDialog({ open, onOpenChange, gpProfile }: GPSendParcelDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offers, setOffers] = useState<AvailableOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCity, setSearchCity] = useState("");

  useEffect(() => {
    if (open) loadOffers();
  }, [open]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("gp_offers")
        .select("id, gp_id, origin_city, destination_city, departure_date, price_per_kg, currency, available_capacity, gp:gp_profiles!inner(business_name, rating, verified_at, user_id)")
        .eq("status", "active")
        .neq("gp_id", gpProfile.id) // Exclude own offers
        .gte("departure_date", new Date().toISOString())
        .gt("available_capacity", 0)
        .order("departure_date", { ascending: true })
        .limit(20);

      setOffers((data || []).map((o: any) => ({
        id: o.id,
        gp_id: o.gp_id,
        origin_city: o.origin_city,
        destination_city: o.destination_city,
        departure_date: o.departure_date,
        price_per_kg: o.price_per_kg,
        currency: o.currency,
        available_capacity: o.available_capacity,
        gp_name: o.gp?.business_name || "—",
        gp_rating: o.gp?.rating,
        gp_verified: !!o.gp?.verified_at,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = offers.filter(o => {
    if (!searchCity) return true;
    const q = searchCity.toLowerCase();
    return o.origin_city.toLowerCase().includes(q) || o.destination_city.toLowerCase().includes(q) || o.gp_name.toLowerCase().includes(q);
  });

  const handleSelectOffer = (offer: AvailableOffer) => {
    onOpenChange(false);
    // Navigate to SmartBookingPage with GP context
    navigate(`/reservation/gp/${offer.gp_id}?offer=${offer.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] pb-safe">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Envoyer un colis
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">
            Réservez chez un autre transporteur GP
          </p>
        </SheetHeader>

        <div className="space-y-4 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Chercher par ville ou transporteur..."
              className="pl-9 h-10"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
            />
          </div>

          {/* Available Offers */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune offre disponible</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(offer => (
                <button
                  key={offer.id}
                  onClick={() => handleSelectOffer(offer)}
                  className="w-full text-left p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm">{offer.gp_name}</span>
                          {offer.gp_verified && <Shield className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {offer.gp_rating?.toFixed(1) || "—"}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">{offer.origin_city}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{offer.destination_city}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(offer.departure_date).toLocaleDateString("fr", { day: "numeric", month: "short" })}</span>
                    <div className="flex items-center gap-3">
                      <span>{offer.available_capacity} kg dispo</span>
                      <Badge variant="secondary" className="text-xs">{offer.price_per_kg.toLocaleString()} {offer.currency}/kg</Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
