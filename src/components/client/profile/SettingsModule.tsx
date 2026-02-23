/**
 * SettingsModule — Quick settings & support links (refined)
 */
import { Settings, HelpCircle, FileText, LogOut, ChevronRight, CreditCard, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { SwitchToTransporteurButton } from "@/components/profile/SwitchToTransporteurButton";

interface SettingsModuleProps {
  onEditProfile: () => void;
  onSignOut: () => void;
}

export function SettingsModule({ onEditProfile, onSignOut }: SettingsModuleProps) {
  const navigate = useNavigate();

  const links = [
    { icon: Settings, label: "Paramètres", desc: "Notifications, sécurité, thème", to: "/settings" },
    { icon: CreditCard, label: "Portefeuille", desc: "Solde et transactions", to: "/client/wallet" },
    { icon: Heart, label: "Favoris", desc: "Transporteurs sauvegardés", to: "/favoris" },
    { icon: HelpCircle, label: "Centre d'aide", desc: "FAQ, tutoriels", to: "/tutoriels" },
    { icon: FileText, label: "Documents légaux", desc: "CGU, confidentialité", to: "/documents-legaux" },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {links.map((link, i) => {
          const content = (
            <div className="flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
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
                <button className="w-full text-left">{content}</button>
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
    </div>
  );
}
