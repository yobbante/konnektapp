import { Zap, Truck, Ship, Plane, Briefcase, Building2, Bike, Luggage, LucideIcon } from "lucide-react";

// Types de transport centralisés pour toute l'application
export type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence" | "bagages_international";

export interface TransportConfig {
  type: TransportType;
  title: string;
  description: string;
  longDescription?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  // Champs requis spécifiques à l'activité
  requiredDocs?: string[];
  // Services proposés (pour agences)
  services?: string[];
}

export const transportConfig: Record<TransportType, TransportConfig> = {
  express: {
    type: "express",
    title: "Express",
    description: "Livraison rapide",
    longDescription: "Coursiers, livreurs d'entreprise, services de livraison rapide B2B/B2C",
    icon: Zap,
    color: "text-transport-express",
    bgColor: "bg-transport-express/10 border-transport-express/30",
    requiredDocs: ["id_document", "transport_license"],
    services: ["livraison_express", "coursier", "b2b", "b2c"],
  },
  routier: {
    type: "routier",
    title: "Transport Routier",
    description: "Transport terrestre",
    longDescription: "Camions, fourgons, transport de marchandises par route",
    icon: Truck,
    color: "text-transport-routier",
    bgColor: "bg-transport-routier/10 border-transport-routier/30",
    requiredDocs: ["id_document", "business_registration", "transport_license", "insurance"],
  },
  maritime: {
    type: "maritime",
    title: "Transport Maritime",
    description: "Fret maritime",
    longDescription: "Conteneurs, fret, transport par voie maritime",
    icon: Ship,
    color: "text-transport-maritime",
    bgColor: "bg-transport-maritime/10 border-transport-maritime/30",
    requiredDocs: ["id_document", "business_registration", "transport_license", "insurance"],
  },
  aerien: {
    type: "aerien",
    title: "Transport Aérien",
    description: "Cargo aérien",
    longDescription: "Fret aérien, cargo, transport par avion",
    icon: Plane,
    color: "text-transport-aerien",
    bgColor: "bg-transport-aerien/10 border-transport-aerien/30",
    requiredDocs: ["id_document", "business_registration", "transport_license", "insurance"],
  },
  voyageur: {
    type: "voyageur",
    title: "Voyageur / GP",
    description: "Via bagages",
    longDescription: "Transport via bagages accompagnés lors de voyages",
    icon: Briefcase,
    color: "text-transport-voyageur",
    bgColor: "bg-transport-voyageur/10 border-transport-voyageur/30",
    requiredDocs: ["id_document"],
  },
  agence: {
    type: "agence",
    title: "Agence de Voyage",
    description: "Agence logistique",
    longDescription: "Billetterie, fret accompagné, groupage passagers/colis",
    icon: Building2,
    color: "text-transport-agence",
    bgColor: "bg-transport-agence/10 border-transport-agence/30",
    requiredDocs: ["id_document", "business_registration", "transport_license"],
    services: ["billetterie", "fret_accompagne", "groupage", "reservation"],
  },
  bagages_international: {
    type: "bagages_international",
    title: "GP Via Bagages",
    description: "International",
    longDescription: "Transport de bagages accompagnés lors de voyages internationaux (diaspora)",
    icon: Luggage,
    color: "text-transport-bagages",
    bgColor: "bg-transport-bagages/10 border-transport-bagages/30",
    requiredDocs: ["id_document", "passport"],
  },
};

// Liste des types dans l'ordre d'affichage pour l'inscription (tous activés)
export const transportTypes: TransportConfig[] = [
  transportConfig.bagages_international,
  transportConfig.routier,
  transportConfig.maritime,
  transportConfig.aerien,
  transportConfig.express,
  transportConfig.agence,
];

// Liste complète incluant les types pour clients
export const allTransportTypes: TransportConfig[] = [
  transportConfig.bagages_international,
  transportConfig.voyageur,
  transportConfig.agence,
  transportConfig.express,
  transportConfig.routier,
  transportConfig.maritime,
  transportConfig.aerien,
];

// Types masqués pour la v1 (aucun maintenant)
export const hiddenTransportTypes: TransportType[] = [];

// Re-export from centralized enum mappings for backward compatibility
export { 
  ORDER_STATUS,
  type OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_WORKFLOW,
  getOrderStatusLabel,
  getOrderStatusColor,
  getNextOrderStatus,
  isValidOrderStatus,
  assertValidOrderStatus,
  isFrenchLabel,
} from "./enumMappings";

// Legacy compatibility - orderStatusConfig format
import { 
  ORDER_STATUS, 
  ORDER_STATUS_LABELS, 
  ORDER_STATUS_COLORS, 
  ORDER_STATUS_WORKFLOW,
  type OrderStatus as OrderStatusType
} from "./enumMappings";

export interface OrderStatusConfig {
  status: OrderStatusType;
  label: string;
  labelFr: string;
  color: string;
  nextStatus?: OrderStatusType;
  nextLabel?: string;
}

export const orderStatusConfig: Record<OrderStatusType, OrderStatusConfig> = Object.keys(ORDER_STATUS).reduce((acc, key) => {
  const status = key as OrderStatusType;
  const workflow = ORDER_STATUS_WORKFLOW[status];
  acc[status] = {
    status,
    label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    labelFr: ORDER_STATUS_LABELS[status],
    color: ORDER_STATUS_COLORS[status],
    ...(workflow ? { nextStatus: workflow.nextStatus, nextLabel: workflow.nextLabel } : {}),
  };
  return acc;
}, {} as Record<OrderStatusType, OrderStatusConfig>);

// Helper functions for transport types
export const getTransportIcon = (type: string): LucideIcon => {
  return transportConfig[type as TransportType]?.icon || Truck;
};

export const getTransportLabel = (type: string): string => {
  return transportConfig[type as TransportType]?.title || type;
};
