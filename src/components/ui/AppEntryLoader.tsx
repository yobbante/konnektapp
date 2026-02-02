/**
 * AppEntryLoader - High-resolution premium entry animation
 * 
 * Displays a sophisticated branded loader when entering the app
 * Designed to feel like a native mobile app splash screen
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function AppEntryLoader({ onComplete, minDuration = 1500 }: AppEntryLoaderProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    
    // Animate progress
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / minDuration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setIsComplete(true);
          onComplete?.();
        }, 300);
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating circles */}
            <motion.div
              className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5"
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [0, -90, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full bg-white/3"
              animate={{ 
                y: [-20, 20, -20],
                x: [-10, 10, -10],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Logo Container */}
            <motion.div
              className="relative mb-8"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Glowing ring */}
              <motion.div
                className="absolute -inset-4 rounded-full bg-white/10 blur-xl"
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* Logo circle */}
              <div className="relative w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                >
                  {/* Y Letter */}
                  <span className="text-5xl font-black text-white tracking-tighter">Y</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center mb-10"
            >
              <h1 className="text-4xl font-black text-white tracking-tight mb-1">
                Yobbanté
              </h1>
              <p className="text-white/70 text-sm font-medium tracking-wide">
                Envoyez & Transportez
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "10rem" }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="relative"
            >
              <div className="w-40 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              
              {/* Loading dots */}
              <motion.div 
                className="flex justify-center mt-4 gap-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-white/60 rounded-full"
                    animate={{ 
                      opacity: [0.4, 1, 0.4],
                      scale: [0.8, 1, 0.8],
                    }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Bottom branding */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 text-xs text-white/50 font-medium"
          >
            Logistique Nouvelle Génération
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
