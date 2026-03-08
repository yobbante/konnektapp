/**
 * RoutierInteractiveMap — Plain Leaflet interactive map (no react-leaflet)
 * Shows missions as package chips with price; click to expand route view
 */
import { useEffect, useRef, useMemo, useState } from "react";
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

function getWeightLabel(weight?: number): string {
  if (!weight) return "";
  if (weight <= 5) return "S";
  if (weight <= 15) return "M";
  if (weight <= 30) return "L";
  if (weight <= 70) return "XL";
  return "XXL";
}

function getMidpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
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

const typeBgColors: Record<string, string> = {
  active: "#dbeafe",
  available: "#d1fae5",
  pending: "#fef3c7",
};

function createPriceChipIcon(mission: MissionPoint) {
  const price = mission.price ? `${mission.price.toLocaleString()} CFA` : "—";
  const sizeLabel = getWeightLabel(mission.weight);
  const borderColor = typeColors[mission.type];
  const bgColor = typeBgColors[mission.type];

  const html = `
    <div class="mission-chip" style="
      display:flex;align-items:center;gap:4px;
      background:white;border:1.5px solid ${borderColor};
      border-radius:20px;padding:3px 8px 3px 6px;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);
      cursor:pointer;white-space:nowrap;
      font-family:system-ui,-apple-system,sans-serif;
      transition:transform 0.15s ease;
    ">
      <span style="
        display:flex;align-items:center;justify-content:center;
        width:18px;height:18px;border-radius:4px;
        background:${bgColor};
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${borderColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </span>
      <span style="font-size:11px;font-weight:700;color:#1a1a1a;">${price}</span>
      ${sizeLabel ? `<span style="font-size:9px;font-weight:500;color:#888;margin-left:2px;">${sizeLabel}</span>` : ""}
    </div>
  `;

  return L.divIcon({
    html,
    className: "mission-chip-wrapper",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createRouteEndpointIcon(label: string, isOrigin: boolean) {
  const html = `
    <div style="
      display:flex;align-items:center;gap:6px;
      background:#111;color:white;
      border-radius:24px;padding:6px 14px;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);
      font-family:system-ui,-apple-system,sans-serif;
      white-space:nowrap;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${isOrigin
          ? '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'
          : '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'
        }
      </svg>
      <span style="font-size:13px;font-weight:700;">${label}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "route-endpoint-marker",
    iconSize: [0, 0],
    iconAnchor: [0, -10],
  });
}

export function RoutierInteractiveMap({ activeMissions, missionRequests, pendingMissions, stats }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const [selectedMission, setSelectedMission] = useState<MissionPoint | null>(null);

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

  // Clear helper
  const clearLayers = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
  };

  const addLayer = (layer: L.Layer) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    layer.addTo(map);
    layersRef.current.push(layer);
  };

  // Show all missions as price chips (default overview)
  const showOverview = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    clearLayers();

    const allPoints: L.LatLng[] = [];

    allMissions.forEach((m) => {
      const origin = getCityCoords(m.origin_city);
      const dest = getCityCoords(m.destination_city);

      // Place chip at midpoint if both exist, else at whichever exists
      const chipPos = origin && dest ? getMidpoint(origin, dest) : origin || dest;
      if (!chipPos) return;

      const marker = L.marker(chipPos, { icon: createPriceChipIcon(m) });
      marker.on("click", () => {
        setSelectedMission(m);
      });
      addLayer(marker);
      allPoints.push(L.latLng(chipPos[0], chipPos[1]));
    });

    if (allMissions.length === 0) {
      const emptyMarker = L.marker([12.5, -4.0], {
        icon: L.divIcon({
          html: `<div style="background:white;border-radius:12px;padding:6px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:11px;font-weight:600;color:#888;white-space:nowrap;">Aucune mission</div>`,
          className: "mission-chip-wrapper",
          iconSize: [0, 0],
        }),
      });
      addLayer(emptyMarker);
    }

    if (allPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 8 });
    } else if (allPoints.length === 1) {
      map.setView(allPoints[0], 7);
    }
  };

  // Show expanded route for a selected mission
  const showRoute = (mission: MissionPoint) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    clearLayers();

    const origin = getCityCoords(mission.origin_city);
    const dest = getCityCoords(mission.destination_city);
    const color = typeColors[mission.type];

    if (origin) {
      addLayer(L.marker(origin, { icon: createRouteEndpointIcon("Départ", true) }));
    }
    if (dest) {
      addLayer(L.marker(dest, { icon: createRouteEndpointIcon("Arrivée", false) }));
    }
    if (origin && dest) {
      // Draw thick route line
      addLayer(L.polyline([origin, dest], {
        color: "#888",
        weight: 6,
        opacity: 0.5,
        lineCap: "round",
      }));
      addLayer(L.polyline([origin, dest], {
        color: "#333",
        weight: 3,
        opacity: 0.9,
        lineCap: "round",
      }));

      const bounds = L.latLngBounds([origin, dest]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    } else if (origin) {
      map.setView(origin, 7);
    } else if (dest) {
      map.setView(dest, 7);
    }
  };

  // React to mission changes => overview
  useEffect(() => {
    if (!selectedMission) {
      showOverview();
    }
  }, [allMissions, selectedMission]);

  // React to selected mission
  useEffect(() => {
    if (selectedMission) {
      showRoute(selectedMission);
    }
  }, [selectedMission]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-sm">
      {/* Top bar */}
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

      {/* Selected mission detail card (bottom overlay) */}
      {selectedMission && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/95 dark:bg-black/90 backdrop-blur-md border-t border-border/50 p-3 pointer-events-auto">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground truncate">
                  {selectedMission.origin_city} → {selectedMission.destination_city}
                </p>
                <span className="text-sm font-bold" style={{ color: typeColors[selectedMission.type] }}>
                  {selectedMission.price ? `${selectedMission.price.toLocaleString()} CFA` : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">○ {selectedMission.origin_city}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">○ {selectedMission.destination_city}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                {selectedMission.weight && (
                  <span className="text-[10px] text-muted-foreground">
                    {selectedMission.weight} kg
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ 
                  background: typeBgColors[selectedMission.type],
                  color: typeColors[selectedMission.type],
                }}>
                  {getWeightLabel(selectedMission.weight) || "—"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedMission(null)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <span className="text-xs font-bold">✕</span>
          </button>
        </div>
      )}

      {/* Legend (only in overview) */}
      {!selectedMission && (
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
      )}

      <div ref={mapRef} style={{ height: selectedMission ? "320px" : "260px", width: "100%", transition: "height 0.3s ease" }} />
    </div>
  );
}
