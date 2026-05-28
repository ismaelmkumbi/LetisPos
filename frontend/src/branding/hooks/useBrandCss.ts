import { useEffect, useRef } from 'react';
import { useBrand } from 'src/context/smartpos/BrandContext';

/**
 * Hook that injects brand design tokens as CSS custom properties
 * on the :root element. Consumes pre-computed tokens from BrandContext
 * to avoid duplicate computation.
 *
 * Place this hook in any component tree wrapped by BrandProvider.
 * It has no return value — its effect is mutating document.documentElement.style.
 */
export function useBrandCss() {
  const { designTokens, profile } = useBrand();
  const prevKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!profile?.id || Object.keys(designTokens).length === 0) return;

    const root = document.documentElement;
    const currentKeys = new Set<string>();

    Object.entries(designTokens).forEach(([path, value]) => {
      const cssPath = `--bp-${path.replace(/\./g, '-')}`;
      currentKeys.add(cssPath);
      root.style.setProperty(cssPath, value);
    });

    // Clean up stale properties from previous brand config
    prevKeys.current.forEach(key => {
      if (!currentKeys.has(key)) {
        root.style.removeProperty(key);
      }
    });
    prevKeys.current = currentKeys;
  }, [designTokens, profile?.id]);
}
