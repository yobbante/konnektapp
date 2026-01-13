import { ReactNode } from "react";

interface SafeAreaWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * A wrapper component that ensures proper safe area insets for iOS devices
 * This should wrap page content to prevent overlap with system UI elements
 */
export function SafeAreaWrapper({ children, className = "" }: SafeAreaWrapperProps) {
  return (
    <div 
      className={`min-h-screen pb-safe ${className}`}
      style={{
        paddingTop: 'var(--safe-top, 0px)',
        paddingBottom: 'calc(var(--safe-bottom, 0px) + 80px)', // 80px for bottom nav
      }}
    >
      {children}
    </div>
  );
}

/**
 * A header wrapper that handles safe area for fixed headers
 */
export function SafeAreaHeader({ 
  children, 
  className = "",
  bgClass = "bg-background"
}: { 
  children: ReactNode; 
  className?: string;
  bgClass?: string;
}) {
  return (
    <div 
      className={`sticky top-0 z-50 ${bgClass} ${className}`}
      style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}
    >
      {children}
    </div>
  );
}
