import { Box, Button, Stack, TextField, Typography, MenuItem } from '@mui/material';
import { IconCalendar } from '@tabler/icons-react';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { greeting, PERIODS, PERIOD_LABELS } from './utils';
import type { GreetingBarProps } from './types';

export default function DashboardGreetingBar({
  period,
  warehouseId,
  warehouses,
  dateRangeLabel,
  isDark,
  onPeriodChange,
  onWarehouseChange,
}: GreetingBarProps) {
  const { user } = useAuth();
  const { salutation, wave, name } = greeting(user?.firstName);

  const pillSx = (active: boolean) => ({
    height: { xs: 32, sm: 34 },
    px: { xs: 1.2, sm: 1.6 },
    borderRadius: '8px',
    fontSize: { xs: 12, sm: 13 },
    fontWeight: active ? 700 : 500,
    textTransform: 'none' as const,
    bgcolor: active ? brand.primary[600] : 'transparent',
    color: active ? '#fff' : brand.neutral[600],
    border: 'none',
    boxShadow: active ? `0 4px 12px -4px ${brand.primary[600]}88` : 'none',
    minWidth: 0,
    flexShrink: 0,
    '&:hover': {
      bgcolor: active ? brand.primary[700] : brand.neutral[100],
      color: active ? '#fff' : brand.neutral[800],
    },
    transition: 'all 0.15s ease',
  });

  return (
    <Box
      sx={{
        mb: 1.5,
        p: { xs: 1.75, md: 2 },
        borderRadius: '12px',
        border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
        bgcolor: isDark ? brand.neutral[800] : '#FFFFFF',
        boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 1.5,
      }}
    >
      {/* Greeting */}
      <Box sx={{ flex: '0 0 auto' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: 19, md: 21 },
              color: brand.neutral[900],
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {salutation}, {name}
          </Typography>
          <Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>
            {wave}
          </Box>
        </Stack>
        <Typography sx={{ color: brand.neutral[500], fontSize: 13, mt: 0.3 }}>
          Here's what's happening with your business today.
        </Typography>
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* Controls */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        useFlexGap
        sx={{
          width: { xs: '100%', md: 'auto' },
          maxWidth: '100%',
          flex: { md: '1 1 620px' },
          flexWrap: 'wrap',
          justifyContent: { xs: 'flex-start', md: 'flex-end' },
        }}
      >
        {/* Period pills */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            p: 0.5,
            borderRadius: '10px',
            bgcolor: isDark ? brand.neutral[900] : brand.neutral[50],
            border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            maxWidth: { xs: '100%', sm: 460, xl: 'none' },
          }}
        >
          {PERIODS.map((p) => (
            <Button
              key={p}
              size="small"
              variant="text"
              onClick={() => onPeriodChange(p)}
              sx={pillSx(period === p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </Box>

        {/* Warehouse selector */}
        {warehouses.length > 0 && (
          <TextField
            select
            size="small"
            value={warehouseId}
            onChange={(e) => onWarehouseChange(e.target.value)}
            sx={{
              minWidth: 160,
              '& .MuiOutlinedInput-root': {
                height: 38,
                borderRadius: '9px',
                fontWeight: 600,
                fontSize: 13.5,
                '& fieldset': { borderColor: isDark ? brand.neutral[700] : brand.neutral[200] },
                '&:hover fieldset': { borderColor: brand.primary[300] },
                '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
              },
            }}
          >
            <MenuItem value="">All warehouses</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* Date range display */}
        <Button
          variant="outlined"
          startIcon={<IconCalendar size={15} stroke={1.8} />}
          sx={{
            height: 38,
            px: 1.6,
            maxWidth: { xs: '100%', sm: 220 },
            borderRadius: '9px',
            borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
            color: brand.neutral[700],
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            bgcolor: isDark ? brand.neutral[800] : '#fff',
            '&:hover': {
              borderColor: brand.primary[300],
              bgcolor: isDark ? brand.primary[900] : brand.primary[50],
              color: brand.primary[700],
            },
          }}
        >
          {dateRangeLabel}
        </Button>
      </Stack>
    </Box>
  );
}
