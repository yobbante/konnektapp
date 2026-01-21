import { useState } from "react";
import { Share2, Copy, Check, Link2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface ShareProfileButtonProps {
  gpId: string;
  gpName: string;
  variant?: "icon" | "button";
  className?: string;
}

export function ShareProfileButton({ 
  gpId, 
  gpName, 
  variant = "button",
  className = "" 
}: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const profileUrl = `${window.location.origin}/client/transporteurs/${gpId}`;
  const shareText = `Découvrez ${gpName} sur Yobbanté - Transporteur de confiance pour vos envois`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({
        title: "Lien copié !",
        description: "Le lien du profil a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${gpName} - Yobbanté`,
          text: shareText,
          url: profileUrl,
        });
        setOpen(false);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    }
  };

  const shareLinks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodeURIComponent(shareText + " " + profileUrl)}`,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      name: "Telegram",
      icon: Send,
      url: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      name: "Facebook",
      icon: Share2,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "Twitter",
      icon: Share2,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`,
      color: "bg-sky-500 hover:bg-sky-600",
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" className={className}>
            <Share2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className={`gap-2 ${className}`}>
            <Share2 className="w-4 h-4" />
            Partager
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Partager ce profil</h4>
          
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Link2 className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium">
                {copied ? "Copié !" : "Copier le lien"}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {profileUrl}
              </p>
            </div>
          </button>

          {/* Native Share (if available) */}
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium">Partager via...</p>
            </button>
          )}

          {/* Social Links */}
          <div className="grid grid-cols-4 gap-2">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-white transition-colors ${link.color}`}
                onClick={() => setOpen(false)}
              >
                <link.icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{link.name}</span>
              </a>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
