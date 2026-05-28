import { useEffect, useRef, useState } from 'react';
import { useBrand } from 'src/context/smartpos/BrandContext';

export interface BrandPerformanceMetrics {
  profileLoadMs: number;
  tokenComputeMs: number;
  cssInjectMs: number;
  totalMs: number;
}

/**
 * Hook that instruments brand loading performance.
 * Tracks profile fetch → token computation → CSS injection pipeline.
 * Only active in development — returns null metrics in production.
 */
export function useBrandPerformance(): BrandPerformanceMetrics | null {
  const { profile, designTokens, loading } = useBrand();
  const [metrics, setMetrics] = useState<BrandPerformanceMetrics | null>(null);
  const loadStart = useRef(window.performance.now());
  const lastProfileRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (import.meta.env.PROD) return;

    if (loading) {
      loadStart.current = performance.now();
      return;
    }

    if (!profile) return;

    // Only re-measure when profile actually changes
    const profileKey = `${profile.id}-${profile.updatedAt}`;
    if (profileKey === lastProfileRef.current) return;
    lastProfileRef.current = profileKey;

    const loadEnd = performance.now();
    const profileLoadMs = Math.round((loadEnd - loadStart.current) * 100) / 100;

    // Token compute time — measure via requestAnimationFrame diff
    const computeStart = performance.now();
    requestAnimationFrame(() => {
      const computeEnd = performance.now();
      const tokenComputeMs = Math.round((computeEnd - computeStart) * 100) / 100;

      // CSS injection time
      const injectStart = performance.now();
      requestAnimationFrame(() => {
        const injectEnd = performance.now();
        const cssInjectMs = Math.round((injectEnd - injectStart) * 100) / 100;

        setMetrics({
          profileLoadMs,
          tokenComputeMs,
          cssInjectMs,
          totalMs: Math.round((profileLoadMs + tokenComputeMs + cssInjectMs) * 100) / 100,
        });
      });
    });
  }, [profile, loading, designTokens]);

  return metrics;
}
