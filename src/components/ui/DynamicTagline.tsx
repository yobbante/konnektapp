/**
 * DynamicTagline - Animated word cycling component
 * 
 * Features:
 * - Smooth fade + vertical slide animation (4px max)
 * - 2-second cycle between words
 * - Mobile-first, stable height, app-native feel
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DynamicTaglineProps {
  className?: string;
  variant?: "default" | "large";
}

const dynamicWords = [
  "un colis",
  "des bagages",
  "des documents",
  "des marchandises",
];

export function DynamicTagline({ className, variant = "default" }: DynamicTaglineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dynamicWords.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const textSizes = {
    default: "text-2xl md:text-3xl",
    large: "text-3xl md:text-4xl",
  };

  return (
    <div className={cn("text-center", className)}>
      <h1 className={cn("font-bold text-foreground leading-tight", textSizes[variant])}>
        Envoyez ou transportez
      </h1>
      <div className="relative h-10 md:h-12 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              duration: 0.25,
              ease: "easeOut",
            }}
            className={cn("text-primary font-bold absolute", textSizes[variant])}
          >
            {dynamicWords[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className={cn("font-bold text-foreground leading-tight -mt-1", textSizes[variant])}>
        simplement.
      </p>
    </div>
  );
}
