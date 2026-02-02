/**
 * AppEntryLoader - Premium 5D Entry Animation
 * 
 * Features:
 * - Immersive dark gradient with 3D parallax layers
 * - Glassmorphism effects
 * - Centered Y logo with premium pulse
 * - Smooth trajectory animation (A → B)
 * - Word cycling: Colis, Bagages, Marchandises, Fret
 * - Max 1.5-2s duration, auto-dismiss when ready
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Package, Plane, Truck, Ship } from "lucide-react";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

const cyclingWords = ["Colis", "Bagages", "Marchandises", "Fret"];
const cyclingIcons = [Package, Plane, Truck, Ship];

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
        }, 100);
      }
    }, 16);

    return () => {
      clearInterval(progressInterval);
      clearInterval(wordInterval);
    };
  }, [minDuration, onComplete]);

  const CurrentIcon = cyclingIcons[wordIndex];

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a0f0a 0%, #0d1f12 30%, #0a1a0f 60%, #050a05 100%)',
          }}
        >
          {/* 3D Parallax Background Layers */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Layer 1 - Far background orb */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.06) 0%, transparent 60%)',
                filter: 'blur(80px)',
              }}
              animate={{ 
                x: [0, 30, 0],
                y: [0, -20, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Layer 2 - Mid orb */}
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
              animate={{ 
                x: [0, -25, 0],
                y: [0, 30, 0],
                scale: [1, 0.9, 1],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />

            {/* Layer 3 - Close accent */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.04) 0%, transparent 50%)',
                filter: 'blur(40px)',
              }}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-emerald-500/30"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Main Content Container - Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 flex flex-col items-center px-8"
          >
            {/* Logo Container with Glass Effect */}
            <motion.div 
              className="relative mb-6"
              animate={{ 
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute -inset-8 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(34, 197, 94, 0.2), transparent, rgba(16, 185, 129, 0.2), transparent, rgba(34, 197, 94, 0.2))',
                }}
                animate={{ 
                  rotate: [0, 360],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Inner glow */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)',
                }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Main Logo Circle - Glass */}
              <div 
                className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  boxShadow: '0 8px 32px rgba(34, 197, 94, 0.2), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Dynamic Icon inside Y */}
                <div className="relative">
                  <span
                    className="text-5xl font-black select-none"
                    style={{ 
                      color: '#22c55e',
                      textShadow: '0 4px 20px rgba(34, 197, 94, 0.5)',
                    }}
                  >
                    Y
                  </span>
                  {/* Mini cycling icon */}
                  <motion.div
                    className="absolute -bottom-1 -right-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    key={wordIndex}
                  >
                    <CurrentIcon className="w-4 h-4 text-emerald-400/80" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Animated Trajectory Line: A → B */}
            <div className="mb-6 flex items-center gap-3">
              {/* Point A - Origin */}
              <motion.div
                className="relative"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-emerald-500"
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.div>
              
              {/* Animated dotted line */}
              <div className="relative w-28 h-0.5 flex items-center gap-1">
                {[...Array(7)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-0.5 rounded-full bg-emerald-500/40"
                    animate={{ 
                      opacity: [0.3, 1, 0.3],
                      scaleX: [1, 1.2, 1],
                    }}
                    transition={{ 
                      duration: 0.8, 
                      repeat: Infinity, 
                      delay: i * 0.1,
                    }}
                  />
                ))}
                {/* Moving package indicator */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center"
                  animate={{ 
                    x: ["-10%", "600%"],
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  <Package className="w-2.5 h-2.5 text-emerald-400" />
                </motion.div>
              </div>
              
              {/* Point B - Destination */}
              <motion.div
                className="relative"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-emerald-500"
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </motion.div>
            </div>

            {/* Cycling Word with Icon */}
            <div className="h-8 flex items-center justify-center overflow-hidden mb-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={wordIndex}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-center gap-2"
                >
                  <CurrentIcon className="w-4 h-4 text-emerald-400/70" />
                  <span className="text-lg font-medium text-emerald-400/90 tracking-wide">
                    {cyclingWords[wordIndex]}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Premium Progress Bar */}
            <div className="w-24 h-1 rounded-full overflow-hidden bg-emerald-900/30">
              <motion.div
                className="h-full rounded-full"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.6) 0%, rgba(16, 185, 129, 0.8) 100%)',
                  boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                }}
              />
            </div>
          </motion.div>

          {/* Bottom Branding - Glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-8 text-center"
            style={{ 
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div 
              className="px-4 py-2 rounded-full"
              style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <p className="text-[11px] text-emerald-400/60 font-medium tracking-[0.2em] uppercase">
                Yobbanté Connect
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
