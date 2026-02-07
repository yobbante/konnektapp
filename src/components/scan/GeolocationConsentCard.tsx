/**
 * GeolocationConsentCard - GP consent UI for passive geolocation tracking
 * 
 * Shown on GP scan page and settings. Explains the feature and collects consent.
 * Once active, shows last detected position and tracking status.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Globe, Shield, Zap, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Clock, CheckCircle, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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

interface GeolocationConsentCardProps {
  consentGiven: boolean;
  trackingActive: boolean;
  lastCountry: string | null;
  lastCity: string | null;
  lastCheckAt: string | null;
  loading: boolean;
  onGiveConsent: () => void;
  onToggleTracking: (active: boolean) => void;
  onRevokeConsent: () => void;
}

export function GeolocationConsentCard({
  consentGiven,
  trackingActive,
  lastCountry,
  lastCity,
  lastCheckAt,
  loading,
  onGiveConsent,
  onToggleTracking,
  onRevokeConsent,
}: GeolocationConsentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Not yet consented — show consent prompt
  if (!consentGiven) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              GeoTrack™ — Suivi automatique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Activez la géolocalisation passive pour que vos commandes changent de statut 
              <strong> automatiquement</strong> quand vous voyagez.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: Zap, text: "Statut \"En transit\" automatique au départ", color: "text-amber-500" },
                { icon: MapPin, text: "Statut \"Arrivé\" détecté à destination", color: "text-green-500" },
                { icon: Shield, text: "Vérification toutes les 60 min, batterie préservée", color: "text-blue-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-background/60">
                  <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                  <span className="text-xs">{item.text}</span>
                </div>
              ))}
            </div>

            <Button className="w-full gap-2" onClick={onGiveConsent}>
              <MapPin className="w-4 h-4" />
              Activer GeoTrack™
            </Button>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Vous pouvez désactiver à tout moment. Aucune donnée partagée avec des tiers.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Consented — show status card
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={trackingActive ? "border-green-200 bg-green-50/30" : "border-muted"}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${trackingActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
              <span className="text-sm font-semibold">GeoTrack™</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${trackingActive ? "border-green-300 text-green-700" : "text-muted-foreground"}`}
              >
                {trackingActive ? "Actif" : "En pause"}
              </Badge>
            </div>
            <Switch 
              checked={trackingActive} 
              onCheckedChange={onToggleTracking}
            />
          </div>

          {/* Last detection info */}
          {lastCountry && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/80 border border-border/50">
              <Globe className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{lastCity || "—"}, {lastCountry}</p>
                {lastCheckAt && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dernière vérif: {new Date(lastCheckAt).toLocaleString("fr-FR", { 
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" 
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expand toggle */}
          <button 
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Moins d'options" : "Options avancées"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    La géolocalisation vérifie votre position toutes les 60 minutes en arrière-plan. 
                    Les statuts de vos commandes actives sont mis à jour automatiquement.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-destructive hover:text-destructive gap-1"
                    onClick={() => setShowRevokeDialog(true)}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Révoquer le consentement
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Revoke Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver GeoTrack™ ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vos commandes ne seront plus mises à jour automatiquement. 
              Vous devrez changer les statuts manuellement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { onRevokeConsent(); setShowRevokeDialog(false); }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
