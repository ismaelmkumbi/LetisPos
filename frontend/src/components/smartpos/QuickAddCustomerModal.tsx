/**
 * QuickAddCustomerModal — inline customer creation for POS terminal.
 *
 * Opens from the KioskTopBar customer selector without leaving the POS screen.
 * Shared across all POS layouts.
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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconCheck, IconUserPlus } from '@tabler/icons-react';
import { createCustomer, type CustomerInput } from 'src/api/smartpos/customers';
import type { Customer } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { premiumFieldSx } from './PosLayouts/shared';

export interface QuickAddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

const empty: CustomerInput = {
  name: '',
  email: '',
  phone: '',
  taxNumber: '',
  address: '',
  city: '',
  country: '',
};

export default function QuickAddCustomerModal({ open, onClose, onCreated }: QuickAddCustomerModalProps) {
  const [form, setForm] = useState<CustomerInput>({ ...empty });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setForm({ ...empty });
    setError('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleChange = (field: keyof CustomerInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    const name = form.name?.trim();
    if (!name) {
      setError('Customer name is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload: CustomerInput = { name };
      if (form.email?.trim()) payload.email = form.email.trim();
      if (form.phone?.trim()) payload.phone = form.phone.trim();
      if (form.taxNumber?.trim()) payload.taxNumber = form.taxNumber.trim();
      if (form.address?.trim()) payload.address = form.address.trim();
      if (form.city?.trim()) payload.city = form.city.trim();
      if (form.country?.trim()) payload.country = form.country.trim();

      const customer = await createCustomer(payload);
      onCreated(customer);
      reset();
      onClose();
    } catch {
      setError('Failed to create customer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, key: keyof CustomerInput, required = false, half = false) => (
    <TextField
      label={label}
      value={(form[key] as string) ?? ''}
      onChange={handleChange(key)}
      fullWidth
      size="small"
      required={required}
      sx={(theme) => ({ ...premiumFieldSx(theme), ...(half ? { flex: 1, minWidth: 0 } : {}) })}
    />
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
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
            Quick Add Customer
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            Create a new customer without leaving the POS
          </Typography>
        </Box>
        <Chip
          icon={<IconUserPlus size={14} />}
          label="New"
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: brand.primary[50],
            color: brand.primary[700],
            borderRadius: '8px',
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {field('Full Name *', 'name', true)}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('Email', 'email', false, true)}
            {field('Phone', 'phone', false, true)}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('Tax Number', 'taxNumber', false, true)}
            {field('City', 'city', false, true)}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('Address', 'address', false, true)}
            {field('Country', 'country', false, true)}
          </Stack>

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
          disabled={submitting || !form.name?.trim()}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: '10px',
            px: 3,
            background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[500]} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[600]} 100%)` },
          }}
        >
          {submitting ? 'Creating...' : 'Create Customer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
