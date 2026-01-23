import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  progress: number;
  pullDistance: number;
}

export function PullToRefreshIndicator({ 
  isRefreshing, 
  progress, 
  pullDistance 
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        style={{ 
          paddingTop: `calc(${Math.min(pullDistance, 80)}px + env(safe-area-inset-top, 0px))` 
        }}
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-card border shadow-lg flex items-center justify-center"
          style={{
            transform: `scale(${0.5 + progress * 0.5})`,
          }}
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : { rotate: progress * 360 }}
            transition={isRefreshing ? { 
              duration: 1, 
              repeat: Infinity, 
              ease: "linear" 
            } : { 
              duration: 0 
            }}
          >
            <RefreshCw 
              className={`w-5 h-5 ${isRefreshing ? 'text-primary' : 'text-muted-foreground'}`} 
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
