import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, RefreshCw, ShieldAlert } from "lucide-react";
import { useGPGeolocation } from "@/hooks/useGPGeolocation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface RoutierLiveMapCardProps {
  gpId: string;
  userId: string | null;
  activeOrdersCount: number;
}

const getMapSrc = (lat: number, lng: number) => {
  const delta = 0.08;
  const left = lng - delta;
  const right = lng + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
};

export function RoutierLiveMapCard({ gpId, userId, activeOrdersCount }: RoutierLiveMapCardProps) {
  const {
    consentGiven,
    trackingActive,
    lastCity,
    lastCountry,
    lastLat,
    lastLng,
    lastCheckAt,
    performGeoCheck,
    giveConsent,
  } = useGPGeolocation(gpId, userId);

  const hasPosition = typeof lastLat === "number" && typeof lastLng === "number";

  return (
    <Card className="overflow-hidden border-primary/20 bg-card">
      <CardContent className="p-0">
        <div className="p-4 border-b border-border/60 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Carte live routier</h3>
              <Badge variant="secondary" className="text-[10px]">
                {activeOrdersCount} actif{activeOrdersCount > 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Position passive utilisée pour détecter transit et arrivée.
            </p>
          </div>
          {consentGiven ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={performGeoCheck}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Actualiser
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={giveConsent}>
              Activer
            </Button>
          )}
        </div>

        {consentGiven ? (
          <>
            <div className="aspect-[16/9] bg-muted">
              <iframe
                title="Carte live du transporteur routier"
                src={hasPosition ? getMapSrc(lastLat!, lastLng!) : "https://www.openstreetmap.org/export/embed.html"}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border/60 p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Dernière zone détectée</p>
                <p className="font-semibold flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                  {lastCity || "Position en attente"}{lastCountry ? `, ${lastCountry}` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Suivi automatique</p>
                <p className="font-semibold">{trackingActive ? "Actif" : "En pause"}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {lastCheckAt
                    ? `Mis à jour ${formatDistanceToNow(new Date(lastCheckAt), { addSuffix: true, locale: fr })}`
                    : "Aucun relevé enregistré"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 flex items-start gap-3 bg-muted/30">
            <ShieldAlert className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Activez la géolocalisation passive</p>
              <p className="text-xs text-muted-foreground mt-1">
                Le système détectera automatiquement le départ et l’arrivée sans changer manuellement tous les statuts.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
