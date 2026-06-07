import { Box, Typography } from '@mui/material';
import { useDynamicBrand } from 'src/theme/smartpos/dynamicBrand';
import { formatMoney } from 'src/utils/smartpos/currency';
import type { AgingBucket } from 'src/api/smartpos/debt';

const fmt = formatMoney;

const AGING_LABELS = ['Current (0-30)', '31-60 days', '61-90 days', '90+ days'];

interface Props {
  arAging: AgingBucket[];
  apAging: AgingBucket[];
}

const MAX_BAR_WIDTH_PCT = 80;

export default function AgingChart({ arAging, apAging }: Props) {
  const brand = useDynamicBrand();
  const AR_COLORS = [brand.success.main, brand.warning.main, brand.warning.dark, brand.error.main];
  const AP_COLORS = [brand.info.main, brand.warning.main, brand.error.main, brand.error.dark];

  const buckets = AGING_LABELS.map((label, i) => {
    const ar = arAging?.[i]?.amount ?? 0;
    const ap = apAging?.[i]?.amount ?? 0;
    return { label, ar, ap };
  });

  const maxVal = Math.max(
    ...buckets.map((b) => Math.max(b.ar, b.ap)),
    1, // avoid division by zero
  );

  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: AR_COLORS[0] }} />
          <Typography variant="caption">AR (Debtors)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: AP_COLORS[0] }} />
          <Typography variant="caption">AP (Creditors)</Typography>
        </Box>
      </Box>

      {buckets.map((bucket, i) => {
        const arPct = (bucket.ar / maxVal) * MAX_BAR_WIDTH_PCT;
        const apPct = (bucket.ap / maxVal) * MAX_BAR_WIDTH_PCT;
        return (
          <Box key={i} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {bucket.label}
            </Typography>
            {/* AR bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  height: 20,
                  width: `${Math.max(arPct, 2)}%`,
                  bgcolor: AR_COLORS[i],
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  minWidth: bucket.ar > 0 ? '60px' : '0',
                  transition: 'width 0.3s',
                }}
              >
                {bucket.ar > 0 && (
                  <Typography variant="caption" color="white" fontWeight={600}>
                    {fmt(bucket.ar)}
                  </Typography>
                )}
              </Box>
            </Box>
            {/* AP bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  height: 20,
                  width: `${Math.max(apPct, 2)}%`,
                  bgcolor: AP_COLORS[i],
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  minWidth: bucket.ap > 0 ? '60px' : '0',
                  transition: 'width 0.3s',
                }}
              >
                {bucket.ap > 0 && (
                  <Typography variant="caption" color="white" fontWeight={600}>
                    {fmt(bucket.ap)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
