import { motion } from "framer-motion";
import { 
  Package, Wallet, Shield, ScanLine, CheckCircle, AlertTriangle, Award,
  Plane, Percent, AlertCircle, FileEdit, BadgeCheck, Scale, LucideIcon, ChevronRight, Play
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
      transition={{ delay: index * 0.04 }}
    >
      <Card
        className={`cursor-pointer transition-all active:scale-[0.98] group ${
          isCompleted ? "border-green-500/30 bg-green-500/5" : "hover:border-primary/30 hover:shadow-md"
        }`}
        onClick={onStart}
      >
        <CardContent className="p-3.5 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                <Badge variant="secondary" className="text-[9px] bg-green-500/10 text-green-600 border-0 px-1.5 py-0">
                  ✓
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{scenario.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground/60">{scenario.steps.length} étapes</span>
              {!isCompleted && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 gap-0.5 border-primary/20 text-primary">
                  <Play className="w-2 h-2" />
                  Démo
                </Badge>
              )}
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
            isCompleted ? "text-green-500" : "text-muted-foreground/40"
          }`} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
