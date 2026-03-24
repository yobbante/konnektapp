/**
 * City utilities: address placeholders, country code lookups, phone indicatifs
 */
import { COUNTRY_PHONE_CODES } from "@/lib/phoneCountryCodes";

// City → country code mapping
const CITY_COUNTRY_MAP: Record<string, string> = {
  // Sénégal
  "Dakar": "SN", "Thiès": "SN", "Saint-Louis": "SN", "Kaolack": "SN",
  "Ziguinchor": "SN", "Touba": "SN", "Mbour": "SN", "Rufisque": "SN",
  // France
  "Paris": "FR", "Marseille": "FR", "Lyon": "FR", "Lille": "FR",
  "Bordeaux": "FR", "Montpellier": "FR", "Rennes": "FR", "Rouen": "FR",
  "Nîmes": "FR", "Toulouse": "FR", "Nice": "FR", "Nantes": "FR", "Strasbourg": "FR",
  // USA
  "New York": "US", "Washington": "US", "Providence": "US", "Los Angeles": "US",
  "Chicago": "US", "Houston": "US", "Miami": "US", "Atlanta": "US",
  "Dallas": "US", "Boston": "US", "San Francisco": "US", "Seattle": "US",
  "Denver": "US", "Las Vegas": "US",
  // Canada
  "Montréal": "CA", "Ottawa": "CA", "Gatineau": "CA", "Toronto": "CA",
  "Vancouver": "CA", "Calgary": "CA", "Québec": "CA", "Edmonton": "CA",
  // Maroc
  "Casablanca": "MA", "Rabat": "MA", "Marrakech": "MA", "Fès": "MA",
  "Tanger": "MA", "Agadir": "MA",
  // UAE
  "Dubaï": "AE",
  // Espagne
  "Madrid": "ES", "Barcelone": "ES", "Almería": "ES", "Valence": "ES",
  "Séville": "ES", "Malaga": "ES",
  // Allemagne
  "Berlin": "DE", "Düsseldorf": "DE", "Munich": "DE", "Francfort": "DE",
  "Hambourg": "DE", "Cologne": "DE",
  // Belgique
  "Bruxelles": "BE", "Anvers": "BE", "Liège": "BE", "Gand": "BE", "Charleroi": "BE",
  // Suisse
  "Genève": "CH", "Zurich": "CH", "Berne": "CH", "Lausanne": "CH", "Bâle": "CH",
  // Turquie
  "Istanbul": "TR",
  // Liban
  "Beyrouth": "LB",
  // Côte d'Ivoire
  "Abidjan": "CI", "Bouaké": "CI", "Yamoussoukro": "CI", "San-Pédro": "CI", "Daloa": "CI",
  // Mali
  "Bamako": "ML", "Sikasso": "ML", "Ségou": "ML", "Mopti": "ML", "Kayes": "ML",
  // Guinée
  "Conakry": "GN", "Nzérékoré": "GN", "Kankan": "GN",
  // Cameroun
  "Douala": "CM", "Yaoundé": "CM", "Bafoussam": "CM", "Garoua": "CM",
  // Congo
  "Brazzaville": "CG",
  // RDC
  "Kinshasa": "CD",
  // Gabon
  "Libreville": "GA",
  // Guinée équatoriale
  "Malabo": "GQ",
  // Tchad
  "N'Djamena": "TD",
  // UK
  "Londres": "GB", "Manchester": "GB", "Birmingham": "GB", "Liverpool": "GB",
  "Leeds": "GB", "Glasgow": "GB",
  // Italie
  "Rome": "IT", "Milan": "IT", "Naples": "IT", "Turin": "IT", "Florence": "IT", "Venise": "IT",
  // Burkina Faso
  "Ouagadougou": "BF", "Bobo-Dioulasso": "BF",
  // Togo
  "Lomé": "TG", "Kara": "TG",
  // Bénin
  "Cotonou": "BJ", "Porto-Novo": "BJ",
  // Ghana
  "Accra": "GH", "Kumasi": "GH",
  // Nigeria
  "Lagos": "NG", "Abuja": "NG",
  // Algérie
  "Alger": "DZ", "Oran": "DZ",
  // Tunisie
  "Tunis": "TN",
  // Egypte
  "Le Caire": "EG",
  // Afrique du Sud
  "Johannesburg": "ZA", "Le Cap": "ZA",
  // Arabie Saoudite
  "Djeddah": "SA", "Riyad": "SA",
  // Qatar
  "Doha": "QA",
};

export function getCountryCodeFromCity(city: string): string {
  return CITY_COUNTRY_MAP[city] || "";
}

export function getPhoneIndicatifForCity(city: string): string {
  const cc = getCountryCodeFromCity(city);
  return cc ? (COUNTRY_PHONE_CODES[cc] || "") : "";
}

// Realistic fictional address examples per city
const CITY_ADDRESS_EXAMPLES: Record<string, string> = {
  // France
  "Paris": "42 Avenue des Champs-Élysées, 75008",
  "Marseille": "15 Rue de la République, 13001",
  "Lyon": "8 Place Bellecour, 69002",
  "Lille": "23 Rue de Béthune, 59000",
  "Bordeaux": "5 Cours de l'Intendance, 33000",
  "Montpellier": "12 Place de la Comédie, 34000",
  "Rennes": "18 Rue le Bastard, 35000",
  "Rouen": "7 Rue du Gros-Horloge, 76000",
  "Nîmes": "3 Boulevard Victor Hugo, 30000",
  "Toulouse": "14 Place du Capitole, 31000",
  "Nice": "21 Promenade des Anglais, 06000",
  "Nantes": "9 Rue Crébillon, 44000",
  "Strasbourg": "6 Place Kléber, 67000",
  // Sénégal
  "Dakar": "Av. Cheikh Anta Diop, Médina",
  "Thiès": "Quartier Escale, Rue 10",
  "Saint-Louis": "Rue Blaise Diagne, Île Nord",
  "Kaolack": "Marché Central, Quartier Bongré",
  "Touba": "Route de Darou Moukhty",
  "Mbour": "Zone Touristique, Saly Portudal",
  // USA
  "New York": "350 5th Avenue, Manhattan, NY 10118",
  "Washington": "1600 Pennsylvania Ave NW, DC 20500",
  "Los Angeles": "6801 Hollywood Blvd, CA 90028",
  "Chicago": "233 S Wacker Dr, IL 60606",
  "Miami": "1100 Biscayne Blvd, FL 33132",
  "Atlanta": "55 Peachtree St NE, GA 30303",
  "Houston": "1200 McKinney St, TX 77010",
  "Boston": "100 Huntington Ave, MA 02116",
  "San Francisco": "1 Market St, CA 94105",
  // Canada
  "Montréal": "1000 Rue Sainte-Catherine O, QC H3B 5K4",
  "Ottawa": "111 Wellington St, ON K1A 0A9",
  "Toronto": "100 Queen St W, ON M5H 2N2",
  "Vancouver": "555 W Hastings St, BC V6B 4N6",
  // Espagne
  "Madrid": "Calle Gran Vía 32, 28013",
  "Barcelone": "Passeig de Gràcia 92, 08008",
  "Almería": "Paseo de Almería 18, 04001",
  "Séville": "Avenida de la Constitución 3, 41004",
  "Malaga": "Calle Marqués de Larios 4, 29005",
  // Allemagne
  "Berlin": "Friedrichstraße 43, 10117",
  "Düsseldorf": "Königsallee 14, 40212",
  "Munich": "Marienplatz 8, 80331",
  "Francfort": "Zeil 106, 60313",
  // Belgique
  "Bruxelles": "Rue Neuve 123, 1000",
  "Anvers": "Meir 47, 2000",
  "Liège": "Place Saint-Lambert 5, 4000",
  // Suisse
  "Genève": "Rue du Rhône 50, 1204",
  "Zurich": "Bahnhofstrasse 21, 8001",
  "Lausanne": "Place de la Palud 2, 1003",
  // UK
  "Londres": "221B Baker Street, NW1 6XE",
  "Manchester": "100 Deansgate, M3 2GP",
  // Italie
  "Rome": "Via del Corso 87, 00186",
  "Milan": "Corso Buenos Aires 36, 20124",
  // Maroc
  "Casablanca": "Boulevard Mohammed V, Maarif",
  "Rabat": "Avenue Mohammed V, Agdal",
  "Marrakech": "Av. Mohammed VI, Guéliz",
  // Côte d'Ivoire
  "Abidjan": "Boulevard Lagunaire, Plateau",
  "Bouaké": "Quartier Commerce, Rue 12",
  // Mali
  "Bamako": "Avenue de l'OUA, Hamdallaye ACI",
  // Guinée
  "Conakry": "Corniche Sud, Kaloum",
  // Cameroun
  "Douala": "Rue Joss, Akwa",
  "Yaoundé": "Avenue Kennedy, Centre-Ville",
  // Turquie
  "Istanbul": "İstiklal Caddesi 140, Beyoğlu",
  // UAE
  "Dubaï": "Sheikh Zayed Road, Downtown",
  // Congo
  "Brazzaville": "Avenue de la Paix, Bacongo",
  // RDC
  "Kinshasa": "Boulevard du 30 Juin, Gombe",
  // Gabon
  "Libreville": "Boulevard Triomphal, Centre",
  // Liban
  "Beyrouth": "Rue Hamra, Ras Beirut",
  // Burkina Faso
  "Ouagadougou": "Avenue Kwame Nkrumah, Koulouba",
  // Togo
  "Lomé": "Boulevard du Mono, Bè",
  // Bénin
  "Cotonou": "Boulevard Saint-Michel, Ganhi",
  // Ghana
  "Accra": "Independence Avenue, Osu",
  // Nigeria
  "Lagos": "Victoria Island, Adeola Odeku St",
};

export function getAddressPlaceholder(city: string): string {
  return CITY_ADDRESS_EXAMPLES[city] || "";
}

// Currency-aware price placeholders
export function getPricePlaceholder(currency: string, type: "per_kg" | "suitcase" | "s" | "m" | "l" | "xl"): string {
  const map: Record<string, Record<string, string>> = {
    EUR: { per_kg: "8", suitcase: "150", s: "15", m: "30", l: "60", xl: "120" },
    XOF: { per_kg: "5000", suitcase: "100000", s: "10000", m: "20000", l: "40000", xl: "80000" },
    XAF: { per_kg: "5000", suitcase: "100000", s: "10000", m: "20000", l: "40000", xl: "80000" },
    USD: { per_kg: "9", suitcase: "170", s: "18", m: "35", l: "70", xl: "140" },
    GBP: { per_kg: "7", suitcase: "130", s: "13", m: "26", l: "52", xl: "105" },
    MAD: { per_kg: "90", suitcase: "1500", s: "150", m: "300", l: "600", xl: "1200" },
    CAD: { per_kg: "12", suitcase: "220", s: "22", m: "45", l: "90", xl: "180" },
    CHF: { per_kg: "8", suitcase: "150", s: "15", m: "30", l: "60", xl: "120" },
    AED: { per_kg: "35", suitcase: "600", s: "60", m: "120", l: "240", xl: "480" },
    TRY: { per_kg: "250", suitcase: "5000", s: "500", m: "1000", l: "2000", xl: "4000" },
    NGN: { per_kg: "7000", suitcase: "140000", s: "14000", m: "28000", l: "56000", xl: "112000" },
    GHS: { per_kg: "80", suitcase: "1500", s: "150", m: "300", l: "600", xl: "1200" },
  };
  return map[currency]?.[type] || map.EUR[type] || "";
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    EUR: "EUR", XOF: "CFA", XAF: "CFA", USD: "$", GBP: "GBP",
    MAD: "MAD", CAD: "CAD", CHF: "CHF", AED: "AED", TRY: "TRY",
    NGN: "NGN", GHS: "GHS",
  };
  return symbols[currency] || currency;
}
