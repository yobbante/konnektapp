/**
 * QRCameraScanner - Real mobile camera QR code scanner
 * 
 * Uses html5-qrcode for cross-platform camera-based QR scanning
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Flashlight, RotateCcw, QrCode } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface QRCameraScannerProps {
  onScan: (code: string) => void;
  onClose?: () => void;
  isOpen: boolean;
}

export function QRCameraScanner({ onScan, onClose, isOpen }: QRCameraScannerProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);
  
  const startScanner = async () => {
    try {
      setError(null);
      setScanning(true);
      
      // Check camera permissions
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError("Aucune caméra détectée");
        setHasPermission(false);
        setScanning(false);
        return;
      }
      
      setHasPermission(true);
      
      // Create scanner instance
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader", {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
      }
      
      // Use back camera preferentially on mobile
      const cameraId = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("arrière")
      )?.id || devices[0].id;
      
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Success - found QR code
          handleScanSuccess(decodedText);
        },
        () => {
          // Scanning but no QR found yet - ignore
        }
      );
    } catch (err: any) {
      console.error("Scanner error:", err);
      if (err.name === "NotAllowedError") {
        setError("Permission caméra refusée. Veuillez autoriser l'accès.");
        setHasPermission(false);
      } else {
        setError("Impossible d'accéder à la caméra");
      }
      setScanning(false);
    }
  };
  
  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.log("Scanner stop error:", err);
    }
    setScanning(false);
  };
  
  const handleScanSuccess = (code: string) => {
    // Vibrate on mobile if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    toast({ title: "✅ Code scanné", description: code });
    stopScanner();
    onScan(code);
    onClose?.();
  };
  
  const handleRetry = () => {
    setError(null);
    startScanner();
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Scanner QR</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { stopScanner(); onClose?.(); }}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Scanner View */}
        <div className="h-full flex flex-col items-center justify-center">
          {error ? (
            <Card className="mx-4 bg-card/95 backdrop-blur">
              <CardContent className="p-6 text-center">
                <Camera className="w-12 h-12 mx-auto text-destructive mb-4" />
                <p className="text-destructive font-medium mb-2">{error}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Vérifiez les permissions de la caméra dans les paramètres de votre navigateur.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => { stopScanner(); onClose?.(); }}>
                    Annuler
                  </Button>
                  <Button onClick={handleRetry}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Camera viewport */}
              <div
                id="qr-reader"
                ref={containerRef}
                className="w-full max-w-sm aspect-square mx-auto relative"
                style={{ 
                  maxHeight: '70vh',
                  overflow: 'hidden',
                  borderRadius: '1rem'
                }}
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 relative">
                  {/* Corner frames */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <motion.div
                    className="absolute left-4 right-4 h-0.5 bg-primary shadow-lg shadow-primary/50"
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
              
              {/* Instructions */}
              <div className="absolute bottom-safe pb-8 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black/50 rounded-full px-4 py-2 mx-auto inline-block">
                  Placez le QR code dans le cadre
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
