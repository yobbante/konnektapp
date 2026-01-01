import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface BookingState {
  offerId?: string;
  returnPath?: string;
  formData?: Record<string, any>;
}

const BOOKING_STORAGE_KEY = "pending_booking_state";

export function useNavigationState() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastHomeClickRef = useRef<number>(0);

  // Save booking state before redirecting to auth
  const saveBookingState = useCallback((state: BookingState) => {
    sessionStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify({
      ...state,
      returnPath: state.returnPath || location.pathname,
      timestamp: Date.now(),
    }));
  }, [location.pathname]);

  // Get and clear saved booking state
  const getAndClearBookingState = useCallback((): BookingState | null => {
    const stored = sessionStorage.getItem(BOOKING_STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const state = JSON.parse(stored);
      // Only use if less than 30 minutes old
      if (Date.now() - state.timestamp > 30 * 60 * 1000) {
        sessionStorage.removeItem(BOOKING_STORAGE_KEY);
        return null;
      }
      sessionStorage.removeItem(BOOKING_STORAGE_KEY);
      return state;
    } catch {
      sessionStorage.removeItem(BOOKING_STORAGE_KEY);
      return null;
    }
  }, []);

  // Check if booking state exists
  const hasBookingState = useCallback((): boolean => {
    const stored = sessionStorage.getItem(BOOKING_STORAGE_KEY);
    if (!stored) return false;
    try {
      const state = JSON.parse(stored);
      return Date.now() - state.timestamp < 30 * 60 * 1000;
    } catch {
      return false;
    }
  }, []);

  // Handle home double-tap to refresh
  const handleHomeNavigation = useCallback(() => {
    const now = Date.now();
    const isDoubleTap = now - lastHomeClickRef.current < 500;
    
    if (location.pathname === "/" && isDoubleTap) {
      // Double-tap on home when already on home - reload
      window.location.reload();
    } else if (location.pathname === "/") {
      // Single tap on home when already on home - do nothing but record time
      lastHomeClickRef.current = now;
    } else {
      // Navigate to home
      navigate("/");
      lastHomeClickRef.current = now;
    }
  }, [location.pathname, navigate]);

  return {
    saveBookingState,
    getAndClearBookingState,
    hasBookingState,
    handleHomeNavigation,
  };
}
