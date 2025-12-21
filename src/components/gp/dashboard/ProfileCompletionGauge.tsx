import { motion } from "framer-motion";
import { User, Truck, FileText, CreditCard, MapPin, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ProfileField {
  id: string;
  label: string;
  icon: typeof User;
  completed: boolean;
}

interface ProfileCompletionGaugeProps {
  profile: {
    business_name?: string;
    phone?: string;
    gp_type?: string;
    id_document_url?: string;
    business_registration_url?: string;
    transport_license_url?: string;
    zones_covered?: string[];
  };
  onCompleteProfile: () => void;
}

export function ProfileCompletionGauge({ profile, onCompleteProfile }: ProfileCompletionGaugeProps) {
  const fields: ProfileField[] = [
    {
      id: "personal",
      label: "Informations personnelles",
      icon: User,
      completed: !!(profile.business_name && profile.phone),
    },
    {
      id: "transport",
      label: "Type de transport",
      icon: Truck,
      completed: !!profile.gp_type,
    },
    {
      id: "documents",
      label: "Documents légaux",
      icon: FileText,
      completed: !!(profile.id_document_url || profile.business_registration_url),
    },
    {
      id: "license",
      label: "Licence de transport",
      icon: CreditCard,
      completed: !!profile.transport_license_url,
    },
    {
      id: "zones",
      label: "Zones desservies",
      icon: MapPin,
      completed: !!(profile.zones_covered && profile.zones_covered.length > 0),
    },
  ];

  const completedCount = fields.filter(f => f.completed).length;
  const completionPercentage = Math.round((completedCount / fields.length) * 100);
  const isComplete = completionPercentage === 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 border border-border/50 shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Complétion du profil</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isComplete ? "Profil complet !" : `${completedCount}/${fields.length} étapes complétées`}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
          isComplete 
            ? "bg-success/10 text-success" 
            : completionPercentage >= 60 
              ? "bg-warning/10 text-warning" 
              : "bg-muted text-muted-foreground"
        }`}>
          {completionPercentage}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress 
          value={completionPercentage} 
          className="h-2.5"
        />
      </div>

      {/* Fields List */}
      <div className="space-y-2 mb-4">
        {fields.map((field, index) => {
          const Icon = field.icon;
          return (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                field.completed ? "bg-success/5" : "bg-muted/50"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                field.completed ? "bg-success/10" : "bg-muted"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${
                  field.completed ? "text-success" : "text-muted-foreground"
                }`} />
              </div>
              <span className={`flex-1 text-xs ${
                field.completed ? "text-foreground" : "text-muted-foreground"
              }`}>
                {field.label}
              </span>
              {field.completed ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-muted-foreground/50" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* CTA Button */}
      {!isComplete && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs"
          onClick={onCompleteProfile}
        >
          Compléter mon profil
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}

      {/* Complete Badge Reward */}
      {isComplete && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="text-xs font-medium text-success">Badge "Vérifié" obtenu !</p>
            <p className="text-[10px] text-success/70">Votre profil est complet</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
