import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { TransportLoader, TransportPageLoader as TransportFullLoader } from "./TransportLoader";

interface PageLoaderProps {
  message?: string;
  variant?: "default" | "transport";
}

export function PageLoader({ message = "Chargement...", variant = "transport" }: PageLoaderProps) {
  // Use transport loader by default for better branding
  if (variant === "transport") {
    return <TransportFullLoader message={message} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      {/* Animated Box Container */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 3D Box Animation */}
        <motion.div
          className="relative w-20 h-20"
          animate={{
            rotateY: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Box Front Face */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg flex items-center justify-center"
            animate={{
              boxShadow: [
                "0 4px 20px -5px hsl(var(--primary) / 0.3)",
                "0 8px 30px -5px hsl(var(--primary) / 0.5)",
                "0 4px 20px -5px hsl(var(--primary) / 0.3)",
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Package className="w-10 h-10 text-primary-foreground" />
          </motion.div>
        </motion.div>

        {/* Floating Particles */}
        <motion.div
          className="absolute -top-2 -left-2 w-3 h-3 rounded-full bg-secondary"
          animate={{
            y: [-5, 5, -5],
            x: [-3, 3, -3],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-2 -right-2 w-2 h-2 rounded-full bg-primary"
          animate={{
            y: [5, -5, 5],
            x: [3, -3, 3],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
        <motion.div
          className="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-warning"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        />
      </motion.div>

      {/* Loading Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.p
          className="text-muted-foreground text-sm font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {message}
        </motion.p>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        className="w-32 h-1 bg-muted rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}

// Re-export TransportLoader components for convenience
export { TransportLoader, TransportPageLoader } from "./TransportLoader";

