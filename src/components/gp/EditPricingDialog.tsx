import { useState, useEffect } from "react";
import { Euro, RefreshCw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CurrencySelector, getCurrencySymbol } from "@/components/ui/currency-selector";

interface FlatRateObjectType {
  id: string;
  name: string;
  label: string;
  default_price: number | null;
  is_active: boolean;
}

interface GPFlatRatePricing {
  id: string;
  object_type_id: string;
  price: number;
  is_active: boolean;
  currency?: string;
}

interface EditPricingDialogProps {
  open: boolean;
  onClose: () => void;
  gpId: string;
  onSuccess: () => void;
}

export function EditPricingDialog({ open, onClose, gpId, onSuccess }: EditPricingDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pricePerKg, setPricePerKg] = useState("");
  const [gpCurrency, setGpCurrency] = useState("EUR");
  const [objectTypes, setObjectTypes] = useState<FlatRateObjectType[]>([]);
  const [gpPricing, setGpPricing] = useState<Map<string, { price: string; isActive: boolean; id?: string }>>(new Map());

  useEffect(() => {
    if (open && gpId) {
      loadData();
    }
  }, [open, gpId]);

  const loadData = async () => {
    try {
      // Load global flat rate object types
      const { data: types } = await supabase
        .from("flat_rate_object_types")
        .select("*")
        .eq("is_active", true);

      if (types) {
        setObjectTypes(types);
      }

      // Load GP's existing pricing
      const { data: pricing } = await supabase
        .from("gp_flat_rate_pricing")
        .select("*")
        .eq("gp_id", gpId);

      if (pricing) {
        const pricingMap = new Map<string, { price: string; isActive: boolean; id?: string }>();
        pricing.forEach(p => {
          pricingMap.set(p.object_type_id, {
            price: p.price.toString(),
            isActive: p.is_active || false,
            id: p.id,
          });
        });
        setGpPricing(pricingMap);
      }

      // Load GP's average price per kg and currency from offers
      const { data: offers } = await supabase
        .from("gp_offers")
        .select("price_per_kg, currency")
        .eq("gp_id", gpId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (offers && offers.length > 0) {
        setPricePerKg(offers[0].price_per_kg.toString());
        setGpCurrency(offers[0].currency || "EUR");
      }
    } catch (error) {
      console.error("Error loading pricing data:", error);
    }
  };

  const handlePricingChange = (objectTypeId: string, field: "price" | "isActive", value: string | boolean) => {
    setGpPricing(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(objectTypeId) || { price: "", isActive: false };
      newMap.set(objectTypeId, { ...current, [field]: value });
      return newMap;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update flat rate pricing
      for (const [objectTypeId, pricing] of gpPricing.entries()) {
        if (pricing.price && parseFloat(pricing.price) > 0) {
          if (pricing.id) {
            // Update existing
            await supabase
              .from("gp_flat_rate_pricing")
              .update({
                price: parseFloat(pricing.price),
                is_active: pricing.isActive,
              })
              .eq("id", pricing.id);
          } else {
            // Insert new
            await supabase
              .from("gp_flat_rate_pricing")
              .insert({
                gp_id: gpId,
                object_type_id: objectTypeId,
                price: parseFloat(pricing.price),
                is_active: pricing.isActive,
                currency: gpCurrency,
              });
          }
        }
      }

      toast({
        title: "✅ Tarifs mis à jour",
        description: "Vos tarifs ont été enregistrés",
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating pricing:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les tarifs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Gérer mes tarifs
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Price per kg info with currency */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Devise par défaut</Label>
              <CurrencySelector
                value={gpCurrency}
                onValueChange={setGpCurrency}
                className="w-36"
              />
            </div>
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium">Prix au kilo (défini par voyage)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Le prix au kilo est défini individuellement pour chaque voyage que vous publiez.
              </p>
              {pricePerKg && (
                <p className="text-sm font-medium mt-2">
                  Dernier prix utilisé: <span className="text-primary">{pricePerKg} {getCurrencySymbol(gpCurrency)}/kg</span>
                </p>
              )}
            </div>
          </div>

          {/* Flat rate pricing */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Tarifs forfaitaires par objet</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Définissez des prix fixes pour certains types d'objets (indépendamment du poids).
            </p>

            <div className="space-y-3">
              {objectTypes.map((type) => {
                const pricing = gpPricing.get(type.id) || { price: type.default_price?.toString() || "", isActive: false };
                
                return (
                  <Card key={type.id} className={pricing.isActive ? "border-primary/50" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Switch
                            checked={pricing.isActive}
                            onCheckedChange={(checked) => handlePricingChange(type.id, "isActive", checked)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{type.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.5"
                            value={pricing.price}
                            onChange={(e) => handlePricingChange(type.id, "price", e.target.value)}
                            className="w-20 h-8 text-sm"
                            placeholder="Prix"
                            disabled={!pricing.isActive}
                          />
                          <span className="text-sm text-muted-foreground">{getCurrencySymbol(gpCurrency)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
