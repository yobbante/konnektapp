import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, AlertTriangle, Truck, MapPin, Package,
  HelpCircle, Clock, Calendar, Search, Heart, AlertCircle,
  MessageSquare, ChevronDown, ChevronUp, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MessageTemplate {
  id: string;
  sender_type: string;
  category: string;
  template_key: string;
  content: string;
  icon: string | null;
  sort_order: number;
}

interface MessageTemplatesProps {
  userType: "client" | "gp";
  onSelectTemplate: (content: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "check-circle": CheckCircle,
  "alert-triangle": AlertTriangle,
  "truck": Truck,
  "map-pin": MapPin,
  "package-check": Package,
  "help-circle": HelpCircle,
  "clock": Clock,
  "calendar": Calendar,
  "search": Search,
  "heart": Heart,
  "alert-circle": AlertCircle,
};

// Category labels and colors
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  status_update: { label: "Mise à jour", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  question: { label: "Question", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  info: { label: "Info", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  issue: { label: "Problème", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
};

export function MessageTemplates({ 
  userType, 
  onSelectTemplate,
  isExpanded = false,
  onToggleExpand
}: MessageTemplatesProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [userType]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("is_active", true)
        .or(`sender_type.eq.${userType},sender_type.eq.both`)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading message templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(templates.map(t => t.category)));
  const filteredTemplates = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  const handleSelectTemplate = (template: MessageTemplate) => {
    onSelectTemplate(template.content);
    // Optionally collapse after selection
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  if (loading) return null;

  return (
    <div className="border-t border-border bg-muted/30">
      {/* Toggle button */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Messages rapides
          </span>
          <Badge variant="secondary" className="text-xs">
            {templates.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* Category filters */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs h-7"
                >
                  Tous
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="text-xs h-7"
                  >
                    {CATEGORY_CONFIG[category]?.label || category}
                  </Button>
                ))}
              </div>

              {/* Template list */}
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {filteredTemplates.map((template) => {
                  const IconComponent = template.icon ? ICON_MAP[template.icon] : MessageSquare;
                  const categoryConfig = CATEGORY_CONFIG[template.category];

                  return (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectTemplate(template)}
                      className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className={cn(
                        "p-2 rounded-full",
                        categoryConfig?.color || "bg-muted"
                      )}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {template.content}
                        </p>
                      </div>
                      <Send className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
