import { AppHeader } from "@/components/layout/AppHeader";

/**
 * Header — legacy desktop/landing header, now delegates to the unified AppHeader.
 */
export function Header() {
  return <AppHeader variant="default" />;
}
