/**
 * KonnektLogo — SVG connected-dots network logo
 * 4 dots forming a stylized K: vertical backbone + two diagonal arms
 */
interface KonnektLogoProps {
  size?: number;
  className?: string;
  color?: string;
  adaptDark?: boolean;
}

export function KonnektLogo({ size = 24, className = "", color, adaptDark = false }: KonnektLogoProps) {
  const fill = color || "hsl(168, 60%, 42%)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      className={className}
      fill="none"
    >
      {/* Lines connecting nodes */}
      <line x1={-20} y1={-30} x2={-20} y2={30} stroke={fill} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={-20} y1={0} x2={22} y2={-28} stroke={fill} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={-20} y1={0} x2={22} y2={28} stroke={fill} strokeWidth={3.5} strokeLinecap="round" />
      {/* 4 Nodes */}
      <circle cx={-20} cy={-30} r={7} fill={fill} />
      <circle cx={-20} cy={30} r={7} fill={fill} />
      <circle cx={22} cy={-28} r={6} fill={fill} />
      <circle cx={22} cy={28} r={6} fill={fill} />
    </svg>
  );
}
