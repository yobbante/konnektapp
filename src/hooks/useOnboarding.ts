import { useState, useEffect } from "react";

const ONBOARDING_KEY_PREFIX = "onboarding_completed_";

export type OnboardingRole = "client" | "transporter" | "admin";

export function useOnboarding(role: OnboardingRole) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const key = `${ONBOARDING_KEY_PREFIX}${role}`;
    const completed = localStorage.getItem(key);
    if (!completed) {
      setShowOnboarding(true);
    }
    setHasChecked(true);
  }, [role]);

  const completeOnboarding = () => {
    const key = `${ONBOARDING_KEY_PREFIX}${role}`;
    localStorage.setItem(key, "true");
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    const key = `${ONBOARDING_KEY_PREFIX}${role}`;
    localStorage.removeItem(key);
    setShowOnboarding(true);
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return {
    showOnboarding: hasChecked && showOnboarding,
    completeOnboarding,
    resetOnboarding,
    skipOnboarding,
    isLoading: !hasChecked,
  };
}

// Reset all onboarding for all roles (for testing)
export function resetAllOnboarding() {
  const roles: OnboardingRole[] = ["client", "transporter", "admin"];
  roles.forEach(role => {
    localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}${role}`);
  });
}
