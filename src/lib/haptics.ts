/**
 * Lightweight haptic feedback for mobile.
 * Falls back silently when Vibration API is unavailable.
 */
export function hapticLight() {
  navigator.vibrate?.(10);
}

export function hapticMedium() {
  navigator.vibrate?.(25);
}

export function hapticSuccess() {
  navigator.vibrate?.([15, 50, 15]);
}

export function hapticError() {
  navigator.vibrate?.([30, 80, 30]);
}
