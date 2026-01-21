import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Supported currencies with their symbols and labels
export const CURRENCIES = [
  { code: "XOF", symbol: "FCFA", label: "Franc CFA (FCFA)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "Dollar US ($)" },
  { code: "CAD", symbol: "CAD", label: "Dollar canadien (CAD)" },
  { code: "AED", symbol: "AED", label: "Dirham (AED)" },
  { code: "GBP", symbol: "£", label: "Livre sterling (£)" },
  { code: "MAD", symbol: "MAD", label: "Dirham marocain (MAD)" },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]["code"];

// Helper function to get currency symbol from code
export function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.symbol || code;
}

// Helper function to format price with currency
export function formatPrice(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  // Format with thousands separator
  const formattedAmount = amount.toLocaleString('fr-FR');
  return `${formattedAmount} ${symbol}`;
}

// Helper function to format price per kg
export function formatPricePerKg(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${amount} ${symbol}/kg`;
}

interface CurrencySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CurrencySelector({ 
  value, 
  onValueChange, 
  disabled = false,
  className = "" 
}: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Devise" />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span className="flex items-center gap-2">
              <span className="font-medium">{currency.symbol}</span>
              <span className="text-muted-foreground text-xs">{currency.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
