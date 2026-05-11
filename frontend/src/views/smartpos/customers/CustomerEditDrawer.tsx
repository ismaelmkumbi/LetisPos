import { useEffect, useState } from 'react';
import {
  Alert, FormControl, FormControlLabel, InputAdornment, InputLabel,
  MenuItem, Select, Stack, Switch, TextField,
} from '@mui/material';
import {
  createCustomer, updateCustomer, type CustomerInput,
} from 'src/api/smartpos/customers';
import type { Customer } from 'src/api/smartpos/types';
import EditDrawer from 'src/components/smartpos/EditDrawer';

export interface CustomerEditDrawerProps {
  open: boolean;
  initial?: Customer | null;
  onClose: () => void;
  onSaved: (c: Customer) => void;
}

const COUNTRIES = [
  'Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Burundi',
  'DRC', 'Zambia', 'Malawi', 'South Africa', 'Nigeria',
  'Ghana', 'UK', 'USA', 'UAE', 'India',
  'China', 'Germany', 'France', 'Netherlands', 'Other',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm: CustomerInput = {
  name: '', email: '', phone: '', taxNumber: '', address: '',
  city: '', country: '', creditLimit: 0, notes: '', code: '',
  active: true,
};

export default function CustomerEditDrawer({ open, initial, onClose, onSaved }: CustomerEditDrawerProps) {
  const [form, setForm] = useState<CustomerInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        code: initial.code ?? '',
        name: initial.name,
        email: initial.email ?? '',
        phone: initial.phone ?? '',
        taxNumber: initial.taxNumber ?? '',
        address: initial.address ?? '',
        city: initial.city ?? '',
        country: initial.country ?? '',
        creditLimit: initial.creditLimit,
        notes: initial.notes ?? '',
        active: initial.active,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // --- field-level validation helpers ---
  const emailTouched = (form.email ?? '').trim().length > 0;
  const emailInvalid = emailTouched && !EMAIL_RE.test(form.email ?? '');
  const phoneTouched = (form.phone ?? '').trim().length > 0;
  const phoneInvalid = phoneTouched && (form.phone ?? '').trim().length < 7;

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (emailInvalid || phoneInvalid) { setError('Please fix validation errors before saving.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial
        ? await updateCustomer(initial.id, form)
        : await createCustomer(form);
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      title={initial ? 'Edit customer' : 'New customer'}
      subtitle={initial ? (initial.code ?? initial.name) : 'Add someone to your directory'}
    >
      {error && <Alert severity="error">{error}</Alert>}

      {/* Active / Inactive toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={form.active ?? true}
            onChange={(e) => patch('active', e.target.checked)}
          />
        }
        label={form.active ?? true ? 'Active' : 'Inactive'}
        sx={{ mb: 1 }}
      />

      <Stack direction="row" spacing={2}>
        <TextField label="Code" value={form.code ?? ''}
          onChange={(e) => patch('code', e.target.value)}
          size="small" sx={{ width: 140 }} />
        <TextField label="Name" value={form.name}
          onChange={(e) => patch('name', e.target.value)}
          size="small" required fullWidth />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Email"
          type="email"
          value={form.email ?? ''}
          onChange={(e) => patch('email', e.target.value)}
          size="small"
          fullWidth
          error={emailInvalid}
          helperText={emailInvalid ? 'Enter a valid email address (e.g. name@example.com)' : undefined}
        />
        <TextField
          label="Phone"
          value={form.phone ?? ''}
          onChange={(e) => patch('phone', e.target.value)}
          size="small"
          fullWidth
          error={phoneInvalid}
          helperText={phoneInvalid ? 'Phone must be at least 7 characters' : undefined}
        />
      </Stack>

      <TextField label="Tax number" value={form.taxNumber ?? ''}
        onChange={(e) => patch('taxNumber', e.target.value)}
        size="small" fullWidth />

      <TextField label="Address" value={form.address ?? ''}
        onChange={(e) => patch('address', e.target.value)}
        size="small" multiline minRows={2} fullWidth />

      <Stack direction="row" spacing={2}>
        <TextField label="City" value={form.city ?? ''}
          onChange={(e) => patch('city', e.target.value)}
          size="small" fullWidth />
        <FormControl size="small" fullWidth>
          <InputLabel id="customer-country-label">Country</InputLabel>
          <Select
            labelId="customer-country-label"
            label="Country"
            value={form.country ?? ''}
            onChange={(e) => patch('country', e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {COUNTRIES.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TextField label="Credit limit" type="number" value={form.creditLimit ?? 0}
        onChange={(e) => patch('creditLimit', Number(e.target.value))}
        size="small" fullWidth
        InputProps={{ startAdornment: <InputAdornment position="start">TZS</InputAdornment> }} />

      <TextField label="Notes" value={form.notes ?? ''}
        onChange={(e) => patch('notes', e.target.value)}
        size="small" multiline minRows={2} fullWidth />
    </EditDrawer>
  );
}
