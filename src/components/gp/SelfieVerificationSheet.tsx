/**
 * SelfieVerificationSheet — Smart selfie verification with camera
 * 
 * Opens camera, captures selfie, uploads to Supabase storage,
 * and updates the GP profile with the selfie URL.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RotateCcw, Check, X, Shield, Smile, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SelfieVerificationSheetProps {
  open: boolean;
  onClose: () => void;
  gpId: string;
  onSuccess?: (url: string) => void;
  onAutoActivated?: () => void;
}

type Step = "instructions" | "camera" | "preview" | "uploading" | "done";

export function SelfieVerificationSheet({ open, onClose, gpId, onSuccess, onAutoActivated }: SelfieVerificationSheetProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("instructions");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

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
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 720 } },
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

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setStep("instructions");
      setCapturedImage(null);
    }
  }, [open, stopCamera]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    // Mirror for front camera
    if (facingMode === "user") {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
    setStep("preview");
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  /** Basic image quality check: not too dark, not blank, face-like content */
  const validateImageQuality = (dataUrl: string): Promise<{ valid: boolean; reason?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const size = 100;
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        
        let totalBrightness = 0;
        let uniformPixels = 0;
        const firstR = data[0], firstG = data[1], firstB = data[2];
        // Check for skin-tone-like pixels (very basic heuristic)
        let skinTonePixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          totalBrightness += brightness;
          if (Math.abs(r - firstR) < 10 && Math.abs(g - firstG) < 10 && Math.abs(b - firstB) < 10) {
            uniformPixels++;
          }
          // Very basic skin tone detection (works for diverse skin tones)
          if (r > 60 && g > 40 && b > 20 && r > g && (r - g) > 5 && brightness > 40 && brightness < 230) {
            skinTonePixels++;
          }
        }
        
        const avgBrightness = totalBrightness / (size * size);
        const uniformity = uniformPixels / (size * size);
        const skinRatio = skinTonePixels / (size * size);
        
        if (avgBrightness < 30) {
          resolve({ valid: false, reason: "Image trop sombre. Améliorez l'éclairage." });
        } else if (avgBrightness > 245) {
          resolve({ valid: false, reason: "Image trop claire ou surexposée." });
        } else if (uniformity > 0.85) {
          resolve({ valid: false, reason: "Image uniforme détectée. Prenez un vrai selfie." });
        } else if (skinRatio < 0.05) {
          resolve({ valid: false, reason: "Aucun visage détecté. Positionnez votre visage dans le cercle." });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => resolve({ valid: true });
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
        toast({ title: "Compte active automatiquement", description: "Toutes les verifications sont completes." });
        onAutoActivated?.();
      }
    } catch { /* silent */ }
  };

  const uploadSelfie = async () => {
    if (!capturedImage) return;
    
    // Validate image quality first
    const quality = await validateImageQuality(capturedImage);
    if (!quality.valid) {
      toast({ title: "Selfie non valide", description: quality.reason, variant: "destructive" });
      setStep("preview");
      return;
    }
    
    setStep("uploading");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `selfie_${gpId}_${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("gp-documents")
        .upload(filePath, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("gp-documents").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("gp_profiles")
        .update({ selfie_url: urlData.publicUrl })
        .eq("id", gpId);

      if (updateError) throw updateError;

      setStep("done");
      onSuccess?.(urlData.publicUrl);
      toast({ title: "Selfie enregistre", description: "Vérification réussie." });
      
      // Try auto-activation
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
              className={cn("flex-1 object-cover", facingMode === "user" && "scale-x-[-1]")}
            />
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 rounded-full border-[3px] border-white/50 border-dashed" />
            </div>
            <p className="absolute top-12 left-0 right-0 text-center text-white/80 text-sm font-medium">
              Placez votre visage dans le cercle
            </p>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <Button variant="ghost" size="icon" className="text-white h-12 w-12" onClick={() => { stopCamera(); onClose(); }}>
                <X className="w-6 h-6" />
              </Button>
              <button
                onClick={capture}
                className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/40 transition-colors"
                style={{ width: 72, height: 72 }}
              >
                <div className="w-14 h-14 rounded-full bg-white" />
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white h-12 w-12"
                onClick={() => {
                  setFacingMode(prev => prev === "user" ? "environment" : "user");
                  startCamera();
                }}
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
              <SheetTitle>Vérifiez votre selfie</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
              <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-primary/30">
                <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Votre visage est-il bien visible et net ?
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <Button variant="outline" onClick={retake} className="flex-1 gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Reprendre
                </Button>
                <Button onClick={uploadSelfie} className="flex-1 gap-1.5">
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
              className="w-12 h-12 rounded-full border-3 border-primary border-t-transparent"
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
              className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-emerald-500" />
            </motion.div>
            <p className="text-sm font-bold">Selfie enregistré !</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
