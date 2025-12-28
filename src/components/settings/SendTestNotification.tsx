import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Bell, Loader2 } from "lucide-react";

interface SendTestNotificationProps {
  userId: string | null;
}

export function SendTestNotification({ userId }: SendTestNotificationProps) {
  const [sending, setSending] = useState(false);

  const sendTestNotification = async () => {
    if (!userId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour envoyer une notification test.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "🔔 Notification test",
          message: "Ceci est une notification test pour vérifier le fonctionnement en temps réel. Si vous voyez cette notification, tout fonctionne correctement !",
          type: "system",
        });

      if (error) throw error;

      toast({
        title: "Notification envoyée",
        description: "Vérifiez votre icône de notification pour voir le compteur se mettre à jour.",
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification test.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={sendTestNotification}
      disabled={sending || !userId}
      className="gap-2"
    >
      {sending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Envoi...
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          Envoyer une notification test
        </>
      )}
    </Button>
  );
}
