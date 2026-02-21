/**
 * PageLoader - Redirects to unified KonnektLoader
 */
import { KonnektPageLoader } from "./KonnektLoader";
import { TransportLoader, TransportPageLoader } from "./TransportLoader";

interface PageLoaderProps {
  message?: string;
  variant?: "default" | "transport";
}

export function PageLoader({ message = "Chargement..." }: PageLoaderProps) {
  return <KonnektPageLoader message={message} />;
}

export { TransportLoader, TransportPageLoader };
