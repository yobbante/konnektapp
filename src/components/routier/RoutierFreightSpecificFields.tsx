import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RoutierFreightSpecificFieldsProps {
  freightType: string | null;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const config: Record<string, { title: string; fields: Array<{ key: string; label: string; placeholder: string; multiline?: boolean }> }> = {
  colis: {
    title: "Détails colis",
    fields: [
      { key: "package_count", label: "Nombre de colis", placeholder: "Ex: 12 cartons" },
      { key: "package_format", label: "Format dominant", placeholder: "Ex: cartons, sacs, valises" },
      { key: "special_handling", label: "Consignes", placeholder: "Fragile, empilage, manutention...", multiline: true },
    ],
  },
  palettes: {
    title: "Détails palettes",
    fields: [
      { key: "pallet_count", label: "Nombre de palettes", placeholder: "Ex: 8" },
      { key: "pallet_size", label: "Format palette", placeholder: "Europe, demi-palette..." },
      { key: "loading_equipment", label: "Chargement", placeholder: "Transpalette, chariot, quai...", multiline: true },
    ],
  },
  alimentaire: {
    title: "Détails alimentaire",
    fields: [
      { key: "food_category", label: "Catégorie", placeholder: "Sec, frais, surgelé..." },
      { key: "packaging", label: "Conditionnement", placeholder: "Caisses, sacs, bacs..." },
      { key: "hygiene_notes", label: "Contraintes hygiène", placeholder: "Température, nettoyage, DLC...", multiline: true },
    ],
  },
  frigorifie: {
    title: "Détails frigorifié",
    fields: [
      { key: "target_temperature", label: "Température cible", placeholder: "Ex: 4°C" },
      { key: "cold_chain", label: "Chaîne du froid", placeholder: "Continue, ponctuelle..." },
      { key: "sensitive_goods", label: "Marchandise", placeholder: "Produits laitiers, viande, pharma...", multiline: true },
    ],
  },
  liquides: {
    title: "Détails liquides",
    fields: [
      { key: "liquid_type", label: "Type de liquide", placeholder: "Eau, huile, boisson..." },
      { key: "container_type", label: "Contenant", placeholder: "Cuve, bidons, fûts..." },
      { key: "security_notes", label: "Sécurité", placeholder: "Étanchéité, scellés, ADR...", multiline: true },
    ],
  },
  materiaux: {
    title: "Détails matériaux / vrac",
    fields: [
      { key: "material_type", label: "Type de matériau", placeholder: "Sable, gravier, ciment..." },
      { key: "unloading_method", label: "Déchargement", placeholder: "Benne, manuel, pelle..." },
      { key: "site_access", label: "Accès chantier", placeholder: "Route étroite, créneau, badge...", multiline: true },
    ],
  },
  btp: {
    title: "Détails BTP / machines",
    fields: [
      { key: "machine_type", label: "Machine / équipement", placeholder: "Mini-pelle, groupe électrogène..." },
      { key: "dimensions", label: "Dimensions utiles", placeholder: "L x l x h" },
      { key: "lifting_needs", label: "Levage / arrimage", placeholder: "Grue, sangles, rampes...", multiline: true },
    ],
  },
  vehicules: {
    title: "Détails véhicule",
    fields: [
      { key: "vehicle_identity", label: "Marque / modèle", placeholder: "Ex: Toyota Hilux 2020" },
      { key: "vehicle_state", label: "État roulant", placeholder: "Roulant, en panne, accidenté..." },
      { key: "documents_notes", label: "Documents / clés", placeholder: "Carte grise, double clé, assurance...", multiline: true },
    ],
  },
};

export function RoutierFreightSpecificFields({ freightType, values, onChange }: RoutierFreightSpecificFieldsProps) {
  if (!freightType || !config[freightType]) return null;

  const section = config[freightType];

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
      <div>
        <h3 className="text-sm font-semibold">{section.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">Formulaire dédié selon le type de marchandise.</p>
      </div>

      <div className="space-y-3">
        {section.fields.map((field) => (
          <div key={field.key}>
            <Label className="text-sm font-medium mb-1 block">{field.label}</Label>
            {field.multiline ? (
              <Textarea
                rows={3}
                placeholder={field.placeholder}
                value={values[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            ) : (
              <Input
                placeholder={field.placeholder}
                value={values[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
