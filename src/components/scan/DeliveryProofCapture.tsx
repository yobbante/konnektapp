/**
 * DeliveryProofCapture - Photo proof component for agent delivery confirmation
 * 
 * Captures a photo as proof of delivery using the device camera.
 * Required before an agent can confirm final delivery.
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, CheckCircle, RotateCcw, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DeliveryProofCaptureProps {
  onProofCaptured: (imageDataUrl: string) => void;
  onSkip?: () => void;
  required?: boolean;
}

export function DeliveryProofCapture({ onProofCaptured, onSkip, required = true }: DeliveryProofCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      // Fallback to file input
      fileInputRef.current?.click();
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmProof = () => {
    if (capturedImage) {
      onProofCaptured(capturedImage);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Preuve de livraison</span>
          {required && (
            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
              Obligatoire
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Prenez une photo du colis remis au destinataire comme preuve de livraison.
        </p>

        <AnimatePresence mode="wait">
          {/* Camera View */}
          {cameraActive && !capturedImage && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-full bg-background/80"
                  onClick={stopCamera}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full bg-white border-4 border-primary"
                  onClick={capturePhoto}
                >
                  <div className="w-10 h-10 rounded-full bg-primary" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Captured Preview */}
          {capturedImage && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
                <img
                  src={capturedImage}
                  alt="Preuve de livraison"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-6 h-6 text-success drop-shadow-lg" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={retake}>
                  <RotateCcw className="w-3 h-3" />
                  Reprendre
                </Button>
                <Button size="sm" className="flex-1 gap-1" onClick={confirmProof}>
                  <CheckCircle className="w-3 h-3" />
                  Confirmer
                </Button>
              </div>
            </motion.div>
          )}

          {/* Initial State */}
          {!cameraActive && !capturedImage && (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-20 flex-col gap-2"
                  onClick={startCamera}
                >
                  <Camera className="w-5 h-5 text-primary" />
                  <span className="text-xs">Prendre une photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-20 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <span className="text-xs">Galerie</span>
                </Button>
              </div>
              {!required && onSkip && (
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onSkip}>
                  Passer cette étape
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
