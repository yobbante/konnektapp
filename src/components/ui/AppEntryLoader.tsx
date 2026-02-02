/**
 * AppEntryLoader - Ultra Premium 5D Entry Animation
 * 
 * Features:
 * - Immersive 3D depth with parallax layers
 * - Glassmorphism and reflections
 * - Optimized for 5K mobile displays
 * - Smooth 60fps animations
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function AppEntryLoader({ onComplete, minDuration = 1800 }: AppEntryLoaderProps) {
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
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 50%, hsl(var(--primary) / 0.95) 100%)',
          }}
        >
          {/* 5D Depth Layers - Background */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Deep layer - slow movement */}
            <motion.div
              className="absolute inset-0"
              animate={{ 
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
              }}
            />
            
            {/* Mid layer - floating orbs */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              animate={{ 
                x: [0, 30, 0],
                y: [0, -20, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            
            <motion.div
              className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
              animate={{ 
                x: [0, -20, 0],
                y: [0, 30, 0],
                scale: [1.1, 1, 1.1],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Light rays */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.03) 60deg, transparent 120deg)',
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Main Content Container */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 flex flex-col items-center px-8"
          >
            {/* Logo Container with 3D effect */}
            <div className="relative mb-10">
              {/* Outer glow */}
              <motion.div
                className="absolute -inset-8 rounded-full opacity-50"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Glass circle with reflection */}
              <motion.div 
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: `
                    0 25px 50px -12px rgba(0,0,0,0.15),
                    inset 0 1px 1px rgba(255,255,255,0.3),
                    inset 0 -1px 1px rgba(0,0,0,0.1)
                  `,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                animate={{ 
                  rotateY: [0, 5, 0, -5, 0],
                  rotateX: [0, -3, 0, 3, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Top reflection */}
                <div 
                  className="absolute top-2 left-4 right-4 h-8 rounded-full"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                  }}
                />
                
                {/* Y Letter - Premium Typography */}
                <motion.span
                  className="text-5xl font-black text-white select-none relative z-10"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    textShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  }}
                  animate={{ 
                    scale: [1, 1.02, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  Y
                </motion.span>
              </motion.div>
            </div>

            {/* Brand Name - Clean & Elegant */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center mb-10"
            >
              <h1 
                className="text-3xl font-black text-white tracking-tight mb-1"
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '0 2px 20px rgba(0,0,0,0.15)',
                }}
              >
                Yobbanté
              </h1>
              <motion.span 
                className="text-white/70 text-sm font-medium tracking-[0.3em] uppercase"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Connect
              </motion.span>
            </motion.div>

            {/* Minimal Progress Indicator */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="w-32"
            >
              <div 
                className="h-0.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ 
                    width: `${progress}%`,
                    background: 'rgba(255,255,255,0.9)',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom tagline - ultra subtle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 text-[11px] text-white/40 font-medium tracking-wider uppercase"
            style={{ 
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            Logistique Nouvelle Génération
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
