// Country phone codes and utilities

export const COUNTRY_PHONE_CODES: Record<string, string> = {
  // Africa
  SN: "+221",
  CI: "+225",
  CM: "+237",
  ML: "+223",
  GN: "+224",
  BF: "+226",
  TG: "+228",
  BJ: "+229",
  GH: "+233",
  NG: "+234",
  GA: "+241",
  CG: "+242",
  CD: "+243",
  DZ: "+213",
  TN: "+216",
  EG: "+20",
  MA: "+212",
  MR: "+222",
  NE: "+227",
  CV: "+238",
  GM: "+220",
  GW: "+245",
  SL: "+232",
  LR: "+231",
  ZA: "+27",
  GQ: "+240",
  TD: "+235",
  LB: "+961",
  
  // Europe
  FR: "+33",
  GB: "+44",
  BE: "+32",
  DE: "+49",
  ES: "+34",
  IT: "+39",
  CH: "+41",
  PT: "+351",
  NL: "+31",
  
  // Americas
  US: "+1",
  CA: "+1",
  BR: "+55",
  
  // Middle East
  AE: "+971",
  SA: "+966",
  QA: "+974",
  TR: "+90",
  
  // Asia
  CN: "+86",
  HK: "+852",
  JP: "+81",
  IN: "+91",
  
  // Oceania
  AU: "+61",
  
  // Default
  XX: "+",
};

export function getCountryPhoneCode(countryCode: string): string {
  return COUNTRY_PHONE_CODES[countryCode] || "+";
}

export function formatPhoneWithCountryCode(phone: string, countryCode: string): string {
  const code = getCountryPhoneCode(countryCode);
  
  // If phone already starts with +, return as is
  if (phone.startsWith("+")) {
    return phone;
  }
  
  // If phone starts with 0, remove it before adding country code
  if (phone.startsWith("0")) {
    return `${code} ${phone.substring(1)}`;
  }
  
  // Otherwise just add the code
  return `${code} ${phone}`;
}

export function getPhonePlaceholder(countryCode: string): string {
  const code = getCountryPhoneCode(countryCode);
  
  switch(countryCode) {
    case "SN": return `${code} 77 123 45 67`;
    case "FR": return `${code} 6 12 34 56 78`;
    case "US": 
    case "CA": return `${code} 555 123 4567`;
    case "GB": return `${code} 7911 123456`;
    case "BE": return `${code} 470 12 34 56`;
    case "CI": return `${code} 07 12 34 56`;
    case "MA": return `${code} 6 12 34 56 78`;
    case "AE": return `${code} 50 123 4567`;
    default: return `${code} ...`;
  }
}
