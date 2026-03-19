/**
 * KonnektLogo — Brand logo using the official Konnekt icon
 */
import konnektLogoIcon from "@/assets/konnekt-logo-icon.png";

interface KonnektLogoProps {
  size?: number;
  className?: string;
  color?: string;
  adaptDark?: boolean;
}

export function KonnektLogo({ size = 24, className = "" }: KonnektLogoProps) {
  return (
    <img
      src={konnektLogoIcon}
      alt="Konnekt"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
