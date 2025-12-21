import { useState } from "react";
import { Sparkles, Calendar, Route, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ScheduledRoute {
  id: string;
  route_name: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  days_of_week: number[];
  departure_time: string | null;
  price_per_kg: number;
  currency: string;
  available_capacity_kg: number | null;
  vehicle_id: string | null;
  is_active: boolean;
}

interface GenerateOffersFromRoutesProps {
  gpId: string;
  gpType: string;
  routes: ScheduledRoute[];
  onOffersGenerated: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Dim" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
];

export function GenerateOffersFromRoutes({ 
  gpId, 
  gpType, 
  routes, 
  onOffersGenerated 
}: GenerateOffersFromRoutesProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [weeksAhead, setWeeksAhead] = useState(2);
  const [generatedCount, setGeneratedCount] = useState(0);

  const activeRoutes = routes.filter(r => r.is_active);

  const toggleRoute = (routeId: string) => {
    setSelectedRoutes(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId) 
        : [...prev, routeId]
    );
  };

  const selectAll = () => {
    setSelectedRoutes(activeRoutes.map(r => r.id));
  };

  const getNextDates = (route: ScheduledRoute, weeks: number): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      
      if (route.days_of_week.includes(dayOfWeek)) {
        dates.push(date);
      }
    }
    
    return dates;
  };

  const generateOffers = async () => {
    if (selectedRoutes.length === 0) {
      toast({ title: "Sélectionnez au moins une navette", variant: "destructive" });
      return;
    }

    setGenerating(true);
    let count = 0;

    try {
      for (const routeId of selectedRoutes) {
        const route = routes.find(r => r.id === routeId);
        if (!route) continue;

        const dates = getNextDates(route, weeksAhead);
        
        for (const date of dates) {
          // Check if offer already exists for this date/route
          const departureDate = new Date(date);
          if (route.departure_time) {
            const [hours, minutes] = route.departure_time.split(':').map(Number);
            departureDate.setHours(hours, minutes, 0, 0);
          }

          const { data: existing } = await supabase
            .from("gp_offers")
            .select("id")
            .eq("gp_id", gpId)
            .eq("origin_city", route.origin_city)
            .eq("destination_city", route.destination_city)
            .gte("departure_date", departureDate.toISOString().split('T')[0])
            .lt("departure_date", addDays(departureDate, 1).toISOString().split('T')[0])
            .maybeSingle();

          if (existing) continue;

          const { error } = await supabase.from("gp_offers").insert({
            gp_id: gpId,
            origin_city: route.origin_city,
            origin_country: route.origin_country,
            destination_city: route.destination_city,
            destination_country: route.destination_country,
            departure_date: departureDate.toISOString(),
            price_per_kg: route.price_per_kg,
            currency: route.currency,
            transport_type: gpType as any,
            total_capacity: route.available_capacity_kg || 1000,
            available_capacity: route.available_capacity_kg || 1000,
            vehicle_id: route.vehicle_id,
            status: "active",
            description: `Navette régulière ${route.route_name}`,
          });

          if (!error) count++;
        }
      }

      setGeneratedCount(count);
      
      if (count > 0) {
        toast({ 
          title: `${count} offre${count > 1 ? 's' : ''} créée${count > 1 ? 's' : ''}`,
          description: "Les offres ont été générées depuis vos navettes"
        });
        onOffersGenerated();
      } else {
        toast({ 
          title: "Aucune nouvelle offre",
          description: "Les offres pour ces dates existent déjà"
        });
      }
    } catch (error: any) {
      console.error("Error generating offers:", error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible de générer les offres",
        variant: "destructive" 
      });
    } finally {
      setGenerating(false);
      setShowDialog(false);
    }
  };

  if (activeRoutes.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Génération automatique d'offres
        </CardTitle>
        <CardDescription className="text-sm">
          Créez des offres automatiquement depuis vos navettes régulières
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="default">
              <Sparkles className="w-4 h-4 mr-2" />
              Générer des offres ({activeRoutes.length} navette{activeRoutes.length > 1 ? 's' : ''})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Générer des offres
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Weeks selector */}
              <div className="space-y-2">
                <Label>Générer pour les prochaines</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={weeksAhead}
                    onChange={(e) => setWeeksAhead(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                    className="w-20"
                    min={1}
                    max={8}
                  />
                  <span className="text-sm text-muted-foreground">semaine(s)</span>
                </div>
              </div>

              {/* Routes selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Navettes à utiliser</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={selectAll}
                    className="text-xs"
                  >
                    Tout sélectionner
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activeRoutes.map((route) => {
                    const nextDates = getNextDates(route, weeksAhead);
                    
                    return (
                      <div 
                        key={route.id}
                        className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                          selectedRoutes.includes(route.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => toggleRoute(route.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={selectedRoutes.includes(route.id)}
                            onCheckedChange={() => toggleRoute(route.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Route className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="font-medium truncate">{route.origin_city}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{route.destination_city}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {route.price_per_kg} FCFA/kg
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {nextDates.length} départ{nextDates.length > 1 ? 's' : ''} prévu{nextDates.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              {selectedRoutes.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Aperçu</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRoutes.reduce((acc, routeId) => {
                      const route = routes.find(r => r.id === routeId);
                      return acc + (route ? getNextDates(route, weeksAhead).length : 0);
                    }, 0)} offres seront créées pour les {weeksAhead} prochaine{weeksAhead > 1 ? 's' : ''} semaine{weeksAhead > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={generating}>
                Annuler
              </Button>
              <Button onClick={generateOffers} disabled={generating || selectedRoutes.length === 0}>
                {generating ? (
                  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Générer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
