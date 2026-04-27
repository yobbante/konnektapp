// Compact searchable city dropdown styled for the beta dark theme.
// Reuses the platform's active cities (admin-managed) with a free-text fallback.
import { useMemo, useState, useEffect, useRef } from "react";
import { Search, MapPin, Check, X } from "lucide-react";
import { useActiveCities } from "@/hooks/useActiveCities";
import { WORLD_CITIES } from "@/components/gp/SearchableCitySelect";
import { cn } from "@/lib/utils";

interface CityComboboxProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}

export function CityCombobox({ value, onChange, placeholder = "Choisir une ville", className }: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const { cities: active } = useActiveCities();

  // Build the search universe: active cities first, then full world list (deduped)
  const allCities = useMemo(() => {
    const seen = new Set<string>();
    const out: { city: string; flag: string }[] = [];
    for (const c of active) {
      const k = c.city.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push({ city: c.city, flag: c.flag }); }
    }
    for (const c of WORLD_CITIES) {
      const k = c.city.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push({ city: c.city, flag: c.flag }); }
    }
    return out;
  }, [active]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allCities.slice(0, 60);
    return allCities.filter(c => c.city.toLowerCase().includes(s)).slice(0, 60);
  }, [q, allCities]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const select = (city: string) => {
    onChange(city);
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-12 rounded-xl bg-[hsl(var(--k-scan-text))]/5 border border-[hsl(var(--k-scan-text))]/10 px-3 flex items-center gap-2 text-left text-[hsl(var(--k-scan-text))] hover:bg-[hsl(var(--k-scan-text))]/8 transition-colors"
      >
        <MapPin className="w-4 h-4 text-[hsl(var(--k-scan-text))]/40 shrink-0" />
        <span className={cn("flex-1 truncate text-sm", !value && "text-[hsl(var(--k-scan-text))]/30")}>
          {value || placeholder}
        </span>
        {value && (
          <span
            role="button"
            aria-label="Effacer"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="h-6 w-6 rounded-full hover:bg-[hsl(var(--k-scan-text))]/10 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-[hsl(var(--k-scan-text))]/50" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-[hsl(var(--k-scan-text))]/15 bg-[hsl(var(--k-scan-bg-top))] shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--k-scan-text))]/10">
            <Search className="w-4 h-4 text-[hsl(var(--k-scan-text))]/40 shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une ville…"
              className="flex-1 bg-transparent text-sm text-[hsl(var(--k-scan-text))] placeholder:text-[hsl(var(--k-scan-text))]/30 outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-[hsl(var(--k-scan-text))]/40">
                {q ? (
                  <button
                    type="button"
                    onClick={() => select(q.trim())}
                    className="text-[hsl(var(--k-scan-text))]/80 hover:text-[hsl(var(--k-scan-text))] underline"
                  >
                    Utiliser « {q} »
                  </button>
                ) : "Aucune ville"}
              </div>
            ) : (
              filtered.map((c) => {
                const isSel = c.city.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => select(c.city)}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-[hsl(var(--k-scan-text))]/8 transition-colors",
                      isSel && "bg-primary/15 text-primary"
                    )}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.city}</span>
                    {isSel && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
