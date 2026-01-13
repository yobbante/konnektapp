import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
  text?: string;
}

const sizeClasses = {
  xs: { container: "w-4 h-4", icon: "w-2 h-2", particle: "w-1 h-1" },
  sm: { container: "w-6 h-6", icon: "w-3 h-3", particle: "w-1 h-1" },
  md: { container: "w-8 h-8", icon: "w-4 h-4", particle: "w-1.5 h-1.5" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6", particle: "w-2 h-2" },
};

export function MiniLoader({ 
  size = "sm", 
  className,
  showText = false,
  text = "Chargement..."
}: MiniLoaderProps) {
  const sizes = sizeClasses[size];
  
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* 3D Box Animation */}
        <motion.div
          className={cn("relative", sizes.container)}
          animate={{
            rotateY: [0, 180, 360],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Box Front Face */}
          <motion.div
            className={cn(
              "absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-md flex items-center justify-center",
              sizes.container
            )}
            animate={{
              boxShadow: [
                "0 2px 8px -2px hsl(var(--primary) / 0.3)",
                "0 4px 12px -2px hsl(var(--primary) / 0.5)",
                "0 2px 8px -2px hsl(var(--primary) / 0.3)",
              ],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Package className={cn("text-primary-foreground", sizes.icon)} />
          </motion.div>
        </motion.div>

        {/* Floating Particles - only show for md and lg */}
        {(size === "md" || size === "lg") && (
          <>
            <motion.div
              className={cn("absolute -top-0.5 -left-0.5 rounded-full bg-secondary", sizes.particle)}
              animate={{
                y: [-2, 2, -2],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className={cn("absolute -bottom-0.5 -right-0.5 rounded-full bg-primary", sizes.particle)}
              animate={{
                y: [2, -2, 2],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
          </>
        )}
      </motion.div>

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
  return (
    <motion.div
      className={cn("inline-flex items-center justify-center", className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <Package className="w-4 h-4 text-current" />
    </motion.div>
  );
}

// Skeleton loader with package animation
export function PackageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <MiniLoader size="md" showText text="Chargement des données..." />
    </div>
  );
}
