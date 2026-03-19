/**
 * AppEntryLoader - Konnekt Splash with logo image
 * Shows the Konnekt logo with a subtle animation then expands out
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import konnektLogo from "@/assets/konnekt-logo-icon.png";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

const TEAL = "hsl(168, 60%, 42%)";

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
        }, 600);
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
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        >
          {/* Logo */}
          <motion.div
            className="mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={phase === 'expanding'
              ? { scale: 3, opacity: 0, rotate: 180 }
              : { scale: 1, opacity: 1, rotate: 0 }
            }
            transition={phase === 'expanding'
              ? { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
            }
          >
            <img src={konnektLogo} alt="Konnekt" className="w-24 h-24 object-contain" />
          </motion.div>

          {/* Brand name */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={phase === 'expanding' ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: phase === 'expanding' ? 0 : 0.25 }}
            className="text-2xl font-bold tracking-[0.14em] uppercase mb-1.5 text-primary"
          >
            Konnekt
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={phase === 'expanding' ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.3, delay: phase === 'expanding' ? 0 : 0.35 }}
            className="text-xs tracking-widest uppercase mb-8 text-muted-foreground"
          >
            Transport sécurisé par scan
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={phase === 'expanding' ? { opacity: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.25, delay: phase === 'expanding' ? 0 : 0.3 }}
            className="w-28 h-[2px] rounded-full overflow-hidden bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${progress}%`,
                transition: 'width 0.08s linear',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
