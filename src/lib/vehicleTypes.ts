import { Truck, Plane, Ship, Zap, Briefcase, Building2, Car, Bus, Container, Anchor } from "lucide-react";

export type TransportCategory = "routier" | "aerien" | "maritime" | "express" | "voyageur" | "agence";

export interface VehicleTypeConfig {
  value: string;
  label: string;
  icon: typeof Truck;
  category: TransportCategory;
  defaultSpecs: string[];
}

// Vehicle types by transport category
export const vehicleTypes: Record<TransportCategory, VehicleTypeConfig[]> = {
  routier: [
    { value: "camion", label: "Camion", icon: Truck, category: "routier", defaultSpecs: ["license_plate", "brand", "model", "year"] },
    { value: "fourgon", label: "Fourgon", icon: Bus, category: "routier", defaultSpecs: ["license_plate", "brand", "model"] },
    { value: "semi_remorque", label: "Semi-remorque", icon: Container, category: "routier", defaultSpecs: ["license_plate", "trailer_type"] },
    { value: "pickup", label: "Pick-up", icon: Car, category: "routier", defaultSpecs: ["license_plate", "brand", "model"] },
    { value: "hammer", label: "Hammer/Benne", icon: Truck, category: "routier", defaultSpecs: ["license_plate", "capacity_tons"] },
    { value: "grue", label: "Grue mobile", icon: Truck, category: "routier", defaultSpecs: ["license_plate", "max_lift_tons", "reach_m"] },
    { value: "bulldozer", label: "Bulldozer/Engin", icon: Truck, category: "routier", defaultSpecs: ["equipment_type"] },
  ],
  aerien: [
    { value: "cargo_avion", label: "Cargo aérien", icon: Plane, category: "aerien", defaultSpecs: ["airline", "flight_routes", "frequency"] },
    { value: "fret_regulier", label: "Fret régulier", icon: Plane, category: "aerien", defaultSpecs: ["airline", "destinations"] },
    { value: "charter", label: "Vol charter", icon: Plane, category: "aerien", defaultSpecs: ["charter_company", "aircraft_type"] },
  ],
  maritime: [
    { value: "conteneur", label: "Conteneur", icon: Container, category: "maritime", defaultSpecs: ["container_size", "container_type"] },
    { value: "cargo_ship", label: "Cargo maritime", icon: Ship, category: "maritime", defaultSpecs: ["ship_name", "shipping_line"] },
    { value: "roro", label: "RoRo (véhicules)", icon: Ship, category: "maritime", defaultSpecs: ["ports_served"] },
    { value: "vrac", label: "Vrac", icon: Anchor, category: "maritime", defaultSpecs: ["cargo_type"] },
  ],
  express: [
    { value: "moto", label: "Moto/Scooter", icon: Zap, category: "express", defaultSpecs: ["brand", "max_weight_kg"] },
    { value: "voiture", label: "Voiture", icon: Car, category: "express", defaultSpecs: ["brand", "model"] },
    { value: "velo", label: "Vélo cargo", icon: Zap, category: "express", defaultSpecs: ["max_weight_kg"] },
    { value: "triporteur", label: "Triporteur", icon: Zap, category: "express", defaultSpecs: ["max_weight_kg"] },
  ],
  voyageur: [
    { value: "bagage_soute", label: "Bagage soute", icon: Briefcase, category: "voyageur", defaultSpecs: ["baggage_allowance_kg", "airline"] },
    { value: "bagage_cabine", label: "Bagage cabine", icon: Briefcase, category: "voyageur", defaultSpecs: ["max_weight_kg"] },
  ],
  agence: [
    { value: "reseau_agences", label: "Réseau d'agences", icon: Building2, category: "agence", defaultSpecs: ["network_name", "coverage"] },
    { value: "partenaires", label: "Partenaires transport", icon: Building2, category: "agence", defaultSpecs: ["partner_types"] },
  ],
};

export const getAllVehicleTypes = (): VehicleTypeConfig[] => {
  return Object.values(vehicleTypes).flat();
};

export const getVehicleTypesByCategory = (category: TransportCategory): VehicleTypeConfig[] => {
  return vehicleTypes[category] || [];
};

export const getVehicleTypeConfig = (vehicleType: string): VehicleTypeConfig | undefined => {
  return getAllVehicleTypes().find(v => v.value === vehicleType);
};

export const getCategoryLabel = (category: TransportCategory): string => {
  const labels: Record<TransportCategory, string> = {
    routier: "Transport Routier",
    aerien: "Transport Aérien",
    maritime: "Transport Maritime",
    express: "Express/Livraison rapide",
    voyageur: "GP/Voyageur",
    agence: "Agence d'envoi",
  };
  return labels[category] || category;
};

export const getCategoryIcon = (category: TransportCategory) => {
  const icons: Record<TransportCategory, typeof Truck> = {
    routier: Truck,
    aerien: Plane,
    maritime: Ship,
    express: Zap,
    voyageur: Briefcase,
    agence: Building2,
  };
  return icons[category] || Truck;
};

// Specification field configurations
export interface SpecFieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  unit?: string;
}

export const specFieldConfigs: Record<string, SpecFieldConfig> = {
  license_plate: { key: "license_plate", label: "Immatriculation", type: "text", placeholder: "AA-123-BB" },
  brand: { key: "brand", label: "Marque", type: "text", placeholder: "Mercedes, MAN, Renault..." },
  model: { key: "model", label: "Modèle", type: "text", placeholder: "Actros, TGX..." },
  year: { key: "year", label: "Année", type: "number", placeholder: "2020" },
  fuel_type: { key: "fuel_type", label: "Carburant", type: "select", options: [
    { value: "diesel", label: "Diesel" },
    { value: "essence", label: "Essence" },
    { value: "electrique", label: "Électrique" },
    { value: "hybride", label: "Hybride" },
  ]},
  capacity_tons: { key: "capacity_tons", label: "Capacité", type: "number", placeholder: "10", unit: "tonnes" },
  max_lift_tons: { key: "max_lift_tons", label: "Charge max", type: "number", placeholder: "50", unit: "tonnes" },
  reach_m: { key: "reach_m", label: "Portée", type: "number", placeholder: "30", unit: "m" },
  trailer_type: { key: "trailer_type", label: "Type remorque", type: "select", options: [
    { value: "bache", label: "Bâché" },
    { value: "plateau", label: "Plateau" },
    { value: "frigorifique", label: "Frigorifique" },
    { value: "citerne", label: "Citerne" },
  ]},
  equipment_type: { key: "equipment_type", label: "Type d'engin", type: "text", placeholder: "Bulldozer, Tractopelle..." },
  airline: { key: "airline", label: "Compagnie aérienne", type: "text", placeholder: "Air France, Ethiopian..." },
  flight_routes: { key: "flight_routes", label: "Routes", type: "text", placeholder: "Dakar-Paris, Dakar-Abidjan..." },
  frequency: { key: "frequency", label: "Fréquence", type: "select", options: [
    { value: "daily", label: "Quotidien" },
    { value: "weekly", label: "Hebdomadaire" },
    { value: "biweekly", label: "Bi-hebdomadaire" },
    { value: "monthly", label: "Mensuel" },
  ]},
  destinations: { key: "destinations", label: "Destinations", type: "text", placeholder: "Paris, New York, Abidjan..." },
  charter_company: { key: "charter_company", label: "Compagnie charter", type: "text" },
  aircraft_type: { key: "aircraft_type", label: "Type d'avion", type: "text", placeholder: "Boeing 747, A320..." },
  container_size: { key: "container_size", label: "Taille conteneur", type: "select", options: [
    { value: "20ft", label: "20 pieds" },
    { value: "40ft", label: "40 pieds" },
    { value: "40hc", label: "40 pieds HC" },
  ]},
  container_type: { key: "container_type", label: "Type conteneur", type: "select", options: [
    { value: "dry", label: "Dry (standard)" },
    { value: "reefer", label: "Réfrigéré" },
    { value: "open_top", label: "Open Top" },
    { value: "flat_rack", label: "Flat Rack" },
  ]},
  ship_name: { key: "ship_name", label: "Nom du navire", type: "text" },
  shipping_line: { key: "shipping_line", label: "Compagnie maritime", type: "text", placeholder: "MSC, Maersk, CMA CGM..." },
  ports_served: { key: "ports_served", label: "Ports desservis", type: "text", placeholder: "Dakar, Abidjan, Lagos..." },
  cargo_type: { key: "cargo_type", label: "Type de cargo", type: "text", placeholder: "Céréales, minerais..." },
  max_weight_kg: { key: "max_weight_kg", label: "Poids max", type: "number", placeholder: "20", unit: "kg" },
  baggage_allowance_kg: { key: "baggage_allowance_kg", label: "Franchise bagage", type: "number", placeholder: "23", unit: "kg" },
  network_name: { key: "network_name", label: "Nom du réseau", type: "text" },
  coverage: { key: "coverage", label: "Couverture", type: "text", placeholder: "Nationale, Afrique de l'Ouest..." },
  partner_types: { key: "partner_types", label: "Types de partenaires", type: "text", placeholder: "Transporteurs routiers, aériens..." },
};

export const getSpecFields = (vehicleType: string): SpecFieldConfig[] => {
  const config = getVehicleTypeConfig(vehicleType);
  if (!config) return [];
  return config.defaultSpecs.map(key => specFieldConfigs[key]).filter(Boolean);
};
