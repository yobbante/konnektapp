import { Zap, Truck, Ship, Plane, Briefcase, Building2, Bike, LucideIcon } from "lucide-react";

// Types de transport centralisés pour toute l'application
export type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence";

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
};

// Liste des types dans l'ordre d'affichage pour l'inscription (tous activés)
export const transportTypes: TransportConfig[] = [
  transportConfig.routier,
  transportConfig.maritime,
  transportConfig.aerien,
  transportConfig.express,
  transportConfig.agence,
];

// Liste complète incluant les types pour clients
export const allTransportTypes: TransportConfig[] = [
  transportConfig.voyageur,
  transportConfig.agence,
  transportConfig.express,
  transportConfig.routier,
  transportConfig.maritime,
  transportConfig.aerien,
];

// Types masqués pour la v1 (aucun maintenant)
export const hiddenTransportTypes: TransportType[] = [];

// Statuts de commande avec le workflow complet
export type OrderStatus = "pending" | "accepted" | "collected" | "in_transit" | "delivered" | "cancelled" | "disputed";

export interface OrderStatusConfig {
  status: OrderStatus;
  label: string;
  labelFr: string;
  color: string;
  nextStatus?: OrderStatus;
  nextLabel?: string;
}

export const orderStatusConfig: Record<OrderStatus, OrderStatusConfig> = {
  pending: {
    status: "pending",
    label: "Pending",
    labelFr: "En attente",
    color: "warning",
    nextStatus: "accepted",
    nextLabel: "Accepter",
  },
  accepted: {
    status: "accepted",
    label: "Accepted",
    labelFr: "Acceptée",
    color: "default",
    nextStatus: "collected",
    nextLabel: "Marquer collecté",
  },
  collected: {
    status: "collected",
    label: "Collected",
    labelFr: "Collectée",
    color: "secondary",
    nextStatus: "in_transit",
    nextLabel: "En livraison",
  },
  in_transit: {
    status: "in_transit",
    label: "In Transit",
    labelFr: "En livraison",
    color: "secondary",
    nextStatus: "delivered",
    nextLabel: "Marquer livré",
  },
  delivered: {
    status: "delivered",
    label: "Delivered",
    labelFr: "Livrée",
    color: "success",
  },
  cancelled: {
    status: "cancelled",
    label: "Cancelled",
    labelFr: "Annulée",
    color: "destructive",
  },
  disputed: {
    status: "disputed",
    label: "Disputed",
    labelFr: "Litige",
    color: "destructive",
  },
};

export const getOrderStatusLabel = (status: OrderStatus): string => {
  return orderStatusConfig[status]?.labelFr || status;
};

export const getOrderStatusColor = (status: OrderStatus): string => {
  return orderStatusConfig[status]?.color || "default";
};

export const getNextOrderStatus = (status: OrderStatus): { nextStatus?: OrderStatus; label?: string } => {
  const config = orderStatusConfig[status];
  return { nextStatus: config?.nextStatus, label: config?.nextLabel };
};

// Helper functions for transport types
export const getTransportIcon = (type: string): LucideIcon => {
  return transportConfig[type as TransportType]?.icon || Truck;
};

export const getTransportLabel = (type: string): string => {
  return transportConfig[type as TransportType]?.title || type;
};
