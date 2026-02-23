import { useRef, useCallback, useState } from "react";

/**
 * Hook to detect a swipe-down gesture with progressive visual feedback.
 * Returns translateY for progressive sheet closing and touch handlers.
 */
export function useSwipeDown(onSwipeDown: () => void, threshold = 80) {
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    if (startY.current !== null && currentY.current !== null) {
      const delta = Math.max(0, currentY.current - startY.current);
      // Apply dampening for natural feel
      setTranslateY(delta * 0.6);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (startY.current !== null && currentY.current !== null) {
      const delta = currentY.current - startY.current;
      if (delta > threshold) {
        onSwipeDown();
      }
    }
    startY.current = null;
    currentY.current = null;
    setTranslateY(0);
    setIsDragging(false);
  }, [onSwipeDown, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd, translateY, isDragging };
}
