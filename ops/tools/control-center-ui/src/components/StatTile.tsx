import { Box, Typography } from '@mui/material';
import { brand } from '../theme';

interface Props {
  label: string;
  value: string;
  unit: string;
  color: string;
  bar?: boolean;
  loading?: boolean;
}

export default function StatTile({ label, value, unit, color, bar, loading }: Props) {
  return (
    <Box sx={{ bgcolor: brand.neutral[900], borderRadius: '8px', p: 0.75, textAlign: 'center' }}>
      <Typography sx={{ color: brand.neutral[500], fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, mb: 0.25 }}>
        {label}
      </Typography>
      {loading ? (
        <Box sx={{ height: 3, bgcolor: brand.neutral[700], borderRadius: 1.5, mt: 0.75, mb: 0.25, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: '30%', bgcolor: brand.neutral[600], borderRadius: 1.5, '@keyframes pulse': { '0%, 100%': { opacity: 0.3 }, '50%': { opacity: 0.8 } }, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </Box>
      ) : (
        <>
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color, lineHeight: 1.2 }}>
            {value}
            {unit && <Box component="span" sx={{ fontSize: '0.55rem', color: brand.neutral[400], ml: 0.15, fontWeight: 500 }}>{unit}</Box>}
          </Typography>
          {bar && (
            <Box sx={{ height: 2, bgcolor: brand.neutral[700], borderRadius: 1, mt: 0.5, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${Math.min(parseFloat(value) || 0, 100)}%`, bgcolor: color, borderRadius: 1, transition: 'width 0.5s ease' }} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
