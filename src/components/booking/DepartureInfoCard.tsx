/**
 * DepartureInfoCard — Non-sensitive departure info for booking confirmation
 * Shows only: airline, flight number, dates, route
 * NEVER shows: GP personal info, contacts, addresses
 */
import { Plane, Calendar, Clock, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DepartureInfoCardProps {
  departureDate: string;
  arrivalDate?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
}

import { getFlag } from "@/lib/countryFlags";

export function DepartureInfoCard({
  departureDate,
  arrivalDate,
  airline,
  flightNumber,
  originCity,
  originCountry,
  destinationCity,
  destinationCountry,
}: DepartureInfoCardProps) {
  const getFlag = (code: string) => FLAGS[code] || "🌍";

  return (
    <Card className="border-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Plane className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Informations du départ</h3>
        </div>

        {/* Route */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 text-center">
            <span className="text-2xl">{getFlag(originCountry)}</span>
            <p className="text-sm font-semibold mt-1">{originCity}</p>
          </div>
          <Plane className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 text-center">
            <span className="text-2xl">{getFlag(destinationCountry)}</span>
            <p className="text-sm font-semibold mt-1">{destinationCity}</p>
          </div>
        </div>

        {/* Date & transport info grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Départ</p>
              <p className="text-sm font-medium">
                {format(new Date(departureDate), "d MMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          {arrivalDate && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Arrivée est.</p>
                <p className="text-sm font-medium">
                  {format(new Date(arrivalDate), "d MMM", { locale: fr })}
                </p>
              </div>
            </div>
          )}
          {airline && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Compagnie</p>
                <p className="text-sm font-medium">{airline}</p>
              </div>
            </div>
          )}
          {flightNumber && (
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Réf. transport</p>
                <p className="text-sm font-medium font-mono">{flightNumber}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
