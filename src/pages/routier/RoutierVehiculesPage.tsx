import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Car, Plus, Truck, Eye, ChevronDown, ChevronUp,
  Edit2, Trash2, Power, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Vehicle {
  id: string;
  name: string;
  vehicle_type: string;
  transport_category: string;
  max_weight_kg: number | null;
  max_volume_m3: number | null;
  is_active: boolean;
  specifications: Record<string, any> | null;
}

const VEHICLE_TYPES = [
  { value: "camion", label: "Camion" },
  { value: "camion_benne", label: "Camion Benne" },
  { value: "fourgon", label: "Fourgon" },
  { value: "pickup", label: "Pick-up" },
  { value: "semi_remorque", label: "Semi-remorque" },
  { value: "plateau", label: "Plateau" },
];

export default function RoutierVehiculesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    vehicle_type: "camion",
    max_weight_kg: "",
    max_volume_m3: "",
  });
  const [saving, setSaving] = useState(false);

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

      const { data: gp, error: gpError } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (gpError || !gp) {
        navigate("/routier/inscription");
        return;
      }

      setGpProfile(gp);

      // Load vehicles
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("gp_id", gp.id)
        .order("created_at", { ascending: false });

      setVehicles((vehiclesData || []).map(v => ({
        ...v,
        specifications: (v.specifications as Record<string, any>) || {},
      })));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVehicleActive = async (vehicle: Vehicle) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ is_active: !vehicle.is_active })
        .eq("id", vehicle.id);

      if (error) throw error;

      setVehicles(prev => prev.map(v => 
        v.id === vehicle.id ? { ...v, is_active: !v.is_active } : v
      ));

      toast({
        title: vehicle.is_active ? "Véhicule désactivé" : "Véhicule activé",
        description: vehicle.is_active 
          ? "Ce véhicule ne recevra plus de missions"
          : "Ce véhicule est maintenant disponible",
      });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleAddVehicle = async () => {
    if (!formData.name || !formData.vehicle_type) {
      toast({ title: "Veuillez remplir les champs requis", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("vehicles")
        .insert({
          gp_id: gpProfile.id,
          name: formData.name,
          vehicle_type: formData.vehicle_type,
          transport_category: "routier",
          max_weight_kg: formData.max_weight_kg ? parseFloat(formData.max_weight_kg) : null,
          max_volume_m3: formData.max_volume_m3 ? parseFloat(formData.max_volume_m3) : null,
          is_active: true,
        });

      if (error) throw error;

      toast({ title: "✅ Véhicule ajouté" });
      setShowAddDialog(false);
      setFormData({ name: "", vehicle_type: "camion", max_weight_kg: "", max_volume_m3: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId);

      if (error) throw error;
      toast({ title: "Véhicule supprimé" });
      loadData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) {
    return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  }

  if (!gpProfile) return null;

  const activeCount = vehicles.filter(v => v.is_active).length;

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={0}
      activeOrdersCount={0}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Ma flotte</h2>
            <p className="text-xs text-muted-foreground">
              {activeCount}/{vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewDialog(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Vue client
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un véhicule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom / Identifiant *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Camion Mercedes 01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de véhicule *</Label>
                    <Select 
                      value={formData.vehicle_type} 
                      onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Poids max (kg)</Label>
                      <Input
                        type="number"
                        value={formData.max_weight_kg}
                        onChange={(e) => setFormData({ ...formData, max_weight_kg: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Volume max (m³)</Label>
                      <Input
                        type="number"
                        value={formData.max_volume_m3}
                        onChange={(e) => setFormData({ ...formData, max_volume_m3: e.target.value })}
                        placeholder="20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                      Annuler
                    </Button>
                    <Button className="flex-1" onClick={handleAddVehicle} disabled={saving}>
                      {saving ? "Ajout..." : "Ajouter"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">Aucun véhicule enregistré</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter mon premier véhicule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {vehicles.map((vehicle) => {
                const isExpanded = expandedId === vehicle.id;
                const typeLabel = VEHICLE_TYPES.find(t => t.value === vehicle.vehicle_type)?.label || vehicle.vehicle_type;

                return (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => setExpandedId(isExpanded ? null : vehicle.id)}
                    >
                      <Card className={!vehicle.is_active ? "opacity-60" : ""}>
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center
                                ${vehicle.is_active ? 'bg-primary/10' : 'bg-muted'}
                              `}>
                                <Truck className={`w-5 h-5 ${vehicle.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <p className="font-medium">{vehicle.name}</p>
                                <p className="text-xs text-muted-foreground">{typeLabel}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Active Switch */}
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={vehicle.is_active}
                                  onCheckedChange={() => toggleVehicleActive(vehicle)}
                                />
                                <Badge variant={vehicle.is_active ? "success" : "secondary"} className="text-xs">
                                  {vehicle.is_active ? "Actif" : "Inactif"}
                                </Badge>
                              </div>

                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                        </CardHeader>

                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-3">
                            {/* Specs */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                              {vehicle.max_weight_kg && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Poids max</p>
                                  <p className="font-medium">{vehicle.max_weight_kg.toLocaleString()} kg</p>
                                </div>
                              )}
                              {vehicle.max_volume_m3 && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Volume max</p>
                                  <p className="font-medium">{vehicle.max_volume_m3} m³</p>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2 border-t">
                              <Button variant="outline" size="sm" className="flex-1" disabled>
                                <Edit2 className="w-4 h-4 mr-1" />
                                Modifier
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Info Banner */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                  Gérez votre flotte
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Sans véhicule actif, vous ne recevrez pas de missions. 
                  Activez au moins un véhicule pour être visible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Vue client
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Voici comment vos véhicules apparaissent aux clients :
              </p>
              
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold">{gpProfile.business_name}</p>
                      <p className="text-xs text-muted-foreground">Transport Routier</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Flotte disponible :</p>
                    <div className="flex flex-wrap gap-2">
                      {vehicles.filter(v => v.is_active).map((v) => (
                        <Badge key={v.id} variant="outline" className="text-xs">
                          {VEHICLE_TYPES.find(t => t.value === v.vehicle_type)?.label}
                          {v.max_weight_kg && ` • ${v.max_weight_kg}kg`}
                        </Badge>
                      ))}
                      {vehicles.filter(v => v.is_active).length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          Aucun véhicule actif
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full" onClick={() => setShowPreviewDialog(false)}>
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoutierDashboardLayout>
  );
}
