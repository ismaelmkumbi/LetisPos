/**
 * PaymentSuccessOverlay — full-screen success screen after completing a sale.
 *
 * Shows the sale reference, amount, payment method, and action buttons.
 * Auto-dismisses after 5 seconds. Keyboard shortcuts: Enter = New Sale, P = Print.
 */
import { useEffect, useRef } from 'react';
import {
  Backdrop,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconCheck,
  IconCoin,
  IconCreditCard,
  IconDeviceMobile,
  IconEye,
  IconPrinter,
  IconReceipt,
  IconX,
} from '@tabler/icons-react';
import type { Sale } from 'src/api/smartpos/sales';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface PaymentSuccessOverlayProps {
  open: boolean;
  sale: Sale | null;
  paymentMethod: string;
  change: number;
  // Credit sale additions
  saleType?: 'CASH' | 'CREDIT' | 'SPLIT';
  newBalance?: number;
  onNewSale: () => void;
  onPrint: (sale: Sale) => void;
  onPreview?: (sale: Sale) => void;
  onClose: () => void;
  onRecordPayment?: () => void;
}

const methodIcons: Record<string, React.ReactNode> = {
  CASH: <IconCoin size={22} />,
  CARD: <IconCreditCard size={22} />,
  MOBILE: <IconDeviceMobile size={22} />,
};

export default function PaymentSuccessOverlay({
  open, sale, paymentMethod, change, saleType, newBalance, onNewSale, onPrint, onPreview, onClose, onRecordPayment,
}: PaymentSuccessOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !sale) return;
    // Auto-dismiss after 5 seconds
    timerRef.current = setTimeout(onClose, 5000);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [open, sale, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNewSale();
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (sale) onPrint(sale);
      }
      if ((e.key === 'r' || e.key === 'R') && saleType === 'CREDIT' && onRecordPayment) {
        e.preventDefault();
        onRecordPayment();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, sale, onNewSale, onPrint, onClose, saleType, onRecordPayment]);

  if (!sale) return null;

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: 1400,
        bgcolor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        role="dialog"
        aria-label="Payment successful"
        sx={{
          width: '100%',
          maxWidth: 440,
          bgcolor: '#fff',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: `0 32px 64px -24px ${brand.neutral[900]}55`,
          animation: 'letis-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          '@keyframes letis-slide-up': {
            from: { opacity: 0, transform: 'translateY(28px) scale(0.97)' },
            to: { opacity: 1, transform: 'translateY(0) scale(1)' },
          },
        }}
      >
        {/* Close button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: brand.neutral[400],
            '&:hover': { color: brand.neutral[700] },
          }}
        >
          <IconX size={20} />
        </IconButton>

        {/* Green success banner */}
        <Box
          sx={{
            py: 3.5,
            background: `linear-gradient(135deg, ${brand.success.main} 0%, #059669 100%)`,
            textAlign: 'center',
            color: '#fff',
          }}
        >
          {/* Animated checkmark */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.5,
              animation: 'letis-check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '@keyframes letis-check-pop': {
                from: { transform: 'scale(0)', opacity: 0 },
                to: { transform: 'scale(1)', opacity: 1 },
              },
            }}
          >
            <IconCheck size={36} stroke={3} />
          </Box>
          {saleType === 'CREDIT' ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
                Added to Tab
              </Typography>
              <Typography sx={{ fontWeight: 600, opacity: 0.85, mt: 0.3 }}>
                Balance updated
              </Typography>
              {newBalance !== undefined && (
                <Chip
                  label={`New Balance: ${Number(newBalance).toLocaleString('en', { minimumFractionDigits: 2 })}`}
                  sx={{
                    mt: 1.5,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: '10px',
                    height: 36,
                  }}
                />
              )}
            </Box>
          ) : (
            <>
              <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
                Payment Successful
              </Typography>
              <Typography sx={{ fontWeight: 600, opacity: 0.85, mt: 0.3 }}>
                Sale completed successfully
              </Typography>
            </>
          )}
        </Box>

        {/* Details */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700, color: brand.neutral[600] }}>
                Sale Reference
              </Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '1.15rem', color: brand.primary[700] }}>
                {sale.ref}
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700, color: brand.neutral[600] }}>
                Amount Paid
              </Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: brand.neutral[900] }}>
                {fmt(sale.grandTotal, sale.currency)}
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700, color: brand.neutral[600] }}>
                Payment Method
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ color: brand.primary[600] }}>
                  {methodIcons[paymentMethod] || methodIcons.CASH}
                </Box>
                <Typography sx={{ fontWeight: 800, color: brand.neutral[800] }}>
                  {paymentMethod}
                </Typography>
              </Stack>
            </Stack>

            {change > 0 && (
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontWeight: 700, color: brand.neutral[600] }}>
                  Change Due
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: brand.success.dark }}>
                  {fmt(change, sale.currency)}
                </Typography>
              </Stack>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 700, color: brand.neutral[600] }}>
                Date & Time
              </Typography>
              <Typography sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '0.84rem' }}>
                {new Date(sale.createdAt).toLocaleString()}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Action buttons */}
        <Box sx={{ px: 3, pb: 3, display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<IconPrinter size={18} />}
            onClick={() => onPrint(sale)}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 800,
              color: brand.neutral[800],
              borderColor: brand.neutral[200],
              '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
            }}
          >
            Print
          </Button>
          {onPreview && (
            <Button
              variant="outlined"
              startIcon={<IconEye size={18} />}
              onClick={() => onPreview(sale)}
              sx={{
                flex: 1,
                py: 1.2,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 800,
                color: brand.neutral[800],
                borderColor: brand.neutral[200],
                '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
              }}
            >
              Preview
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<IconCheck size={18} />}
            onClick={onNewSale}
            sx={{
              flex: 1,
              py: 1.2,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 800,
              background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[500]} 100%)`,
              '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[600]} 100%)` },
            }}
          >
            New Sale
          </Button>
          {saleType === 'CREDIT' && onRecordPayment && (
            <Button
              variant="outlined"
              startIcon={<IconReceipt size={18} />}
              onClick={onRecordPayment}
              sx={{
                flex: 1,
                py: 1.2,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 800,
                color: '#B45309',
                borderColor: '#F59E0B',
                '&:hover': { borderColor: '#B45309', bgcolor: '#FEF3C7' },
              }}
            >
              Record Payment
            </Button>
          )}
        </Box>

        {/* Keyboard hint */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            pb: 2,
            color: brand.neutral[400],
            fontWeight: 600,
          }}
        >
          {saleType === 'CREDIT'
            ? 'Enter = New Sale  ·  P = Print  ·  Esc = Close  ·  R = Record Payment  ·  Auto-closes in 5s'
            : 'Enter = New Sale  ·  P = Print  ·  Esc = Close  ·  Auto-closes in 5s'
          }
        </Typography>
      </Box>
    </Backdrop>
  );
}
