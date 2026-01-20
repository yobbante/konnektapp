import { useState } from "react";
import { 
  AlertTriangle, ShieldX, Package, Gem, Tag,
  Check, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Standard restrictions for GP Via Bagages
export const STANDARD_RESTRICTIONS = [
  { 
    id: "marques", 
    label: "Produits de marque", 
    description: "Articles de luxe, contrefaçons potentielles",
    icon: Tag,
    severity: "high"
  },
  { 
    id: "objets_precieux", 
    label: "Objets précieux", 
    description: "Bijoux de valeur, montres de luxe, or",
    icon: Gem,
    severity: "high"
  },
  { 
    id: "contrefacons", 
    label: "Contrefaçons", 
    description: "Produits non originaux, copies",
    icon: ShieldX,
    severity: "critical"
  },
  { 
    id: "liquides", 
    label: "Liquides", 
    description: "Bouteilles, produits liquides",
    icon: Package,
    severity: "medium"
  },
  { 
    id: "perissables", 
    label: "Périssables", 
    description: "Aliments frais, produits réfrigérés",
    icon: Package,
    severity: "medium"
  },
  { 
    id: "dangereux", 
    label: "Produits dangereux", 
    description: "Inflammables, explosifs, batteries lithium",
    icon: AlertTriangle,
    severity: "critical"
  },
];

interface BaggageRestrictionsProps {
  selectedRestrictions: string[];
  onChange: (restrictions: string[]) => void;
  readOnly?: boolean;
}

export function BaggageRestrictions({ 
  selectedRestrictions, 
  onChange,
  readOnly = false 
}: BaggageRestrictionsProps) {
  const toggleRestriction = (id: string) => {
    if (readOnly) return;
    if (selectedRestrictions.includes(id)) {
      onChange(selectedRestrictions.filter(r => r !== id));
    } else {
      onChange([...selectedRestrictions, id]);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldX className="w-4 h-4 text-destructive" />
          Restrictions de transport
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Indiquez ce que vous ne transportez PAS
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {STANDARD_RESTRICTIONS.map((restriction) => {
          const Icon = restriction.icon;
          const isSelected = selectedRestrictions.includes(restriction.id);
          
          return (
            <div
              key={restriction.id}
              onClick={() => toggleRestriction(restriction.id)}
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
                w-10 h-10 rounded-lg flex items-center justify-center
                ${isSelected ? 'bg-destructive/10' : 'bg-muted'}
              `}>
                <Icon className={`w-5 h-5 ${isSelected ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              
              <div className="flex-1">
                <p className={`font-medium text-sm ${isSelected ? 'text-destructive' : ''}`}>
                  ⛔ {restriction.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {restriction.description}
                </p>
              </div>

              {!readOnly && (
                <Switch
                  checked={isSelected}
                  onCheckedChange={() => toggleRestriction(restriction.id)}
                />
              )}

              {readOnly && isSelected && (
                <Badge variant="destructive" className="text-xs">
                  Non accepté
                </Badge>
              )}
            </div>
          );
        })}

        {selectedRestrictions.length > 0 && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              {selectedRestrictions.length} restriction{selectedRestrictions.length > 1 ? 's' : ''} active{selectedRestrictions.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Display component for showing restrictions in offer cards
export function RestrictionBadges({ restrictions }: { restrictions: string[] }) {
  if (!restrictions || restrictions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {restrictions.slice(0, 3).map((r) => {
        const restriction = STANDARD_RESTRICTIONS.find(s => s.id === r);
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
      {restrictions.length > 3 && (
        <Badge variant="outline" className="text-[10px]">
          +{restrictions.length - 3}
        </Badge>
      )}
    </div>
  );
}
