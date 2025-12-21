import { useCallback, useRef, useEffect } from "react";

// Simple notification sound using Web Audio API
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create a simple "ping" sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
  oscillator.type = "sine";
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

export function useNotificationSound() {
  const hasPermission = useRef(false);

  // Request permission on first user interaction
  useEffect(() => {
    const enableSound = () => {
      hasPermission.current = true;
      // Remove listener after first interaction
      document.removeEventListener("click", enableSound);
      document.removeEventListener("touchstart", enableSound);
    };

    document.addEventListener("click", enableSound);
    document.addEventListener("touchstart", enableSound);

    return () => {
      document.removeEventListener("click", enableSound);
      document.removeEventListener("touchstart", enableSound);
    };
  }, []);

  const playSound = useCallback(() => {
    if (!hasPermission.current) return;
    
    try {
      createNotificationSound();
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  }, []);

  const vibrate = useCallback((pattern: number | number[] = 200) => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn("Vibration not supported:", error);
      }
    }
  }, []);

  const notify = useCallback((options?: { sound?: boolean; vibrate?: boolean | number[] }) => {
    const { sound = true, vibrate: shouldVibrate = true } = options || {};
    
    if (sound) {
      playSound();
    }
    
    if (shouldVibrate) {
      vibrate(typeof shouldVibrate === "boolean" ? [100, 50, 100] : shouldVibrate);
    }
  }, [playSound, vibrate]);

  return {
    playSound,
    vibrate,
    notify,
  };
}
