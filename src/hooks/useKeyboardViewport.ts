import { useState, useEffect } from "react";

/**
 * Hook to detect mobile keyboard open/close and adjust viewport.
 * Uses window.visualViewport API for reliable keyboard detection.
 */
export function useKeyboardViewport() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 0
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const threshold = 150; // Keyboard is at least 150px

    const onResize = () => {
      const heightDiff = window.innerHeight - vv.height;
      const keyboardVisible = heightDiff > threshold;
      setIsKeyboardOpen(keyboardVisible);
      setViewportHeight(vv.height);

      // Set CSS custom property for components to use
      document.documentElement.style.setProperty(
        "--visual-vh",
        `${vv.height}px`
      );
      document.documentElement.style.setProperty(
        "--visual-offset-top",
        `${vv.offsetTop}px`
      );
      document.documentElement.classList.toggle("keyboard-open", keyboardVisible);
    };

    vv.addEventListener("resize", onResize);
    // Initial set
    onResize();

    return () => {
      vv.removeEventListener("resize", onResize);
      document.documentElement.classList.remove("keyboard-open");
    };
  }, []);

  return { isKeyboardOpen, viewportHeight };
}
