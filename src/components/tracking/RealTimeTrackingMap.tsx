import { motion } from "framer-motion";
import { Plane, Truck, CheckCircle2, MapPin } from "lucide-react";
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
      arrived: "Arrivé",
      delivered: "Livré"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "from-amber-500 to-amber-600",
      accepted: "from-blue-500 to-blue-600",
      collected: "from-indigo-500 to-indigo-600",
      in_transit: "from-primary to-blue-600",
      arrived: "from-purple-500 to-purple-600",
      delivered: "from-green-500 to-green-600"
    };
    return colors[status] || "from-muted to-muted";
  };

  const getBgColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500",
      accepted: "bg-blue-500",
      collected: "bg-indigo-500",
      in_transit: "bg-primary",
      arrived: "bg-purple-500",
      delivered: "bg-green-500"
    };
    return colors[status] || "bg-muted";
  };

  // Checkpoints along the route
  const checkpoints = [
  { position: 0, label: "Départ", threshold: 0 },
  { position: 33, label: "Collecté", threshold: 25 },
  { position: 66, label: "En transit", threshold: 50 },
  { position: 100, label: "Arrivée", threshold: 90 }];


  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
      {/* Map background with gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />


      






































































































    </div>);

}