/**
 * AdminConfigPanel - Unified configuration management for admin
 * 
 * Organized configuration sections:
 * 1. Devises & Taux de change
 * 2. Assurances
 * 3. Templates de messages
 * 4. Tarification logistique
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Settings, TrendingUp, Shield, MessageSquare, Truck, 
  ChevronRight, Plus, Save, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

const CURRENCY_INFO: Record<string, { symbol: string; name: string }> = {
  XOF: { symbol: "FCFA", name: "Franc CFA (Référence)" },
  EUR: { symbol: "€", name: "Euro" },
  USD: { symbol: "$", name: "Dollar US" },
  CAD: { symbol: "C$", name: "Dollar Canadien" },
  AED: { symbol: "د.إ", name: "Dirham Émirats" },
  GBP: { symbol: "£", name: "Livre Sterling" },
  MAD: { symbol: "DH", name: "Dirham Marocain" },
};

export function AdminConfigPanel() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("currencies");
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: "", rate: "" });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("to_currency", "XOF")
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

  const handleSaveRates = async () => {
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
      toast({ title: "✅ Taux sauvegardés" });
      fetchRates();
    } catch (err) {
      toast({ title: "Erreur", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleAddCurrency = async () => {
    if (!newCurrency.code || !newCurrency.rate) return;
    
    try {
      const { error } = await supabase
        .from("exchange_rates")
        .insert({
          from_currency: newCurrency.code.toUpperCase(),
          to_currency: "XOF",
          rate: parseFloat(newCurrency.rate),
        });

      if (error) throw error;

      toast({ title: "✅ Devise ajoutée" });
      setShowAddCurrency(false);
      setNewCurrency({ code: "", rate: "" });
      fetchRates();
    } catch (err) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const sections = [
    { id: "currencies", label: "Devises", icon: TrendingUp, badge: rates.length },
    { id: "insurance", label: "Assurances", icon: Shield },
    { id: "messages", label: "Templates", icon: MessageSquare },
    { id: "logistics", label: "Logistique", icon: Truck },
  ];

  return (
    <div className="space-y-4">
      {/* Section Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                p-3 rounded-xl border-2 transition-all flex items-center gap-2
                ${isActive 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-border bg-card hover:border-primary/50"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{section.label}</span>
              {section.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {section.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Currency Management */}
      {activeSection === "currencies" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Gestion des Devises
                </CardTitle>
                <CardDescription>
                  Tous les taux sont définis par rapport au FCFA (XOF) - monnaie de référence
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchRates} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Actualiser
                </Button>
                <Dialog open={showAddCurrency} onOpenChange={setShowAddCurrency}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une devise</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Code devise (ex: CHF, CNY)</Label>
                        <Input
                          placeholder="CHF"
                          value={newCurrency.code}
                          onChange={(e) => setNewCurrency(p => ({ ...p, code: e.target.value }))}
                          maxLength={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Taux vers FCFA (1 devise = X FCFA)</Label>
                        <Input
                          type="number"
                          placeholder="665"
                          value={newCurrency.rate}
                          onChange={(e) => setNewCurrency(p => ({ ...p, rate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCurrency(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleAddCurrency}>
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reference Currency */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">XOF</span>
                </div>
                <div>
                  <p className="font-semibold">Franc CFA (XOF)</p>
                  <p className="text-sm text-muted-foreground">Monnaie de référence — Base 1</p>
                </div>
                <Badge className="ml-auto">Référence</Badge>
              </div>
            </div>

            {/* Currency Rates */}
            <div className="grid gap-3">
              {rates.map((rate) => {
                const info = CURRENCY_INFO[rate.from_currency];
                return (
                  <motion.div
                    key={rate.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-xl bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-bold">{rate.from_currency}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{info?.name || rate.from_currency}</p>
                        <p className="text-xs text-muted-foreground">
                          1 {rate.from_currency} = {editedRates[rate.id]?.toLocaleString() || rate.rate.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          className="w-32 text-right font-mono"
                          value={editedRates[rate.id] || rate.rate}
                          onChange={(e) => setEditedRates(prev => ({
                            ...prev,
                            [rate.id]: parseFloat(e.target.value) || 0
                          }))}
                        />
                        <span className="text-sm text-muted-foreground">FCFA</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveRates} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Sauvegarde..." : "Sauvegarder les taux"}
              </Button>
            </div>

            {/* Info */}
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <strong>💡 Règle Yobbanté :</strong> Les taux sont volontairement majorés par rapport au marché 
              pour couvrir la volatilité et éviter les pertes FX. Tous les calculs internes utilisent le FCFA.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Section - Link to existing component */}
      {activeSection === "insurance" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Paliers d'Assurance
            </CardTitle>
            <CardDescription>
              Configuration des niveaux d'assurance et des frais associés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Utilisez le composant AdminInsuranceTiers dans l'onglet Configuration principal pour gérer les paliers.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/admin?tab=config"}>
              Ouvrir la configuration
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Messages Section */}
      {activeSection === "messages" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Templates de Messages
            </CardTitle>
            <CardDescription>
              Messages automatiques pour les notifications de statut
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Utilisez le composant AdminMessageTemplates dans l'onglet Configuration principal.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/admin?tab=config"}>
              Ouvrir la configuration
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Logistics Section */}
      {activeSection === "logistics" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tarification Logistique Interne
            </CardTitle>
            <CardDescription>
              Prix des enlèvements et livraisons Yobbanté à Dakar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Les prix sont définis en FCFA et basés sur la zone de Dakar.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">Enlèvement à domicile</p>
                <p className="text-2xl font-bold text-primary">2 000 FCFA</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">Livraison dernier km</p>
                <p className="text-2xl font-bold text-primary">2 500 FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
