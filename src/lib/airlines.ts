/**
 * Airline list — Popular airlines first, then alphabetical
 */

export interface Airline {
  code: string;
  name: string;
  popular?: boolean;
}

export const AIRLINES: Airline[] = [
  // Popular — shown first
  { code: "AF", name: "Air France", popular: true },
  { code: "HC", name: "Air Sénégal", popular: true },
  { code: "AT", name: "Royal Air Maroc", popular: true },
  { code: "ET", name: "Ethiopian Airlines", popular: true },
  { code: "TK", name: "Turkish Airlines", popular: true },
  { code: "HF", name: "Air Côte d'Ivoire", popular: true },
  { code: "QR", name: "Qatar Airways", popular: true },
  { code: "EK", name: "Emirates", popular: true },
  { code: "TP", name: "TAP Air Portugal", popular: true },
  { code: "SN", name: "Brussels Airlines", popular: true },
  { code: "IB", name: "Iberia", popular: true },
  { code: "LH", name: "Lufthansa", popular: true },
  // Rest — alphabetical
  { code: "3O", name: "Air Arabia Maroc" },
  { code: "AH", name: "Air Algérie" },
  { code: "UU", name: "Air Austral" },
  { code: "BP", name: "Air Burkina" },
  { code: "TX", name: "Air Caraïbes" },
  { code: "AC", name: "Air Canada" },
  { code: "CA", name: "Air China" },
  { code: "EN", name: "Air Dolomiti" },
  { code: "UX", name: "Air Europa" },
  { code: "GN", name: "Air Guinée International" },
  { code: "NX", name: "Air Macau" },
  { code: "SW", name: "Air Namibia" },
  { code: "PX", name: "Air Niugini" },
  { code: "AP", name: "ASKY Airlines" },
  { code: "KP", name: "Compagnie Aérienne du Mali" },
  { code: "A3", name: "Aegean Airlines" },
  { code: "AM", name: "Aeroméxico" },
  { code: "NH", name: "All Nippon Airways (ANA)" },
  { code: "AA", name: "American Airlines" },
  { code: "OS", name: "Austrian Airlines" },
  { code: "AV", name: "Avianca" },
  { code: "BA", name: "British Airways" },
  { code: "CA", name: "Cameroon Airlines (Camair-Co)" },
  { code: "CX", name: "Cathay Pacific" },
  { code: "CE", name: "Ceiba Intercontinental" },
  { code: "MU", name: "China Eastern Airlines" },
  { code: "CZ", name: "China Southern Airlines" },
  { code: "CM", name: "Copa Airlines" },
  { code: "SS", name: "Corsair" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "MS", name: "EgyptAir" },
  { code: "LY", name: "El Al Israel Airlines" },
  { code: "FZ", name: "flydubai" },
  { code: "GA", name: "Garuda Indonesia" },
  { code: "GF", name: "Gulf Air" },
  { code: "KQ", name: "Kenya Airways" },
  { code: "KL", name: "KLM Royal Dutch Airlines" },
  { code: "KU", name: "Kuwait Airways" },
  { code: "LA", name: "LATAM Airlines" },
  { code: "MS", name: "Middle East Airlines (MEA)" },
  { code: "WB", name: "RwandAir" },
  { code: "SK", name: "SAS Scandinavian Airlines" },
  { code: "SV", name: "Saudi Arabian Airlines (Saudia)" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "SA", name: "South African Airways" },
  { code: "LX", name: "Swiss International Air Lines" },
  { code: "DT", name: "TAAG Angola Airlines" },
  { code: "TG", name: "Thai Airways" },
  { code: "TU", name: "Tunisair" },
  { code: "PS", name: "Ukraine International Airlines" },
  { code: "UA", name: "United Airlines" },
  { code: "VN", name: "Vietnam Airlines" },
  { code: "VS", name: "Virgin Atlantic" },
  { code: "WY", name: "Oman Air" },
];

export const POPULAR_AIRLINES = AIRLINES.filter(a => a.popular);
export const ALL_AIRLINES_SORTED = [
  ...POPULAR_AIRLINES,
  ...AIRLINES.filter(a => !a.popular).sort((a, b) => a.name.localeCompare(b.name)),
];
