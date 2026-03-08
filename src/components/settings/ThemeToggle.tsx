import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useThemeManager } from "@/hooks/useThemeManager";

export function ThemeToggle() {
  const { isDark, setMode } = useThemeManager();

  return (
    <div className="flex items-center gap-2">
      <Sun className="w-3.5 h-3.5 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
      />
      <Moon className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
  );
}
