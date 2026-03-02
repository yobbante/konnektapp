/**
 * KonnektLogo — SVG connected-dots network logo
 * Matches the PWA icon style: teal nodes connected by lines forming a K shape
 */
interface KonnektLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export function KonnektLogo({ size = 24, className = "", color = "hsl(168, 60%, 42%)" }: KonnektLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      className={className}
      fill="none"
    >
      {/* Lines connecting nodes */}
      <line x1={-18} y1={-28} x2={-18} y2={0} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={-18} y1={0} x2={-18} y2={28} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={-18} y1={0} x2={8} y2={0} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={8} y1={0} x2={24} y2={-20} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <line x1={8} y1={0} x2={24} y2={20} stroke={color} strokeWidth={3} strokeLinecap="round" />
      {/* Nodes */}
      <circle cx={-18} cy={-28} r={5} fill={color} />
      <circle cx={-18} cy={0} r={6} fill={color} />
      <circle cx={-18} cy={28} r={5} fill={color} />
      <circle cx={8} cy={0} r={4} fill={color} />
      <circle cx={24} cy={-20} r={4.5} fill={color} />
      <circle cx={24} cy={20} r={4.5} fill={color} />
    </svg>
  );
}
