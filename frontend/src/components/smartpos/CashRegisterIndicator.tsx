/**
 * CashRegisterIndicator — compact chip showing register state.
 * Green when open, red when closed. Clickable to open/close.
 */
import { Box, Chip, Typography } from '@mui/material';
import { IconCircleFilled } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import type { CashRegisterSession } from 'src/api/smartpos/cashRegister';

const fmt = formatMoney;

interface CashRegisterIndicatorProps {
  session: CashRegisterSession | null;
  loading: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export default function CashRegisterIndicator({
  session, loading, onOpen, onClose,
}: CashRegisterIndicatorProps) {
  if (loading) {
    return (
      <Chip
        label="Register…"
        size="small"
        sx={{
          fontWeight: 700,
          bgcolor: brand.neutral[100],
          color: brand.neutral[500],
          borderRadius: '999px',
        }}
      />
    );
  }

  if (!session || session.status === 'CLOSED') {
    return (
      <Chip
        label="Register Closed"
        size="small"
        icon={<IconCircleFilled size={8} color={brand.error.main} />}
        onClick={onOpen}
        sx={{
          fontWeight: 700,
          bgcolor: brand.error.light,
          color: brand.error.dark,
          borderRadius: '999px',
          cursor: 'pointer',
          border: `1px solid ${brand.error.main}33`,
          '&:hover': { bgcolor: brand.error.main + '22' },
        }}
      />
    );
  }

  return (
    <Box
      onClick={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: '999px',
        bgcolor: brand.success.light,
        border: `1px solid ${brand.success.main}33`,
        cursor: 'pointer',
        '&:hover': { bgcolor: brand.success.main + '22' },
      }}
    >
      <IconCircleFilled size={8} color={brand.success.main} />
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: brand.success.dark }}>
        Register Open
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand.neutral[700] }}>
        {fmt(session.expectedCash)}
      </Typography>
    </Box>
  );
}
