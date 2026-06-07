/**
 * Dynamic brand palette — derives full color scales from a single base colour.
 *
 * Problem this solves:
 *   src/theme/smartpos/brand.ts is a static object.  When a tenant changes
 *   their primary / accent colour in BrandIdentity, MUI's theme updates
 *   (Theme.tsx reads from BrandContext), but components that import the
 *   static `brand` object directly still show the old hard-coded Letis
 *   green (#16A34A).
 *
 * How it works:
 *   1. `buildScale(base)` creates a 50-900 scale by rotating the hue
 *      toward teal, adjusting saturation, and shifting lightness.
 *   2. `useDynamicBrand()` returns a brand-compatible object where every
 *      palette value reflects the tenant's current brand colours.
 *   3. Components replace `import { brand } from 'src/theme/smartpos/brand'`
 *      with `const brand = useDynamicBrand()`.
 *
 * Design intent (matches Tailwind / MUI conventions):
 *   - 50  : very light tint  (page backgrounds, soft fills)
 *   - 100 : light tint        (hover states, subtle borders)
 *   - 200 : lighter           (disabled backgrounds)
 *   - 300 : light-mid         (borders, dividers)
 *   - 400 : mid-light         (secondary emphasis)
 *   - 500 : base              (the tenant's chosen colour)
 *   - 600 : mid-dark          (primary buttons, active states)
 *   - 700 : dark              (hover on primary)
 *   - 800 : darker            (text on light backgrounds)
 *   - 900 : very dark         (headings, emphasis text)
 */

import { useMemo } from 'react';
import { useBrand } from 'src/context/smartpos/BrandContext';
import { staticBrand } from './brand';

/* ── HSL helpers ─────────────────────────────────────────────────────────── */

interface HSL { h: number; s: number; l: number }

function hexToHsl(hex: string): HSL {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return { h: 145, s: 62, l: 42 }; // fallback Letis green
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case R: h = ((G - B) / d + (G < B ? 6 : 0)) / 6; break;
      case G: h = ((B - R) / d + 2) / 6; break;
      case B: h = ((R - G) / d + 4) / 6; break;
    }
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: HSL): string {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* ── Scale builder ───────────────────────────────────────────────────────── */

interface Scale { 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string; 800: string; 900: string }

function buildScale(baseHex: string): Scale {
  const base = hexToHsl(baseHex);

  // Preserve original hue; shift slightly toward a "brand-friendly" direction.
  // For warm colours (red/orange/yellow) we keep them as-is; for others we
  // nudge toward teal-green so the scale looks balanced on enterprise UI.
  const hueShift = (base.h >= 30 && base.h <= 60) ? 0     // warm: leave alone
    : (base.h >= 120 && base.h <= 180) ? 0                // already green-teal
    : (base.h > 180 && base.h <= 240) ? -8                // blue → slightly teal
    : (base.h > 240) ? -12                              // purple → more teal
    : 8;                                                  // red/orange → warm green

  const h = base.h + hueShift;

  // Saturation drops as we go lighter, stays high in mid-tones
  const s500 = Math.min(85, Math.max(35, base.s));
  const sValues = {
    50:  Math.max(10, s500 * 0.25),
    100: Math.max(15, s500 * 0.40),
    200: Math.max(20, s500 * 0.55),
    300: Math.max(25, s500 * 0.70),
    400: Math.max(30, s500 * 0.85),
    500: s500,
    600: Math.min(90, s500 * 1.05),
    700: Math.min(95, s500 * 1.10),
    800: Math.min(98, s500 * 1.15),
    900: Math.min(100, s500 * 1.20),
  };

  // Lightness values — 50 very light, 500 base (tenant colour), 900 very dark
  const lBase = Math.min(55, Math.max(40, base.l));
  const lValues = {
    50:  97,
    100: 94,
    200: 88,
    300: 80,
    400: lBase + 12,
    500: lBase,
    600: lBase - 10,
    700: lBase - 18,
    800: lBase - 26,
    900: Math.max(10, lBase - 36),
  };

  return {
    50:  hslToHex({ h, s: sValues[50],  l: lValues[50] }),
    100: hslToHex({ h, s: sValues[100], l: lValues[100] }),
    200: hslToHex({ h, s: sValues[200], l: lValues[200] }),
    300: hslToHex({ h, s: sValues[300], l: lValues[300] }),
    400: hslToHex({ h, s: sValues[400], l: lValues[400] }),
    500: hslToHex({ h, s: sValues[500], l: lValues[500] }),
    600: hslToHex({ h, s: sValues[600], l: lValues[600] }),
    700: hslToHex({ h, s: sValues[700], l: lValues[700] }),
    800: hslToHex({ h, s: sValues[800], l: lValues[800] }),
    900: hslToHex({ h, s: sValues[900], l: lValues[900] }),
  };
}

/* ── Dynamic brand object ────────────────────────────────────────────────── */

export interface DynamicBrand {
  primary: Scale;
  accent: Scale;
  neutral: typeof staticBrand.neutral;
  success: typeof staticBrand.success;
  warning: typeof staticBrand.warning;
  error: typeof staticBrand.error;
  info: typeof staticBrand.info;
  purple: typeof staticBrand.purple;
  operational: typeof staticBrand.operational;
}

export function buildDynamicBrand(primaryHex: string, accentHex?: string): DynamicBrand {
  const primary = buildScale(primaryHex);
  const accent = buildScale(accentHex ?? primaryHex);
  return {
    primary,
    accent,
    neutral: staticBrand.neutral,
    success: staticBrand.success,
    warning: staticBrand.warning,
    error: staticBrand.error,
    info: staticBrand.info,
    purple: staticBrand.purple,
    operational: staticBrand.operational,
  };
}

/** Hook that returns a brand-compatible object using the tenant's current colours. */
export function useDynamicBrand(): DynamicBrand {
  const { profile } = useBrand();
  return useMemo(
    () => buildDynamicBrand(
      profile?.primaryColor ?? staticBrand.primary[600],
      profile?.accentColor,
    ),
    [profile?.primaryColor, profile?.accentColor],
  );
}

/** Convenience: just the primary scale (for simple component usage). */
export function usePrimaryScale(): Scale {
  const { profile } = useBrand();
  return useMemo(
    () => buildScale(profile?.primaryColor ?? staticBrand.primary[600]),
    [profile?.primaryColor],
  );
}
