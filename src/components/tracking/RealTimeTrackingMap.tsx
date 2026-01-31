import { motion } from "framer-motion";
import { MapPin, Truck, Navigation, Plane, Package } from "lucide-react";
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
  // Calculate position based on progress
  const positionX = 10 + progress * 0.8;
  const positionY = 80 - progress * 0.6;
  const TransportIcon = transportType === "bagages_international" ? Plane : Truck;
  return;
}