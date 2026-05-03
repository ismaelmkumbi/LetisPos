/**
 * Shared utilities, CSS constants, and helpers for all POS layouts.
 */
import { brand } from 'src/theme/smartpos/brand';
import type { Line } from './types';

/** Unit price from tier when line has basePrice / unitCost from catalog. */
export function unitPriceForTier(line: Line, tier: NonNullable<Line['priceTier']>): number {
  const base = line.basePrice ?? line.unitPrice;
  if (tier === 'retail') return Math.round(base * 100) / 100;
  if (tier === 'wholesale') {
    const c = line.unitCost;
    const v = c != null && c > 0 ? c : base * 0.92;
    return Math.round(v * 100) / 100;
  }
  return Math.round(base * 0.97 * 100) / 100;
}

export const POS_LANG_CYCLE = ['en', 'fr', 'ar', 'ch'] as const;

// ─── Layout dimensions ─────────────────────────────────────────────────────
export const CHECKOUT_PANEL_MIN_WIDTH = 420;
export const FOOTER_HEIGHT = 72;
export const PRODUCT_PAGE_SIZE = 10;

export const posSurface = {
  border: `1px solid ${brand.neutral[200]}`,
  borderRadius: '18px',
  bgcolor: '#fff',
  boxShadow: `0 1px 2px ${brand.neutral[900]}08, 0 18px 48px -28px ${brand.primary[900]}33`,
} as const;

export const premiumFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: '#fff',
    fontSize: '0.86rem',
    transition: 'box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease',
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.primary[300] },
    '&.Mui-focused': {
      bgcolor: '#fff',
      boxShadow: `0 0 0 4px ${brand.primary[100]}99`,
    },
    '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: brand.neutral[500],
  },
} as const;

export const softScrollSx = {
  '&::-webkit-scrollbar': { width: 6, height: 6 },
  '&::-webkit-scrollbar-thumb': {
    bgcolor: brand.neutral[300],
    borderRadius: 8,
  },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
} as const;

export const focusVisibleSx = {
  '&:focus-visible': {
    outline: `3px solid ${brand.primary[200]}`,
    outlineOffset: 2,
  },
} as const;
