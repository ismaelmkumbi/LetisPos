/**
 * CloseRegisterModal — closes a cash register session with counted cash.
 */
import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconCheck, IconLock } from '@tabler/icons-react';
import { closeRegister } from 'src/api/smartpos/cashRegister';
import type { CashRegisterSession } from 'src/api/smartpos/cashRegister';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { premiumFieldSx } from './PosLayouts/shared';

const fmt = formatMoney;

interface CloseRegisterModalProps {
  open: boolean;
  warehouseId: string;
  session: CashRegisterSession | null;
  onClose: () => void;
  onClosed: (session: CashRegisterSession) => void;
}

export default function CloseRegisterModal({ open, warehouseId, session, onClose, onClosed }: CloseRegisterModalProps) {
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const countedNum = Number(counted) || 0;
  const expectedNum = session?.expectedCash ?? 0;
  const difference = countedNum - expectedNum;

  const handleClose = () => {
    setCounted('');
    setNotes('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (countedNum <= 0) {
      setError('Please enter the counted cash amount.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await closeRegister(warehouseId, {
        countedCash: countedNum,
        notes: notes || undefined,
      });
      onClosed(result);
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to close register');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      TransitionProps={{ timeout: 200 }}
      PaperProps={{
        sx: {
          borderRadius: '18px',
          overflow: 'hidden',
          bgcolor: '#fff',
        },
      }}
    >
      <DialogTitle sx={{
        fontWeight: 800,
        fontSize: '1.1rem',
        pb: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>
            Close Cash Register
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            Count your cash drawer and record the total
          </Typography>
        </Box>
        <Chip
          icon={<IconLock size={14} />}
          label="Close"
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: brand.warning.light,
            color: brand.warning.dark,
            borderRadius: '8px',
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {session && (
            <Box sx={{
              p: 2,
              borderRadius: '12px',
              bgcolor: brand.primary[50],
              border: `1px solid ${brand.primary[100]}`,
            }}>
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: brand.neutral[600], fontWeight: 600 }}>
                    Opening Balance
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {fmt(session.openingBalance)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: brand.neutral[600], fontWeight: 600 }}>
                    Expected Cash (POS sales)
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: brand.primary[700] }}>
                    {fmt(expectedNum)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}

          <TextField
            label="Counted Cash"
            type="number"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            sx={premiumFieldSx}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">TSh</InputAdornment>,
              },
              htmlInput: { min: 0, step: 1000 },
            }}
          />

          {countedNum > 0 && (
            <Box sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: difference >= 0 ? brand.success.light : brand.error.light,
              border: `1px solid ${difference >= 0 ? brand.success.main : brand.error.main}33`,
            }}>
              <Typography sx={{
                fontWeight: 800,
                fontSize: '0.9rem',
                color: difference >= 0 ? brand.success.dark : brand.error.dark,
              }}>
                {difference === 0
                  ? 'Balanced — counted matches expected'
                  : difference > 0
                    ? `Over by ${fmt(difference)}`
                    : `Short by ${fmt(Math.abs(difference))}`}
              </Typography>
            </Box>
          )}

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={premiumFieldSx}
          />

          {error && (
            <Typography variant="caption" sx={{ color: brand.error.main, fontWeight: 700 }}>
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[600] }}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || countedNum <= 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: '10px',
            px: 3,
          }}
        >
          {submitting ? 'Closing...' : 'Close Register'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
