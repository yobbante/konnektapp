import { Zap, Truck, Ship, Plane, Briefcase, Building2, LucideIcon } from "lucide-react";

// Types de transport centralisés pour toute l'application
export type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur" | "agence";

export interface TransportConfig {
  type: TransportType;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const transportConfig: Record<TransportType, TransportConfig> = {
  voyageur: {
    type: "voyageur",
    title: "Voyageur",
    description: "Via bagages",
    icon: Briefcase,
    color: "text-transport-voyageur",
    bgColor: "bg-transport-voyageur/10 border-transport-voyageur/30",
  },
  agence: {
    type: "agence",
    title: "Agence",
    description: "Agence d'envoi",
    icon: Building2,
    color: "text-transport-agence",
    bgColor: "bg-transport-agence/10 border-transport-agence/30",
  },
  express: {
    type: "express",
    title: "Express",
    description: "Livraison rapide",
    icon: Zap,
    color: "text-transport-express",
    bgColor: "bg-transport-express/10 border-transport-express/30",
  },
  routier: {
    type: "routier",
    title: "Routier",
    description: "Transport terrestre",
    icon: Truck,
    color: "text-transport-routier",
    bgColor: "bg-transport-routier/10 border-transport-routier/30",
  },
  maritime: {
    type: "maritime",
    title: "Maritime",
    description: "Fret maritime",
    icon: Ship,
    color: "text-transport-maritime",
    bgColor: "bg-transport-maritime/10 border-transport-maritime/30",
  },
  aerien: {
    type: "aerien",
    title: "Aérien",
    description: "Cargo aérien",
    icon: Plane,
    color: "text-transport-aerien",
    bgColor: "bg-transport-aerien/10 border-transport-aerien/30",
  },
};

// Liste des types dans l'ordre d'affichage (voyageur et agence en premier)
export const transportTypes: TransportConfig[] = [
  transportConfig.voyageur,
  transportConfig.agence,
  transportConfig.express,
  transportConfig.routier,
  transportConfig.maritime,
  transportConfig.aerien,
];

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
