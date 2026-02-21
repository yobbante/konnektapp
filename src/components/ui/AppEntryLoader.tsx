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

export function AppEntryLoader({ onComplete, minDuration = 1600 }: AppEntryLoaderProps) {
  const [phase, setPhase] = useState<'loading' | 'expanding' | 'done'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(progressInterval);
        setPhase('expanding');
        setTimeout(() => {
          setPhase('done');
          onComplete?.();
        }, 500);
      }
    }, 16);

    return () => clearInterval(progressInterval);
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
        >
          {/* Logo — larger, with expand-out transition */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={
              phase === 'expanding'
                ? { scale: 12, opacity: 0 }
                : { scale: 1, opacity: 1 }
            }
            transition={
              phase === 'expanding'
                ? { duration: 0.45, ease: [0.4, 0, 0.2, 1] }
                : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
            }
            className="relative mb-6"
          >
            <img
              src={konnektLogo}
              alt="Konnekt"
              className="w-36 h-36 object-contain"
            />
          </motion.div>

          {/* Brand name */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={
              phase === 'expanding'
                ? { opacity: 0, y: -10 }
                : { opacity: 1, y: 0 }
            }
            transition={{ duration: 0.3, delay: phase === 'expanding' ? 0 : 0.2 }}
            className="text-2xl font-bold tracking-[0.14em] uppercase mb-1.5"
            style={{ color: 'hsl(168, 60%, 42%)' }}
          >
            Konnekt
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={
              phase === 'expanding'
                ? { opacity: 0 }
                : { opacity: 1 }
            }
            transition={{ duration: 0.3, delay: phase === 'expanding' ? 0 : 0.35 }}
            className="text-xs tracking-widest uppercase mb-8"
            style={{ color: 'hsl(220, 10%, 58%)' }}
          >
            Transport sécurisé par scan
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={
              phase === 'expanding'
                ? { opacity: 0, scaleX: 0.5 }
                : { opacity: 1, scaleX: 1 }
            }
            transition={{ duration: 0.25, delay: phase === 'expanding' ? 0 : 0.3 }}
            className="w-28 h-[2px] rounded-full overflow-hidden"
            style={{ backgroundColor: 'hsl(220, 14%, 92%)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: 'hsl(168, 60%, 42%)',
                transition: 'width 0.08s linear',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
