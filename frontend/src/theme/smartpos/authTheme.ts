/**
 * Auth page theme — extends the Letis POS brand palette.
 *
 * Botanical Precision: green-forward, architecturally clean, confident.
 * Uses the existing brand green (#16A34A) as the dominant color.
 * Slate neutrals for structure. Nothing competes with the green.
 */
import { brand } from './brand';

/* ── Typography ── */
const _fontDisplay = '"Lexend", "DM Sans", -apple-system, sans-serif';
const _fontBody = '"DM Sans", -apple-system, sans-serif';

/* ── Radii ── */
const _radius = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
} as const;

/* ── Shadows ── */
const _shadow = {
  sm: `0 1px 2px rgba(15,23,42,0.04)`,
  card: `0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)`,
  elevated: `0 1px 2px rgba(15,23,42,0.05), 0 8px 32px rgba(15,23,42,0.09)`,
  form: `0 44px 110px rgba(15,23,42,0.10), 0 18px 44px rgba(15,23,42,0.06)`,
} as const;

/* ── Backgrounds ── */
const _surfaces = {
  /** Rich green gradient — used for the brand column on auth pages */
  brandColumn: `
    radial-gradient(
      ellipse at 30% 20%,
      ${brand.primary[400]}22 0%,
      transparent 55%
    ),
    radial-gradient(
      ellipse at 75% 80%,
      ${brand.primary[600]}18 0%,
      transparent 50%
    ),
    linear-gradient(
      160deg,
      ${brand.primary[700]} 0%,
      ${brand.primary[800]} 45%,
      #052e16 100%
    )
  `,

  /** Light page background — subtle green warmth */
  page: `
    radial-gradient(
      ellipse at 80% 20%,
      ${brand.primary[50]} 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 10% 80%,
      ${brand.neutral[50]} 0%,
      transparent 40%
    ),
    #FFFFFF
  `,

  /** Form card glass effect */
  formCard: 'rgba(255,255,255,0.92)',
} as const;

export const authTheme = {
  brand,        // full brand palette
  fontDisplay: _fontDisplay,
  fontBody: _fontBody,
  radius: _radius,
  shadow: _shadow,
  surfaces: _surfaces,
} as const;

export type AuthTheme = typeof authTheme;
