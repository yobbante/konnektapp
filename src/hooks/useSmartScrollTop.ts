import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook for smart scroll-to-top behavior
 * Scrolls to top on route changes and provides a function for manual scroll
 */
export function useSmartScrollTop() {
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  // Manual scroll function for step changes
  const scrollToTop = useCallback((behavior: ScrollBehavior = "smooth") => {
    window.scrollTo({ top: 0, behavior });
  }, []);

  // Scroll to element
  const scrollToElement = useCallback((elementId: string, offset = 80) => {
    const element = document.getElementById(elementId);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  return { scrollToTop, scrollToElement };
}

/**
 * Component to auto-scroll on route change
 */
export function SmartScrollTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
