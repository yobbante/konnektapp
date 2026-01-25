import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, MessageSquare, Save, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface MessageTemplate {
  id: string;
  template_key: string;
  category: string;
  sender_type: string;
  content: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { value: "status", label: "Statut de commande" },
  { value: "info", label: "Demande d'information" },
  { value: "greeting", label: "Accueil" },
  { value: "confirmation", label: "Confirmation" },
  { value: "problem", label: "Problème" },
];

const SENDER_TYPES = [
  { value: "gp", label: "Transporteur (GP)" },
  { value: "client", label: "Client" },
  { value: "both", label: "Les deux" },
];

export function AdminMessageTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    template_key: "",
    category: "status",
    sender_type: "gp",
    content: "",
    icon: "",
    sort_order: "0",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({ title: "Erreur", description: "Impossible de charger les templates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.template_key || !formData.content) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    try {
      const templateData = {
        template_key: formData.template_key,
        category: formData.category,
        sender_type: formData.sender_type,
        content: formData.content,
        icon: formData.icon || null,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: true,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("message_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast({ title: "✅ Template mis à jour" });
      } else {
        const { error } = await supabase
          .from("message_templates")
          .insert(templateData);
        if (error) throw error;
        toast({ title: "✅ Template ajouté" });
      }

      resetForm();
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  };

  const handleToggle = async (template: MessageTemplate) => {
    try {
      const { error } = await supabase
        .from("message_templates")
        .update({ is_active: !template.is_active })
        .eq("id", template.id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error("Error toggling template:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "✅ Template supprimé" });
      setDeleteId(null);
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const openEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_key: template.template_key,
      category: template.category,
      sender_type: template.sender_type,
      content: template.content,
      icon: template.icon || "",
      sort_order: template.sort_order.toString(),
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ template_key: "", category: "status", sender_type: "gp", content: "", icon: "", sort_order: "0" });
    setEditingTemplate(null);
    setShowAddDialog(false);
  };

  const groupedTemplates = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  if (loading) {
    return <div className="flex items-center justify-center p-8">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Templates de messages prédéfinis
        </CardTitle>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.keys(groupedTemplates).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun template configuré</p>
        ) : (
          Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 uppercase">
                {CATEGORIES.find(c => c.value === category)?.label || category}
              </h4>
              <div className="space-y-2">
                {categoryTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      template.is_active ? "border-border bg-card" : "border-border bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {SENDER_TYPES.find(s => s.value === template.sender_type)?.label}
                        </Badge>
                        <code className="text-xs bg-muted px-1 rounded">{template.template_key}</code>
                      </div>
                      <p className="text-sm">{template.content}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => handleToggle(template)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(template.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Modifier le template" : "Ajouter un template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Clé unique *</Label>
              <Input
                placeholder="Ex: colis_recu"
                value={formData.template_key}
                onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Utilisé par</Label>
                <Select value={formData.sender_type} onValueChange={(v) => setFormData({ ...formData, sender_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENDER_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Contenu du message *</Label>
              <Textarea
                placeholder="Ex: Bonjour, j'ai bien reçu votre colis."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icône (emoji)</Label>
                <Input
                  placeholder="📦"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
              <div>
                <Label>Ordre</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              {editingTemplate ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
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
