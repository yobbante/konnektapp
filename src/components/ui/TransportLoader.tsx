/**
 * TransportLoader - Redirects to unified KonnektLoader
 * Preserves old API (vehicle, autoRotate) for backward compatibility
 */
import { KonnektLoader, KonnektPageLoader, KonnektButtonLoader } from "./KonnektLoader";

interface TransportLoaderProps {
  message?: string;
  vehicle?: string;
  autoRotate?: boolean;
  size?: "sm" | "md" | "lg";
}

export function TransportLoader({ message, size = "md" }: TransportLoaderProps) {
  return <KonnektLoader size={size} message={message} />;
}

export function TransportPageLoader({ message }: { message?: string; vehicle?: string }) {
  return <KonnektPageLoader message={message} />;
}

export function TransportButtonLoader({ vehicle }: { vehicle?: string }) {
  return <KonnektButtonLoader />;
}
