/**
 * CreditPaymentZone — payment method selector with Pay Later support.
 *
 * Replaces the hardcoded "Pay ${total}" button in layout footers.
 * Shows Cash, Card, Pay Later (when customer has credit), and Split options.
 */
import { useState } from 'react';
import {
  Box,
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
import {
  IconCash,
  IconCreditCard,
  IconReceipt,
  IconArrowsSplit,
  IconCheck,
} from '@tabler/icons-react';
import type { Customer } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export type CreditPaymentMethod = 'CASH' | 'CARD' | 'CREDIT' | 'SPLIT';

export interface SplitAllocation {
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
}

export interface CreditPaymentZoneProps {
  total: number;
  currency?: string;
  customerId: string | null;
  customers: Customer[];
  customerBalance: number | null;
  creditAvailable: boolean;
  creditLimit: number;
  submitting: boolean;
  canCheckout: boolean;
  onCheckout: (method: CreditPaymentMethod, split?: SplitAllocation) => void;
}

export default function CreditPaymentZone({
  total,
  currency,
  customerId: _customerId,
  customers: _customers,
  customerBalance,
  creditAvailable,
  creditLimit,
  submitting,
  canCheckout,
  onCheckout,
}: CreditPaymentZoneProps) {
  const [selectedMethod, setSelectedMethod] = useState<CreditPaymentMethod>('CASH');
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitCredit, setSplitCredit] = useState('');

  const newBalance = customerBalance !== null
    ? customerBalance + (selectedMethod === 'CREDIT' ? total : 0)
    : null;

  const wouldExceedLimit = creditLimit > 0 && newBalance !== null && newBalance > creditLimit;

  const methods: { key: CreditPaymentMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'CASH', label: 'Cash', icon: <IconCash size={18} /> },
    { key: 'CARD', label: 'Card', icon: <IconCreditCard size={18} /> },
  ];

  if (creditAvailable) {
    methods.push({ key: 'CREDIT', label: 'Pay Later', icon: <IconReceipt size={18} /> });
  }
  methods.push({ key: 'SPLIT', label: 'Split', icon: <IconArrowsSplit size={18} /> });

  const handleSplitConfirm = () => {
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    const credit = parseFloat(splitCredit) || 0;
    onCheckout('SPLIT', { cashAmount: cash, cardAmount: card, creditAmount: credit });
    setSplitOpen(false);
  };

  const remaining = total
    - (parseFloat(splitCash) || 0)
    - (parseFloat(splitCard) || 0)
    - (parseFloat(splitCredit) || 0);

  return (
    <Box>
      {/* Method selector */}
      <Stack spacing={1} sx={{ mb: 1.5 }}>
        {methods.map((m) => {
          const active = selectedMethod === m.key;
          const isCredit = m.key === 'CREDIT';
          const isBlocked = isCredit && wouldExceedLimit;

          return (
            <Button
              key={m.key}
              variant={active ? 'contained' : 'outlined'}
              startIcon={m.icon}
              disabled={isBlocked}
              onClick={() => setSelectedMethod(m.key)}
              sx={{
                textTransform: 'none',
                fontWeight: active ? 800 : 600,
                borderRadius: '12px',
                py: 1.2,
                justifyContent: 'flex-start',
                borderColor: active ? 'transparent' : brand.neutral[200],
                bgcolor: active
                  ? isCredit
                    ? brand.primary[600]
                    : brand.neutral[800]
                  : 'transparent',
                color: active ? '#fff' : isCredit ? brand.primary[600] : brand.neutral[800],
                '&:hover': {
                  bgcolor: active
                    ? isCredit
                      ? brand.primary[700]
                      : brand.neutral[900]
                    : isCredit
                      ? brand.primary[50]
                      : brand.neutral[50],
                },
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography sx={{ fontWeight: 'inherit', fontSize: '0.85rem' }}>
                  {m.label}
                </Typography>
                {isCredit && newBalance !== null && (
                  <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
                    New balance: {fmt(newBalance)}
                  </Typography>
                )}
                {isBlocked && (
                  <Typography variant="caption" sx={{ color: brand.error.main, fontWeight: 700 }}>
                    Would exceed credit limit ({fmt(creditLimit)})
                  </Typography>
                )}
              </Box>
              {active && <IconCheck size={18} />}
            </Button>
          );
        })}
      </Stack>

      {/* Pay button */}
      <Button
        fullWidth
        variant="contained"
        disabled={!canCheckout || submitting}
        onClick={() => {
          if (selectedMethod === 'SPLIT') {
            setSplitCash(total.toString());
            setSplitCard('0');
            setSplitCredit('0');
            setSplitOpen(true);
          } else {
            onCheckout(selectedMethod);
          }
        }}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={18} />}
        sx={{
          textTransform: 'none',
          fontWeight: 800,
          borderRadius: '12px',
          py: 1.5,
          fontSize: '0.95rem',
          bgcolor: brand.primary[600],
          '&:hover': { bgcolor: brand.primary[700] },
          boxShadow: `0 12px 28px -14px ${brand.primary[600]}bb`,
        }}
      >
        {submitting
          ? 'Processing…'
          : selectedMethod === 'CREDIT'
            ? `Add to Tab — ${fmt(total, currency)}`
            : `Pay ${fmt(total, currency)}`}
      </Button>

      {/* Split modal */}
      <Dialog open={splitOpen} onClose={() => setSplitOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Split Payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Cash"
              type="number"
              value={splitCash}
              onChange={(e) => setSplitCash(e.target.value)}
              InputProps={{ startAdornment: <IconCash size={16} style={{ marginRight: 8 }} /> }}
              fullWidth
            />
            <TextField
              label="Card"
              type="number"
              value={splitCard}
              onChange={(e) => setSplitCard(e.target.value)}
              InputProps={{ startAdornment: <IconCreditCard size={16} style={{ marginRight: 8 }} /> }}
              fullWidth
            />
            {creditAvailable && (
              <TextField
                label="Pay Later (add to tab)"
                type="number"
                value={splitCredit}
                onChange={(e) => setSplitCredit(e.target.value)}
                InputProps={{ startAdornment: <IconReceipt size={16} style={{ marginRight: 8 }} /> }}
                fullWidth
              />
            )}
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[600] }}>
              Total: {fmt(total)} · Remaining: {fmt(remaining)}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSplitConfirm} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Confirm Split
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
