/**
 * AppEntryLoader - Konnekt Splash with 4 dots forming a K
 * Pure white, dots expand outward with rotation then fade
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

const TEAL = "hsl(168, 60%, 42%)";
const TEAL_LIGHT = "hsl(168, 50%, 62%)";

// 4 dots forming a K shape
const DOTS = [
  { x: -20, y: -30, size: 14, delay: 0 },
  { x: -20, y: 30, size: 14, delay: 0.08 },
  { x: 22, y: -28, size: 12, delay: 0.12 },
  { x: 22, y: 28, size: 12, delay: 0.16 },
];

// Lines connecting dots
const LINES = [
  [0, 1], // vertical backbone
  [0, 2], // top-right diagonal (via center)
  [1, 3], // bottom-right diagonal (via center)
];

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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
        >
          {/* Dots constellation */}
          <motion.div
            className="relative mb-6"
            style={{ width: 120, height: 120 }}
            animate={phase === 'expanding' ? { rotate: 180, scale: 3, opacity: 0 } : { rotate: 0, scale: 1, opacity: 1 }}
            transition={phase === 'expanding'
              ? { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.3 }
            }
          >
            <svg viewBox="-50 -50 100 100" className="w-full h-full">
              {/* Lines */}
              {LINES.map(([a, b], i) => (
                <motion.line
                  key={`line-${i}`}
                  x1={DOTS[a].x} y1={DOTS[a].y}
                  x2={DOTS[b].x} y2={DOTS[b].y}
                  stroke={TEAL_LIGHT}
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={phase === 'expanding'
                    ? { opacity: 0 }
                    : { pathLength: 1, opacity: 0.5 }
                  }
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                />
              ))}
              {/* Dots */}
              {DOTS.map((dot, i) => (
                <motion.circle
                  key={`dot-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.size / 2}
                  fill={TEAL}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={phase === 'expanding'
                    ? {
                        cx: dot.x * 4,
                        cy: dot.y * 4,
                        scale: 2.5,
                        opacity: 0,
                      }
                    : { scale: 1, opacity: 1 }
                  }
                  transition={phase === 'expanding'
                    ? { duration: 0.5, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] }
                    : { duration: 0.35, delay: dot.delay, ease: [0.23, 1, 0.32, 1] }
                  }
                />
              ))}
            </svg>
          </motion.div>

          {/* Brand name */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={phase === 'expanding' ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: phase === 'expanding' ? 0 : 0.25 }}
            className="text-2xl font-bold tracking-[0.14em] uppercase mb-1.5"
            style={{ color: TEAL }}
          >
            Konnekt
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={phase === 'expanding' ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.3, delay: phase === 'expanding' ? 0 : 0.35 }}
            className="text-xs tracking-widest uppercase mb-8"
            style={{ color: 'hsl(220, 10%, 58%)' }}
          >
            Transport sécurisé par scan
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={phase === 'expanding' ? { opacity: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.25, delay: phase === 'expanding' ? 0 : 0.3 }}
            className="w-28 h-[2px] rounded-full overflow-hidden"
            style={{ backgroundColor: 'hsl(220, 14%, 92%)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: TEAL,
                transition: 'width 0.08s linear',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
