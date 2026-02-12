/**
 * RecipientField — Enhanced with saved recipients selector
 * Used in SmartBookingPage to link a recipient user
 */
import { useState, useEffect } from "react";
import { User, Search, CheckCircle, X, Users, ChevronDown, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

interface SavedRecipient {
  id: string;
  full_name: string;
  phone: string | null;
  recipient_user_id: string | null;
  is_favorite: boolean;
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
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    loadSavedRecipients();
  }, []);

  const loadSavedRecipients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("recipients")
      .select("id, full_name, phone, recipient_user_id, is_favorite")
      .eq("owner_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("full_name")
      .limit(20);
    setSavedRecipients(data || []);
  };

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

  const selectSavedRecipient = (r: SavedRecipient) => {
    onRecipientChange({
      name: r.full_name,
      phone: r.phone || "",
      userId: r.recipient_user_id,
    });
    if (r.recipient_user_id) {
      setSearchResult({ id: r.recipient_user_id, name: r.full_name });
    }
    setExpanded(true);
    setShowSaved(false);
  };

  const clearRecipient = () => {
    onRecipientChange({ name: "", phone: "", userId: null });
    setSearchResult(null);
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
        >
          <User className="w-4 h-4" />
          <span className="text-sm">Ajouter un destinataire</span>
        </button>
        {savedRecipients.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSaved(true)}
            className="flex items-center gap-2 px-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">{savedRecipients.length}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Destinataire
            </Label>
            <div className="flex items-center gap-1">
              {savedRecipients.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSaved(true)}>
                  <Users className="w-3.5 h-3.5" /> Carnet
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearRecipient}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <Input
            placeholder="Nom du destinataire"
            value={recipientName}
            onChange={(e) => onRecipientChange({ name: e.target.value, phone: recipientPhone, userId: recipientUserId })}
            className="h-10 rounded-xl text-sm"
          />

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

          {recipientPhone.length >= 8 && !searching && !searchResult && (
            <p className="text-xs text-muted-foreground">
              📱 Le destinataire recevra un lien de confirmation à la remise
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saved Recipients Sheet */}
      <Sheet open={showSaved} onOpenChange={setShowSaved}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[60vh]">
          <SheetHeader>
            <SheetTitle className="text-left flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Mes destinataires
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2 py-3 overflow-y-auto">
            {savedRecipients.map(r => (
              <button
                key={r.id}
                onClick={() => selectSavedRecipient(r)}
                className="w-full text-left p-3 rounded-xl border bg-card hover:border-primary/30 transition-all flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{r.full_name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.full_name}</span>
                    {r.is_favorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    {r.recipient_user_id && <Badge className="bg-primary/20 text-primary text-[10px] px-1">Konnekt</Badge>}
                  </div>
                  {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
