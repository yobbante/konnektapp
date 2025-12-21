import { useState, useCallback } from "react";
import { Upload, FileCheck, X, Loader2, Image, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  label: string;
  onUpload: (url: string) => void;
  uploadedUrl?: string;
  required?: boolean;
  accept?: string;
}

export function DocumentUpload({ 
  label, 
  onUpload, 
  uploadedUrl, 
  required = false,
  accept = "image/jpeg,image/png,image/webp,application/pdf"
}: DocumentUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximum est de 10 Mo",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Formats acceptés: JPG, PNG, WebP, PDF",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // SECURITY FIX: Always require authentication before upload
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentification requise",
          description: "Veuillez vous connecter pour télécharger des documents",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Authenticated upload - use user ID as folder
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const safeFileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("gp-documents")
        .upload(safeFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // SECURITY FIX: Store only the file path, not public URL
      // Use signed URLs when document access is needed
      onUpload(safeFileName);
      toast({
        title: "Document téléchargé",
        description: "Votre fichier a été enregistré avec succès",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [onUpload, toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, [handleUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  }, [handleUpload]);

  const handleRemove = useCallback(() => {
    onUpload("");
  }, [onUpload]);

  if (uploadedUrl) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-success/10 border border-success/20">
        <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{label}</p>
          <p className="text-sm text-success">Document téléchargé</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleRemove}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer",
        dragActive 
          ? "border-secondary bg-secondary/5" 
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
        uploading && "pointer-events-none opacity-70"
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={uploading}
      />
      
      <div className="flex flex-col items-center text-center">
        {uploading ? (
          <>
            <Loader2 className="w-10 h-10 text-secondary animate-spin mb-3" />
            <p className="font-medium text-foreground">Téléchargement en cours...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">
              {label} {required && <span className="text-destructive">*</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              Glissez-déposez ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              JPG, PNG, WebP ou PDF • Max 10 Mo
            </p>
          </>
        )}
      </div>
    </div>
  );
}
