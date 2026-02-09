/**
 * PDFDownloadGate — Blocks navigation until logistics label is downloaded
 * 
 * PRV §8: PDF OBLIGATOIRE (ANTI-ERREUR TERRAIN)
 * - Shows a prominent download CTA
 * - Blocks the "continue" button until PDF is downloaded
 * - Clear messaging about the obligation
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogisticsLabelGenerator } from "@/components/logistics/LogisticsLabelGenerator";

interface PDFDownloadGateProps {
  order: {
    orderNumber: string;
    orderId: string;
    clientName: string;
    gpName: string;
    originCity: string;
    destinationCity: string;
    originCountry: string;
    destinationCountry: string;
    weight: number;
    description?: string | null;
    pickupDate?: string | null;
  };
  onContinue: () => void;
  continueLabel?: string;
}

export function PDFDownloadGate({ order, onContinue, continueLabel = "Continuer" }: PDFDownloadGateProps) {
  const [downloaded, setDownloaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Warning Banner */}
      {!downloaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-800 dark:text-amber-400">
              Étiquette colis obligatoire
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
              Ce document doit être imprimé et collé sur le colis. 
              Sans cette étiquette, aucun colis ne sera pris en charge.
            </p>
          </div>
        </motion.div>
      )}

      {/* Label Generator */}
      <LogisticsLabelGenerator
        order={order}
        onDownloaded={() => setDownloaded(true)}
        required={!downloaded}
      />

      {/* Continue Button — Blocked until download */}
      <Button
        className="w-full h-12 gap-2"
        onClick={onContinue}
        disabled={!downloaded}
      >
        {downloaded ? (
          <>
            <ArrowRight className="w-4 h-4" />
            {continueLabel}
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Téléchargez d'abord l'étiquette
          </>
        )}
      </Button>

      {downloaded && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-green-600 flex items-center justify-center gap-1"
        >
          <CheckCircle className="w-3 h-3" />
          Étiquette téléchargée — vous pouvez continuer
        </motion.p>
      )}
    </motion.div>
  );
}
