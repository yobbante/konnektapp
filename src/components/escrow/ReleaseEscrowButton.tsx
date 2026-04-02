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
      const { data, error } = await supabase.functions.invoke("release-funds-v2", {
        body: {
          order_id: orderId,
          idempotency_key: `client_release:${orderId}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Paiement libéré",
        description: "Le transporteur a reçu le paiement.",
      });

      onReleased?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible de libérer le paiement";
      toast({
        title: "Erreur",
        description: message,
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
