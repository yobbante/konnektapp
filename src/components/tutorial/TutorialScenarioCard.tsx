import { motion } from "framer-motion";
import { 
  Package, Wallet, Shield, ScanLine, CheckCircle, AlertTriangle, Award,
  Plane, Percent, AlertCircle, FileEdit, BadgeCheck, Scale, LucideIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TutorialScenario } from "@/lib/tutorial/types";

const iconMap: Record<string, LucideIcon> = {
  Package, Wallet, Shield, ScanLine, CheckCircle, AlertTriangle, Award,
  Plane, Percent, AlertCircle, FileEdit, BadgeCheck, Scale,
};

interface Props {
  scenario: TutorialScenario;
  isCompleted: boolean;
  onStart: () => void;
  index: number;
}

export function TutorialScenarioCard({ scenario, isCompleted, onStart, index }: Props) {
  const Icon = iconMap[scenario.icon] || Package;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`cursor-pointer transition-all active:scale-[0.98] ${
          isCompleted ? "border-green-500/30 bg-green-500/5" : "hover:border-primary/30"
        }`}
        onClick={onStart}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCompleted 
              ? "bg-green-500/10 text-green-600" 
              : "bg-primary/10 text-primary"
          }`}>
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm truncate">{scenario.title}</h4>
              {isCompleted && (
                <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-0 px-1.5 py-0">
                  Terminé
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{scenario.description}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">{scenario.steps.length} étapes</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
