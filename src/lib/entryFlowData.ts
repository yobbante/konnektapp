/**
 * entryFlowData — Read entry flow data from sessionStorage
 * Shared utility for all registration forms
 */

export interface EntryFlowData {
  phone: string;
  city: string;
  countryCode: string;
  dialCode: string;
  hasPhone: boolean;
  hasCity: boolean;
}

export function getEntryFlowData(): EntryFlowData {
  const phone = sessionStorage.getItem("entry_phone") || "";
  const city = sessionStorage.getItem("entry_city") || "";
  const countryRaw = sessionStorage.getItem("entry_country");
  
  let countryCode = "SN";
  let dialCode = "+221";
  
  if (countryRaw) {
    try {
      const parsed = JSON.parse(countryRaw);
      countryCode = parsed?.code || "SN";
      dialCode = parsed?.dialCode || "+221";
    } catch {
      // ignore
    }
  }
  
  return {
    phone,
    city,
    countryCode,
    dialCode,
    hasPhone: !!phone,
    hasCity: !!city,
  };
}
