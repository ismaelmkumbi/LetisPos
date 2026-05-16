/**
 * WalkInPaymentModal — record a debt payment without a purchase.
 *
 * Customer comes to the shop just to pay their outstanding balance.
 */
import { useState, useEffect } from 'react';
import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconCash, IconCreditCard, IconDeviceMobile } from '@tabler/icons-react';
import type { Customer } from 'src/api/smartpos/types';
import { listCustomers } from 'src/api/smartpos/customers';
import { listSales } from 'src/api/smartpos/sales';
import type { PaymentMethod } from 'src/api/smartpos/payments';
import { recordPayment } from 'src/api/smartpos/payments';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface WalkInPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onPaid: (customerId: string, amount: number, newBalance: number) => void;
  preselectedCustomerId?: string | null;
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <IconCash size={16} />,
  CARD: <IconCreditCard size={16} />,
  MOBILE_MONEY: <IconDeviceMobile size={16} />,
};

export default function WalkInPaymentModal({
  open,
  onClose,
  onPaid,
  preselectedCustomerId,
}: WalkInPaymentModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listCustomers({ size: 200 }).then((c) => setCustomers(c.content)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      const found = customers.find((c) => c.id === preselectedCustomerId);
      if (found) setSelectedCustomer(found);
    }
  }, [preselectedCustomerId, customers]);

  useEffect(() => {
    if (!selectedCustomer) { setBalance(0); return; }
    Promise.all([
      listSales({ customerId: selectedCustomer.id, paymentStatus: 'UNPAID', size: 200 }),
      listSales({ customerId: selectedCustomer.id, paymentStatus: 'PARTIAL', size: 200 }),
    ]).then(([unpaid, partial]) => {
      const all = [...unpaid.content, ...partial.content];
      const bal = all.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
      setBalance(bal);
      setAmount(bal > 0 ? bal.toFixed(2) : '');
    }).catch(() => setBalance(0));
  }, [selectedCustomer]);

  const handleSubmit = async () => {
    if (!selectedCustomer || !amount) return;
    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) { setError('Enter an amount greater than 0'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const unpaidSales = await listSales({
        customerId: selectedCustomer.id,
        paymentStatus: 'UNPAID',
        size: 200,
      });
      const sale = unpaidSales.content[0];
      if (sale) {
        // Map UI method to backend PaymentMethod
        const paymentMethod: PaymentMethod = method === 'MOBILE_MONEY' ? 'MPESA' : (method as PaymentMethod);
        await recordPayment({
          referenceType: 'SALE',
          referenceId: sale.id,
          accountId: '',
          amount: paymentAmount,
          method: paymentMethod,
        });
      }
      const newBalance = Math.max(0, balance - paymentAmount);
      onPaid(selectedCustomer.id, paymentAmount, newBalance);
      setAmount('');
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Record Payment
        {selectedCustomer && balance > 0 && (
          <Typography variant="body2" sx={{ color: brand.warning.dark, fontWeight: 700, mt: 0.5 }}>
            Outstanding: {fmt(balance)} · Limit: {fmt(selectedCustomer.creditLimit)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Autocomplete
            options={customers}
            value={selectedCustomer}
            onChange={(_, v) => setSelectedCustomer(v)}
            getOptionLabel={(c) => c.name}
            renderInput={(params) => (
              <TextField {...params} label="Customer" placeholder="Search customer…" />
            )}
            fullWidth
          />

          {balance > 0 && (
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              helperText={`Max: ${fmt(balance)}`}
              fullWidth
            />
          )}

          <Stack direction="row" spacing={1}>
            {['CASH', 'CARD', 'MOBILE_MONEY'].map((m) => (
              <Button
                key={m}
                variant={method === m ? 'contained' : 'outlined'}
                size="small"
                startIcon={METHOD_ICONS[m]}
                onClick={() => setMethod(m)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '8px',
                  flex: 1,
                }}
              >
                {m.replace('_', ' ')}
              </Button>
            ))}
          </Stack>

          {error && (
            <Typography variant="body2" sx={{ color: brand.error.main, fontWeight: 700 }}>
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!selectedCustomer || !amount || submitting}
          onClick={handleSubmit}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
        >
          {submitting ? 'Processing…' : `Record ${fmt(parseFloat(amount) || 0)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
