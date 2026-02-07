import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Shield, Save, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InsuranceTier {
  id: string;
  category: string;
  label: string;
  max_declared_value: number;
  insurance_fee: number;
  is_active: boolean;
  sort_order: number;
}

export function AdminInsuranceTiers() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<InsuranceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<InsuranceTier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    category: "",
    label: "",
    max_declared_value: "",
    insurance_fee: "",
    sort_order: "0",
  });

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("insurance_tiers")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error("Error loading insurance tiers:", error);
      toast({ title: "Erreur", description: "Impossible de charger les paliers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.category || !formData.label || !formData.max_declared_value || !formData.insurance_fee) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    try {
      const tierData = {
        category: formData.category,
        label: formData.label,
        max_declared_value: parseInt(formData.max_declared_value),
        insurance_fee: parseInt(formData.insurance_fee),
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: true,
      };

      if (editingTier) {
        const { error } = await supabase
          .from("insurance_tiers")
          .update(tierData)
          .eq("id", editingTier.id);
        if (error) throw error;
        toast({ title: "✅ Palier mis à jour" });
      } else {
        const { error } = await supabase
          .from("insurance_tiers")
          .insert(tierData);
        if (error) throw error;
        toast({ title: "✅ Palier ajouté" });
      }

      resetForm();
      loadTiers();
    } catch (error) {
      console.error("Error saving tier:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  };

  const handleToggle = async (tier: InsuranceTier) => {
    try {
      const { error } = await supabase
        .from("insurance_tiers")
        .update({ is_active: !tier.is_active })
        .eq("id", tier.id);

      if (error) throw error;
      loadTiers();
    } catch (error) {
      console.error("Error toggling tier:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("insurance_tiers")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "✅ Palier supprimé" });
      setDeleteId(null);
      loadTiers();
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const openEdit = (tier: InsuranceTier) => {
    setEditingTier(tier);
    setFormData({
      category: tier.category,
      label: tier.label,
      max_declared_value: tier.max_declared_value.toString(),
      insurance_fee: tier.insurance_fee.toString(),
      sort_order: tier.sort_order.toString(),
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ category: "", label: "", max_declared_value: "", insurance_fee: "", sort_order: "0" });
    setEditingTier(null);
    setShowAddDialog(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Paliers d'assurance Konnekt
        </CardTitle>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun palier configuré</p>
        ) : (
          tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                tier.is_active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/50"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={tier.is_active ? "default" : "secondary"}>{tier.category}</Badge>
                  <span className="font-medium">{tier.label}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Valeur max: {tier.max_declared_value.toLocaleString()} FCFA • 
                  Prime: {tier.insurance_fee.toLocaleString()} FCFA
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tier.is_active}
                  onCheckedChange={() => handleToggle(tier)}
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(tier)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(tier.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? "Modifier le palier" : "Ajouter un palier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie *</Label>
                <Input
                  placeholder="Ex: alimentaire"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div>
                <Label>Libellé *</Label>
                <Input
                  placeholder="Ex: Produits alimentaires"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valeur max déclarée (FCFA) *</Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={formData.max_declared_value}
                  onChange={(e) => setFormData({ ...formData, max_declared_value: e.target.value })}
                />
              </div>
              <div>
                <Label>Prime d'assurance (FCFA) *</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={formData.insurance_fee}
                  onChange={(e) => setFormData({ ...formData, insurance_fee: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              {editingTier ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce palier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
