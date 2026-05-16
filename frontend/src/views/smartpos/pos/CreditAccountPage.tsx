/**
 * CreditAccountPage — full financial picture of one customer.
 *
 * Shows outstanding balance, available credit, aging breakdown,
 * transaction ledger (sales + payments mixed), and quick actions.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconCash,
  IconFileDescription,
} from '@tabler/icons-react';
import { getCustomerDebt, type DebtAging } from 'src/api/smartpos/credit';
import type { Customer } from 'src/api/smartpos/types';
import WalkInPaymentModal from 'src/components/smartpos/WalkInPaymentModal';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

type LedgerEntry = {
  type: 'sale' | 'payment';
  id: string;
  date: string;
  description: string;
  amount: number;
  ref: string;
  method?: string;
};

export default function CreditAccountPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [balance, setBalance] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [available, setAvailable] = useState(0);
  const [aging, setAging] = useState<DebtAging>({
    current: 0, days30to60: 0, days60to90: 0, days90plus: 0,
  });
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getCustomerDebt(customerId)
      .then((data) => {
        setCustomer(data.customer);
        setBalance(data.balance);
        setCreditLimit(data.creditLimit);
        setAvailable(data.available);
        setAging(data.aging);

        // Build mixed ledger: sales (debits) + payments (credits)
        const entries: LedgerEntry[] = [];
        for (const sale of data.sales) {
          const isUnpaid = sale.paymentStatus === 'UNPAID' || sale.paymentStatus === 'PARTIAL';
          entries.push({
            type: 'sale',
            id: sale.id,
            date: sale.date || sale.createdAt,
            description: sale.lines.map((l) => l.productName).join(', ') || 'Sale',
            amount: isUnpaid ? (sale.dueTotal || sale.grandTotal) : -(sale.paidTotal || 0),
            ref: sale.ref,
          });
        }
        for (const p of data.payments) {
          entries.push({
            type: 'payment',
            id: p.id,
            date: p.date,
            description: p.method,
            amount: -p.amount,
            ref: p.ref,
            method: p.method,
          });
        }
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLedger(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 700 }}>Customer not found</Typography>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2, textTransform: 'none' }}>Go Back</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: brand.neutral[50], pb: 8 }}>
      {/* Header — Letis Green gradient */}
      <Box sx={{
        background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
        color: '#fff', p: 2.5,
      }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#fff' }}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>{customer.name}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Credit limit: {fmt(creditLimit)}
            </Typography>
          </Box>
          <Chip
            label={customer.active ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '8px',
            }}
          />
        </Stack>
      </Box>

      {/* Balance cards */}
      <Box sx={{ display: 'flex', gap: 1.5, px: 2, mt: -1.5, position: 'relative', zIndex: 1 }}>
        <Box sx={{
          flex: 1, bgcolor: '#fff', borderRadius: '12px', p: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)', textAlign: 'center',
        }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: brand.warning.dark }}>
            {fmt(balance)}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 700 }}>
            Outstanding
          </Typography>
        </Box>
        <Box sx={{
          flex: 1, bgcolor: '#fff', borderRadius: '12px', p: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)', textAlign: 'center',
        }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: brand.success.dark }}>
            {fmt(available)}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 700 }}>
            Available
          </Typography>
        </Box>
      </Box>

      {/* Aging */}
      {balance > 0 && (
        <Box sx={{ px: 2, mt: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>Debt Aging</Typography>
          <Stack direction="row" spacing={1}>
            {([
              { label: '<30d', value: aging.current, bg: brand.success.light, color: brand.success.dark },
              { label: '30-60d', value: aging.days30to60, bg: brand.warning.light, color: brand.warning.dark },
              { label: '60-90d', value: aging.days60to90, bg: brand.error.light, color: brand.error.dark },
              { label: '90d+', value: aging.days90plus, bg: brand.neutral[200], color: brand.neutral[600] },
            ]).map((bucket) => (
              <Box key={bucket.label} sx={{
                flex: 1, bgcolor: bucket.bg, borderRadius: '8px', p: 1, textAlign: 'center',
              }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: bucket.color }}>
                  {fmt(bucket.value)}
                </Typography>
                <Typography variant="caption" sx={{ color: bucket.color, fontWeight: 600 }}>
                  {bucket.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Quick actions */}
      <Stack direction="row" spacing={1.5} sx={{ px: 2, mt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => setPaymentOpen(true)}
          disabled={balance <= 0}
          startIcon={<IconCash size={18} />}
          sx={{
            textTransform: 'none', fontWeight: 800, borderRadius: '10px', py: 1.2,
            bgcolor: brand.primary[600],
            '&:hover': { bgcolor: brand.primary[700] },
          }}
        >
          Record Payment
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate('/pos/terminal')}
          startIcon={<IconFileDescription size={18} />}
          sx={{
            textTransform: 'none', fontWeight: 700, borderRadius: '10px', py: 1.2,
            borderColor: brand.neutral[200], color: brand.neutral[700],
          }}
        >
          New Sale
        </Button>
      </Stack>

      {/* Transaction ledger */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1.5 }}>
          Transaction Ledger
        </Typography>
        {ledger.length === 0 ? (
          <Typography variant="body2" sx={{
            color: brand.neutral[500], fontWeight: 600, textAlign: 'center', py: 4,
          }}>
            No transactions yet
          </Typography>
        ) : (
          ledger.map((entry) => (
            <Stack
              key={`${entry.type}-${entry.id}`}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ py: 1.25, borderBottom: `1px solid ${brand.neutral[100]}` }}
            >
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                bgcolor: entry.type === 'sale' ? brand.error.light : brand.success.light,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {entry.type === 'sale'
                  ? <IconFileDescription size={16} color={brand.error.dark} />
                  : <IconCash size={16} color={brand.success.dark} />
                }
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.84rem' }} noWrap>
                  {entry.type === 'sale' ? `Sale ${entry.ref}` : `Payment — ${entry.description}`}
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                  {new Date(entry.date).toLocaleDateString()}
                </Typography>
              </Box>
              <Typography sx={{
                fontWeight: 800, fontSize: '0.9rem',
                color: entry.amount >= 0 ? brand.error.main : brand.success.main,
              }}>
                {entry.amount >= 0 ? '+' : ''}{fmt(Math.abs(entry.amount))}
              </Typography>
            </Stack>
          ))
        )}
      </Box>

      {/* Walk-in Payment Modal */}
      <WalkInPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onPaid={(_customerId, _amount, newBal) => {
          setBalance(newBal);
          setAvailable(Math.max(0, creditLimit - newBal));
          setPaymentOpen(false);
        }}
        preselectedCustomerId={customerId}
      />
    </Box>
  );
}
