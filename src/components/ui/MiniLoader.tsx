/**
 * MiniLoader - Sophisticated Transport-themed Mini Loader
 * 
 * Features:
 * - Multiple animated vehicle types
 * - Smooth transitions between icons
 * - Compact size for inline use
 * - Same loading duration as before
 */

import { motion, AnimatePresence } from "framer-motion";
import { Package, Plane, Truck, Ship } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MiniLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
  text?: string;
}

const sizeClasses = {
  xs: { container: "w-4 h-4", icon: "w-2.5 h-2.5" },
  sm: { container: "w-6 h-6", icon: "w-3.5 h-3.5" },
  md: { container: "w-8 h-8", icon: "w-4 h-4" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
};

const transportIcons = [Package, Plane, Truck, Ship];

export function MiniLoader({ 
  size = "sm", 
  className,
  showText = false,
  text = "Chargement..."
}: MiniLoaderProps) {
  const sizes = sizeClasses[size];
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % transportIcons.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = transportIcons[iconIndex];
  
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative">
        {/* Outer ring animation */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-primary/30",
            sizes.container
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            borderTopColor: 'hsl(var(--primary))',
          }}
        />
        
        {/* Icon container */}
        <div className={cn(
          "relative flex items-center justify-center rounded-full bg-primary/10",
          sizes.container
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={iconIndex}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentIcon className={cn("text-primary", sizes.icon)} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showText && (
        <motion.span
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
}

// Inline loader for buttons
export function ButtonLoader({ className }: { className?: string }) {
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % transportIcons.length);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = transportIcons[iconIndex];

  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", className)}
      animate={{ rotate: [0, 5, -5, 0] }}
      transition={{
        duration: 0.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <CurrentIcon className="w-4 h-4 text-current" />
    </motion.div>
  );
}

// Skeleton loader with transport animation
export function PackageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <MiniLoader size="md" showText text="Chargement des données..." />
    </div>
  );
}

// Full page loading state
export function PageLoadingState({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <MiniLoader size="lg" />
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}
