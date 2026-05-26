/**
 * BrandLivePreview — renders a live preview mock of an invoice/receipt
 * using the current brand colors, logo, and store info.
 */
import { Box, Stack, Typography } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';
import type { BrandProfile } from 'src/api/smartpos/brand';

interface BrandLivePreviewProps {
  profile: BrandProfile;
}

const SAMPLE_LINES = [
  { item: 'Premium Coffee Beans', qty: 2, price: '24,000' },
  { item: 'Organic Green Tea', qty: 1, price: '12,500' },
  { item: 'Honey Jar 500g', qty: 3, price: '18,000' },
];

export default function BrandLivePreview({ profile }: BrandLivePreviewProps) {
  const primary = profile.primaryColor || brand.primary[600];
  const textColor = brand.neutral[900];
  const mutedColor = brand.neutral[400];

  return (
    <Box
      sx={{
        borderRadius: '14px',
        border: `1px solid ${brand.neutral[200]}`,
        overflow: 'hidden',
        bgcolor: '#fff',
        boxShadow: `
          0 2px 8px ${brand.neutral[900]}08,
          0 12px 32px -16px ${brand.neutral[900]}12
        `,
        transition: 'all 0.3s ease',
        fontFamily: profile.fontFamily || 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)`,
          color: '#fff',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            {profile.logoUrl && (
              <Box sx={{
                width: 72,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'rgba(255,255,255,0.92)',
                display: 'grid',
                placeItems: 'center',
                p: 0.4,
                flexShrink: 0,
              }}>
                <Box
                  component="img"
                  src={profile.logoUrl}
                  sx={{ maxHeight: 30, maxWidth: 64, objectFit: 'contain' }}
                />
              </Box>
            )}
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>
                {profile.businessName || 'Your Business'}
              </Typography>
              {profile.tagline && (
                <Typography sx={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 500 }}>
                  {profile.tagline}
                </Typography>
              )}
            </Box>
          </Stack>
          <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', opacity: 0.9 }}>
            INVOICE
          </Typography>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ px: 2.5, py: 2 }}>
        {/* Meta row */}
        <Stack direction="row" spacing={4} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.62rem', color: mutedColor, fontWeight: 600 }}>DATE</Typography>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>22 May 2026</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.62rem', color: mutedColor, fontWeight: 600 }}>INVOICE #</Typography>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: primary }}>INV-0042</Typography>
          </Box>
        </Stack>

        {/* Line items */}
        <Box sx={{ borderTop: `1px solid ${brand.neutral[100]}`, pt: 1 }}>
          <Stack direction="row" sx={{ mb: 0.5 }}>
            {['Item', 'Qty', 'Price'].map((h, i) => (
              <Typography
                key={h}
                sx={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: mutedColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flex: i === 0 ? 2 : 1,
                  textAlign: i === 0 ? 'left' : 'right',
                }}
              >
                {h}
              </Typography>
            ))}
          </Stack>
          {SAMPLE_LINES.map((line, i) => (
            <Stack key={i} direction="row" sx={{ py: 0.35 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, flex: 2, color: textColor }}>
                {line.item}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, flex: 1, textAlign: 'right', color: textColor }}>
                {line.qty}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, flex: 1, textAlign: 'right', color: textColor }}>
                {line.price}
              </Typography>
            </Stack>
          ))}
        </Box>

        {/* Total */}
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: `2px solid ${primary}40`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Stack direction="row" spacing={3} alignItems="baseline">
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: mutedColor }}>
              TOTAL
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: primary }}>
              54,500
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: brand.neutral[50],
          borderTop: `1px solid ${brand.neutral[100]}`,
        }}
      >
        <Typography sx={{ fontSize: '0.62rem', color: mutedColor, textAlign: 'center', fontWeight: 600 }}>
          {profile.businessName || 'Your Business'} — Thank you for your purchase
        </Typography>
      </Box>
    </Box>
  );
}
