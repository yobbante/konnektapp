import { motion } from "framer-motion";
import { Plane, Truck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
interface RealTimeTrackingMapProps {
  originCity: string;
  destinationCity: string;
  currentStatus: string;
  progress: number; // 0-100
  transportType?: string;
}
export function RealTimeTrackingMap({
  originCity,
  destinationCity,
  currentStatus,
  progress,
  transportType = "bagages_international"
}: RealTimeTrackingMapProps) {
  const TransportIcon = transportType === "bagages_international" ? Plane : Truck;
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Accepté",
      collected: "Collecté",
      in_transit: "En transit",
      delivered: "Livré"
    };
    return labels[status] || status;
  };
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500",
      accepted: "bg-blue-500",
      collected: "bg-indigo-500",
      in_transit: "bg-primary",
      delivered: "bg-green-500"
    };
    return colors[status] || "bg-muted";
  };
  return;
}