/**
 * KonnektLoader - Unified in-app loader
 * Single consistent loader for all loading states across the app.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface KonnektLoaderProps {
  size?: "xs" | "sm" | "md" | "lg";
  message?: string;
  className?: string;
  fullPage?: boolean;
}

const sizeConfig = {
  xs: { ring: "w-4 h-4", dot: "w-1 h-1", border: "border-[1.5px]" },
  sm: { ring: "w-6 h-6", dot: "w-1.5 h-1.5", border: "border-2" },
  md: { ring: "w-10 h-10", dot: "w-2 h-2", border: "border-2" },
  lg: { ring: "w-14 h-14", dot: "w-2.5 h-2.5", border: "border-[3px]" },
};

export function KonnektLoader({
  size = "md",
  message,
  className,
  fullPage = false,
}: KonnektLoaderProps) {
  const s = sizeConfig[size];

  const loader = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        {/* Spinning ring */}
        <motion.div
          className={cn(
            s.ring,
            s.border,
            "rounded-full border-muted"
          )}
          style={{ borderTopColor: 'hsl(168, 60%, 42%)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />

        {/* Center dot */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
            s.dot
          )}
          style={{ backgroundColor: 'hsl(168, 60%, 42%)' }}
        />
      </div>

      {message && (
        <motion.p
          className="text-sm text-muted-foreground font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {loader}
      </div>
    );
  }

  return loader;
}

// Convenience exports
export function KonnektPageLoader({ message = "Chargement..." }: { message?: string }) {
  return <KonnektLoader size="lg" message={message} fullPage />;
}

export function KonnektInlineLoader({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <KonnektLoader size="md" message={message} />
    </div>
  );
}

export function KonnektButtonLoader({ className }: { className?: string }) {
  return <KonnektLoader size="xs" className={className} />;
}
