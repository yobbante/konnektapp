/**
 * AirlineSelect — Searchable airline dropdown with popular airlines first
 */
import { useState } from "react";
import { Plane, Search, Check, ChevronDown } from "lucide-react";
import { ALL_AIRLINES_SORTED, POPULAR_AIRLINES } from "@/lib/airlines";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AirlineSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AirlineSelect({ value, onChange, placeholder = "Compagnie aérienne", className }: AirlineSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? ALL_AIRLINES_SORTED.filter(a => 
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.code.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_AIRLINES_SORTED;

  const selectedAirline = ALL_AIRLINES_SORTED.find(a => a.name === value || a.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center justify-between w-full h-11 px-3 rounded-xl border border-input bg-background text-sm hover:bg-muted/50 transition-colors ${className || ""}`}
        >
          <span className={selectedAirline ? "text-foreground" : "text-muted-foreground"}>
            {selectedAirline ? (
              <span className="flex items-center gap-2">
                <Plane className="w-3.5 h-3.5" />
                {selectedAirline.name}
              </span>
            ) : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une compagnie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[280px]">
          <div className="p-1">
            {!search && (
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Populaires
              </p>
            )}
            {filtered.map((airline, i) => {
              const isSelected = value === airline.name;
              const showDivider = !search && i === POPULAR_AIRLINES.length;
              return (
                <div key={`${airline.code}-${airline.name}-${i}`}>
                  {showDivider && (
                    <>
                      <div className="h-px bg-border mx-2 my-1" />
                      <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Toutes les compagnies
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => { onChange(airline.name); setOpen(false); setSearch(""); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                    }`}
                  >
                    <Plane className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{airline.name}</span>
                    {airline.popular && !search && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Fréquent</Badge>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Aucune compagnie trouvée</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
