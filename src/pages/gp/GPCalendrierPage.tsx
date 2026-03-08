/**
 * GPCalendrierPage — Departures management with unified SmartVoyageForm
 * Mobile-optimized compact calendar
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Plane, Edit, Trash2, List, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { SmartVoyageForm } from "@/components/gp/SmartVoyageForm";
import { EditVoyageDialog } from "@/components/gp/EditVoyageDialog";
import { GPCompactCalendar } from "@/components/gp/GPCompactCalendar";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useGPProfile } from "@/hooks/useGPProfile";
import { format, isFuture, isPast } from "date-fns";
import { fr } from "date-fns/locale";

interface Voyage {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  currency: string;
  status: string;
  flight_number: string | null;
  airline: string | null;
  baggage_types_accepted: string[] | null;
  baggage_restrictions: string | null;
}

export default function GPCalendrierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount, isVerified, gpRoute } = useGPProfile();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoyageForm, setShowVoyageForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEditVoyage, setShowEditVoyage] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");

  useEffect(() => {
    if (gpProfile) loadVoyages();
  }, [gpProfile]);

  const loadVoyages = async () => {
    if (!gpProfile) return;
    try {
      const { data } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", gpProfile.id)
        .order("departure_date", { ascending: true });
      setVoyages(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoyage = async (voyageId: string) => {
    try {
      const { error } = await supabase.from("gp_offers").delete().eq("id", voyageId);
      if (error) throw error;
      toast({ title: "Voyage supprimé" });
      loadVoyages();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const handleDateTap = (date: Date) => {
    setSelectedDate(date);
    setShowVoyageForm(true);
  };

  const handleNewVoyage = () => {
    setSelectedDate(null);
    setShowVoyageForm(true);
  };

  if (profileLoading || loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const upcomingVoyages = voyages.filter(v => isFuture(new Date(v.departure_date)));
  const pastVoyages = voyages.filter(v => isPast(new Date(v.departure_date)));

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="calendrier"
      onNewVoyage={handleNewVoyage}
    >
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mes départs</h2>
          <div className="flex gap-1.5">
            <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")} className="h-8 px-2.5">
              <CalendarDays className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")} className="h-8 px-2.5">
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isVerified ? (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6 text-center">
              <Plane className="w-10 h-10 mx-auto mb-3 text-amber-500 opacity-60" />
              <p className="font-semibold text-sm">Compte en attente de validation</p>
              <p className="text-xs text-muted-foreground mt-1">Vous pourrez créer des départs après approbation</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Add button */}
            <Button className="w-full h-12" onClick={handleNewVoyage}>
              <Plus className="w-5 h-5 mr-2" /> Nouveau voyage
            </Button>

            {viewMode === "calendar" && gpRoute ? (
              <GPCompactCalendar
                departures={voyages.map(v => ({
                  id: v.id,
                  date: v.departure_date,
                  originCity: v.origin_city,
                  destinationCity: v.destination_city,
                  availableCapacity: v.available_capacity,
                  type: v.origin_city === gpRoute.originCity ? "aller" as const : "retour" as const,
                  status: v.status === "active" ? (isFuture(new Date(v.departure_date)) ? "open" as const : "past" as const) : "past" as const,
                }))}
                onDateTap={handleDateTap}
                onDepartureTap={(depId) => {
                  const v = voyages.find(v => v.id === depId);
                  if (v) { setSelectedVoyage(v); setShowEditVoyage(true); }
                }}
              />
            ) : (
              <>
                {/* Upcoming list */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">À venir ({upcomingVoyages.length})</p>
                  {upcomingVoyages.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <Plane className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun voyage programmé</p>
                      </CardContent>
                    </Card>
                  ) : (
                    upcomingVoyages.map((v) => (
                      <Card key={v.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Plane className="w-4 h-4 text-primary" />
                                <p className="font-semibold text-sm">{v.origin_city} → {v.destination_city}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(v.departure_date), "EEEE d MMMM yyyy", { locale: fr })}
                                {v.flight_number && ` · ${v.flight_number}`}
                              </p>
                            </div>
                            <Badge variant={v.status === "active" ? "default" : "secondary"}>
                              {v.status === "active" ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                            <div><span className="text-muted-foreground block">Capacité</span><p className="font-semibold">{v.available_capacity}/{v.total_capacity} kg</p></div>
                            <div><span className="text-muted-foreground block">Prix/kg</span><p className="font-semibold">{v.price_per_kg} {getCurrencySymbol(v.currency)}</p></div>
                            <div><span className="text-muted-foreground block">Vol</span><p className="font-semibold">{v.flight_number || "—"}</p></div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedVoyage(v); setShowEditVoyage(true); }}>
                              <Edit className="w-4 h-4 mr-1" /> Modifier
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteVoyage(v.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Past */}
                {pastVoyages.length > 0 && (
                  <div className="space-y-2 opacity-60">
                    <p className="text-sm font-medium text-muted-foreground">Passés ({pastVoyages.length})</p>
                    {pastVoyages.slice(0, 3).map((v) => (
                      <Card key={v.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm">{v.origin_city} → {v.destination_city}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(v.departure_date), "d MMM yyyy", { locale: fr })}</p>
                          </div>
                          <Badge variant="outline">Terminé</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Unified Smart Voyage Form */}
      <SmartVoyageForm
        open={showVoyageForm}
        onClose={() => { setShowVoyageForm(false); setSelectedDate(null); }}
        gpId={gpProfile.id}
        selectedDate={selectedDate}
        onSuccess={() => { setShowVoyageForm(false); setSelectedDate(null); loadVoyages(); }}
      />

      {selectedVoyage && (
        <EditVoyageDialog
          open={showEditVoyage}
          onClose={() => { setShowEditVoyage(false); setSelectedVoyage(null); }}
          voyage={selectedVoyage}
          onSuccess={() => { setShowEditVoyage(false); setSelectedVoyage(null); loadVoyages(); }}
        />
      )}
    </GPDashboardLayout>
  );
}
