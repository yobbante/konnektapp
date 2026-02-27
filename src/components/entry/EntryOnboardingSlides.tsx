import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Shield, Scan, CreditCard, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EntryOnboardingSlidesProps {
  country: { code: string; name: string; flag: string; currency: string };
  onComplete: () => void;
}

const getSlides = (country: { code: string; currency: string }) => {
  const isFCFA = ["XOF", "XAF"].includes(country.currency);
  
  return [
    {
      icon: Package,
      title: "Envoyez facilement",
      desc: "Trouvez un transporteur, réservez en ligne et suivez votre colis jusqu'à destination.",
      color: "from-cyan-500 to-blue-500",
    },
    {
      icon: Shield,
      title: "Paiement sécurisé",
      desc: isFCFA
        ? "Payez par Mobile Money ou carte. Vos fonds sont bloqués en escrow jusqu'à confirmation de livraison."
        : "Payez par carte bancaire. Vos fonds sont sécurisés en escrow jusqu'à confirmation de livraison.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Scan,
      title: "Scan intelligent",
      desc: "Chaque colis est tracé par QR code. Scannez pour déposer, suivre et confirmer la réception.",
      color: "from-violet-500 to-purple-500",
    },
    {
      icon: CreditCard,
      title: "Devenez transporteur",
      desc: "Publiez vos trajets, fixez vos tarifs et gagnez de l'argent en transportant des colis.",
      color: "from-orange-500 to-amber-500",
    },
  ];
};

export function EntryOnboardingSlides({ country, onComplete }: EntryOnboardingSlidesProps) {
  const slides = getSlides(country);
  const [current, setCurrent] = useState(0);
  const isLast = current === slides.length - 1;
  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Skip */}
      <div className="flex justify-end px-5 pt-4">
        <button onClick={onComplete} className="text-sm text-muted-foreground hover:text-foreground">
          Passer
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{slide.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots + button */}
      <div className="px-6 pb-6 space-y-4">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <Button
          className="w-full h-12 rounded-xl text-base"
          onClick={() => isLast ? onComplete() : setCurrent(c => c + 1)}
        >
          {isLast ? (
            <>
              Commencer
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
