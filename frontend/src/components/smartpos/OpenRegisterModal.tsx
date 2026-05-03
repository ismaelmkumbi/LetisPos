/**
 * OpenRegisterModal — opens a cash register session for a warehouse.
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
  TextField,
  Typography,
} from '@mui/material';
import { IconCheck, IconCash } from '@tabler/icons-react';
import { openRegister } from 'src/api/smartpos/cashRegister';
import type { CashRegisterSession } from 'src/api/smartpos/cashRegister';
import { brand } from 'src/theme/smartpos/brand';
import { premiumFieldSx } from './PosLayouts/shared';

interface OpenRegisterModalProps {
  open: boolean;
  warehouseId: string;
  onClose: () => void;
  onOpened: (session: CashRegisterSession) => void;
}

export default function OpenRegisterModal({ open, warehouseId, onClose, onOpened }: OpenRegisterModalProps) {
  const [balance, setBalance] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setBalance('0');
    setError('');
    onClose();
  };

  const handleOpen = async () => {
    setError('');
    setSubmitting(true);
    try {
      const session = await openRegister({
        warehouseId,
        openingBalance: Number(balance) || 0,
      });
      onOpened(session);
      handleClose();
    } catch (e) {
      type AxiosLike = { response?: { data?: { detail?: string } } };
      setError((e as AxiosLike)?.response?.data?.detail || 'Failed to open register');
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
            Open Cash Register
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            Set the opening cash balance for this session
          </Typography>
        </Box>
        <Chip
          icon={<IconCash size={14} />}
          label="Register"
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: brand.success.light,
            color: brand.success.dark,
            borderRadius: '8px',
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <TextField
          label="Opening Balance"
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
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
        {error && (
          <Typography variant="caption" sx={{ color: brand.error.main, fontWeight: 700, mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[600] }}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={handleOpen}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: '10px',
            px: 3,
          }}
        >
          {submitting ? 'Opening...' : 'Open Register'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
