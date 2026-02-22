import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  MapPin, ArrowRight, Phone, Eye, ChevronDown, ChevronUp,
  Package, Truck, CheckCircle, Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  OrderStatus,
  getOrderStatusLabel,
  getOrderStatusColor,
} from "@/lib/transportTypes";
import { assertValidOrderStatus } from "@/lib/enumMappings";

interface Order {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  status: string;
  total_price: number;
  weight?: number;
  client_id?: string;
  description?: string;
  pickup_date?: string;
  delivery_date?: string;
  dimensions?: string;
}

interface ActiveOrderBarProps {
  order: Order;
  onRefresh?: () => void;
}

const statusOptions: { value: OrderStatus; label: string; icon: typeof Clock }[] = [
  { value: "accepted", label: "Acceptée", icon: CheckCircle },
  { value: "collected", label: "Collectée", icon: Package },
  { value: "in_transit", label: "En transit", icon: Truck },
  { value: "delivered", label: "Livrée", icon: CheckCircle },
];

export function ActiveOrderBar({ order, onRefresh }: ActiveOrderBarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientPhone, setClientPhone] = useState<string | null>(null);

  const currentStatus = order.status as OrderStatus;
  const statusConfig = statusOptions.find(s => s.value === currentStatus);

  const fetchClientPhone = async () => {
    if (!order.client_id) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", order.client_id)
      .maybeSingle();
    
    if (data?.phone) {
      setClientPhone(data.phone);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    console.log("=== ActiveOrderBar handleStatusChange ===");
    console.log("Order:", order.order_number);
    console.log("New Status (raw from Select):", newStatus, "| type:", typeof newStatus);
    
    setLoading(true);
    try {
      // CRITICAL: Validate enum value before DB operation
      const typedStatus = assertValidOrderStatus(newStatus);
      console.log("Validated status:", typedStatus);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("orders")
        .update({
          status: typedStatus,
          ...(typedStatus === "delivered" ? { actual_delivery_date: new Date().toISOString() } : {}),
        })
        .eq("id", order.id);

      if (error) throw error;

      const { error: historyError } = await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: typedStatus,
        changed_by: user.id,
        changed_by_type: "gp",
      });

      if (historyError) {
        console.error("History insert error:", historyError);
      }

      toast({
        title: "Statut mis à jour",
        description: `Mission marquée comme "${getOrderStatusLabel(typedStatus)}"`,
      });
      onRefresh?.();
    } catch (error: any) {
      const raw = error?.message || "Erreur inconnue";
      const lower = String(raw).toLowerCase();
      const friendly = (lower.includes("row level security") || lower.includes("permission denied"))
        ? "Accès refusé : cette commande n’est pas assignée à votre compte transporteur."
        : raw;

      toast({ title: "Erreur", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async () => {
    if (!clientPhone) {
      await fetchClientPhone();
    }
    if (clientPhone) {
      window.location.href = `tel:${clientPhone}`;
    } else {
      toast({ title: "Téléphone non disponible", variant: "destructive" });
    }
  };

  const handleViewDetails = () => {
    navigate(`/tracking?order=${order.order_number}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-primary/10 border-b border-primary/20"
    >
      {/* Main Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Route info */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-xs font-medium">
                <span className="truncate">{order.origin_city}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{order.destination_city}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{order.order_number}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Call Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleCall}
            >
              <Phone className="w-4 h-4" />
            </Button>

            {/* Look up Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchClientPhone}>
                  <Eye className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Détails de la mission</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-4 overflow-y-auto">
                  {/* Order Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Numéro</span>
                      <span className="font-mono font-medium">{order.order_number}</span>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">Trajet</span>
                      </div>
                      <p className="text-sm">
                        {order.origin_city}, {order.origin_country} → {order.destination_city}, {order.destination_country}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Poids</p>
                        <p className="font-medium">{order.weight || '-'} kg</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Prix</p>
                        <p className="font-medium">{order.total_price?.toLocaleString()} FCFA</p>
                      </div>
                    </div>

                    {order.dimensions && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Dimensions</p>
                        <p className="font-medium">{order.dimensions}</p>
                      </div>
                    )}

                    {order.description && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{order.description}</p>
                      </div>
                    )}

                    {/* Contact */}
                    {clientPhone && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Téléphone client</p>
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{clientPhone}</p>
                          <Button variant="outline" size="sm" onClick={handleCall}>
                            <Phone className="w-4 h-4 mr-1" />
                            Appeler
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Status Change */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">Statut actuel</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant={getOrderStatusColor(currentStatus) as any}>
                          {getOrderStatusLabel(currentStatus)}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2">Changer le statut</p>
                      <Select 
                        value={currentStatus} 
                        onValueChange={handleStatusChange}
                        disabled={loading || currentStatus === 'delivered'}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <option.icon className="w-4 h-4" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleViewDetails}
                    >
                      Voir suivi complet
                    </Button>
                    <Button 
                      variant="default" 
                      className="flex-1"
                      onClick={() => navigate(`/gp/messages?client=${order.client_id}`)}
                    >
                      Contacter client
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Expand/Collapse */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-primary/10"
          >
            <div className="px-4 py-3 space-y-3">
              {/* Quick status change */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Statut:</span>
                <Select 
                  value={currentStatus} 
                  onValueChange={handleStatusChange}
                  disabled={loading || currentStatus === 'delivered'}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-3 h-3" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleCall}>
                  <Phone className="w-3 h-3 mr-1" />
                  Appeler
                </Button>
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleViewDetails}>
                  <Eye className="w-3 h-3 mr-1" />
                  Suivi
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
