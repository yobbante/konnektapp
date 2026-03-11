/**
 * Mobility Scan Ticket — Driver scans passenger QR tickets
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ScanLine, Check, X, Users, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MobilityScanTicketPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"scan" | "manual">("manual");
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const scannerRef = useRef<any>(null);

  // Try to use html5-qrcode for camera scanning
  useEffect(() => {
    if (mode !== "scan") return;
    let scanner: any = null;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => {
            scanner.stop().catch(() => {});
            handleScan(decoded);
          },
          () => {}
        );
      } catch {
        setMode("manual");
        toast({ title: "Caméra indisponible", description: "Utilisez la saisie manuelle", variant: "destructive" });
      }
    };

    initScanner();
    return () => { scanner?.stop().catch(() => {}); };
  }, [mode]);

  const handleScan = async (qrData: string) => {
    setScanning(true);
    setError("");
    setResult(null);

    try {
      // Extract booking ID from QR data (format: KONNEKT-MOB-{uuid})
      let bookingId = qrData;
      if (qrData.startsWith("KONNEKT-MOB-")) {
        bookingId = qrData.replace("KONNEKT-MOB-", "");
      }

      const { data: booking, error: fetchErr } = await supabase
        .from("mobility_bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (fetchErr || !booking) {
        // Try by boarding code
        const { data: byCode } = await supabase
          .from("mobility_bookings")
          .select("*")
          .eq("boarding_code", qrData.toUpperCase())
          .single();

        if (!byCode) {
          setError("Ticket introuvable. Vérifiez le code.");
          setScanning(false);
          return;
        }
        setResult(byCode);
        setScanning(false);
        return;
      }

      setResult(booking);
    } catch {
      setError("Erreur lors de la vérification");
    }
    setScanning(false);
  };

  const handleManualSearch = () => {
    if (!code.trim()) return;
    handleScan(code.trim());
  };

  const handleValidateTicket = async () => {
    if (!result) return;
    if (result.scanned_at) {
      toast({ title: "Déjà scanné", description: "Ce ticket a déjà été validé", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("mobility_bookings")
      .update({ scanned_at: new Date().toISOString(), status: "confirmed" as any })
      .eq("id", result.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "✓ Ticket validé !", description: `${result.passenger_count} passager(s) embarqué(s)` });
    setResult({ ...result, scanned_at: new Date().toISOString() });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-transport-mobility text-white p-4 pt-safe">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold">Scanner un ticket</h1>
            <p className="text-sm opacity-80">Validez l'embarquement des passagers</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "scan" ? "default" : "outline"}
            className={mode === "scan" ? "flex-1 bg-transport-mobility" : "flex-1"}
            onClick={() => setMode("scan")}
          >
            <ScanLine className="w-4 h-4 mr-2" /> Scanner QR
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            className={mode === "manual" ? "flex-1 bg-transport-mobility" : "flex-1"}
            onClick={() => setMode("manual")}
          >
            Code manuel
          </Button>
        </div>

        {/* Camera viewport */}
        {mode === "scan" && (
          <div className="rounded-xl overflow-hidden border border-border bg-black aspect-square max-h-[300px]">
            <div id="qr-reader" className="w-full h-full" />
          </div>
        )}

        {/* Manual input */}
        {mode === "manual" && (
          <div className="flex gap-2">
            <Input
              placeholder="Code d'embarquement ou ID ticket"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              className="flex-1"
            />
            <Button onClick={handleManualSearch} disabled={scanning} className="bg-transport-mobility">
              {scanning ? "..." : "Vérifier"}
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <X className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="border-transport-mobility/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-mono font-bold">{result.booking_number}</p>
                {result.scanned_at ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Check className="w-3 h-3 mr-1" /> Validé
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Non scanné
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{result.origin_city} → {result.destination_city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{result.departure_date ? format(new Date(result.departure_date), "dd MMM", { locale: fr }) : "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{result.passenger_count} passager(s)</span>
                </div>
                <div>
                  <span className="font-bold text-transport-mobility">{result.total_price?.toLocaleString()} {result.currency}</span>
                </div>
              </div>

              {result.passenger_names?.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Passagers : {result.passenger_names.join(", ")}
                </div>
              )}

              {!result.scanned_at && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleValidateTicket}
                >
                  <Check className="w-4 h-4 mr-2" /> Valider l'embarquement
                </Button>
              )}

              {result.scanned_at && (
                <p className="text-xs text-center text-green-600">
                  Scanné le {format(new Date(result.scanned_at), "dd MMM à HH:mm", { locale: fr })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!result && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Scannez le QR code du passager</p>
            <p className="text-xs mt-1">ou saisissez le code d'embarquement manuellement</p>
          </div>
        )}
      </div>
    </div>
  );
}
