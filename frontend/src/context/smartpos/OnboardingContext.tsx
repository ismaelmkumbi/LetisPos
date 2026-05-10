import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchOnboardingState,
  updateOnboardingStep,
  type OnboardingState,
  type OnboardingStep,
} from 'src/api/smartpos/onboarding';

interface OnboardingContextValue {
  state: OnboardingState;
  loading: boolean;
  completeStep: (step: OnboardingStep) => Promise<void>;
  dismissBanner: () => void;
  bannerDismissed: boolean;
  resetOnboarding: () => Promise<void>;
}

const DEFAULT_STATE: OnboardingState = {
  workspace: true,
  warehouse: false,
  tax: false,
  products: false,
  staff: false,
  firstSale: false,
  percent: 20,
  isComplete: false,
  completedAt: null,
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const BANNER_DISMISSED_KEY = 'letispos:banner:dismissed';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem(BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchOnboardingState()
      .then((s) => setState(s))
      .catch(() => setState(DEFAULT_STATE))
      .finally(() => setLoading(false));
  }, []);

  const completeStep = React.useCallback(async (step: OnboardingStep) => {
    await updateOnboardingStep(step, true);
    setState((prev) => {
      // Map snake_case step key to camelCase state property (e.g. 'first_sale' → 'firstSale')
      const stateKey = step === 'first_sale' ? 'firstSale' : step;
      const next = { ...prev, [stateKey]: true };
      const steps: (keyof OnboardingState)[] = ['workspace', 'warehouse', 'tax', 'products', 'firstSale'];
      const completed = steps.filter((k) => next[k]).length;
      return {
        ...next,
        percent: Math.round((completed / steps.length) * 100),
        isComplete: completed === steps.length,
        completedAt: completed === steps.length ? new Date().toISOString() : prev.completedAt,
      };
    });
  }, []);

  const dismissBanner = React.useCallback(() => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const resetOnboarding = React.useCallback(async () => {
    const steps: OnboardingStep[] = ['workspace', 'warehouse', 'tax', 'products', 'first_sale'];
    await Promise.all(steps.map((s) => updateOnboardingStep(s, false)));
    setState(DEFAULT_STATE);
    setBannerDismissed(false);
    try {
      localStorage.removeItem(BANNER_DISMISSED_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      loading,
      completeStep,
      dismissBanner,
      bannerDismissed,
      resetOnboarding,
    }),
    [state, loading, completeStep, dismissBanner, bannerDismissed, resetOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
