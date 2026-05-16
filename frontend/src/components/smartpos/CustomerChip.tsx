/**
 * CustomerChip — customer selector with debt context badge.
 *
 * States:
 *  - Walk-in: neutral chip, no badge
 *  - Known, no debt: green border, customer name
 *  - Known, has debt: amber border, "Owes $X" badge
 *  - Known, over limit: red border, blocked indicator
 */
import { useState, useEffect } from 'react';
import {
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconUser,
  IconAlertTriangle,
} from '@tabler/icons-react';
import type { Customer } from 'src/api/smartpos/types';
import { listSales } from 'src/api/smartpos/sales';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export interface CustomerChipProps {
  customerId: string | null;
  customers: Customer[];
  onCustomerChange: (id: string | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  onViewAccount?: (customerId: string) => void;
}

export default function CustomerChip({
  customerId,
  customers,
  onCustomerChange: _onCustomerChange,
  onCustomerCreated: _onCustomerCreated,
  onViewAccount,
}: CustomerChipProps) {
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId) || null;

  // Fetch balance when customer changes
  useEffect(() => {
    if (!customerId || customerId === '__walkin__') {
      setCustomerBalance(null);
      return;
    }
    setLoading(true);
    listSales({ customerId, paymentStatus: 'UNPAID', size: 200 })
      .then((unpaid) => {
        return listSales({ customerId, paymentStatus: 'PARTIAL', size: 200 })
          .then((partial) => {
            const all = [...unpaid.content, ...partial.content];
            const balance = all.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
            setCustomerBalance(balance);
          });
      })
      .catch(() => setCustomerBalance(null))
      .finally(() => setLoading(false));
  }, [customerId]);

  const hasDebt = customerBalance !== null && customerBalance > 0;
  const overLimit = selectedCustomer && customerBalance !== null
    && customerBalance >= selectedCustomer.creditLimit;
  const available = selectedCustomer
    ? Math.max(0, selectedCustomer.creditLimit - (customerBalance || 0))
    : null;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        icon={<IconUser size={14} />}
        label={selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
        variant={selectedCustomer ? 'filled' : 'outlined'}
        sx={{
          fontWeight: 700,
          fontSize: '0.82rem',
          borderRadius: '10px',
          height: 36,
          borderColor: overLimit
            ? brand.error.main
            : hasDebt
              ? brand.warning.main
              : selectedCustomer
                ? brand.primary[300]
                : brand.neutral[300],
          bgcolor: overLimit
            ? brand.error.light
            : hasDebt
              ? brand.warning.light
              : selectedCustomer
                ? brand.primary[50]
                : 'transparent',
          color: overLimit
            ? brand.error.dark
            : hasDebt
              ? brand.warning.dark
              : selectedCustomer
                ? brand.primary[700]
                : brand.neutral[600],
        }}
      />

      {loading && <CircularProgress size={14} />}

      {hasDebt && (
        <Tooltip title={`Credit limit: ${fmt(selectedCustomer?.creditLimit || 0)} · Available: ${fmt(available || 0)}`}>
          <Chip
            label={`Owes ${fmt(customerBalance!)}`}
            size="small"
            icon={overLimit ? <IconAlertTriangle size={12} /> : undefined}
            onClick={() => onViewAccount?.(customerId!)}
            sx={{
              height: 28,
              fontWeight: 800,
              fontSize: '0.72rem',
              borderRadius: '8px',
              bgcolor: overLimit ? brand.error.light : brand.warning.light,
              color: overLimit ? brand.error.dark : brand.warning.dark,
              cursor: 'pointer',
            }}
          />
        </Tooltip>
      )}

      {selectedCustomer && !hasDebt && selectedCustomer.creditLimit > 0 && (
        <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>
          Clear · Limit {fmt(selectedCustomer.creditLimit)}
        </Typography>
      )}
    </Stack>
  );
}
