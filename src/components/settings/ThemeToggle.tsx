import { Sun, Moon, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useThemeManager, ThemeMode } from "@/hooks/useThemeManager";

export function ThemeToggle() {
  const { mode, setMode, isDark } = useThemeManager();

  const options: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: "light", label: "Clair", icon: Sun },
    { value: "dark", label: "Sombre", icon: Moon },
    { value: "system", label: "Auto", icon: Monitor },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            {isDark ? (
              <Moon className="w-5 h-5 text-primary" />
            ) : (
              <Sun className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <Label className="font-medium">Thème de l'application</Label>
            <p className="text-sm text-muted-foreground">
              Mode {mode === "system" ? "automatique" : mode === "dark" ? "sombre" : "clair"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = mode === option.value;
          
          return (
            <Button
              key={option.value}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode(option.value)}
              className={`flex-1 gap-2 ${isActive ? "" : "hover:bg-background"}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{option.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
