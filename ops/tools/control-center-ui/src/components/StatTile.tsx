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
    <Box sx={{ bgcolor: brand.neutral[900], borderRadius: '10px', p: 1.5, textAlign: 'center' }}>
      <Typography sx={{ color: brand.neutral[500], fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      {loading ? (
        <Box sx={{ height: 4, bgcolor: brand.neutral[700], borderRadius: 2, mt: 1.5, mb: 0.5, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: '30%', bgcolor: brand.neutral[600], borderRadius: 2, '@keyframes pulse': { '0%, 100%': { opacity: 0.3 }, '50%': { opacity: 0.8 } }, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </Box>
      ) : (
        <>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color }}>
            {value}
            {unit && <Box component="span" sx={{ fontSize: '0.6rem', color: brand.neutral[400], ml: 0.25, fontWeight: 500 }}>{unit}</Box>}
          </Typography>
          {bar && (
            <Box sx={{ height: 3, bgcolor: brand.neutral[700], borderRadius: 2, mt: 0.75, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${Math.min(parseFloat(value) || 0, 100)}%`, bgcolor: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
