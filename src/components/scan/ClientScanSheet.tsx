/**
 * ClientScanSheet - Instant camera scan for clients from bottom nav
 * 
 * Opens camera immediately, with fallback options on failure.
 * Role-aware QR scanning: determines actions based on scanner role.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ScanLine, History, HelpCircle, Home, Keyboard } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { useNavigate } from "react-router-dom";

interface ClientScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const navigate = useNavigate();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Open camera immediately when sheet opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setCameraOpen(true);
      setScanFailed(false);
      setManualMode(false);
      setScannedCode(null);
    } else {
      setCameraOpen(false);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleScan = (code: string) => {
    setCameraOpen(false);
    setScannedCode(code);
    // The UniversalScanner will handle lookup
  };

  const handleCameraClose = () => {
    setCameraOpen(false);
    setScanFailed(true);
  };

  const handleFallbackAction = (action: string) => {
    onOpenChange(false);
    switch (action) {
      case "history":
        navigate("/historique");
        break;
      case "help":
        navigate("/settings");
        break;
      case "home":
        navigate("/");
        break;
    }
  };

  return (
    <>
      {/* Camera opens directly */}
      <QRCameraScanner
        isOpen={open && cameraOpen}
        onScan={handleScan}
        onClose={handleCameraClose}
      />

      {/* Fallback sheet when camera fails or closes */}
      <Sheet open={open && !cameraOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ScanLine className="w-5 h-5 text-primary" />
              Scanner un QR Code
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-safe">
            {/* If we have a scanned code, show UniversalScanner with result */}
            {scannedCode ? (
              <UniversalScanner onComplete={() => handleOpenChange(false)} />
            ) : (
              <>
                {/* Retry camera button */}
                <Button
                  className="w-full h-20 flex flex-col items-center justify-center gap-2"
                  onClick={() => {
                    setScanFailed(false);
                    setCameraOpen(true);
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ScanLine className="w-7 h-7" />
                  </motion.div>
                  <span className="text-sm font-medium">Ouvrir la caméra</span>
                </Button>

                {/* Manual code entry */}
                {!manualMode ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setManualMode(true)}
                  >
                    <Keyboard className="w-4 h-4" />
                    Saisir un code manuellement
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <UniversalScanner onComplete={() => handleOpenChange(false)} />
                  </div>
                )}

                {/* Fallback options when scan fails */}
                {scanFailed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 pt-4 border-t"
                  >
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      Le scan n'a pas fonctionné ?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-1 h-auto py-3"
                        onClick={() => handleFallbackAction("history")}
                      >
                        <History className="w-5 h-5 text-primary" />
                        <span className="text-[10px]">Historique</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-1 h-auto py-3"
                        onClick={() => handleFallbackAction("help")}
                      >
                        <HelpCircle className="w-5 h-5 text-primary" />
                        <span className="text-[10px]">Aide</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col items-center gap-1 h-auto py-3"
                        onClick={() => handleFallbackAction("home")}
                      >
                        <Home className="w-5 h-5 text-primary" />
                        <span className="text-[10px]">Accueil</span>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
