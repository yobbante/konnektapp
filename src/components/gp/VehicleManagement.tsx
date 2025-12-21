import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Truck, Plane, Ship, Zap, Briefcase, Building2, Edit2, Trash2, 
  Check, X, ChevronDown, ChevronUp, Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  TransportCategory, 
  vehicleTypes, 
  getVehicleTypesByCategory, 
  getCategoryLabel, 
  getCategoryIcon,
  getSpecFields,
  specFieldConfigs,
  VehicleTypeConfig,
  SpecFieldConfig
} from "@/lib/vehicleTypes";

interface Vehicle {
  id: string;
  name: string;
  vehicle_type: string;
  transport_category: string;
  max_weight_kg: number | null;
  max_volume_m3: number | null;
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  specifications: Record<string, any> | null;
  is_active: boolean;
  photo_url: string | null;
}

interface VehicleManagementProps {
  gpId: string;
  gpType: string;
  onVehiclesChange?: (vehicles: Vehicle[]) => void;
}

export function VehicleManagement({ gpId, gpType, onVehiclesChange }: VehicleManagementProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadVehicles();
  }, [gpId]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("gp_id", gpId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mappedData = (data || []).map(v => ({
        ...v,
        specifications: (v.specifications as Record<string, any>) || {},
      }));
      setVehicles(mappedData);
      onVehiclesChange?.(mappedData);
    } catch (error) {
      console.error("Error loading vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId);

      if (error) throw error;
      toast({ title: "Véhicule supprimé" });
      loadVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const toggleActive = async (vehicle: Vehicle) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ is_active: !vehicle.is_active })
        .eq("id", vehicle.id);

      if (error) throw error;
      loadVehicles();
    } catch (error) {
      console.error("Error toggling vehicle:", error);
    }
  };

  const getIcon = (category: string) => {
    const icons: Record<string, typeof Truck> = {
      routier: Truck,
      aerien: Plane,
      maritime: Ship,
      express: Zap,
      voyageur: Briefcase,
      agence: Building2,
    };
    return icons[category] || Package;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Mes véhicules / équipements</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un véhicule</DialogTitle>
            </DialogHeader>
            <VehicleForm 
              gpId={gpId} 
              defaultCategory={gpType as TransportCategory}
              onSuccess={() => {
                setShowAddDialog(false);
                loadVehicles();
              }}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Aucun véhicule enregistré</p>
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter mon premier véhicule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle) => {
            const Icon = getIcon(vehicle.transport_category);
            const isExpanded = expandedId === vehicle.id;
            
            return (
              <Collapsible 
                key={vehicle.id} 
                open={isExpanded} 
                onOpenChange={() => setExpandedId(isExpanded ? null : vehicle.id)}
              >
                <Card className={!vehicle.is_active ? "opacity-60" : ""}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{vehicle.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {vehicle.vehicle_type.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={vehicle.is_active ? "success" : "secondary"}>
                          {vehicle.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Capacity info */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {vehicle.max_weight_kg && (
                          <div>
                            <span className="text-muted-foreground">Poids max:</span>
                            <span className="ml-1 font-medium">{vehicle.max_weight_kg} kg</span>
                          </div>
                        )}
                        {vehicle.max_volume_m3 && (
                          <div>
                            <span className="text-muted-foreground">Volume:</span>
                            <span className="ml-1 font-medium">{vehicle.max_volume_m3} m³</span>
                          </div>
                        )}
                      </div>

                      {/* Specifications */}
                      {Object.keys(vehicle.specifications || {}).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(vehicle.specifications || {}).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {specFieldConfigs[key]?.label || key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={vehicle.is_active} 
                            onCheckedChange={() => toggleActive(vehicle)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {vehicle.is_active ? "Disponible" : "Indisponible"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingVehicle(vehicle)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Modifier le véhicule</DialogTitle>
                              </DialogHeader>
                              <VehicleForm 
                                gpId={gpId}
                                vehicle={vehicle}
                                onSuccess={() => {
                                  setEditingVehicle(null);
                                  loadVehicles();
                                }}
                                onCancel={() => setEditingVehicle(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(vehicle.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Vehicle Form Component
interface VehicleFormProps {
  gpId: string;
  vehicle?: Vehicle;
  defaultCategory?: TransportCategory;
  onSuccess: () => void;
  onCancel: () => void;
}

function VehicleForm({ gpId, vehicle, defaultCategory, onSuccess, onCancel }: VehicleFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<TransportCategory>(
    (vehicle?.transport_category as TransportCategory) || defaultCategory || "routier"
  );
  const [vehicleType, setVehicleType] = useState(vehicle?.vehicle_type || "");
  const [name, setName] = useState(vehicle?.name || "");
  const [maxWeight, setMaxWeight] = useState<string>(vehicle?.max_weight_kg?.toString() || "");
  const [maxVolume, setMaxVolume] = useState<string>(vehicle?.max_volume_m3?.toString() || "");
  const [specs, setSpecs] = useState<Record<string, any>>(vehicle?.specifications || {});

  const availableTypes = getVehicleTypesByCategory(category);
  const specFields = vehicleType ? getSpecFields(vehicleType) : [];

  useEffect(() => {
    // Reset vehicle type when category changes
    if (!vehicle && availableTypes.length > 0 && !availableTypes.find(t => t.value === vehicleType)) {
      setVehicleType(availableTypes[0].value);
    }
  }, [category]);

  const handleSave = async () => {
    if (!name || !vehicleType) {
      toast({ title: "Veuillez remplir tous les champs requis", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const data = {
        gp_id: gpId,
        name,
        vehicle_type: vehicleType,
        transport_category: category,
        max_weight_kg: maxWeight ? parseFloat(maxWeight) : null,
        max_volume_m3: maxVolume ? parseFloat(maxVolume) : null,
        specifications: specs,
      };

      if (vehicle) {
        const { error } = await supabase
          .from("vehicles")
          .update(data)
          .eq("id", vehicle.id);
        if (error) throw error;
        toast({ title: "Véhicule mis à jour" });
      } else {
        const { error } = await supabase
          .from("vehicles")
          .insert(data);
        if (error) throw error;
        toast({ title: "Véhicule ajouté" });
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving vehicle:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateSpec = (key: string, value: any) => {
    setSpecs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <div className="space-y-2">
        <Label>Catégorie de transport</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as TransportCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(vehicleTypes).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {getCategoryLabel(cat as TransportCategory)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle Type */}
      <div className="space-y-2">
        <Label>Type de véhicule/équipement</Label>
        <Select value={vehicleType} onValueChange={setVehicleType}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label>Nom / Identifiant</Label>
        <Input 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Camion Mercedes 01, Vol Paris-Dakar..."
        />
      </div>

      {/* Capacity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Poids max (kg)</Label>
          <Input 
            type="number"
            value={maxWeight}
            onChange={(e) => setMaxWeight(e.target.value)}
            placeholder="5000"
          />
        </div>
        <div className="space-y-2">
          <Label>Volume max (m³)</Label>
          <Input 
            type="number"
            value={maxVolume}
            onChange={(e) => setMaxVolume(e.target.value)}
            placeholder="20"
          />
        </div>
      </div>

      {/* Dynamic Spec Fields */}
      {specFields.length > 0 && (
        <div className="space-y-3">
          <Label className="text-muted-foreground">Caractéristiques spécifiques</Label>
          {specFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-sm">{field.label}</Label>
              {field.type === "select" ? (
                <Select 
                  value={specs[field.key] || ""} 
                  onValueChange={(v) => updateSpec(field.key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input 
                    type={field.type}
                    value={specs[field.key] || ""}
                    onChange={(e) => updateSpec(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1"
                  />
                  {field.unit && (
                    <span className="flex items-center text-sm text-muted-foreground px-2">
                      {field.unit}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? (
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : vehicle ? (
            "Mettre à jour"
          ) : (
            "Ajouter"
          )}
        </Button>
      </div>
    </div>
  );
}
