/**
 * AppEntryLoader - Premium Entry Animation (Minimal Logistics)
 * 
 * Features:
 * - Dark/gradient green Yobbanté background
 * - Centered logo with pulse animation
 * - Animated trajectory (point A → B)
 * - Word cycling: Colis, Bagages, Marchandises, Fret
 * - Max 1.5-2s duration, auto-dismiss when ready
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

const cyclingWords = ["Colis", "Bagages", "Marchandises", "Fret"];

export function AppEntryLoader({ onComplete, minDuration = 1800 }: AppEntryLoaderProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    
    // Word cycling
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % cyclingWords.length);
    }, 400);

    // Progress tracking
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
        clearInterval(wordInterval);
        setTimeout(() => {
          setIsComplete(true);
          onComplete?.();
        }, 150);
      }
    }, 16);

    return () => {
      clearInterval(progressInterval);
      clearInterval(wordInterval);
    };
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0a1a0f 0%, #0d2818 50%, #0a1a0f 100%)',
          }}
        >
          {/* Subtle ambient particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
              animate={{ 
                x: [0, 20, 0],
                y: [0, -15, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.05) 0%, transparent 70%)',
                filter: 'blur(50px)',
              }}
              animate={{ 
                x: [0, -15, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.05, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 flex flex-col items-center px-8"
          >
            {/* Logo with pulse */}
            <motion.div 
              className="relative mb-8"
              animate={{ 
                scale: [1, 1.03, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Outer glow */}
              <motion.div
                className="absolute -inset-6 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)',
                }}
                animate={{ 
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Logo Circle */}
              <div 
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.1) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  boxShadow: '0 0 40px rgba(34, 197, 94, 0.2), inset 0 1px 1px rgba(255,255,255,0.1)',
                }}
              >
                <span
                  className="text-4xl font-black select-none"
                  style={{ 
                    color: '#22c55e',
                    textShadow: '0 2px 15px rgba(34, 197, 94, 0.5)',
                  }}
                >
                  Y
                </span>
              </div>
            </motion.div>

            {/* Animated Trajectory Line: A → B */}
            <div className="mb-8 flex items-center gap-2">
              {/* Point A */}
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              
              {/* Animated line */}
              <div className="relative w-24 h-0.5 bg-emerald-500/20 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                  animate={{ 
                    x: ["-100%", "200%"],
                  }}
                  transition={{ 
                    duration: 1.2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  style={{ width: "40%" }}
                />
              </div>
              
              {/* Point B */}
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
              />
            </div>

            {/* Cycling Word */}
            <div className="h-7 flex items-center justify-center overflow-hidden mb-6">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-lg font-medium text-emerald-400/90 tracking-wide"
                >
                  {cyclingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Minimal Progress */}
            <div className="w-20 h-0.5 rounded-full overflow-hidden bg-emerald-500/10">
              <motion.div
                className="h-full rounded-full bg-emerald-500/60"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>

          {/* Bottom Branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-6 text-center"
            style={{ 
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <p className="text-[11px] text-emerald-400/50 font-medium tracking-widest uppercase">
              Yobbanté Connect
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
