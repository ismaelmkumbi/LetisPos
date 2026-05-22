import { Box, Typography, Chip } from '@mui/material';
import type { BackendService } from '../api/hub';
import { brand } from '../theme';

const CATEGORY_COLORS: Record<string, string> = {
  Core: brand.info.main, Catalog: brand.primary[500], Inventory: brand.warning.main,
  Sales: brand.success.main, Finance: brand.purple.main, Insight: '#06b6d4',
  People: '#f97316', Intelligence: '#ec4899', Platform: brand.neutral[400],
};

interface Props {
  svc: BackendService;
}

export default function ServiceDetailDialog({ svc }: Props) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.75 }}>
      <Box sx={{ bgcolor: brand.neutral[900], borderRadius: '6px', p: 0.75 }}>
        <Typography sx={{ fontSize: '0.5rem', color: brand.neutral[400], textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Category
        </Typography>
        <Chip
          label={svc.category}
          size="small"
          sx={{
            mt: 0.25, height: 16, fontWeight: 600, fontSize: '0.55rem',
            bgcolor: `${(CATEGORY_COLORS[svc.category] || brand.primary[500])}20`,
            color: CATEGORY_COLORS[svc.category] || brand.primary[500],
            borderRadius: '3px',
          }}
        />
      </Box>
      <Box sx={{ bgcolor: brand.neutral[900], borderRadius: '6px', p: 0.75 }}>
        <Typography sx={{ fontSize: '0.5rem', color: brand.neutral[400], textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Port / PID
        </Typography>
        <Typography sx={{ mt: 0.25, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: '0.7rem' }}>
          :{svc.port} / {svc.pid ?? '—'}
        </Typography>
      </Box>
      <Box sx={{ bgcolor: brand.neutral[900], borderRadius: '6px', p: 0.75 }}>
        <Typography sx={{ fontSize: '0.5rem', color: brand.neutral[400], textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          CPU / RAM
        </Typography>
        <Typography sx={{
          mt: 0.25, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: '0.7rem',
          color: (svc.cpuPercent ?? 0) > 50 ? brand.error.main : brand.neutral[50],
        }}>
          {(svc.cpuPercent ?? 0).toFixed(1)}% / {((svc.memUsedBytes ?? 0) / 1048576).toFixed(0)} MB
        </Typography>
      </Box>
    </Box>
  );
}
