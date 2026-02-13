/**
 * SettingsModule — Quick settings & support links
 */
import { Settings, HelpCircle, FileText, LogOut, ChevronRight, Edit2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SwitchToTransporteurButton } from "@/components/profile/SwitchToTransporteurButton";

interface SettingsModuleProps {
  onEditProfile: () => void;
  onSignOut: () => void;
}

export function SettingsModule({ onEditProfile, onSignOut }: SettingsModuleProps) {
  const links = [
    { icon: Edit2, label: "Modifier mes informations", desc: "Nom, téléphone, adresse", onClick: onEditProfile },
    { icon: Settings, label: "Paramètres", desc: "Notifications, sécurité", to: "/settings" },
    { icon: HelpCircle, label: "Centre d'aide", desc: "FAQ, contact support", to: "/settings" },
    { icon: FileText, label: "Documents légaux", desc: "CGU, politique de confidentialité", to: "/documents-legaux" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-3"
    >
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {links.map((link, i) => {
          const content = (
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <link.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{link.label}</p>
                  <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          );

          return (
            <div key={i}>
              {link.to ? (
                <Link to={link.to}>{content}</Link>
              ) : (
                <button className="w-full text-left" onClick={link.onClick}>{content}</button>
              )}
              {i < links.length - 1 && <div className="h-px bg-border mx-4" />}
            </div>
          );
        })}
      </div>

      <SwitchToTransporteurButton />

      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Se déconnecter
      </Button>
    </motion.div>
  );
}
