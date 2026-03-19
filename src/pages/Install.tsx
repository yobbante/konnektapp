import { useState, useEffect } from "react";
import { Download, Share, MoreVertical, Check, Smartphone, Monitor } from "lucide-react";
import { KonnektLogo } from "@/components/ui/KonnektLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader title="Installer l'app" />

      <div className="container max-w-lg mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KonnektLogo size={48} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Konnekt</h1>
          <p className="text-muted-foreground">
            Installez l'application pour un accès rapide
          </p>
        </div>

        {/* Already Installed */}
        {isInstalled && (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-green-500">Application installée</p>
                <p className="text-sm text-muted-foreground">
                  Vous utilisez déjà l'application installée
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Install Button for Android/Chrome */}
        {deferredPrompt && !isInstalled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Installation rapide
              </CardTitle>
              <CardDescription>
                Cliquez sur le bouton pour installer l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstallClick} className="w-full" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Installer Konnekt
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !isInstalled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Installation sur iPhone/iPad
              </CardTitle>
              <CardDescription>
                Suivez ces étapes pour installer l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Appuyez sur le bouton Partager</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Share className="w-4 h-4" /> en bas de l'écran Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Faites défiler et appuyez sur</p>
                  <p className="text-sm text-muted-foreground">
                    "Sur l'écran d'accueil"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Confirmez en appuyant sur</p>
                  <p className="text-sm text-muted-foreground">"Ajouter"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Chrome Instructions */}
        {isAndroid && !deferredPrompt && !isInstalled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Installation sur Android
              </CardTitle>
              <CardDescription>
                Suivez ces étapes pour installer l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Appuyez sur le menu</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MoreVertical className="w-4 h-4" /> en haut à droite de Chrome
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Appuyez sur</p>
                  <p className="text-sm text-muted-foreground">
                    "Installer l'application" ou "Ajouter à l'écran d'accueil"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && !isInstalled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Installation sur ordinateur
              </CardTitle>
              <CardDescription>
                Installez l'application depuis votre navigateur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Dans Chrome, cliquez sur l'icône</p>
                  <p className="text-sm text-muted-foreground">
                    d'installation dans la barre d'adresse
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Cliquez sur "Installer"</p>
                  <p className="text-sm text-muted-foreground">
                    L'application s'ouvrira dans une fenêtre séparée
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Avantages de l'application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">Accès rapide depuis l'écran d'accueil</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">Fonctionne hors ligne</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">Notifications push</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">Chargement ultra rapide</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
}
