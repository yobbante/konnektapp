/**
 * MaritimeParametresPage — Maritime-specific settings
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ship, Bell, Shield, Globe, FileText, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function MaritimeParametresPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [insuranceDefault, setInsuranceDefault] = useState(true);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/90 shadow-lg" style={{ paddingTop: 'calc(8px + var(--safe-top, 0px))' }}>
        <div className="px-3 py-2.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-white" />
            <h1 className="text-white font-bold text-sm">Paramètres Maritime</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Corridors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Anchor className="w-4 h-4 text-primary" /> Corridors actifs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Définissez vos lignes maritimes principales</p>
            {["Marseille ↔ Dakar", "Le Havre ↔ Dakar", "Casablanca ↔ Dakar"].map((corridor) => (
              <div key={corridor} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <span className="text-xs font-medium">{corridor}</span>
                <Switch defaultChecked />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs h-8">
              <Globe className="w-3 h-3 mr-1" /> Ajouter un corridor
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Nouvelles réservations</Label>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Acceptation automatique</Label>
              <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
            </div>
          </CardContent>
        </Card>

        {/* Insurance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Assurance maritime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Proposer assurance par défaut</Label>
              <Switch checked={insuranceDefault} onCheckedChange={setInsuranceDefault} />
            </div>
            <p className="text-[10px] text-muted-foreground">L'assurance maritime protège contre les risques en mer, les dommages conteneur et les retards portuaires.</p>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Documents & KYC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Licence de transitaire, agrément portuaire, assurance RC</p>
            <Button variant="outline" size="sm" className="mt-2 text-xs h-8 w-full">
              Gérer mes documents
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
