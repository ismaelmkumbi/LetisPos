/**
 * CollectionsRunPage — mobile-optimized debt collection round view.
 *
 * Lists all debtors. Tapping one opens a quick-collect screen:
 * big amount input, method toggle, "Record & Next" flow.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconCash,
  IconCheck,
  IconChevronRight,
  IconDeviceMobile,
} from '@tabler/icons-react';
import { listDebtors, type CustomerDebt } from 'src/api/smartpos/credit';
import { recordPayment } from 'src/api/smartpos/payments';
import { listSales } from 'src/api/smartpos/sales';
import { useOnlineStatus } from 'src/components/smartpos/OfflineBanner';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function CollectionsRunPage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [debtors, setDebtors] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listDebtors()
      .then(setDebtors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedDebtor = selectedIndex !== null ? debtors[selectedIndex] : null;

  const handleRecordAndNext = async () => {
    if (!selectedDebtor) return;
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;

    setSubmitting(true);
    try {
      const unpaidSales = await listSales({
        customerId: selectedDebtor.customerId,
        paymentStatus: 'UNPAID',
        size: 1,
      });
      if (unpaidSales.content[0]) {
        await recordPayment({
          referenceType: 'SALE',
          referenceId: unpaidSales.content[0].id,
          accountId: '',
          amount,
          method: paymentMethod as 'CASH' | 'CARD' | 'MPESA',
        });
      }
      // Update local debtor list
      const updated = [...debtors];
      updated[selectedIndex!] = {
        ...selectedDebtor,
        outstanding: selectedDebtor.outstanding - amount,
      };
      setDebtors(updated.filter((d) => d.outstanding > 0));
      setPaymentAmount('');
      // Auto-advance to next debtor
      if (selectedIndex! < updated.length - 1) {
        setSelectedIndex(selectedIndex! + 1);
      } else {
        setSelectedIndex(null);
      }
    } catch {
      // silent — stay on current screen
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick-collect detail view ──
  if (selectedDebtor) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: brand.neutral[50] }}>
        <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: `1px solid ${brand.neutral[200]}` }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <IconButton onClick={() => setSelectedIndex(null)}>
              <IconArrowLeft size={20} />
            </IconButton>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
              {selectedDebtor.customerName}
            </Typography>
          </Stack>
          <Typography sx={{ fontWeight: 500, color: brand.neutral[500] }}>
            Outstanding:{' '}
            <span style={{ fontWeight: 800, color: brand.error.main }}>
              {fmt(selectedDebtor.outstanding)}
            </span>
          </Typography>
          {!online && (
            <Chip
              label="Offline"
              size="small"
              sx={{ mt: 1, bgcolor: brand.warning.light, color: brand.warning.dark, fontWeight: 700 }}
            />
          )}
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Amount Collected</Typography>
          <TextField
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            slotProps={{ input: { sx: { fontSize: '1.5rem', fontWeight: 800 } } }}
            fullWidth
          />

          <Typography sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>Method</Typography>
          <ToggleButtonGroup
            value={paymentMethod}
            exclusive
            onChange={(_, v) => v && setPaymentMethod(v)}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="CASH" sx={{ textTransform: 'none', fontWeight: 700, py: 1.2 }}>
              <IconCash size={18} style={{ marginRight: 6 }} /> Cash
            </ToggleButton>
            <ToggleButton value="MOBILE_MONEY" sx={{ textTransform: 'none', fontWeight: 700, py: 1.2 }}>
              <IconDeviceMobile size={18} style={{ marginRight: 6 }} /> Mobile
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            fullWidth
            variant="contained"
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || submitting}
            onClick={handleRecordAndNext}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
            sx={{
              textTransform: 'none', fontWeight: 800, borderRadius: '12px', py: 1.8, fontSize: '1rem',
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {submitting ? 'Recording…' : `Record ${fmt(parseFloat(paymentAmount) || 0)} & Next`}
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Debtor list view ──
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: brand.neutral[50], pb: 4 }}>
      <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: `1px solid ${brand.neutral[200]}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate(-1)}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Collections</Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
              {debtors.length} debtor{debtors.length !== 1 ? 's' : ''} · {online ? 'Online' : 'Offline'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : debtors.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontWeight: 700, color: brand.neutral[500] }}>
            All caught up
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
            No outstanding debt to collect
          </Typography>
        </Box>
      ) : (
        debtors.map((d, i) => (
          <Box
            key={d.customerId}
            onClick={() => { setSelectedIndex(i); setPaymentAmount(d.outstanding.toFixed(2)); }}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              py: 2, px: 2.5, bgcolor: '#fff',
              borderBottom: `1px solid ${brand.neutral[100]}`,
              cursor: 'pointer',
              '&:active': { bgcolor: brand.neutral[50] },
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{d.customerName}</Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                {d.saleCount} sale{d.saleCount !== 1 ? 's' : ''}
                {d.overdue && ' · Overdue'}
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 800, color: brand.error.main }}>
                {fmt(d.outstanding)}
              </Typography>
              <IconChevronRight size={16} color={brand.neutral[400]} />
            </Stack>
          </Box>
        ))
      )}
    </Box>
  );
}
