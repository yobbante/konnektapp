import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const countries = [
  { code: "SN", name: "Sénégal", currency: "FCFA", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", currency: "FCFA", flag: "🇨🇮" },
  { code: "ML", name: "Mali", currency: "FCFA", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", currency: "FCFA", flag: "🇧🇫" },
  { code: "GN", name: "Guinée", currency: "GNF", flag: "🇬🇳" },
];

export function CountrySelector() {
  const [selected, setSelected] = useState(countries[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <span className="text-lg">{selected.flag}</span>
          <span className="hidden sm:inline text-sm">{selected.code}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {countries.map((country) => (
          <DropdownMenuItem
            key={country.code}
            onClick={() => setSelected(country)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-lg">{country.flag}</span>
            <div className="flex flex-col">
              <span className="font-medium">{country.name}</span>
              <span className="text-xs text-muted-foreground">{country.currency}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
