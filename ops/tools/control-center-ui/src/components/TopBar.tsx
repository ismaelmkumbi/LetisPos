import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Refresh, Logout, Storage, Circle } from '@mui/icons-material';
import type { Server } from '../api/hub';
import { brand } from '../theme';

interface Props {
  servers: Server[];
  onlineCount: number;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function TopBar({ servers, onlineCount, onRefresh, onLogout }: Props) {
  return (
    <Box sx={{
      mb: 1.5, p: { xs: 1.75, md: 2 }, borderRadius: '12px',
      border: `1px solid ${brand.neutral[700]}`, bgcolor: brand.neutral[800],
      boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
      display: 'flex', flexDirection: { xs: 'column', md: 'row' },
      alignItems: { xs: 'flex-start', md: 'center' }, gap: 2,
      mx: 2, mt: 2,
    }}>
      <Box sx={{ flex: '0 0 auto' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: `${brand.primary[600]}15`, display: 'grid', placeItems: 'center' }}>
            <Storage sx={{ color: brand.primary[600], fontSize: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 22 }, color: brand.neutral[50], letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Letis Control Center
          </Typography>
        </Stack>
        <Typography sx={{ color: brand.neutral[400], fontSize: 13, mt: 0.3 }}>
          Infrastructure Operations — {servers.length} server{servers.length !== 1 ? 's' : ''} monitored
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Chip
          label={`${onlineCount}/${servers.length} online`}
          size="small"
          icon={<Circle sx={{ fontSize: '8px !important', fill: onlineCount > 0 ? brand.success.main : brand.error.main }} />}
          sx={{
            height: 28, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.03em',
            bgcolor: onlineCount > 0 ? brand.success.light : brand.error.light,
            color: onlineCount > 0 ? brand.success.dark : brand.error.dark,
            borderRadius: '8px',
            border: `1px solid ${onlineCount > 0 ? brand.success.main : brand.error.main}20`,
            '.MuiChip-icon': { ml: 0.75, mr: -0.25 },
          }}
        />
        <Tooltip title="Refresh"><IconButton size="small" onClick={onRefresh} sx={{ color: brand.neutral[400], border: `1px solid ${brand.neutral[700]}`, borderRadius: '10px' }}><Refresh fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Sign out"><IconButton size="small" onClick={onLogout} sx={{ color: brand.neutral[400], border: `1px solid ${brand.neutral[700]}`, borderRadius: '10px' }}><Logout fontSize="small" /></IconButton></Tooltip>
      </Stack>
    </Box>
  );
}
