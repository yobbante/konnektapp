/**
 * LogisticsLabelGenerator - PDF logistics sheet for parcels
 * 
 * Generates a printable PDF label containing:
 * - Konnekt logo header
 * - Client name, order number, destination
 * - GP name, weight
 * - QR Code (main) + Barcode (backup)
 * - Mandatory mention: "Ce document doit être collé sur le colis..."
 * 
 * Uses jsPDF for generation and JsBarcode for backup barcode.
 */
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, Download, Printer, QrCode, 
  CheckCircle, Package, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import QRCodeLib from "react-qr-code";

interface LabelData {
  orderNumber: string;
  orderId: string;
  clientName: string;
  gpName: string;
  recipientName?: string;
  recipientPhone?: string;
  originCity: string;
  destinationCity: string;
  originCountry: string;
  destinationCountry: string;
  weight: number;
  description?: string | null;
  pickupDate?: string | null;
}

interface LogisticsLabelGeneratorProps {
  order: LabelData;
  onDownloaded?: () => void;
  required?: boolean;
}

export function LogisticsLabelGenerator({ order, onDownloaded, required = false }: LogisticsLabelGeneratorProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate barcode on mount
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

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5", // A5 format for label
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      let y = margin;

      // ============ HEADER ============
      // Brand header background
      doc.setFillColor(30, 30, 30);
      doc.rect(0, 0, pageWidth, 22, "F");
      
      // Logo text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("KONNEKT", margin, 14);
      
      // Tagline
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Feuille logistique", pageWidth - margin, 10, { align: "right" });
      doc.text("A coller sur le colis", pageWidth - margin, 15, { align: "right" });
      
      y = 28;

      // ============ ORDER INFO BOX ============
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, pageWidth - margin * 2, order.recipientName ? 60 : 45, 3, 3, "FD");

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");

      const infoX = margin + 5;
      let infoY = y + 7;

      // Order number
      doc.text("N. COMMANDE", infoX, infoY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      infoY += 6;
      doc.text(order.orderNumber, infoX, infoY);

      // Client
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

      // GP
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

      // Recipient
      if (order.recipientName) {
        infoY += 7;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("DESTINATAIRE", infoX, infoY);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        infoY += 5;
        const recipientText = order.recipientName + (order.recipientPhone ? ` (${order.recipientPhone})` : "");
        doc.text(recipientText, infoX, infoY);
      }

      // Right column info
      const rightX = pageWidth / 2 + 5;
      let rightY = y + 7;

      // Route
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("TRAJET", rightX, rightY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      rightY += 6;
      doc.text(`${order.originCity} > ${order.destinationCity}`, rightX, rightY);

      // Countries
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      rightY += 5;
      doc.text(`${order.originCountry} > ${order.destinationCountry}`, rightX, rightY);

      // Weight
      rightY += 8;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.text("POIDS DECLARE", rightX, rightY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      rightY += 6;
      doc.text(`${order.weight} kg`, rightX, rightY);

      // Date
      if (order.pickupDate) {
        rightY += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("DATE DEPOT", rightX, rightY);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        rightY += 5;
        doc.text(new Date(order.pickupDate).toLocaleDateString("fr-FR"), rightX, rightY);
      }

      y += order.recipientName ? 65 : 50;

      // ============ QR CODE ============
      // Generate QR as image
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
        doc.text("QR CODE - SCAN OBLIGATOIRE", pageWidth / 2, y + 3, { align: "center" });
        y += 6;

        doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);
        y += qrSize + 3;
      }

      // ============ BARCODE (BACKUP) ============
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

      // ============ DESCRIPTION ============
      if (order.description) {
        doc.setFillColor(248, 248, 248);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, "FD");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        doc.text("CONTENU DECLARE", margin + 3, y + 4);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text(order.description.substring(0, 80), margin + 3, y + 9);
        y += 15;
      }

      // ============ MANDATORY MENTION ============
      doc.setFillColor(255, 240, 240);
      doc.setDrawColor(220, 50, 50);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, "FD");
      
      doc.setTextColor(180, 30, 30);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("/!\\ MENTION OBLIGATOIRE", margin + 3, y + 5);
      
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Ce document doit etre colle sur le colis. Sans scan valide,",
        margin + 3, y + 10
      );
      doc.text(
        "le colis n'est pas pris en charge. Tout porteur du QR est repute mandate.",
        margin + 3, y + 14
      );

      y += 22;

      // ============ FOOTER ============
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(6);
      doc.text(
        `Genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")} - KONNEKT (c) ${new Date().getFullYear()}`,
        pageWidth / 2,
        y + 3,
        { align: "center" }
      );

      // Save PDF
      doc.save(`feuille-logistique-${order.orderNumber}.pdf`);
      
      setDownloaded(true);
      onDownloaded?.();
      toast({ title: "✅ Feuille logistique téléchargée" });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ title: "Erreur de génération", description: "Réessayez.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className={required && !downloaded ? "border-amber-300 bg-amber-50/50" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Feuille logistique
          {required && !downloaded && (
            <Badge variant="destructive" className="text-[10px]">
              Obligatoire
            </Badge>
          )}
          {downloaded && (
            <Badge className="bg-green-100 text-green-800 text-[10px] gap-1">
              <CheckCircle className="w-3 h-3" />
              Téléchargée
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Document à imprimer et coller sur votre colis. Contient le QR code de scan, 
          le code-barres de secours et toutes les informations de la commande.
        </p>

        {required && !downloaded && (
          <div className="flex items-start gap-2 p-2 bg-amber-100/50 rounded-lg text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Le téléchargement de cette feuille est <strong>obligatoire</strong> avant la validation finale.</span>
          </div>
        )}

        <Button 
          className="w-full gap-2" 
          onClick={generatePDF} 
          disabled={generating}
          variant={downloaded ? "outline" : "default"}
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Génération en cours...
            </>
          ) : downloaded ? (
            <>
              <Download className="w-4 h-4" />
              Retélécharger la feuille
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Télécharger la feuille logistique
            </>
          )}
        </Button>

        {/* Preview chips */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] gap-1">
            <QrCode className="w-3 h-3" /> QR Code
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            📊 Code-barres
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Package className="w-3 h-3" /> {order.weight} kg
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            📍 {order.originCity} → {order.destinationCity}
          </Badge>
        </div>

        {/* Hidden QR code for PDF generation */}
        <div className="hidden">
          <div ref={qrRef}>
            <QRCodeLib
              value={order.orderNumber}
              size={300}
              level="H"
            />
          </div>
          <canvas ref={barcodeCanvasRef} />
        </div>
      </CardContent>
    </Card>
  );
}
