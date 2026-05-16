/**
 * DebtorsSheet — mobile bottom sheet listing all customers with outstanding debt.
 * Accessible from POS header via debt badge tap.
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { IconX, IconChevronRight } from '@tabler/icons-react';
import { listDebtors, type CustomerDebt } from 'src/api/smartpos/credit';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface DebtorsSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectDebtor: (customerId: string) => void;
  onRecordPayment: (customerId: string) => void;
}

export default function DebtorsSheet({
  open,
  onClose,
  onSelectDebtor,
  onRecordPayment: _onRecordPayment,
}: DebtorsSheetProps) {
  const [debtors, setDebtors] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listDebtors({ overdueOnly: filter === 'overdue' })
      .then(setDebtors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, filter]);

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.outstanding, 0);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          maxHeight: '85dvh',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${brand.neutral[200]}`, flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Outstanding Debt</Typography>
          <IconButton onClick={onClose} size="small">
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: brand.error.main }}>
            {fmt(totalOutstanding)}
          </Typography>
          <Chip
            label={`${debtors.length} debtor${debtors.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: brand.error.light, color: brand.error.dark }}
          />
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
          <Chip
            label="All"
            size="small"
            onClick={() => setFilter('all')}
            sx={{
              fontWeight: filter === 'all' ? 700 : 500,
              bgcolor: filter === 'all' ? brand.primary[600] : brand.neutral[100],
              color: filter === 'all' ? '#fff' : brand.neutral[600],
            }}
          />
          <Chip
            label="Overdue"
            size="small"
            onClick={() => setFilter('overdue')}
            sx={{
              fontWeight: filter === 'overdue' ? 700 : 500,
              bgcolor: filter === 'overdue' ? brand.warning.main : brand.neutral[100],
              color: filter === 'overdue' ? '#fff' : brand.neutral[600],
            }}
          />
        </Stack>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : debtors.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontWeight: 700, color: brand.neutral[500] }}>
              No outstanding debt
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
              All customers are paid up
            </Typography>
          </Box>
        ) : (
          debtors.map((d) => (
            <Box
              key={d.customerId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                borderBottom: `1px solid ${brand.neutral[100]}`,
                cursor: 'pointer',
                '&:active': { bgcolor: brand.neutral[50] },
              }}
              onClick={() => onSelectDebtor(d.customerId)}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {d.customerName}
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                  {d.saleCount} sale{d.saleCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Stack direction="column" alignItems="flex-end" spacing={0.5} sx={{ mr: 1 }}>
                <Typography sx={{ fontWeight: 800, color: d.overdue ? brand.error.main : brand.warning.dark }}>
                  {fmt(d.outstanding)}
                </Typography>
                <Chip
                  label={d.overdue ? 'Overdue' : 'Current'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    bgcolor: d.overdue ? brand.error.light : brand.success.light,
                    color: d.overdue ? brand.error.dark : brand.success.dark,
                  }}
                />
              </Stack>
              <IconChevronRight size={16} color={brand.neutral[400]} />
            </Box>
          ))
        )}
      </Box>
    </Drawer>
  );
}
