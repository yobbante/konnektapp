/**
 * RoutierInteractiveMap — Plain Leaflet interactive map (no react-leaflet)
 * Avoids react-leaflet context consumer bug with React 18
 */
import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, Package, MapPin } from "lucide-react";

const CITY_COORDS: Record<string, [number, number]> = {
  "dakar": [14.6928, -17.4467],
  "thies": [14.7886, -16.9260],
  "saint-louis": [16.0179, -16.4897],
  "touba": [14.8500, -15.8833],
  "kaolack": [14.1520, -16.0754],
  "ziguinchor": [12.5833, -16.2719],
  "mbour": [14.4167, -16.9667],
  "rufisque": [14.7167, -17.2667],
  "tambacounda": [13.7709, -13.6676],
  "abidjan": [5.3600, -4.0083],
  "yamoussoukro": [6.8206, -5.2764],
  "bouake": [7.6939, -5.0303],
  "san pedro": [4.7485, -6.6363],
  "bamako": [12.6392, -8.0029],
  "sikasso": [11.3175, -5.6664],
  "mopti": [14.4843, -4.1870],
  "conakry": [9.5370, -13.6785],
  "ouagadougou": [12.3714, -1.5197],
  "bobo-dioulasso": [11.1771, -4.2979],
  "lome": [6.1319, 1.2228],
  "cotonou": [6.3703, 2.3912],
  "porto-novo": [6.4969, 2.6289],
  "accra": [5.6037, -0.1870],
  "niamey": [13.5116, 2.1254],
  "douala": [4.0511, 9.7679],
  "yaounde": [3.8480, 11.5021],
  "banjul": [13.4549, -16.5790],
  "paris": [48.8566, 2.3522],
  "marseille": [43.2965, 5.3698],
  "lyon": [45.7640, 4.8357],
  "toulouse": [43.6047, 1.4442],
  "bordeaux": [44.8378, -0.5792],
  "nice": [43.7102, 7.2620],
  "nantes": [47.2184, -1.5536],
  "strasbourg": [48.5734, 7.7521],
  "lille": [50.6292, 3.0573],
  "casablanca": [33.5731, -7.5898],
  "rabat": [34.0209, -6.8416],
  "tunis": [36.8065, 10.1815],
};

function getCityCoords(cityName: string): [number, number] | null {
  if (!cityName) return null;
  const normalized = cityName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  return null;
}

function createMarkerIcon(color: string, type: "origin" | "destination") {
  const svg = type === "origin"
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><circle cx="12" cy="12" r="4" fill="${color}" opacity="0.3"/><circle cx="12" cy="12" r="2" fill="${color}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: type === "origin" ? [24, 24] : [24, 32],
    iconAnchor: type === "origin" ? [12, 12] : [12, 32],
    popupAnchor: [0, type === "origin" ? -14 : -34],
  });
}

interface MissionPoint {
  id: string;
  origin_city: string;
  destination_city: string;
  weight?: number;
  status?: string;
  price?: number;
  type: "active" | "available" | "pending";
}

interface Props {
  activeMissions: any[];
  missionRequests: any[];
  pendingMissions: any[];
  stats: { delivered: number; successRate: number; avgRating: number };
}

const typeColors: Record<string, string> = {
  active: "#2563eb",
  available: "#10b981",
  pending: "#f59e0b",
};

const typeLabels: Record<string, string> = {
  active: "En cours",
  available: "Disponible",
  pending: "En attente",
};

export function RoutierInteractiveMap({ activeMissions, missionRequests, pendingMissions, stats }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const allMissions = useMemo(() => {
    const missions: MissionPoint[] = [];
    activeMissions.forEach((m) => missions.push({ id: m.id, origin_city: m.origin_city, destination_city: m.destination_city, weight: m.weight, status: m.status, price: m.total_price, type: "active" }));
    pendingMissions.forEach((m) => missions.push({ id: m.id, origin_city: m.origin_city, destination_city: m.destination_city, weight: m.weight, status: "pending", price: m.total_price, type: "pending" }));
    missionRequests.forEach((m) => missions.push({ id: m.id, origin_city: m.origin_city, destination_city: m.destination_city, weight: m.weight_kg, price: m.client_budget || m.estimated_price, type: "available" }));
    return missions;
  }, [activeMissions, missionRequests, pendingMissions]);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [12.5, -4.0],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers/routes when missions change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const allPoints: L.LatLng[] = [];

    allMissions.forEach((m) => {
      const origin = getCityCoords(m.origin_city);
      const dest = getCityCoords(m.destination_city);
      const color = typeColors[m.type];

      if (origin) {
        const marker = L.marker(origin, { icon: createMarkerIcon(color, "origin") }).addTo(map);
        marker.bindPopup(`<div class="text-xs"><p class="font-bold">${m.origin_city} → ${m.destination_city}</p><p>${typeLabels[m.type]}${m.weight ? ` · ${m.weight} kg` : ""}${m.price ? ` · ${m.price.toLocaleString()} CFA` : ""}</p></div>`);
        allPoints.push(L.latLng(origin[0], origin[1]));
      }
      if (dest) {
        const marker = L.marker(dest, { icon: createMarkerIcon(color, "destination") }).addTo(map);
        marker.bindPopup(`<div class="text-xs"><p class="font-bold">${m.origin_city} → ${m.destination_city}</p><p>${typeLabels[m.type]}${m.weight ? ` · ${m.weight} kg` : ""}${m.price ? ` · ${m.price.toLocaleString()} CFA` : ""}</p></div>`);
        allPoints.push(L.latLng(dest[0], dest[1]));
      }
      if (origin && dest) {
        L.polyline([origin, dest], {
          color,
          weight: 2,
          opacity: 0.6,
          dashArray: m.type === "available" ? "6, 8" : undefined,
        }).addTo(map);
      }
    });

    if (allMissions.length === 0) {
      L.marker([12.5, -4.0], { icon: createMarkerIcon("#10b981", "destination") })
        .addTo(map)
        .bindPopup('<p class="text-xs font-medium">Aucune mission active</p>');
    }

    if (allPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30], maxZoom: 8 });
    } else if (allPoints.length === 1) {
      map.setView(allPoints[0], 7);
    }
  }, [allMissions]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-sm">
      {/* Stats bar overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-2.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1 pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-white">LIVE</span>
        </div>
        <div className="flex gap-1.5">
          {activeMissions.length > 0 && (
            <div className="bg-blue-600/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 pointer-events-auto">
              <Truck className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">{activeMissions.length}</span>
            </div>
          )}
          {missionRequests.length > 0 && (
            <div className="bg-emerald-600/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 pointer-events-auto">
              <Package className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">{missionRequests.length}</span>
            </div>
          )}
          {pendingMissions.length > 0 && (
            <div className="bg-amber-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 pointer-events-auto">
              <MapPin className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">{pendingMissions.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] bg-white/90 dark:bg-black/70 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex gap-3 pointer-events-auto">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-[9px] font-medium text-foreground/80">En cours</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-medium text-foreground/80">Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[9px] font-medium text-foreground/80">En attente</span>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="absolute bottom-2.5 right-2.5 z-[1000] flex gap-1.5">
        <div className="bg-white/90 dark:bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 text-center pointer-events-auto">
          <p className="text-[10px] font-bold text-foreground">{stats.delivered}</p>
          <p className="text-[7px] text-muted-foreground uppercase">Livrés</p>
        </div>
        <div className="bg-white/90 dark:bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 text-center pointer-events-auto">
          <p className="text-[10px] font-bold text-foreground">{stats.successRate}%</p>
          <p className="text-[7px] text-muted-foreground uppercase">Réussite</p>
        </div>
      </div>

      <div ref={mapRef} style={{ height: "220px", width: "100%" }} />
    </div>
  );
}
