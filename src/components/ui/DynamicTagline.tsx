/**
 * DynamicTagline V2 — Konnekt branded
 * 
 * "Envoyez {un colis / des bagages / des documents / des marchandises}
 *  en toute confiance."
 * 
 * Animated word cycling with smooth fade + vertical slide
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DynamicTaglineProps {
  className?: string;
  variant?: "default" | "large";
}

const dynamicWords = [
  "un colis,",
  "des bagages,",
  "des documents,",
  "des effets personnels,",
  "des marchandises,",
];

export function DynamicTagline({ className, variant = "default" }: DynamicTaglineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dynamicWords.length);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  const textSizes = {
    default: "text-2xl md:text-3xl",
    large: "text-3xl md:text-4xl",
  };

  return (
    <div className={cn("text-center", className)}>
      <h1 className={cn("font-bold text-foreground leading-tight", textSizes[variant])}>
        Envoyez
      </h1>
      <div className="relative h-10 md:h-12 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className={cn("text-primary font-bold absolute", textSizes[variant])}
          >
            {dynamicWords[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className={cn("font-bold text-foreground leading-tight -mt-1", textSizes[variant])}>
        en toute confiance.
      </p>
    </div>
  );
}
