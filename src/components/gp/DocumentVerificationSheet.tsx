/**
 * DocumentVerificationSheet — Camera-based passport/CNI capture
 * 
 * Opens camera directly, captures document photo, uploads to Supabase storage,
 * and updates the GP profile with the document URL.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, RotateCcw, Check, X, FileText, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DocumentVerificationSheetProps {
  open: boolean;
  onClose: () => void;
  gpId: string;
  onSuccess?: (url: string) => void;
  onAutoActivated?: () => void;
}

type Step = "instructions" | "camera" | "preview" | "uploading" | "done";

export function DocumentVerificationSheet({ open, onClose, gpId, onSuccess, onAutoActivated }: DocumentVerificationSheetProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("instructions");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep("camera");
    } catch {
      toast({ title: "Caméra inaccessible", description: "Autorisez l'accès à la caméra dans les paramètres.", variant: "destructive" });
    }
  }, [facingMode, stopCamera, toast]);

  // Auto-open camera when sheet opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setStep("instructions");
      setCapturedImage(null);
    }
  }, [open, stopCamera]);

  // Re-start camera when facingMode changes (only while camera step active)
  useEffect(() => {
    if (open && step === "camera") {
      startCamera();
    }
  }, [facingMode]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
    setStep("preview");
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  /** Basic image quality check: not too dark, not blank */
  const validateImageQuality = (dataUrl: string): Promise<{ valid: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const size = 100; // sample at small size for speed
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        
        let totalBrightness = 0;
        let uniformPixels = 0;
        const firstR = data[0], firstG = data[1], firstB = data[2];
        
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
          totalBrightness += brightness;
          if (Math.abs(data[i] - firstR) < 10 && Math.abs(data[i+1] - firstG) < 10 && Math.abs(data[i+2] - firstB) < 10) {
            uniformPixels++;
          }
        }
        
        const avgBrightness = totalBrightness / (size * size);
        const uniformity = uniformPixels / (size * size);
        
        if (avgBrightness < 30) {
          resolve({ valid: false, reason: "Image trop sombre. Assurez-vous d'avoir un bon éclairage." });
        } else if (avgBrightness > 245) {
          resolve({ valid: false, reason: "Image trop claire ou surexposée." });
        } else if (uniformity > 0.85) {
          resolve({ valid: false, reason: "Image uniforme détectée. Photographiez un vrai document." });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => resolve({ valid: true }); // fallback: allow
      img.src = dataUrl;
    });
  };

  /** Check if both documents are present and auto-activate */
  const tryAutoActivate = async () => {
    try {
      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id_document_url, selfie_url, status, base_price_per_kg, base_origin_city, base_destination_city")
        .eq("id", gpId)
        .single();
      
      if (profile && profile.id_document_url && profile.selfie_url && 
          profile.base_origin_city && profile.base_destination_city && 
          (profile.base_price_per_kg ?? 0) > 0 &&
          profile.status !== "verified") {
        await supabase.from("gp_profiles").update({
          status: "verified" as any,
          kyc_status: "verified",
          kyc_level: 1,
          verified_at: new Date().toISOString(),
        }).eq("id", gpId);
        toast({ title: "🎉 Compte activé automatiquement !", description: "Toutes les vérifications sont complètes." });
        onAutoActivated?.();
      }
    } catch { /* silent */ }
  };

  const uploadDocument = async () => {
    if (!capturedImage) return;
    
    // Validate image quality first
    const quality = await validateImageQuality(capturedImage);
    if (!quality.valid) {
      toast({ title: "Image non valide", description: quality.reason, variant: "destructive" });
      setStep("preview");
      return;
    }
    
    setStep("uploading");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `id_document_${gpId}_${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("gp-documents")
        .upload(filePath, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("gp-documents").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("gp_profiles")
        .update({ id_document_url: urlData.publicUrl })
        .eq("id", gpId);

      if (updateError) throw updateError;

      setStep("done");
      onSuccess?.(urlData.publicUrl);
      toast({ title: "Document enregistré ✅", description: "Passeport/CNI validé." });

      // Try auto-activation after a small delay to let DB update propagate
      setTimeout(async () => {
        await tryAutoActivate();
        onClose();
      }, 1500);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Échec de l'envoi", variant: "destructive" });
      setStep("preview");
    }
  };

  return (
    <Sheet open={open} onOpenChange={() => { if (step !== "uploading") { stopCamera(); onClose(); } }}>
      <SheetContent side="bottom" className="h-[95dvh] rounded-t-3xl p-0 overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera — auto-opened */}
        {(step === "instructions" || step === "camera") && (
          <div className="relative h-full bg-black flex flex-col">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="flex-1 object-cover"
            />
            {/* Document guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[90%] aspect-[1.42/1] rounded-lg border-[3px] border-white/60 border-dashed shadow-[inset_0_0_30px_rgba(255,255,255,0.1)]">
                <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl-md" />
                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr-md" />
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl-md" />
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br-md" />
              </div>
            </div>
            <div className="absolute top-12 left-0 right-0 text-center space-y-1">
              <p className="text-white/90 text-sm font-semibold">Photographiez votre Passeport ou CNI</p>
              <p className="text-white/60 text-xs">Cadrez le document dans le rectangle</p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <Button variant="ghost" size="icon" className="text-white h-12 w-12" onClick={() => { stopCamera(); onClose(); }}>
                <X className="w-6 h-6" />
              </Button>
              <button
                onClick={capture}
                className="rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/40 transition-colors"
                style={{ width: 72, height: 72 }}
              >
                <div className="w-14 h-14 rounded-full bg-white" />
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white h-12 w-12"
                onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && capturedImage && (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-5 pb-3">
              <SheetTitle>Vérifiez votre document</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
              <div className="w-full max-w-sm rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg">
                <img src={capturedImage} alt="Document" className="w-full h-auto object-contain" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium">Le document est-il lisible et complet ?</p>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Assurez-vous que toutes les informations sont visibles (nom, photo, numéro)</span>
                </div>
              </div>
              <div className="flex gap-3 w-full max-w-xs">
                <Button variant="outline" onClick={retake} className="flex-1 gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Reprendre
                </Button>
                <Button onClick={uploadDocument} className="flex-1 gap-1.5">
                  <Check className="w-4 h-4" /> Valider
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Uploading */}
        {step === "uploading" && (
          <div className="flex flex-col h-full items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="w-12 h-12 rounded-full border-primary border-t-transparent"
              style={{ borderWidth: 3 }}
            />
            <p className="text-sm font-medium">Envoi en cours...</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col h-full items-center justify-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-primary" />
            </motion.div>
            <p className="text-sm font-bold">Document enregistré !</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
