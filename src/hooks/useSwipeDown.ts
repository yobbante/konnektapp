import { useRef, useCallback } from "react";

/**
 * Hook to detect a swipe-down gesture and trigger a callback.
 * Attach onTouchStart/onTouchMove/onTouchEnd to the container element.
 */
export function useSwipeDown(onSwipeDown: () => void, threshold = 80) {
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
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
  }, [onSwipeDown, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
