import { useState, useEffect } from "react";
import { 
  Smartphone, Laptop, Car, FileText, Gem, 
  Tablet, Gamepad2, Wine, Plus, Check, Euro
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ObjectType {
  id: string;
  name: string;
  label: string;
  default_price: number | null;
}

interface GPPricing {
  id: string;
  object_type_id: string;
  price: number;
  is_active: boolean;
}

const OBJECT_ICONS: Record<string, any> = {
  telephone: Smartphone,
  ordinateur: Laptop,
  piece_auto: Car,
  document: FileText,
  bijoux: Gem,
  tablette: Tablet,
  console: Gamepad2,
  parfum: Wine,
};

interface FlatRatePricingProps {
  gpId: string;
  readOnly?: boolean;
}

export function FlatRatePricing({ gpId, readOnly = false }: FlatRatePricingProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [gpPricing, setGpPricing] = useState<Map<string, GPPricing>>(new Map());
  const [editedPrices, setEditedPrices] = useState<Map<string, { price: string; isActive: boolean }>>(new Map());

  useEffect(() => {
    loadData();
  }, [gpId]);

  const loadData = async () => {
    try {
      // Load object types
      const { data: types, error: typesError } = await supabase
        .from("flat_rate_object_types")
        .select("*")
        .eq("is_active", true)
        .order("label");

      if (typesError) throw typesError;
      setObjectTypes(types || []);

      // Load GP's current pricing
      const { data: pricing, error: pricingError } = await supabase
        .from("gp_flat_rate_pricing")
        .select("*")
        .eq("gp_id", gpId);

      if (pricingError) throw pricingError;

      const pricingMap = new Map<string, GPPricing>();
      const editedMap = new Map<string, { price: string; isActive: boolean }>();
      
      pricing?.forEach(p => {
        pricingMap.set(p.object_type_id, p);
        editedMap.set(p.object_type_id, { 
          price: p.price.toString(), 
          isActive: p.is_active 
        });
      });

      // Initialize defaults for types without pricing
      types?.forEach(t => {
        if (!editedMap.has(t.id)) {
          editedMap.set(t.id, { 
            price: t.default_price?.toString() || "", 
            isActive: false 
          });
        }
      });

      setGpPricing(pricingMap);
      setEditedPrices(editedMap);
    } catch (error) {
      console.error("Error loading pricing data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les tarifs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (typeId: string, value: string) => {
    setEditedPrices(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(typeId) || { price: "", isActive: false };
      newMap.set(typeId, { ...current, price: value });
      return newMap;
    });
  };

  const handleToggle = (typeId: string) => {
    setEditedPrices(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(typeId) || { price: "", isActive: false };
      newMap.set(typeId, { ...current, isActive: !current.isActive });
      return newMap;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: { gp_id: string; object_type_id: string; price: number; is_active: boolean }[] = [];
      
      editedPrices.forEach((edited, typeId) => {
        if (edited.price && parseFloat(edited.price) > 0) {
          updates.push({
            gp_id: gpId,
            object_type_id: typeId,
            price: parseFloat(edited.price),
            is_active: edited.isActive,
          });
        }
      });

      // Upsert all pricing
      const { error } = await supabase
        .from("gp_flat_rate_pricing")
        .upsert(updates, { onConflict: 'gp_id,object_type_id' });

      if (error) throw error;

      toast({
        title: "✅ Tarifs enregistrés",
        description: "Vos tarifs forfaitaires ont été mis à jour",
      });

      loadData();
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les tarifs",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Euro className="w-4 h-4 text-primary" />
          Tarifs forfaitaires par objet
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Définissez des prix fixes pour certains objets (au lieu du prix/kg)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {objectTypes.map((type) => {
          const Icon = OBJECT_ICONS[type.name] || FileText;
          const edited = editedPrices.get(type.id) || { price: "", isActive: false };
          const hasPrice = edited.price && parseFloat(edited.price) > 0;
          
          return (
            <div
              key={type.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all
                ${edited.isActive && hasPrice 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'border-border'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${edited.isActive && hasPrice ? 'bg-primary/10' : 'bg-muted'}
              `}>
                <Icon className={`w-5 h-5 ${edited.isActive && hasPrice ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              
              <div className="flex-1">
                <p className="font-medium text-sm">{type.label}</p>
                {type.default_price && (
                  <p className="text-xs text-muted-foreground">
                    Prix suggéré: {type.default_price} €
                  </p>
                )}
              </div>

              {!readOnly && (
                <>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="1"
                      placeholder="€"
                      value={edited.price}
                      onChange={(e) => handlePriceChange(type.id, e.target.value)}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <Switch
                    checked={edited.isActive && hasPrice}
                    onCheckedChange={() => handleToggle(type.id)}
                    disabled={!hasPrice}
                  />
                </>
              )}

              {readOnly && edited.isActive && hasPrice && (
                <Badge variant="default" className="text-sm">
                  {edited.price} €
                </Badge>
              )}
            </div>
          );
        })}

        {!readOnly && (
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full mt-4"
          >
            {saving ? "Enregistrement..." : "Enregistrer les tarifs"}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Les objets activés seront proposés aux clients à un tarif fixe
        </p>
      </CardContent>
    </Card>
  );
}

// Display component for showing flat rates in offer/profile
export function FlatRateDisplay({ gpId }: { gpId: string }) {
  const [pricing, setPricing] = useState<{ label: string; price: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("gp_flat_rate_pricing")
        .select(`
          price,
          flat_rate_object_types!inner(label)
        `)
        .eq("gp_id", gpId)
        .eq("is_active", true);

      if (data) {
        setPricing(data.map((p: any) => ({
          label: p.flat_rate_object_types.label,
          price: p.price,
        })));
      }
    };
    load();
  }, [gpId]);

  if (pricing.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {pricing.map((p, i) => (
        <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20">
          {p.label}: {p.price} €
        </Badge>
      ))}
    </div>
  );
}
