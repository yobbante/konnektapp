/**
 * MiniLoader - Redirects to unified KonnektLoader
 * Preserves old API (showText, text) for backward compatibility
 */
import { KonnektLoader, KonnektPageLoader, KonnektInlineLoader, KonnektButtonLoader } from "./KonnektLoader";

interface MiniLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
  text?: string;
}

export function MiniLoader({ size = "sm", className, showText, text }: MiniLoaderProps) {
  return <KonnektLoader size={size} className={className} message={showText ? text : undefined} />;
}

export { KonnektButtonLoader as ButtonLoader } from "./KonnektLoader";
export { KonnektInlineLoader as PackageSkeleton } from "./KonnektLoader";
export { KonnektPageLoader as PageLoadingState } from "./KonnektLoader";
