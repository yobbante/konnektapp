import { useState, useEffect } from "react";
import { 
  AlertTriangle, ShieldX, Package, Gem, Tag, Flame, Pill,
  Battery, Droplets, UtensilsCrossed, Cigarette, Wine, Scissors,
  Sprout, Bug, Banknote, CreditCard, Key, FileText, Laptop,
  Smartphone, Camera, Watch, Shield, Check, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Comprehensive list of restrictions for GP Bagages
export const FULL_RESTRICTIONS_LIST = [
  // High severity - Critical
  { 
    id: "contrefacons", 
    label: "Contrefaçons", 
    description: "Produits non originaux, copies, faux",
    icon: ShieldX,
    severity: "critical",
    category: "legal"
  },
  { 
    id: "dangereux", 
    label: "Produits dangereux", 
    description: "Inflammables, explosifs, toxiques",
    icon: AlertTriangle,
    severity: "critical",
    category: "safety"
  },
  { 
    id: "drogues", 
    label: "Stupéfiants & drogues", 
    description: "Substances illicites",
    icon: Pill,
    severity: "critical",
    category: "legal"
  },
  { 
    id: "armes", 
    label: "Armes & munitions", 
    description: "Toutes armes et accessoires",
    icon: Shield,
    severity: "critical",
    category: "legal"
  },
  
  // High severity - Valuable
  { 
    id: "marques", 
    label: "Produits de marque", 
    description: "Articles de luxe, contrefaçons potentielles",
    icon: Tag,
    severity: "high",
    category: "valuable"
  },
  { 
    id: "objets_precieux", 
    label: "Objets précieux", 
    description: "Bijoux de valeur, montres de luxe, or",
    icon: Gem,
    severity: "high",
    category: "valuable"
  },
  { 
    id: "argent", 
    label: "Argent liquide", 
    description: "Espèces, devises",
    icon: Banknote,
    severity: "high",
    category: "valuable"
  },
  { 
    id: "cartes_bancaires", 
    label: "Cartes bancaires", 
    description: "Cartes de crédit, débit",
    icon: CreditCard,
    severity: "high",
    category: "valuable"
  },
  
  // Medium severity - Fragile/Special
  { 
    id: "liquides", 
    label: "Liquides", 
    description: "Bouteilles, produits liquides",
    icon: Droplets,
    severity: "medium",
    category: "special"
  },
  { 
    id: "batteries", 
    label: "Batteries lithium", 
    description: "Piles, accumulateurs lithium",
    icon: Battery,
    severity: "medium",
    category: "safety"
  },
  { 
    id: "perissables", 
    label: "Périssables", 
    description: "Aliments frais, produits réfrigérés",
    icon: UtensilsCrossed,
    severity: "medium",
    category: "special"
  },
  { 
    id: "alcool", 
    label: "Alcool", 
    description: "Vins, spiritueux, bières",
    icon: Wine,
    severity: "medium",
    category: "special"
  },
  { 
    id: "tabac", 
    label: "Tabac", 
    description: "Cigarettes, cigares, chicha",
    icon: Cigarette,
    severity: "medium",
    category: "special"
  },
  { 
    id: "plantes", 
    label: "Plantes & végétaux", 
    description: "Plantes, graines, fleurs",
    icon: Sprout,
    severity: "medium",
    category: "special"
  },
  { 
    id: "animaux", 
    label: "Animaux", 
    description: "Animaux vivants ou morts",
    icon: Bug,
    severity: "medium",
    category: "special"
  },
  
  // Low severity - Documents/Electronics
  { 
    id: "documents_officiels", 
    label: "Documents officiels", 
    description: "Passeports, visas, diplômes originaux",
    icon: FileText,
    severity: "low",
    category: "documents"
  },
  { 
    id: "cles", 
    label: "Clés", 
    description: "Clés de maison, voiture, coffre",
    icon: Key,
    severity: "low",
    category: "valuable"
  },
  { 
    id: "electronique_fragile", 
    label: "Électronique fragile", 
    description: "Appareils photo, drones, équipements pro",
    icon: Camera,
    severity: "low",
    category: "fragile"
  },
  { 
    id: "objets_coupants", 
    label: "Objets coupants", 
    description: "Couteaux, ciseaux, lames",
    icon: Scissors,
    severity: "low",
    category: "safety"
  },
];

interface RestrictionsManagerProps {
  selectedRestrictions: string[];
  onChange: (restrictions: string[]) => void;
  readOnly?: boolean;
  compact?: boolean;
  gpId?: string; // For saving to DB
  showSaveButton?: boolean;
}

export function RestrictionsManager({ 
  selectedRestrictions, 
  onChange,
  readOnly = false,
  compact = false,
  gpId,
  showSaveButton = false
}: RestrictionsManagerProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");

  const toggleRestriction = (id: string) => {
    if (readOnly) return;
    if (selectedRestrictions.includes(id)) {
      onChange(selectedRestrictions.filter(r => r !== id));
    } else {
      onChange([...selectedRestrictions, id]);
    }
  };

  const handleSaveToProfile = async () => {
    if (!gpId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({ explicit_restrictions: selectedRestrictions })
        .eq("id", gpId);

      if (error) throw error;

      toast({
        title: "✅ Restrictions enregistrées",
        description: "Vos préférences ont été mises à jour",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les restrictions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: "all", label: "Tout" },
    { id: "critical", label: "Critiques", severity: true },
    { id: "legal", label: "Légal" },
    { id: "safety", label: "Sécurité" },
    { id: "valuable", label: "Valeur" },
    { id: "special", label: "Spécial" },
  ];

  const filteredRestrictions = activeCategory === "all" 
    ? FULL_RESTRICTIONS_LIST
    : activeCategory === "critical"
    ? FULL_RESTRICTIONS_LIST.filter(r => r.severity === "critical")
    : FULL_RESTRICTIONS_LIST.filter(r => r.category === activeCategory);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {FULL_RESTRICTIONS_LIST.slice(0, 8).map((restriction) => {
            const isSelected = selectedRestrictions.includes(restriction.id);
            return (
              <Badge
                key={restriction.id}
                variant={isSelected ? "destructive" : "outline"}
                className={`cursor-pointer text-xs ${!readOnly ? 'hover:bg-destructive/20' : ''}`}
                onClick={() => !readOnly && toggleRestriction(restriction.id)}
              >
                ⛔ {restriction.label}
              </Badge>
            );
          })}
          {FULL_RESTRICTIONS_LIST.length > 8 && (
            <Badge variant="outline" className="text-xs">
              +{FULL_RESTRICTIONS_LIST.length - 8} autres
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldX className="w-4 h-4 text-destructive" />
          Restrictions de transport
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Indiquez tout ce que vous <strong>ne transportez PAS</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Restrictions list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredRestrictions.map((restriction) => {
            const Icon = restriction.icon;
            const isSelected = selectedRestrictions.includes(restriction.id);
            
            return (
              <div
                key={restriction.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${readOnly ? '' : 'cursor-pointer hover:bg-muted/50'}
                  ${isSelected 
                    ? 'border-destructive/50 bg-destructive/5' 
                    : 'border-border'
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${isSelected ? 'bg-destructive/10' : 'bg-muted'}
                `}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${isSelected ? 'text-destructive' : ''}`}>
                    {restriction.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {restriction.description}
                  </p>
                </div>

                {!readOnly && (
                  <Switch
                    checked={isSelected}
                    onCheckedChange={() => toggleRestriction(restriction.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}

                {readOnly && isSelected && (
                  <Badge variant="destructive" className="text-xs">
                    ⛔
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="pt-2 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedRestrictions.length} restriction{selectedRestrictions.length > 1 ? 's' : ''} active{selectedRestrictions.length > 1 ? 's' : ''}
          </p>
          
          {showSaveButton && gpId && (
            <Button 
              size="sm" 
              onClick={handleSaveToProfile}
              disabled={saving}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                "Enregistrer"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Display component for showing restrictions as badges
export function RestrictionBadgesDisplay({ restrictions }: { restrictions: string[] }) {
  if (!restrictions || restrictions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {restrictions.slice(0, 4).map((r) => {
        const restriction = FULL_RESTRICTIONS_LIST.find(s => s.id === r);
        if (!restriction) return null;
        return (
          <Badge 
            key={r} 
            variant="outline" 
            className="text-[10px] border-destructive/30 text-destructive bg-destructive/5"
          >
            ⛔ {restriction.label}
          </Badge>
        );
      })}
      {restrictions.length > 4 && (
        <Badge variant="outline" className="text-[10px]">
          +{restrictions.length - 4}
        </Badge>
      )}
    </div>
  );
}
