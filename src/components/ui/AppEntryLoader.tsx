/**
 * AppEntryLoader - Premium interactive entry animation
 * 
 * Features the Y logo that transforms into transport vehicles and packages
 * Optimized for mobile 5K displays with smooth animations
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Package, Plane, Truck, Ship, Car } from "lucide-react";

interface AppEntryLoaderProps {
  onComplete?: () => void;
  minDuration?: number;
}

// Transport icons that cycle through
const transportIcons = [
  { Icon: Package, color: "text-white" },
  { Icon: Plane, color: "text-white" },
  { Icon: Truck, color: "text-white" },
  { Icon: Ship, color: "text-white" },
  { Icon: Car, color: "text-white" },
];

export function AppEntryLoader({ onComplete, minDuration = 2000 }: AppEntryLoaderProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIconIndex, setCurrentIconIndex] = useState(-1); // -1 means show Y
  const [showY, setShowY] = useState(true);

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
        }, 400);
      }
    }, 30);

    // Cycle through icons
    const iconInterval = setInterval(() => {
      setShowY(false);
      setCurrentIconIndex(prev => {
        const next = prev + 1;
        if (next >= transportIcons.length) {
          setShowY(true);
          return -1;
        }
        return next;
      });
    }, 350);

    return () => {
      clearInterval(progressInterval);
      clearInterval(iconInterval);
    };
  }, [minDuration, onComplete]);

  const CurrentIcon = currentIconIndex >= 0 ? transportIcons[currentIconIndex].Icon : null;

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary via-primary to-primary/90 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Animated Background Elements - Subtle */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Moving particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/10 rounded-full"
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                }}
                animate={{ 
                  y: [null, -100, null],
                  opacity: [0.1, 0.3, 0.1],
                }}
                transition={{ 
                  duration: 3 + i * 0.5, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              />
            ))}
            
            {/* Gradient circles */}
            <motion.div
              className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-white/5"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 45, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-white/5"
              animate={{ scale: [1.1, 1, 1.1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center px-6"
          >
            {/* Interactive Logo Container */}
            <motion.div className="relative mb-8">
              {/* Outer glow ring */}
              <motion.div
                className="absolute -inset-6 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                }}
                animate={{ 
                  scale: [1, 1.15, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Inner pulse ring */}
              <motion.div
                className="absolute -inset-3 rounded-full border-2 border-white/20"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              
              {/* Main logo circle with glass effect */}
              <motion.div 
                className="relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Y Letter / Transport Icon Animation */}
                <AnimatePresence mode="wait">
                  {showY ? (
                    <motion.span
                      key="y-letter"
                      initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      exit={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="text-6xl font-black text-white select-none"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                    >
                      Y
                    </motion.span>
                  ) : CurrentIcon && (
                    <motion.div
                      key={`icon-${currentIconIndex}`}
                      initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.3, opacity: 0, rotate: 45 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <CurrentIcon className="w-12 h-12 text-white" strokeWidth={1.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* Brand Name - Clean typography */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center mb-10"
            >
              <h1 
                className="text-4xl font-black text-white tracking-tight mb-2"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.15)' }}
              >
                Yobbanté
              </h1>
              <motion.p 
                className="text-white/80 text-sm font-medium tracking-widest uppercase"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Connect
              </motion.p>
            </motion.div>

            {/* Progress Bar - Minimal elegant style */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="w-48"
            >
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>
              
              {/* Status text */}
              <motion.p 
                className="text-center text-white/60 text-xs mt-4 font-medium"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Chargement...
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Bottom tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 text-xs text-white/50 font-medium tracking-wide"
          >
            Logistique Nouvelle Génération
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
