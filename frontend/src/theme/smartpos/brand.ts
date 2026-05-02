/**
 * Letis POS — brand palette.
 *
 * Single source of truth for all product and marketing colors.
 *
 * Design intent:
 *  - Exact Letis color-system green primary from the supplied reference.
 *  - Cool navy/slate neutrals for the crisp dashboard shell.
 *  - Semantic colors match the alert/chart treatment in the design board.
 *
 *  Component shape (50..900) is preserved across the rebrand so any
 *  reference to `brand.primary[600]` keeps working without code changes.
 */

export const brand = {
  /** Primary — Letis Green */
  primary: {
    50:  '#ECFDF5',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  /** Accent — same family as primary for the exact Letis POS system */
  accent: {
    50:  '#ECFDF5',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#22C55E',
    500: '#16A34A',
    600: '#15803D',
    700: '#166534',
    800: '#14532D',
    900: '#052E16',
  },

  /** Neutral slate scale (unchanged) */
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#334155',
    700: '#1E293B',
    800: '#111827',
    900: '#0F172A',
  },

  /** Semantic — info shifted to sky-blue (clearly distinct from teal primary
   *  so charts/alerts don't read as indigo conflict; success/warning/error
   *  unchanged because they're universal signal colors). */
  success: { light: '#DCFCE7', main: '#22C55E', dark: '#15803D' },
  warning: { light: '#FEF3C7', main: '#F59E0B', dark: '#B45309' },
  error:   { light: '#FEE2E2', main: '#EF4444', dark: '#B91C1C' },
  info:    { light: '#EFF6FF', main: '#3B82F6', dark: '#1D4ED8' },
  purple:  { light: '#F3E8FF', main: '#8B5CF6', dark: '#6D28D9' },
} as const;

/** Convenience aliases — what 99% of components use. */
export const brandTokens = {
  primary:      brand.primary[600],
  primaryLight: brand.primary[300],
  primaryDark:  brand.primary[800],
  primarySoft:  brand.primary[50],

  accent:      brand.accent[500],
  accentLight: brand.accent[300],
  accentDark:  brand.accent[700],
  accentSoft:  brand.accent[50],

  text:        brand.neutral[900],
  textMuted:   brand.neutral[500],
  border:      brand.neutral[200],
  surface:     '#FFFFFF',
  background:  brand.neutral[50],

  success: brand.success.main,
  warning: brand.warning.main,
  error:   brand.error.main,
  info:    brand.info.main,
} as const;

/** Dark-mode overrides — teal is retained (lifted), neutrals invert. */
export const brandTokensDark = {
  ...brandTokens,
  primary:    brand.primary[400],
  text:       brand.neutral[50],
  textMuted:  brand.neutral[400],
  border:     brand.neutral[700],
  surface:    brand.neutral[800],
  background: '#0F172A',
} as const;

/**
 * Gradients used for the reference cards and CTA surfaces.
 */
export const brandGradients = {
  hero:     `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
  surface:  'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
  signal:   `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
  midnight: 'linear-gradient(180deg, #0F172A 0%, #020617 100%)',
  cta:      `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
} as const;

export type BrandPalette = typeof brand;
export type BrandTokens = typeof brandTokens;
