import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "@/hooks/use-toast";

interface ReleaseEscrowButtonProps {
  orderId: string;
  escrowId: string;
  onReleased?: () => void;
}

export function ReleaseEscrowButton({ orderId, escrowId, onReleased }: ReleaseEscrowButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRelease = async () => {
    setLoading(true);
    try {
      // Update escrow status
      const { error: escrowError } = await supabase
        .from("escrow_transactions")
        .update({
          status: "released",
          released_at: new Date().toISOString(),
          release_reason: "Livraison confirmée par le client",
        })
        .eq("id", escrowId);

      if (escrowError) throw escrowError;

      // Update order payment status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ payment_status: "released" })
        .eq("id", orderId);

      if (orderError) throw orderError;

      toast({
        title: "Paiement libéré",
        description: "Le transporteur a reçu le paiement.",
      });

      onReleased?.();
    } catch (error: any) {
      console.error("Release error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de libérer le paiement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Confirmer réception
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la réception</AlertDialogTitle>
          <AlertDialogDescription>
            En confirmant la réception, vous libérez le paiement au transporteur. 
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleRelease}>
            Confirmer et libérer le paiement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
