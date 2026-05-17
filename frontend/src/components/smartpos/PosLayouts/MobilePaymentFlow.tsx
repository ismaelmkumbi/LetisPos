/**
 * MobilePaymentFlow — 3-step payment for small screens.
 *
 * Step 0: Pick method  (3-col grid of payment types)
 * Step 1: Enter amount (keypad + presets, skip for CREDIT)
 * Step 2: Confirm     (summary + complete button)
 */
import { useState } from 'react';
import {
  Box, Button, CircularProgress, IconButton, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import {
  IconArrowLeft, IconCheck, IconPlus, IconX, IconReceipt,
  IconCoin, IconCreditCard, IconDeviceMobile, IconBuildingBank,
  IconCalculator, IconSparkles,
} from '@tabler/icons-react';
import type { PaymentChoice } from './PosLayoutProps';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface MobilePaymentFlowProps {
  grand: number;
  paymentChoice: PaymentChoice;
  onPaymentChoiceChange: (choice: PaymentChoice) => void;
  tendered: string;
  onTenderedChange: (v: string) => void;
  customerName: string;
  submitting: boolean;
  canComplete: boolean;
  onBack: () => void;
  onComplete: () => void;
  // Split payment
  splitPayments?: { method: PaymentChoice; amount: number }[];
  onSplitPaymentsChange?: (payments: { method: PaymentChoice; amount: number }[]) => void;
}

const METHOD_LABEL: Record<PaymentChoice, string> = {
  CASH: 'Cash', CARD: 'Card', MOBILE: 'Mobile Money',
  BANK: 'Bank Transfer', USSD: 'USSD', CREDIT: 'Pay Later', SPLIT: 'Mixed',
};

export default function MobilePaymentFlow(p: MobilePaymentFlowProps) {
  const [step, setStep] = useState(0);
  const tenderedNumber = Number(p.tendered) || 0;

  const methods: { key: PaymentChoice; icon: React.ReactNode; label: string }[] = [
    { key: 'CASH', icon: <IconCoin size={28} />, label: 'Cash' },
    { key: 'CARD', icon: <IconCreditCard size={28} />, label: 'Card' },
    { key: 'MOBILE', icon: <IconDeviceMobile size={28} />, label: 'Mobile' },
    { key: 'BANK', icon: <IconBuildingBank size={28} />, label: 'Bank' },
    { key: 'USSD', icon: <IconCalculator size={28} />, label: 'USSD' },
    { key: 'CREDIT', icon: <IconReceipt size={28} />, label: 'Pay Later' },
    { key: 'SPLIT', icon: <IconSparkles size={28} />, label: 'Split' },
  ];

  const goNext = () => {
    if (step === 0 && p.paymentChoice === 'CREDIT') {
      setStep(2); // Skip amount entry for credit
    } else {
      setStep(step + 1);
    }
  };

  const setDigit = (d: string) => {
    const next = `${p.tendered || ''}${d}`.replace(/^0+(?=\d)/, '');
    p.onTenderedChange(next);
  };
  const backspace = () => p.onTenderedChange((p.tendered || '').slice(0, -1));

  const splitTotal = (p.splitPayments || []).reduce((s, sp) => s + sp.amount, 0);
  const splitRemaining = Math.max(0, p.grand - splitTotal);

  const effectiveCanComplete =
    p.paymentChoice === 'SPLIT' ? splitRemaining <= 0 && !p.submitting
    : p.paymentChoice === 'CREDIT' ? !p.submitting
    : p.canComplete;

  const change = Math.max(0, tenderedNumber - p.grand);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* ── Step indicators ── */}
      <Stack direction="row" spacing={1} sx={{ px: 2, py: 1.5, alignItems: 'center', flexShrink: 0 }}>
        <IconButton onClick={step === 0 ? p.onBack : () => setStep(step - 1)} size="small">
          <IconArrowLeft size={20} />
        </IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', flex: 1 }}>
          {step === 0 ? 'Payment Method' : step === 1 ? 'Enter Amount' : 'Confirm'}
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: brand.primary[700] }}>
          {fmt(p.grand)}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {[0, 1, 2].map(s => (
            <Box key={s} sx={{
              width: 20, height: 3, borderRadius: 2,
              bgcolor: step >= s ? brand.primary[600] : brand.neutral[200],
              transition: 'background 0.2s',
            }} />
          ))}
        </Stack>
      </Stack>

      {/* ═══ STEP 0 — Pick Method ═══ */}
      {step === 0 && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: brand.neutral[500], mb: 1.5 }}>
            Select payment method
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
            {methods.map(m => {
              const active = p.paymentChoice === m.key;
              return (
                <Button key={m.key} variant={active ? 'contained' : 'outlined'}
                  onClick={() => p.onPaymentChoiceChange(m.key)}
                  sx={{
                    aspectRatio: '1/1', borderRadius: '14px',
                    borderColor: active ? 'transparent' : brand.neutral[200],
                    bgcolor: active ? brand.primary[600] : '#fff',
                    color: active ? '#fff' : brand.neutral[700],
                    display: 'flex', flexDirection: 'column', gap: 0.5,
                    textTransform: 'none', fontWeight: active ? 800 : 600, fontSize: '0.75rem',
                    '&:hover': { bgcolor: active ? brand.primary[700] : brand.primary[50] },
                  }}>
                  {m.icon}
                  {m.label}
                </Button>
              );
            })}
          </Box>
          <Button fullWidth variant="contained" size="large" onClick={goNext}
            sx={{ mt: 2, textTransform: 'none', fontWeight: 800, borderRadius: '12px', py: 1.5, fontSize: '0.95rem', bgcolor: brand.neutral[800], '&:hover': { bgcolor: brand.neutral[900] } }}>
            Continue with {METHOD_LABEL[p.paymentChoice]}
          </Button>
        </Box>
      )}

      {/* ═══ STEP 1 — Enter Amount ═══ */}
      {step === 1 && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2, display: 'flex', flexDirection: 'column' }}>
          {p.paymentChoice === 'SPLIT' ? (
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: brand.neutral[500], mb: 1 }}>Split Payment</Typography>
              {(p.splitPayments || []).map((sp, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ mb: 1 }}>
                  <TextField select size="small" value={sp.method}
                    onChange={(e) => {
                      const next = [...(p.splitPayments || [])];
                      next[i] = { ...next[i], method: e.target.value as PaymentChoice };
                      p.onSplitPaymentsChange?.(next);
                    }} sx={{ width: 140 }}>
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="CARD">Card</MenuItem>
                    <MenuItem value="MOBILE">Mobile</MenuItem>
                  </TextField>
                  <TextField size="small" type="number" value={sp.amount || ''}
                    onChange={(e) => {
                      const next = [...(p.splitPayments || [])];
                      next[i] = { ...next[i], amount: Number(e.target.value) || 0 };
                      p.onSplitPaymentsChange?.(next);
                    }} placeholder="Amount" sx={{ flex: 1 }} />
                  <IconButton onClick={() => p.onSplitPaymentsChange?.((p.splitPayments || []).filter((_, j) => j !== i))}>
                    <IconX size={16} />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<IconPlus size={16} />}
                onClick={() => p.onSplitPaymentsChange?.([...(p.splitPayments || []), { method: 'CASH', amount: 0 }])}
                sx={{ textTransform: 'none' }}>Add</Button>
              <Box sx={{ mt: 2, p: 1.5, bgcolor: brand.neutral[50], borderRadius: '10px' }}>
                <Stack direction="row" justifyContent="space-between"><Typography>Total</Typography><Typography sx={{ fontWeight: 800 }}>{fmt(p.grand)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography>Tendered</Typography><Typography sx={{ fontWeight: 800, color: brand.primary[700] }}>{fmt(splitTotal)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography>Remaining</Typography><Typography sx={{ fontWeight: 800, color: splitRemaining > 0 ? brand.error.main : brand.success.main }}>{fmt(splitRemaining)}</Typography></Stack>
              </Box>
            </Box>
          ) : (
            <>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography sx={{ fontSize: '0.85rem', color: brand.neutral[500], fontWeight: 600 }}>Amount Due</Typography>
                <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: brand.neutral[900] }}>{fmt(p.grand)}</Typography>
              </Box>
              <TextField type="number" fullWidth autoFocus value={p.tendered}
                onChange={(e) => p.onTenderedChange(e.target.value)} placeholder="0"
                InputProps={{ sx: { fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', borderRadius: '14px' } }}
                sx={{ mb: 2 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                {[20000, 30000, 50000, 100000].map(v => (
                  <Button key={v} variant="outlined" size="small" onClick={() => p.onTenderedChange(String(v))}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: brand.neutral[200], color: brand.neutral[600] }}>{fmt(v)}</Button>
                ))}
                <Button variant="outlined" size="small" onClick={() => p.onTenderedChange(String(Math.ceil(p.grand / 1000) * 1000))}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: brand.primary[200], color: brand.primary[700] }}>Round up</Button>
                <Button variant="outlined" size="small" onClick={() => p.onTenderedChange(String(p.grand))}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: brand.primary[200], color: brand.primary[700] }}>Exact</Button>
                <Button variant="outlined" size="small" color="error" onClick={() => p.onTenderedChange('')}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Clear</Button>
              </Box>
              <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                {['1','2','3','4','5','6','7','8','9'].map(d => (
                  <Button key={d} onClick={() => setDigit(d)}
                    sx={{ py: 1.5, fontSize: '1.2rem', fontWeight: 700, borderRadius: '10px', bgcolor: '#fff', border: `1px solid ${brand.neutral[200]}`, color: brand.neutral[800] }}>{d}</Button>
                ))}
                <Button onClick={() => p.onTenderedChange('')}
                  sx={{ py: 1.5, fontWeight: 700, borderRadius: '10px', bgcolor: brand.error.light, color: brand.error.dark }}>C</Button>
                <Button onClick={() => setDigit('0')}
                  sx={{ py: 1.5, fontSize: '1.2rem', fontWeight: 700, borderRadius: '10px', bgcolor: '#fff', border: `1px solid ${brand.neutral[200]}`, color: brand.neutral[800] }}>0</Button>
                <Button onClick={backspace}
                  sx={{ py: 1.5, fontWeight: 700, borderRadius: '10px', bgcolor: brand.neutral[50], color: brand.neutral[600] }}>⌫</Button>
              </Box>
              {tenderedNumber > 0 && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: brand.success.light, borderRadius: '10px', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.8rem', color: brand.success.dark, fontWeight: 700 }}>
                    Change: {fmt(change)}
                  </Typography>
                </Box>
              )}
            </>
          )}
          <Button fullWidth variant="contained" size="large" onClick={goNext}
            sx={{ mt: 2, textTransform: 'none', fontWeight: 800, borderRadius: '12px', py: 1.5, fontSize: '0.95rem', bgcolor: brand.neutral[800], '&:hover': { bgcolor: brand.neutral[900] } }}>
            Review & Confirm
          </Button>
        </Box>
      )}

      {/* ═══ STEP 2 — Confirm ═══ */}
      {step === 2 && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ bgcolor: brand.success.light, borderRadius: '14px', p: 2, mb: 2, textAlign: 'center' }}>
            <IconCheck size={40} color={brand.success.main} style={{ marginBottom: 8 }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: brand.success.dark }}>
              {METHOD_LABEL[p.paymentChoice]}
            </Typography>
            {p.paymentChoice === 'CREDIT' && (
              <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>
                Added to customer tab
              </Typography>
            )}
          </Box>

          <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: `1px solid ${brand.neutral[200]}`, p: 2 }}>
            <Stack spacing={1.5}>
              {p.paymentChoice !== 'CREDIT' && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: brand.neutral[500] }}>Tendered</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{fmt(tenderedNumber || p.grand)}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: brand.neutral[500] }}>Total</Typography>
                <Typography sx={{ fontWeight: 800 }}>{fmt(p.grand)}</Typography>
              </Stack>
              {p.paymentChoice !== 'CREDIT' && change > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: brand.neutral[500] }}>Change</Typography>
                  <Typography sx={{ fontWeight: 800, color: brand.success.dark }}>{fmt(change)}</Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ color: brand.neutral[500] }}>Customer</Typography>
                <Typography sx={{ fontWeight: 600 }}>{p.customerName}</Typography>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button fullWidth variant="contained" size="large" disabled={!effectiveCanComplete}
              onClick={p.onComplete}
              startIcon={p.submitting ? <CircularProgress size={20} color="inherit" /> : <IconCheck size={22} />}
              sx={{ textTransform: 'none', fontWeight: 900, borderRadius: '14px', py: 1.8, fontSize: '1.05rem',
                bgcolor: brand.primary[600], '&:hover': { bgcolor: brand.primary[700] },
                boxShadow: `0 12px 28px -12px ${brand.primary[600]}88` }}>
              {p.submitting ? 'Processing…' : p.paymentChoice === 'CREDIT' ? 'Add to Tab' : `Complete · ${fmt(p.grand)}`}
            </Button>
            <Button fullWidth variant="text" size="small"
              onClick={() => setStep(p.paymentChoice === 'CREDIT' ? 0 : 1)}
              sx={{ mt: 1, textTransform: 'none', fontWeight: 600, color: brand.neutral[500] }}>
              Back
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

