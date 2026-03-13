/**
 * RoutierInteractiveMap — Plain Leaflet interactive map
 * Overview: mission chips (📦 price + size) placed at origin city + corridor routes
 * Detail: curved road-style route with Départ/Arrivée labels + bottom card
 */
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, Package, MapPin, Plus, Minus, LocateFixed, ChevronRight } from "lucide-react";

/* ─── City coordinates ─── */
const CITY_COORDS: Record<string, [number, number]> = {
  "dakar": [14.6928, -17.4467], "thies": [14.7886, -16.9260],
  "saint-louis": [16.0179, -16.4897], "touba": [14.8500, -15.8833],
  "kaolack": [14.1520, -16.0754], "ziguinchor": [12.5833, -16.2719],
  "mbour": [14.4167, -16.9667], "rufisque": [14.7167, -17.2667],
  "tambacounda": [13.7709, -13.6676], "abidjan": [5.3600, -4.0083],
  "yamoussoukro": [6.8206, -5.2764], "bouake": [7.6939, -5.0303],
  "san pedro": [4.7485, -6.6363], "bamako": [12.6392, -8.0029],
  "sikasso": [11.3175, -5.6664], "mopti": [14.4843, -4.1870],
  "conakry": [9.5370, -13.6785], "ouagadougou": [12.3714, -1.5197],
  "bobo-dioulasso": [11.1771, -4.2979], "lome": [6.1319, 1.2228],
  "cotonou": [6.3703, 2.3912], "porto-novo": [6.4969, 2.6289],
  "accra": [5.6037, -0.1870], "niamey": [13.5116, 2.1254],
  "douala": [4.0511, 9.7679], "yaounde": [3.8480, 11.5021],
  "banjul": [13.4549, -16.5790], "paris": [48.8566, 2.3522],
  "marseille": [43.2965, 5.3698], "lyon": [45.7640, 4.8357],
  "toulouse": [43.6047, 1.4442], "bordeaux": [44.8378, -0.5792],
  "nice": [43.7102, 7.2620], "nantes": [47.2184, -1.5536],
  "strasbourg": [48.5734, 7.7521], "lille": [50.6292, 3.0573],
  "casablanca": [33.5731, -7.5898], "rabat": [34.0209, -6.8416],
  "tunis": [36.8065, 10.1815],
};

function getCityCoords(cityName: string): [number, number] | null {
  if (!cityName) return null;
  const n = cityName.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (n.includes(key) || key.includes(n)) return coords;
  }
  return null;
}

function getWeightLabel(w?: number): string {
  if (!w) return "";
  if (w <= 5) return "S";
  if (w <= 15) return "M";
  if (w <= 30) return "L";
  if (w <= 70) return "XL";
  return "XXL";
}

/** Generate a smooth curved polyline between two points (road-like) */
function generateCurvedRoute(a: [number, number], b: [number, number], steps = 30): [number, number][] {
  const midLat = (a[0] + b[0]) / 2;
  const midLng = (a[1] + b[1]) / 2;
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  const offsetScale = Math.min(dist * 0.15, 2);
  const cpLat = midLat + (-dLng / dist) * offsetScale;
  const cpLng = midLng + (dLat / dist) * offsetScale;

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cpLat + t * t * b[0];
    const lng = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cpLng + t * t * b[1];
    points.push([lat, lng]);
  }
  return points;
}

/* ─── Types ─── */
interface MissionPoint {
  id: string;
  origin_city: string;
  destination_city: string;
  weight?: number;
  status?: string;
  price?: number;
  photo_url?: string;
  type: "active" | "available" | "pending" | "corridor";
}

interface CorridorData {
  corridor_key: string;
  origin_city: string;
  destination_city: string;
  mission_count: number;
  total_weight_kg: number;
  total_estimated_revenue: number;
  is_hub_corridor?: boolean;
}

interface Props {
  activeMissions: any[];
  missionRequests: any[];
  pendingMissions: any[];
  corridors?: CorridorData[];
  stats: { delivered: number; successRate: number; avgRating: number };
}

const TYPE_COLORS: Record<string, string> = { active: "#2563eb", available: "#10b981", pending: "#f59e0b", corridor: "#8b5cf6" };
const TYPE_BG: Record<string, string> = { active: "#dbeafe", available: "#d1fae5", pending: "#fef3c7", corridor: "#ede9fe" };

/* ─── Chip icon (overview) ─── */
function createPriceChipIcon(m: MissionPoint) {
  const price = m.price ? `${Math.round(m.price).toLocaleString()} CFA` : "—";
  const size = getWeightLabel(m.weight);
  const c = TYPE_COLORS[m.type];
  const bg = TYPE_BG[m.type];

  return L.divIcon({
    html: `<div style="
      display:inline-flex;align-items:center;gap:5px;
      background:#fff;border:1.5px solid ${c};border-radius:20px;
      padding:4px 10px 4px 7px;box-shadow:0 2px 10px rgba(0,0,0,0.13);
      cursor:pointer;white-space:nowrap;font-family:system-ui,sans-serif;
    ">
      <span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:${bg};">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </span>
      <span style="font-size:12px;font-weight:700;color:#1a1a1a;">${price}</span>
      ${size ? `<span style="font-size:10px;font-weight:600;color:${c};margin-left:1px;">${size}</span>` : ""}
    </div>`,
    className: "mission-chip-icon",
    iconSize: [0, 0],
    iconAnchor: [-10, 15],
  });
}

/* ─── Corridor label chip ─── */
function createCorridorChipIcon(corridor: CorridorData) {
  const price = corridor.total_estimated_revenue
    ? `${Math.round(corridor.total_estimated_revenue).toLocaleString()} CFA`
    : "—";
  const isHub = corridor.is_hub_corridor;

  return L.divIcon({
    html: `<div style="
      display:inline-flex;align-items:center;gap:5px;
      background:${isHub ? '#f0fdf4' : '#faf5ff'};border:2px solid ${isHub ? '#10b981' : '#8b5cf6'};border-radius:20px;
      padding:5px 12px 5px 8px;box-shadow:0 3px 12px rgba(0,0,0,0.15);
      cursor:pointer;white-space:nowrap;font-family:system-ui,sans-serif;
    ">
      <span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:${isHub ? '#d1fae5' : '#ede9fe'};">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isHub ? '#10b981' : '#8b5cf6'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </span>
      <span style="font-size:11px;font-weight:800;color:${isHub ? '#059669' : '#7c3aed'};">${corridor.mission_count} colis</span>
      <span style="font-size:11px;font-weight:700;color:#1a1a1a;">${price}</span>
    </div>`,
    className: "corridor-chip-icon",
    iconSize: [0, 0],
    iconAnchor: [-10, 20],
  });
}

/* ─── Route endpoint label (detail view) ─── */
function createEndpointIcon(label: string, isOrigin: boolean) {
  const icon = isOrigin
    ? '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'
    : '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>';

  return L.divIcon({
    html: `<div style="
      display:inline-flex;align-items:center;gap:7px;
      background:#111;color:#fff;border-radius:24px;padding:7px 16px;
      box-shadow:0 4px 16px rgba(0,0,0,0.35);font-family:system-ui,sans-serif;
      white-space:nowrap;
    ">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
      <span style="font-size:13px;font-weight:700;">${label}</span>
    </div>`,
    className: "route-endpoint-icon",
    iconSize: [0, 0],
    iconAnchor: isOrigin ? [60, 40] : [60, -5],
  });
}

/* ─── Main Component ─── */
export function RoutierInteractiveMap({ activeMissions, missionRequests, pendingMissions, corridors = [], stats }: Props) {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const [selectedMission, setSelectedMission] = useState<MissionPoint | null>(null);

  const allMissions = useMemo(() => {
    const out: MissionPoint[] = [];
    activeMissions.forEach((m) => out.push({ id: m.id, origin_city: m.origin_city, destination_city: m.destination_city, weight: m.weight, status: m.status, price: m.total_price, photo_url: m.photo_urls?.[0] || null, type: "active" }));
    pendingMissions.forEach((m) => out.push({ id: m.id, origin_city: m.origin_city, destination_city: m.destination_city, weight: m.weight, status: "pending", price: m.total_price, photo_url: m.photo_urls?.[0] || null, type: "pending" }));
    missionRequests.forEach((m) => out.push({ id: m.id, origin_city: m.origin_city, destination_city: m.destination_city, weight: m.weight_kg, price: m.client_budget || m.estimated_price, photo_url: m.photo_urls?.[0] || null, type: "available" }));
    return out;
  }, [activeMissions, missionRequests, pendingMissions]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [14.5, -4.0], zoom: 5,
      zoomControl: false, attributionControl: false,
      scrollWheelZoom: true, dragging: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 7, { animate: true });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  const clearLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
  }, []);

  const addLayer = useCallback((layer: L.Layer) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    layer.addTo(map);
    layersRef.current.push(layer);
  }, []);

  // ── Overview: chips at origin city + corridor routes ──
  const showOverview = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    clearLayers();
    const pts: L.LatLng[] = [];

    // Draw corridor routes first (underneath)
    corridors.forEach((corridor) => {
      const origin = getCityCoords(corridor.origin_city);
      const dest = getCityCoords(corridor.destination_city);
      if (!origin || !dest) return;

      const curvedPts = generateCurvedRoute(origin, dest);
      const isHub = corridor.is_hub_corridor;

      // Route line
      addLayer(L.polyline(curvedPts, {
        color: isHub ? "#10b981" : "#8b5cf6",
        weight: 3,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "6, 8",
      }));

      // Corridor label at midpoint
      const midIdx = Math.floor(curvedPts.length / 2);
      const midPt = curvedPts[midIdx];
      const corridorMarker = L.marker(midPt, { icon: createCorridorChipIcon(corridor) });
      corridorMarker.on("click", () => {
        // Navigate to corridor details
        navigate("/routier/demandes");
      });
      addLayer(corridorMarker);

      // Origin/dest dots for corridors
      addLayer(L.circleMarker(origin, { radius: 4, color: isHub ? "#10b981" : "#8b5cf6", fillColor: isHub ? "#10b981" : "#8b5cf6", fillOpacity: 0.6, weight: 1.5 }));
      addLayer(L.circleMarker(dest, { radius: 4, color: isHub ? "#10b981" : "#8b5cf6", fillColor: isHub ? "#10b981" : "#8b5cf6", fillOpacity: 0.6, weight: 1.5 }));

      pts.push(L.latLng(origin[0], origin[1]));
      pts.push(L.latLng(dest[0], dest[1]));
    });

    // Individual mission chips
    allMissions.forEach((m) => {
      const origin = getCityCoords(m.origin_city);
      if (!origin) return;
      const marker = L.marker(origin, { icon: createPriceChipIcon(m) });
      marker.on("click", () => setSelectedMission(m));
      addLayer(marker);
      pts.push(L.latLng(origin[0], origin[1]));
    });

    if (pts.length === 0) {
      addLayer(L.marker([14.5, -4.0], {
        icon: L.divIcon({
          html: `<div style="background:#fff;border-radius:12px;padding:8px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:12px;font-weight:600;color:#999;white-space:nowrap;">Aucune mission</div>`,
          className: "mission-chip-icon", iconSize: [0, 0],
        }),
      }));
    } else if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 7 });
    } else {
      map.setView(pts[0], 7);
    }
  }, [allMissions, corridors, clearLayers, addLayer, navigate]);

  // ── Detail: curved route between origin → dest ──
  const showRoute = useCallback((mission: MissionPoint) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    clearLayers();

    const origin = getCityCoords(mission.origin_city);
    const dest = getCityCoords(mission.destination_city);

    if (origin && dest) {
      const curvedPts = generateCurvedRoute(origin, dest);

      // Shadow line
      addLayer(L.polyline(curvedPts, {
        color: "#b0b0b0", weight: 8, opacity: 0.4, lineCap: "round", lineJoin: "round",
      }));
      // Main route line
      addLayer(L.polyline(curvedPts, {
        color: "#333", weight: 4, opacity: 0.85, lineCap: "round", lineJoin: "round",
      }));
      // Dotted overlay for texture
      addLayer(L.polyline(curvedPts, {
        color: "#555", weight: 2, opacity: 0.3, dashArray: "2, 8", lineCap: "round",
      }));

      // Endpoint markers
      addLayer(L.marker(origin, { icon: createEndpointIcon("Départ", true) }));
      addLayer(L.marker(dest, { icon: createEndpointIcon("Arrivée", false) }));

      // Small dot at origin & dest
      addLayer(L.circleMarker(origin, { radius: 5, color: "#111", fillColor: "#111", fillOpacity: 1, weight: 2 }));
      addLayer(L.circleMarker(dest, { radius: 5, color: "#111", fillColor: "#111", fillOpacity: 1, weight: 2 }));

      map.fitBounds(L.latLngBounds([origin, dest]), { padding: [60, 60], maxZoom: 8 });
    } else {
      const pos = origin || dest || [14.5, -4.0] as [number, number];
      if (origin) addLayer(L.marker(origin, { icon: createEndpointIcon("Départ", true) }));
      if (dest) addLayer(L.marker(dest, { icon: createEndpointIcon("Arrivée", false) }));
      map.setView(pos, 7);
    }
  }, [clearLayers, addLayer]);

  // Sync view
  useEffect(() => {
    if (!selectedMission) showOverview();
  }, [allMissions, corridors, selectedMission, showOverview]);

  useEffect(() => {
    if (selectedMission) showRoute(selectedMission);
  }, [selectedMission, showRoute]);

  return (
    <div className="relative z-0 rounded-xl overflow-hidden border border-border/50 shadow-sm isolate h-full">
      {/* Top bar: mission counters */}
      <div className="absolute top-0 left-0 right-16 z-[1000] p-2.5 flex items-center gap-2 pointer-events-none">
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
          {corridors.length > 0 && (
            <div className="bg-violet-600/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 pointer-events-auto">
              <Truck className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">{corridors.length} corridors</span>
            </div>
          )}
        </div>
      </div>

      {/* Zoom + / - and locate button (top right) */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm flex items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm flex items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            navigator.geolocation?.getCurrentPosition(
              (pos) => {
                mapInstanceRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 10, { animate: true });
              },
              () => {},
              { enableHighAccuracy: true, timeout: 5000 }
            );
          }}
          className="w-8 h-8 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm flex items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* Detail card (bottom overlay when mission selected) */}
      {selectedMission && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000] bg-background/95 backdrop-blur-md border-t border-border/50 p-3 pointer-events-auto animate-in slide-in-from-bottom-4 duration-200 cursor-pointer"
          onClick={() => navigate(`/routier/detail-mission/${selectedMission.id}`)}
        >
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {selectedMission.photo_url ? (
                <img 
                  src={selectedMission.photo_url} 
                  alt="Photo colis" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-7 h-7 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {selectedMission.origin_city} → {selectedMission.destination_city}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                      <span className="text-[11px] text-muted-foreground">{selectedMission.origin_city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full border border-foreground/60" />
                      <span className="text-[11px] text-muted-foreground">{selectedMission.destination_city}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <div>
                    <span className="text-base font-bold" style={{ color: TYPE_COLORS[selectedMission.type] }}>
                      {selectedMission.price ? `${Math.round(selectedMission.price).toLocaleString()} CFA` : "—"}
                    </span>
                    {selectedMission.weight && (
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span className="text-[10px] text-muted-foreground">{selectedMission.weight} kg</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                          background: TYPE_BG[selectedMission.type],
                          color: TYPE_COLORS[selectedMission.type],
                        }}>
                          {getWeightLabel(selectedMission.weight)}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedMission(null); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <span className="text-sm font-bold">✕</span>
          </button>
        </div>
      )}

      {/* Legend (overview only) */}
      {!selectedMission && (
        <div className="absolute bottom-2.5 left-2.5 z-[1000] bg-background/90 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex gap-3 pointer-events-auto flex-wrap">
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
          {corridors.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-[9px] font-medium text-foreground/80">Corridors</span>
            </div>
          )}
        </div>
      )}

      <div
        ref={mapRef}
        className="relative z-0 w-full"
        style={{
          height: "100%",
          minHeight: "calc(100vh - 200px)",
        }}
      />
    </div>
  );
}
