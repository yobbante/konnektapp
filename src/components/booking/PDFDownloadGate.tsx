/**
 * PDFDownloadGate — Full-screen blocking gate for PDF download
 * 
 * PRV §8: PDF OBLIGATOIRE (ANTI-ERREUR TERRAIN)
 * - Shows ONLY the PDF download UI, nothing else
 * - Blocks until PDF is downloaded
 * - Once downloaded, calls onUnlocked to reveal the confirmation
 */
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Download, CheckCircle, AlertTriangle, Package, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import QRCodeLib from "react-qr-code";

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
  onUnlocked: () => void;
}

export function PDFDownloadGate({ order, onUnlocked }: PDFDownloadGateProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const storageKey = `konnekt_label_downloaded_${order.orderId}`;
  const [downloaded, setDownloaded] = useState(() => {
    // If already downloaded before, skip the gate immediately
    return localStorage.getItem(storageKey) === "1";
  });
  const qrRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  // If already downloaded on mount, unlock immediately without rendering the gate
  useEffect(() => {
    if (localStorage.getItem(storageKey) === "1") {
      onUnlocked();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, order.orderNumber, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          background: "#ffffff",
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [order.orderNumber]);

  // Auto-unlock after download with short delay
  useEffect(() => {
    if (downloaded) {
      const timer = setTimeout(() => onUnlocked(), 2000);
      return () => clearTimeout(timer);
    }
  }, [downloaded, onUnlocked]);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      let y = margin;

      // Header
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, pageWidth, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("KONNEKT", margin, 14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Feuille logistique", pageWidth - margin, 10, { align: "right" });
      doc.text("À coller sur le colis", pageWidth - margin, 15, { align: "right" });
      y = 28;

      // Order info box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 45, 3, 3, "FD");

      const infoX = margin + 5;
      let infoY = y + 7;

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("N° COMMANDE", infoX, infoY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      infoY += 6;
      doc.text(order.orderNumber, infoX, infoY);

      infoY += 8;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("CLIENT", infoX, infoY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      infoY += 5;
      doc.text(order.clientName || "—", infoX, infoY);

      infoY += 7;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("TRANSPORTEUR (GP)", infoX, infoY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      infoY += 5;
      doc.text(order.gpName || "—", infoX, infoY);

      const rightX = pageWidth / 2 + 5;
      let rightY = y + 7;

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("TRAJET", rightX, rightY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      rightY += 6;
      doc.text(`${order.originCity} → ${order.destinationCity}`, rightX, rightY);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      rightY += 5;
      doc.text(`${order.originCountry} → ${order.destinationCountry}`, rightX, rightY);

      rightY += 8;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.text("POIDS DÉCLARÉ", rightX, rightY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      rightY += 6;
      doc.text(`${order.weight} kg`, rightX, rightY);

      if (order.pickupDate) {
        rightY += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("DATE DÉPÔT", rightX, rightY);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        rightY += 5;
        doc.text(new Date(order.pickupDate).toLocaleDateString("fr-FR"), rightX, rightY);
      }

      y += 50;

      // QR Code
      const qrSvg = qrRef.current?.querySelector("svg");
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            if (ctx) {
              ctx.fillStyle = "white";
              ctx.fillRect(0, 0, 300, 300);
              ctx.drawImage(img, 0, 0, 300, 300);
            }
            resolve();
          };
          img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
        });
        const qrDataUrl = canvas.toDataURL("image/png");
        const qrSize = 45;
        const qrX = (pageWidth - qrSize) / 2;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("QR CODE — SCAN OBLIGATOIRE", pageWidth / 2, y + 3, { align: "center" });
        y += 6;
        doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);
        y += qrSize + 3;
      }

      // Barcode
      if (barcodeCanvasRef.current) {
        const barcodeDataUrl = barcodeCanvasRef.current.toDataURL("image/png");
        const barcodeWidth = 80;
        const barcodeHeight = 18;
        const barcodeX = (pageWidth - barcodeWidth) / 2;
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text("CODE-BARRES (BACKUP SCANNER PHYSIQUE)", pageWidth / 2, y + 2, { align: "center" });
        y += 4;
        doc.addImage(barcodeDataUrl, "PNG", barcodeX, y, barcodeWidth, barcodeHeight);
        y += barcodeHeight + 5;
      }

      // Description
      if (order.description) {
        doc.setFillColor(248, 248, 248);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, "FD");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        doc.text("CONTENU DÉCLARÉ", margin + 3, y + 4);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text(order.description.substring(0, 80), margin + 3, y + 9);
        y += 15;
      }

      // Mandatory mention
      doc.setFillColor(255, 240, 240);
      doc.setDrawColor(220, 50, 50);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, "FD");
      doc.setTextColor(180, 30, 30);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("⚠ MENTION OBLIGATOIRE", margin + 3, y + 5);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Ce document doit être collé sur le colis. Sans scan valide,", margin + 3, y + 10);
      doc.text("le colis n'est pas pris en charge. Tout porteur du QR est réputé mandaté.", margin + 3, y + 14);
      y += 22;

      // Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(6);
      doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")} — KONNEKT © ${new Date().getFullYear()}`,
        pageWidth / 2, y + 3, { align: "center" }
      );

      doc.save(`feuille-logistique-${order.orderNumber}.pdf`);
      localStorage.setItem(storageKey, "1");
      setDownloaded(true);
      toast({ title: "✅ Feuille logistique téléchargée" });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ title: "Erreur de génération", description: "Réessayez.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center"
        >
          {downloaded ? (
            <CheckCircle className="w-10 h-10 text-green-600" />
          ) : (
            <FileText className="w-10 h-10 text-amber-600" />
          )}
        </motion.div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {downloaded ? "Étiquette téléchargée !" : "Étiquette colis obligatoire"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {downloaded
              ? "Imprimez-la et collez-la sur votre colis. Redirection automatique…"
              : "Téléchargez votre feuille logistique avant de continuer. Ce document doit être imprimé et collé sur le colis."}
          </p>
        </div>

        {/* Warning */}
        {!downloaded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-400">
              <strong>Sans cette étiquette, aucun colis ne sera pris en charge.</strong>{" "}
              Le document contient le QR code et le code-barres nécessaires au scan.
            </p>
          </motion.div>
        )}

        {/* Order summary mini */}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Package className="w-3 h-3" /> {order.weight} kg
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            📍 {order.originCity} → {order.destinationCity}
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            <QrCode className="w-3 h-3" /> QR + Code-barres
          </Badge>
        </div>

        {/* Download button */}
        <Button
          className="w-full h-14 text-base gap-3"
          size="lg"
          onClick={generatePDF}
          disabled={generating || downloaded}
          variant={downloaded ? "outline" : "default"}
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Génération en cours…
            </>
          ) : downloaded ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              Téléchargée — redirection…
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Télécharger l'étiquette colis
            </>
          )}
        </Button>

        {downloaded && (
          <Button variant="ghost" size="sm" onClick={onUnlocked} className="text-xs text-muted-foreground">
            Voir ma confirmation maintenant
          </Button>
        )}
      </motion.div>

      {/* Hidden elements for PDF generation */}
      <div className="hidden">
        <div ref={qrRef}>
          <QRCodeLib value={order.orderNumber} size={300} level="H" />
        </div>
        <canvas ref={barcodeCanvasRef} />
      </div>
    </div>
  );
}
