import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS, assertValidOrderStatus } from "@/lib/enumMappings";

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: string;
  onCancelled?: () => void;
}

export function CancelOrderButton({ orderId, orderStatus, onCancelled }: CancelOrderButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Only allow cancellation for pending orders
  if (orderStatus !== "pending") {
    return null;
  }

  const handleCancel = async () => {
    setLoading(true);
    try {
      // CRITICAL: Validate enum value before DB operation
      const validStatus = assertValidOrderStatus(ORDER_STATUS.cancelled);
      
      const { error } = await supabase
        .from("orders")
        .update({ status: validStatus })
        .eq("id", orderId)
        .eq("status", ORDER_STATUS.pending); // Double-check it's still pending

      if (error) throw error;

      toast({
        title: "Commande annulée",
        description: "Votre commande a été annulée avec succès",
      });

      onCancelled?.();
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la commande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={loading}>
          <X className="w-4 h-4 mr-1" />
          Annuler
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. La commande sera définitivement annulée 
            et le transporteur sera notifié.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Non, garder</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={loading}>
            {loading ? "Annulation..." : "Oui, annuler"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
