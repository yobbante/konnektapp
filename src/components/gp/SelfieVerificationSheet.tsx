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
}

type Step = "instructions" | "camera" | "preview" | "uploading" | "done";

export function SelfieVerificationSheet({ open, onClose, gpId, onSuccess }: SelfieVerificationSheetProps) {
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
    if (!open) {
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

  const uploadSelfie = async () => {
    if (!capturedImage) return;
    setStep("uploading");

    try {
      // Convert base64 to blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const fileName = `selfie_${gpId}_${Date.now()}.jpg`;
      const filePath = `gp-documents/${gpId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("gp-documents")
        .upload(filePath, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("gp-documents").getPublicUrl(filePath);

      // Update GP profile
      const { error: updateError } = await supabase
        .from("gp_profiles")
        .update({ selfie_url: urlData.publicUrl })
        .eq("id", gpId);

      if (updateError) throw updateError;

      setStep("done");
      onSuccess?.(urlData.publicUrl);
      toast({ title: "Selfie enregistré ✅", description: "Votre vérification est en cours de traitement." });
      
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Échec de l'envoi", variant: "destructive" });
      setStep("preview");
    }
  };

  return (
    <Sheet open={open} onOpenChange={() => { if (step !== "uploading") { stopCamera(); onClose(); } }}>
      <SheetContent side="bottom" className="h-[95dvh] rounded-t-3xl p-0 overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />

        {/* Instructions */}
        {step === "instructions" && (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-5 pb-0">
              <SheetTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Vérification d'identité
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Smile className="w-16 h-16 text-primary" />
              </motion.div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold">Prenez un selfie clair</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Nous comparons votre visage avec votre pièce d'identité pour valider votre compte.
                </p>
              </div>

              <div className="space-y-2 w-full max-w-xs">
                {[
                  "Visage bien éclairé, de face",
                  "Sans lunettes de soleil ni casquette",
                  "Arrière-plan neutre",
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs">{tip}</span>
                  </div>
                ))}
              </div>

              <Button onClick={startCamera} size="lg" className="w-full max-w-xs gap-2">
                <Camera className="w-5 h-5" /> Ouvrir la caméra
              </Button>
            </div>
          </div>
        )}

        {/* Camera */}
        {step === "camera" && (
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
