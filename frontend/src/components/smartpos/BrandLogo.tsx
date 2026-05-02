/**
 * Letis POS — brand mark.
 *
 * Two pieces composed together:
 *
 *   Monogram   A teal rounded-square holding a stylised "L". The bottom of
 *              the L extends into an upward-pointing tip, signalling sales
 *              growth. A pale green tile in the upper right reads as a
 *              transaction-confirmed pulse.
 *
 *   Wordmark   "Letis" in a tight 800-weight sans + a thin green "POS" pill.
 *
 * The SVG is hand-built (no external dep) so it scales sharply at any
 * size and inherits color from the `color` prop:
 *   - `default` — full colour on a light surface
 *   - `onDark`  — inverted neutrals for dark / hero backgrounds
 *   - `mono`    — single-colour neutral for print or favicon contexts
 *
 * Usage:
 *   <BrandLogo />                              // inline navbar
 *   <BrandLogo variant="stacked" size="xl" />  // login / hero
 *   <BrandLogo variant="mark" size="md" />     // collapsed sidebar / favicon
 */
import { Box, Typography } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

export type BrandLogoVariant = 'inline' | 'stacked' | 'mark';
export type BrandLogoColor   = 'default' | 'onDark' | 'mono';
export type BrandLogoSize    = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<BrandLogoSize, number> = { sm: 22, md: 30, lg: 42, xl: 64 };

interface Props {
  variant?: BrandLogoVariant;
  color?:   BrandLogoColor;
  size?:    BrandLogoSize;
  /** Hide the "POS" pill in `inline` / `stacked` variants. */
  compact?: boolean;
}

export function BrandLogo({ variant = 'inline', color = 'default', size = 'md', compact = false }: Props) {
  const fs = SIZE_PX[size];
  const monoSize = Math.round(fs * 1.2);

  // Resolve palette per surface.
  const wordColor =
    color === 'onDark' ? '#FFFFFF'
    : color === 'mono' ? brand.neutral[900]
    : brand.neutral[900];
  const subColor = color === 'onDark' ? 'rgba(255,255,255,0.7)' : brand.neutral[500];
  const pillBg   = color === 'mono' ? brand.neutral[900] : brand.primary[600];
  const pillFg   = '#FFFFFF';

  const Mark = (
    <LetisMark size={monoSize} color={color} />
  );

  if (variant === 'mark') return Mark;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: variant === 'stacked' ? 'column' : 'row',
        alignItems: variant === 'stacked' ? 'flex-start' : 'center',
        gap: variant === 'stacked' ? 1.25 : 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {Mark}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
          <Typography
            component="span"
            sx={{
              fontSize: fs,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              color: wordColor,
              lineHeight: 1,
              fontFeatureSettings: '"ss01" 1',
            }}
          >
            Letis
          </Typography>
          {!compact && (
            <Box
              component="span"
              sx={{
                px: 0.85,
                py: 0.18,
                borderRadius: 0.85,
                bgcolor: pillBg,
                color: pillFg,
                fontSize: Math.max(10, Math.round(fs * 0.4)),
                fontWeight: 800,
                letterSpacing: '0.12em',
                lineHeight: 1.2,
              }}
            >
              POS
            </Box>
          )}
        </Box>
      </Box>
      {variant === 'stacked' && (
        <Typography
          component="span"
          sx={{
            fontSize: Math.max(10, Math.round(fs * 0.36)),
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: subColor,
          }}
        >
          Retail · in one motion
        </Typography>
      )}
    </Box>
  );
}

/**
 * The square monogram on its own — used as a favicon, in the collapsed
 * sidebar, and inside the inline/stacked layouts above.
 */
export function LetisMark({ size = 32, color = 'default' as BrandLogoColor }: { size?: number; color?: BrandLogoColor }) {
  // Pre-compute palette so the SVG stays a single static literal.
  const isMono = color === 'mono';
  const isDark = color === 'onDark';

  const grad = {
    from: isMono ? brand.neutral[900] : brand.primary[700],
    to:   isMono ? brand.neutral[700] : brand.primary[500],
  };
  const stroke = '#FFFFFF';
  const dot    = isMono ? '#FFFFFF' : brand.primary[100];
  const ring   = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(22, 163, 74,0.16)';

  // Unique gradient id so multiple instances on a page don't collide.
  const uid = `letis-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64"
      role="img" aria-label="Letis POS"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={grad.from} />
          <stop offset="1" stopColor={grad.to} />
        </linearGradient>
      </defs>

      {/* Subtle outer ring — gives the mark a button-like presence on busy headers. */}
      <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="none" stroke={ring} strokeWidth="1" />

      {/* Filled monogram body. */}
      <rect x="3" y="3" width="58" height="58" rx="15" fill={`url(#${uid})`} />

      {/* The "L" — vertical bar + base that turns into an upward arrow tip. */}
      <path
        d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z"
        fill={stroke}
        opacity="0.97"
      />
      {/* Arrow head emerging from the L — sales going up. */}
      <path
        d="M40 40 L51 29 L46 24 L46 34 L40 34 Z"
        fill={stroke}
        opacity="0.6"
      />

      {/* Confirmation tile. */}
      <rect x="41" y="11" width="14" height="10" rx="3" fill={dot} opacity="0.95" />
    </svg>
  );
}

export default BrandLogo;
