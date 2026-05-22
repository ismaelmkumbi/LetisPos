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
      mb: 1, p: { xs: 1, md: 1.25 }, borderRadius: '10px',
      border: `1px solid ${brand.neutral[700]}`, bgcolor: brand.neutral[800],
      boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
      display: 'flex', alignItems: 'center', gap: 1.5,
      mx: 1, mt: 1,
    }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flex: '0 0 auto' }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: `${brand.primary[600]}15`, display: 'grid', placeItems: 'center' }}>
          <Storage sx={{ color: brand.primary[600], fontSize: 16 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[50], letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Letis Control Center
          </Typography>
          <Typography sx={{ color: brand.neutral[400], fontSize: 11, lineHeight: 1.1 }}>
            {servers.length} server{servers.length !== 1 ? 's' : ''} — Infrastructure Operations
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ flex: 1 }} />
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Chip
          label={`${onlineCount}/${servers.length} online`}
          size="small"
          icon={<Circle sx={{ fontSize: '7px !important', fill: onlineCount > 0 ? brand.success.main : brand.error.main }} />}
          sx={{
            height: 24, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.03em',
            bgcolor: onlineCount > 0 ? brand.success.light : brand.error.light,
            color: onlineCount > 0 ? brand.success.dark : brand.error.dark,
            borderRadius: '7px',
            border: `1px solid ${onlineCount > 0 ? brand.success.main : brand.error.main}20`,
            '.MuiChip-icon': { ml: 0.5, mr: -0.25 },
          }}
        />
        <Tooltip title="Refresh"><IconButton size="small" onClick={onRefresh} sx={{ color: brand.neutral[400], border: `1px solid ${brand.neutral[700]}`, borderRadius: '8px', p: 0.5 }}><Refresh fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Sign out"><IconButton size="small" onClick={onLogout} sx={{ color: brand.neutral[400], border: `1px solid ${brand.neutral[700]}`, borderRadius: '8px', p: 0.5 }}><Logout fontSize="small" /></IconButton></Tooltip>
      </Stack>
    </Box>
  );
}
