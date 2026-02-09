/**
 * RecipientField — Optional field to tag a Konnekt recipient
 * Used in SmartBookingPage to link a recipient user
 */
import { useState } from "react";
import { User, Search, CheckCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface RecipientFieldProps {
  recipientName: string;
  recipientPhone: string;
  recipientUserId: string | null;
  onRecipientChange: (data: {
    name: string;
    phone: string;
    userId: string | null;
  }) => void;
}

export function RecipientField({
  recipientName,
  recipientPhone,
  recipientUserId,
  onRecipientChange,
}: RecipientFieldProps) {
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const searchKonnektUser = async (phone: string) => {
    if (phone.length < 8) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (data) {
        setSearchResult({ id: data.user_id, name: data.full_name || "Utilisateur Konnekt" });
        onRecipientChange({
          name: data.full_name || recipientName,
          phone,
          userId: data.user_id,
        });
      } else {
        setSearchResult(null);
        onRecipientChange({ name: recipientName, phone, userId: null });
      }
    } catch {
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const clearRecipient = () => {
    onRecipientChange({ name: "", phone: "", userId: null });
    setSearchResult(null);
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
      >
        <User className="w-4 h-4" />
        <span className="text-sm">Ajouter un destinataire (optionnel)</span>
      </button>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Destinataire
          </Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearRecipient}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Nom du destinataire"
            value={recipientName}
            onChange={(e) => onRecipientChange({ name: e.target.value, phone: recipientPhone, userId: recipientUserId })}
            className="h-10 rounded-xl text-sm"
          />
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Input
              type="tel"
              placeholder="Téléphone du destinataire"
              value={recipientPhone}
              onChange={(e) => {
                onRecipientChange({ name: recipientName, phone: e.target.value, userId: null });
                setSearchResult(null);
              }}
              onBlur={(e) => searchKonnektUser(e.target.value)}
              className="h-10 rounded-xl text-sm pr-10"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Konnekt user found */}
        {searchResult && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">{searchResult.name}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Utilisateur Konnekt — suivi automatique</p>
            </div>
            <Badge className="bg-primary/20 text-primary text-[10px]">Konnekt</Badge>
          </div>
        )}

        {/* Not found info */}
        {recipientPhone.length >= 8 && !searching && !searchResult && (
          <p className="text-xs text-muted-foreground">
            📱 Le destinataire recevra un lien de confirmation à la remise
          </p>
        )}
      </CardContent>
    </Card>
  );
}