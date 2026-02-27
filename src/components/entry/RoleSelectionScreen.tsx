import { motion } from "framer-motion";
import { Package, Truck, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RoleSelectionScreenProps {
  onSelect: (role: "client" | "transporteur") => void;
  country: { flag: string; name: string };
}

export function RoleSelectionScreen({ onSelect, country }: RoleSelectionScreenProps) {
  const [selected, setSelected] = useState<"client" | "transporteur" | null>(null);

  const roles = [
    {
      id: "client" as const,
      icon: Package,
      title: "Client",
      subtitle: "Envoyer des colis",
      desc: "Trouvez un transporteur, réservez et suivez vos envois en toute sécurité.",
    },
    {
      id: "transporteur" as const,
      icon: Truck,
      title: "Transporteur (GP)",
      subtitle: "Transporter des colis",
      desc: "Publiez vos trajets, acceptez des missions et gérez vos revenus.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-1">{country.flag} {country.name}</p>
          <h1 className="text-2xl font-bold">Vous êtes</h1>
          <p className="text-sm text-muted-foreground mt-1">Choisissez votre rôle principal</p>
        </div>

        <div className="space-y-3">
          {roles.map((role, i) => {
            const Icon = role.icon;
            const isSelected = selected === role.id;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelected(role.id)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">{role.title}</p>
                    <p className="text-xs font-medium text-primary mt-0.5">{role.subtitle}</p>
                    <p className="text-xs text-muted-foreground mt-1">{role.desc}</p>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Confirm */}
      <div className="px-6 py-4 border-t border-border bg-background">
        <Button
          className="w-full h-12 rounded-xl text-base"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Continuer
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
