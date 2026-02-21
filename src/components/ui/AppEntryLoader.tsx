/**
 * AppEntryLoader - Clean Konnekt Splash Screen
 * White background, logo animation that connects to PWA icon
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import konnektLogo from "@/assets/konnekt-logo.png";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function AppEntryLoader({ onComplete, minDuration = 2000 }: AppEntryLoaderProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setIsComplete(true);
          onComplete?.();
        }, 200);
      }
    }, 16);

    return () => clearInterval(progressInterval);
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
        >
          {/* Logo - matches PWA icon for seamless transition */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="relative mb-8"
          >
            {/* Subtle pulse ring */}
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{
                background: 'radial-gradient(circle, hsla(168, 60%, 42%, 0.08) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            <img
              src={konnektLogo}
              alt="Konnekt"
              className="w-24 h-24 object-contain relative z-10"
            />
          </motion.div>

          {/* Brand name */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-2xl font-bold tracking-[0.12em] uppercase mb-2"
            style={{ color: 'hsl(168, 60%, 42%)' }}
          >
            Konnekt
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-sm tracking-wide mb-10"
            style={{ color: 'hsl(220, 10%, 60%)' }}
          >
            Transport sécurisé par scan
          </motion.p>

          {/* Minimal progress line */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="w-32 h-0.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'hsl(220, 14%, 93%)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: 'hsl(168, 60%, 42%)',
                transition: 'width 0.1s linear',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
