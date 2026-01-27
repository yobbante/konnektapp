import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, Plane, MapPin, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { CreateBaggageVoyageDialog } from "@/components/gp/CreateBaggageVoyageDialog";
import { EditVoyageDialog } from "@/components/gp/EditVoyageDialog";
import { DepartureCalendarView } from "@/components/gp/DepartureCalendarView";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
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

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  explicit_restrictions?: string[] | null;
}

/**
 * GPCalendrierPage - Gestion des départs/voyages
 * 
 * Pour GP Bagages: calendrier des départs programmés
 * Actions: Créer voyage, modifier, supprimer
 */
export default function GPCalendrierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [showCreateVoyage, setShowCreateVoyage] = useState(false);
  const [showEditVoyage, setShowEditVoyage] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, explicit_restrictions")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);

      // Load all voyages/offers
      const { data: offersData } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("gp_id", profile.id)
        .order("departure_date", { ascending: true });

      setVoyages(offersData || []);

      // Get pending count
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", profile.id)
        .eq("status", "pending");

      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditVoyage = (voyage: Voyage) => {
    setSelectedVoyage(voyage);
    setShowEditVoyage(true);
  };

  const handleDeleteVoyage = async (voyageId: string) => {
    try {
      const { error } = await supabase
        .from("gp_offers")
        .delete()
        .eq("id", voyageId);

      if (error) throw error;

      toast({
        title: "Voyage supprimé",
        description: "Le départ a été supprimé",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le voyage",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoader message="Chargement du calendrier..." />;
  }

  if (!gpProfile) return null;

  const upcomingVoyages = voyages.filter(v => isFuture(new Date(v.departure_date)));
  const pastVoyages = voyages.filter(v => isPast(new Date(v.departure_date)));

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeTab="calendrier"
    >
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Mes départs
          </h2>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              Liste
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Add New Voyage Button */}
        <Button
          className="w-full"
          onClick={() => setShowCreateVoyage(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau voyage
        </Button>

        {viewMode === "calendar" ? (
          <DepartureCalendarView
            departures={voyages.map(v => ({
              id: v.id,
              date: v.departure_date,
              originCity: v.origin_city,
              originCountry: v.origin_country,
              destinationCity: v.destination_city,
              destinationCountry: v.destination_country,
              capacity: v.total_capacity,
              availableCapacity: v.available_capacity,
              pricePerKg: v.price_per_kg,
              type: "aller" as const,
              status: v.status === "active" ? "open" as const : "past" as const,
            }))}
            onAddDeparture={async (data) => {
              // Handle adding departure
              console.log("Add departure:", data);
            }}
          />
        ) : (
          <>
            {/* Upcoming Voyages */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                À venir ({upcomingVoyages.length})
              </h3>

              {upcomingVoyages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Plane className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun voyage programmé</p>
                  </CardContent>
                </Card>
              ) : (
                upcomingVoyages.map((voyage) => (
                  <Card key={voyage.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Plane className="w-4 h-4 text-primary" />
                            <p className="font-medium text-sm">
                              {voyage.origin_city} → {voyage.destination_city}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(voyage.departure_date), "EEEE d MMMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <Badge 
                          variant={voyage.status === "active" ? "default" : "secondary"}
                          className={voyage.status === "active" ? "bg-green-500" : ""}
                        >
                          {voyage.status === "active" ? "Actif" : "Inactif"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                        <div>
                          <span className="text-muted-foreground">Capacité</span>
                          <p className="font-medium">{voyage.available_capacity}/{voyage.total_capacity} kg</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prix/kg</span>
                          <p className="font-medium">{voyage.price_per_kg} {getCurrencySymbol(voyage.currency)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vol</span>
                          <p className="font-medium">{voyage.flight_number || "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditVoyage(voyage)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteVoyage(voyage.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Past Voyages */}
            {pastVoyages.length > 0 && (
              <div className="space-y-3 opacity-60">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Passés ({pastVoyages.length})
                </h3>
                {pastVoyages.slice(0, 3).map((voyage) => (
                  <Card key={voyage.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">
                            {voyage.origin_city} → {voyage.destination_city}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(voyage.departure_date), "d MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <Badge variant="outline">Terminé</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Voyage Dialog */}
      <CreateBaggageVoyageDialog
        open={showCreateVoyage}
        onClose={() => setShowCreateVoyage(false)}
        gpId={gpProfile.id}
        lastVoyage={voyages[0] || null}
        onSuccess={() => {
          setShowCreateVoyage(false);
          loadData();
        }}
      />

      {/* Edit Voyage Dialog */}
      {selectedVoyage && (
        <EditVoyageDialog
          open={showEditVoyage}
          onClose={() => {
            setShowEditVoyage(false);
            setSelectedVoyage(null);
          }}
          voyage={selectedVoyage}
          onSuccess={() => {
            setShowEditVoyage(false);
            setSelectedVoyage(null);
            loadData();
          }}
        />
      )}
    </GPDashboardLayout>
  );
}
