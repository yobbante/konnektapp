import { AppHeader } from "@/components/layout/AppHeader";

interface MobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
  showScanButton?: boolean;
}

/**
 * MobileHeader — now a thin wrapper around the unified AppHeader.
 * Keeps backward-compatibility for the 30+ pages that import it.
 */
export function MobileHeader({ title, showNotifications = true }: MobileHeaderProps) {
  return (
    <AppHeader
      title={title}
      showNotifications={showNotifications}
      variant="default"
    />
  );
}
