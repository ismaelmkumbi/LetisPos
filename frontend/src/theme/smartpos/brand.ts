/**
 * Letis POS — brand palette.
 *
 * Single source of truth for all product and operational colors.
 *
 * Design intent:
 *  - Letis green primary (#16A34A) with a full 50–900 scale.
 *  - Slate neutrals for the enterprise shell.
 *  - Semantic colors for universal signal states.
 *  - Operational tokens for live status indicators across the Sales Desk.
 */

export const staticBrand = {
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

  /** Accent — same family as primary */
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

  /** Neutral slate scale */
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

  /** Semantic signals */
  success: { light: '#DCFCE7', main: '#22C55E', dark: '#15803D' },
  warning: { light: '#FEF3C7', main: '#F59E0B', dark: '#B45309' },
  error:   { light: '#FEE2E2', main: '#EF4444', dark: '#B91C1C' },
  info:    { light: '#EFF6FF', main: '#3B82F6', dark: '#1D4ED8' },
  purple:  { light: '#F3E8FF', main: '#8B5CF6', dark: '#6D28D9' },

  /** Operational state tokens — used by StatusIndicator, rows, alerts */
  operational: {
    idle:      { bg: '#F8FAFC', dot: '#94A3B8', text: '#475569' },
    active:    { bg: '#ECFDF5', dot: '#22C55E', text: '#065F46' },
    attention: { bg: '#FEF3C7', dot: '#F59E0B', text: '#92400E' },
    critical:  { bg: '#FEE2E2', dot: '#EF4444', text: '#991B1B' },
    closed:    { bg: '#F1F5F9', dot: '#94A3B8', text: '#334155' },
  },
} as const;

/** Backward-compatible alias — new code should use `useDynamicBrand()` instead. */
export const brand = staticBrand;

/** Convenience aliases — what 99% of components use. */
export const brandTokens = {
  primary:      staticBrand.primary[600],
  primaryLight: staticBrand.primary[300],
  primaryDark:  staticBrand.primary[800],
  primarySoft:  staticBrand.primary[50],

  accent:      staticBrand.accent[500],
  accentLight: staticBrand.accent[300],
  accentDark:  staticBrand.accent[700],
  accentSoft:  staticBrand.accent[50],

  text:        staticBrand.neutral[900],
  textMuted:   staticBrand.neutral[500],
  border:      staticBrand.neutral[200],
  surface:     '#FFFFFF',
  background:  staticBrand.neutral[50],

  success: staticBrand.success.main,
  warning: staticBrand.warning.main,
  error:   staticBrand.error.main,
  info:    staticBrand.info.main,
} as const;

/** Dark-mode overrides — teal is retained (lifted), neutrals invert. */
export const brandTokensDark = {
  ...brandTokens,
  primary:    staticBrand.primary[400],
  text:       staticBrand.neutral[50],
  textMuted:  staticBrand.neutral[400],
  border:     staticBrand.neutral[700],
  surface:    staticBrand.neutral[800],
  background: '#0F172A',
} as const;

/**
 * Brand surface colours — flat solids for enterprise consistency.
 * Previously gradients; now flat to reduce template aesthetics.
 */
export const brandGradients = {
  hero:     `linear-gradient(135deg, ${staticBrand.primary[600]} 0%, ${staticBrand.primary[700]} 100%)`,
  surface:  'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
  signal:   `linear-gradient(135deg, ${staticBrand.primary[600]} 0%, ${staticBrand.primary[700]} 100%)`,
  midnight: 'linear-gradient(180deg, #0F172A 0%, #020617 100%)',
  cta:      `linear-gradient(135deg, ${staticBrand.primary[600]} 0%, ${staticBrand.primary[700]} 100%)`,
} as const;

export type BrandPalette = typeof staticBrand;
export type BrandTokens = typeof brandTokens;
