import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, QrCode, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { QRCodeScanner } from "./QRCodeScanner";

interface GPQRCodeTabProps {
  gpId: string;
  onScanComplete?: () => void;
}

/**
 * GP QR Code Tab - Unified scan interface for deposit and delivery
 */
export function GPQRCodeTab({ gpId, onScanComplete }: GPQRCodeTabProps) {
  const [activeTab, setActiveTab] = useState<"deposit" | "delivery">("deposit");

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Scanner QR Code</h2>
              <p className="text-sm text-muted-foreground">
                Confirmez dépôt ou livraison par scan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="deposit" className="flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" />
            <span>Dépôt</span>
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Livraison</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="mt-4">
          <QRCodeScanner 
            gpId={gpId} 
            scanType="deposit" 
            onComplete={onScanComplete}
          />
          
          <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Processus dépôt
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 pl-6 list-decimal">
              <li>Le client ou mandataire présente le QR</li>
              <li>Vous scannez et vérifiez le poids</li>
              <li>Ajustement automatique si différence</li>
              <li>Statut passe à "Colis reçu"</li>
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="mt-4">
          <QRCodeScanner 
            gpId={gpId} 
            scanType="delivery" 
            onComplete={onScanComplete}
          />
          
          <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Truck className="w-4 h-4 text-success" />
              Processus livraison
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 pl-6 list-decimal">
              <li>Le destinataire présente le QR</li>
              <li>Vous scannez pour confirmer</li>
              <li>Mission terminée automatiquement</li>
              <li>Paiement débloqué sous 24h</li>
            </ol>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
