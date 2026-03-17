import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Edit2, MessageSquare, Save, Eye, EyeOff,
  Sparkles, Copy, CheckCircle, Settings2, Zap, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
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
import { cn } from "@/lib/utils";

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

// Template categories with visual distinction
const CATEGORIES = [
  { value: "auto_booking", label: "Reservation auto", icon: "", color: "bg-blue-500" },
  { value: "auto_acceptance", label: "Acceptation auto", icon: "", color: "bg-green-500" },
  { value: "auto_status", label: "Changement statut", icon: "", color: "bg-amber-500" },
  { value: "auto_delivery", label: "Livraison", icon: "", color: "bg-purple-500" },
  { value: "status", label: "Statut commande", icon: "", color: "bg-slate-500" },
  { value: "info", label: "Information", icon: "", color: "bg-cyan-500" },
  { value: "greeting", label: "Accueil", icon: "", color: "bg-pink-500" },
  { value: "confirmation", label: "Confirmation", icon: "", color: "bg-emerald-500" },
  { value: "problem", label: "Probleme", icon: "", color: "bg-red-500" },
];

const SENDER_TYPES = [
  { value: "system", label: "Systeme (auto)", icon: "" },
  { value: "gp", label: "Transporteur", icon: "" },
  { value: "client", label: "Client", icon: "" },
  { value: "admin", label: "Admin", icon: "" },
];

// Available variables for templates
const TEMPLATE_VARIABLES = [
  { key: "{{gpName}}", description: "Nom du transporteur" },
  { key: "{{orderNumber}}", description: "Numéro de commande" },
  { key: "{{originCity}}", description: "Ville de départ" },
  { key: "{{destinationCity}}", description: "Ville d'arrivée" },
  { key: "{{depositAddress}}", description: "Adresse de dépôt" },
  { key: "{{phone}}", description: "Téléphone" },
  { key: "{{whatsapp}}", description: "WhatsApp" },
  { key: "{{wazeLink}}", description: "Lien Waze" },
  { key: "{{status}}", description: "Statut actuel" },
];

export function AdminAutoMessageTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewMode, setPreviewMode] = useState(false);
  
  const [formData, setFormData] = useState({
    template_key: "",
    category: "auto_acceptance",
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
      toast({ 
        title: template.is_active ? "Template désactivé" : "Template activé",
        description: template.template_key 
      });
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

  const handleDuplicate = (template: MessageTemplate) => {
    setFormData({
      template_key: `${template.template_key}_copy`,
      category: template.category,
      sender_type: template.sender_type,
      content: template.content,
      icon: template.icon || "",
      sort_order: (template.sort_order + 1).toString(),
    });
    setShowAddDialog(true);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + variable
    }));
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
    setFormData({ template_key: "", category: "auto_acceptance", sender_type: "gp", content: "", icon: "", sort_order: "0" });
    setEditingTemplate(null);
    setShowAddDialog(false);
  };

  // Filter templates by category
  const filteredTemplates = activeCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  // Group templates by category for display
  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  // Preview sample data
  const previewData = {
    gpName: "Transport Express",
    orderNumber: "ORD-ABC123",
    originCity: "Paris",
    destinationCity: "Dakar",
    depositAddress: "123 Rue de la Paix, Paris",
    phone: "+33 6 12 34 56 78",
    whatsapp: "+33612345678",
    wazeLink: "https://waze.com/ul?q=123+Rue+de+la+Paix",
    status: "En transit",
  };

  const renderPreview = (content: string) => {
    let preview = content;
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return preview;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-5 h-5 text-amber-500" />
              Messages automatiques
            </CardTitle>
            <CardDescription className="mt-1">
              Configuration des messages envoyés automatiquement par le système
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-2"
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? "Édition" : "Aperçu"}
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau template
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Category Filter Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs px-3">
              Tous ({templates.length})
            </TabsTrigger>
            {CATEGORIES.filter(c => c.value.startsWith("auto_")).map(cat => {
              const count = templates.filter(t => t.category === cat.value).length;
              return (
                <TabsTrigger key={cat.value} value={cat.value} className="text-xs px-3 gap-1">
                  <span>{cat.icon}</span>
                  {cat.label}
                  {count > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{count}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Templates List */}
        {Object.keys(groupedTemplates).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Aucun template dans cette catégorie</p>
            <p className="text-sm mt-1">Créez un nouveau template pour commencer</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
              const catConfig = CATEGORIES.find(c => c.value === category);
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-white text-xs", catConfig?.color || "bg-slate-500")}>
                      {catConfig?.icon || "📝"}
                    </div>
                    <h4 className="font-semibold text-sm">
                      {catConfig?.label || category}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {categoryTemplates.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {categoryTemplates.map((template) => (
                        <motion.div
                          key={template.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            "group relative p-4 rounded-xl border transition-all",
                            template.is_active 
                              ? "border-border bg-card hover:shadow-md" 
                              : "border-border bg-muted/30 opacity-60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs gap-1">
                                  {SENDER_TYPES.find(s => s.value === template.sender_type)?.icon}
                                  {SENDER_TYPES.find(s => s.value === template.sender_type)?.label}
                                </Badge>
                                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                  {template.template_key}
                                </code>
                                {!template.is_active && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Inactif
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">
                                {previewMode ? renderPreview(template.content) : template.content}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Switch
                                checked={template.is_active}
                                onCheckedChange={() => handleToggle(template)}
                                className="mr-2"
                              />
                              <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)} title="Dupliquer">
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(template)} title="Modifier">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(template.id)} title="Supprimer">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTemplate ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingTemplate ? "Modifier le template" : "Nouveau template automatique"}
            </DialogTitle>
            <DialogDescription>
              Configurez le contenu et les conditions d'envoi du message
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Clé unique (identifiant technique) *</Label>
                <Input
                  placeholder="Ex: auto_acceptance_gp"
                  value={formData.template_key}
                  onChange={(e) => setFormData({ ...formData, template_key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          {c.icon} {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Envoyé par</Label>
                <Select value={formData.sender_type} onValueChange={(v) => setFormData({ ...formData, sender_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENDER_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          {s.icon} {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variables Helper */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Variables disponibles (cliquez pour insérer)</p>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_VARIABLES.map((v) => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-mono"
                    onClick={() => insertVariable(v.key)}
                    type="button"
                  >
                    {v.key}
                  </Button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <Label>Contenu du message *</Label>
              <Textarea
                placeholder="Écrivez votre message ici... Utilisez les variables ci-dessus pour personnaliser."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supporté: Markdown, liens, emojis. Utilisez **texte** pour le gras.
              </p>
            </div>

            {/* Preview */}
            {formData.content && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" />
                  Aperçu du message
                </Label>
                <div className="p-4 bg-muted/30 rounded-lg border text-sm whitespace-pre-wrap">
                  {renderPreview(formData.content)}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icône (emoji)</Label>
                <Input
                  placeholder="📦"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="text-center text-2xl"
                />
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
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              {editingTemplate ? "Mettre à jour" : "Créer le template"}
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
              Cette action est irréversible. Le template ne sera plus disponible pour les messages automatiques.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
