import { useState, useEffect } from "react";
import { RefreshCw, Save, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

const CURRENCIES = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "XOF", symbol: "FCFA", name: "Franc CFA" },
  { code: "USD", symbol: "$", name: "Dollar US" },
  { code: "CAD", symbol: "C$", name: "Dollar Canadien" },
  { code: "AED", symbol: "د.إ", name: "Dirham Émirats" },
  { code: "GBP", symbol: "£", name: "Livre Sterling" },
  { code: "MAD", symbol: "DH", name: "Dirham Marocain" },
];

export function ExchangeRatesManager() {
  const { toast } = useToast();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});

  const fetchRates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("from_currency");

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setRates(data || []);
      const edited: Record<string, number> = {};
      data?.forEach(r => {
        edited[r.id] = r.rate;
      });
      setEditedRates(edited);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const rate of rates) {
        if (editedRates[rate.id] !== rate.rate) {
          await supabase
            .from("exchange_rates")
            .update({ rate: editedRates[rate.id], updated_at: new Date().toISOString() })
            .eq("id", rate.id);
        }
      }
      toast({ title: "Succès", description: "Taux de change mis à jour" });
      fetchRates();
    } catch (err) {
      toast({ title: "Erreur", description: "Échec de la sauvegarde", variant: "destructive" });
    }
    setSaving(false);
  };

  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    const rate = rates.find(r => r.from_currency === fromCurrency && r.to_currency === toCurrency);
    if (rate) return amount * rate.rate;
    
    // Try via EUR
    const toEur = rates.find(r => r.from_currency === fromCurrency && r.to_currency === "EUR");
    const fromEur = rates.find(r => r.from_currency === "EUR" && r.to_currency === toCurrency);
    if (toEur && fromEur) return amount * toEur.rate * fromEur.rate;
    
    return amount;
  };

  // Group rates by from_currency
  const ratesBySource = rates.reduce((acc, rate) => {
    if (!acc[rate.from_currency]) acc[rate.from_currency] = [];
    acc[rate.from_currency].push(rate);
    return acc;
  }, {} as Record<string, ExchangeRate[]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5" />
            Taux de change
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchRates} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(ratesBySource).map(([source, sourceRates]) => (
            <div key={source} className="p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="font-mono">
                  {source}
                </Badge>
                <span className="text-sm text-muted-foreground">→</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sourceRates.map(rate => (
                  <div key={rate.id} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs py-0">
                        {rate.to_currency}
                      </Badge>
                    </Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={editedRates[rate.id] || rate.rate}
                      onChange={(e) => setEditedRates(prev => ({
                        ...prev,
                        [rate.id]: parseFloat(e.target.value) || 0
                      }))}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick conversion preview */}
        <div className="mt-4 p-3 bg-primary/5 rounded-lg">
          <p className="text-sm font-medium mb-2">Aperçu conversion (100 unités)</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {CURRENCIES.slice(0, 4).map(c => (
              <Badge key={c.code} variant="outline">
                100 {c.code} = {convertAmount(100, c.code, "EUR").toFixed(2)} EUR
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility hook for currency conversion
export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);

  useEffect(() => {
    supabase.from("exchange_rates").select("*").then(({ data }) => {
      if (data) setRates(data);
    });
  }, []);

  const convert = (amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    const rate = rates.find(r => r.from_currency === from && r.to_currency === to);
    if (rate) return amount * rate.rate;
    
    const toEur = rates.find(r => r.from_currency === from && r.to_currency === "EUR");
    const fromEur = rates.find(r => r.from_currency === "EUR" && r.to_currency === to);
    if (toEur && fromEur) return amount * toEur.rate * fromEur.rate;
    
    return amount;
  };

  return { rates, convert };
}
