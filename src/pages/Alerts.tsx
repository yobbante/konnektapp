import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Bell, Plus, Trash2, ToggleLeft, ToggleRight, 
  MapPin, DollarSign, Package, Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserAlert {
  id: string;
  alert_type: string;
  name: string;
  criteria: Record<string, any>;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

const ALERT_TYPES = [
  { value: "route", label: "Nouvelle route", icon: MapPin },
  { value: "price", label: "Baisse de prix", icon: DollarSign },
  { value: "offer", label: "Nouvelle offre", icon: Package },
];

export default function AlertsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [newAlert, setNewAlert] = useState({
    name: "",
    alert_type: "route",
    origin_city: "",
    destination_city: "",
    max_price: "",
    transport_type: "",
  });

  useEffect(() => {
    checkAuthAndLoadAlerts();
  }, []);

  const checkAuthAndLoadAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    await loadAlerts();
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.name.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez donner un nom à votre alerte",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const criteria: Record<string, any> = {};
      if (newAlert.origin_city) criteria.origin_city = newAlert.origin_city;
      if (newAlert.destination_city) criteria.destination_city = newAlert.destination_city;
      if (newAlert.max_price) criteria.max_price = parseInt(newAlert.max_price);
      if (newAlert.transport_type) criteria.transport_type = newAlert.transport_type;

      const { error } = await supabase.from("user_alerts").insert({
        user_id: user.id,
        name: newAlert.name.trim(),
        alert_type: newAlert.alert_type,
        criteria,
      });

      if (error) throw error;

      toast({ title: "Alerte créée avec succès" });
      setDialogOpen(false);
      setNewAlert({
        name: "",
        alert_type: "route",
        origin_city: "",
        destination_city: "",
        max_price: "",
        transport_type: "",
      });
      await loadAlerts();
    } catch (error: any) {
      console.error("Error creating alert:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("user_alerts")
        .update({ is_active: !isActive })
        .eq("id", alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error("Error toggling alert:", error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("user_alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;
      toast({ title: "Alerte supprimée" });
      await loadAlerts();
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const getAlertIcon = (type: string) => {
    const alertType = ALERT_TYPES.find((t) => t.value === type);
    const Icon = alertType?.icon || Bell;
    return <Icon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-xl font-bold">Mes alertes</h1>
            <p className="text-sm text-muted-foreground">
              Recevez des notifications personnalisées
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Créer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle alerte</DialogTitle>
              </DialogHeader>
              <form onSubmit={createAlert} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de l'alerte</Label>
                  <Input
                    placeholder="Ex: Dakar → Paris pas cher"
                    value={newAlert.name}
                    onChange={(e) =>
                      setNewAlert({ ...newAlert, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type d'alerte</Label>
                  <Select
                    value={newAlert.alert_type}
                    onValueChange={(v) =>
                      setNewAlert({ ...newAlert, alert_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ville départ</Label>
                    <Input
                      placeholder="Ex: Dakar"
                      value={newAlert.origin_city}
                      onChange={(e) =>
                        setNewAlert({ ...newAlert, origin_city: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ville arrivée</Label>
                    <Input
                      placeholder="Ex: Paris"
                      value={newAlert.destination_city}
                      onChange={(e) =>
                        setNewAlert({ ...newAlert, destination_city: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Prix maximum (FCFA/kg)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 5000"
                    value={newAlert.max_price}
                    onChange={(e) =>
                      setNewAlert({ ...newAlert, max_price: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Créer l'alerte"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {alerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Aucune alerte</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre première alerte pour être notifié
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une alerte
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={!alert.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            alert.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {getAlertIcon(alert.alert_type)}
                        </div>
                        <div>
                          <h3 className="font-medium">{alert.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {alert.criteria.origin_city && (
                              <Badge variant="outline" className="text-xs">
                                De: {alert.criteria.origin_city}
                              </Badge>
                            )}
                            {alert.criteria.destination_city && (
                              <Badge variant="outline" className="text-xs">
                                À: {alert.criteria.destination_city}
                              </Badge>
                            )}
                            {alert.criteria.max_price && (
                              <Badge variant="outline" className="text-xs">
                                Max: {alert.criteria.max_price} FCFA
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAlert(alert.id, alert.is_active)}
                        >
                          {alert.is_active ? (
                            <ToggleRight className="w-5 h-5 text-primary" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAlert(alert.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
