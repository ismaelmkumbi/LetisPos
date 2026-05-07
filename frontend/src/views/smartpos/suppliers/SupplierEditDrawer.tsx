import { useEffect, useState } from 'react';
import { Alert, Divider, Stack, TextField, Typography } from '@mui/material';
import { createSupplier, updateSupplier, type SupplierInput } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { brand } from 'src/theme/smartpos/brand';

export interface SupplierEditDrawerProps {
  open: boolean;
  initial?: Supplier | null;
  onClose: () => void;
  onSaved: (s: Supplier) => void;
}

const empty: SupplierInput = {
  name: '',
  code: undefined,
  contactPerson: '',
  email: '',
  phone: '',
  website: '',
  taxNumber: '',
  address: '',
  city: '',
  country: '',
  paymentTermDays: undefined,
  creditLimit: undefined,
  openingBalance: undefined,
  notes: '',
};

export default function SupplierEditDrawer({
  open,
  initial,
  onClose,
  onSaved,
}: SupplierEditDrawerProps) {
  const [form, setForm] = useState<SupplierInput>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        code: initial.code ?? undefined,
        name: initial.name,
        contactPerson: initial.contactPerson ?? '',
        email: initial.email ?? '',
        phone: initial.phone ?? '',
        website: initial.website ?? '',
        taxNumber: initial.taxNumber ?? '',
        address: initial.address ?? '',
        city: initial.city ?? '',
        country: initial.country ?? '',
        paymentTermDays: initial.paymentTermDays ?? undefined,
        creditLimit: initial.creditLimit ?? undefined,
        openingBalance: initial.openingBalance ?? undefined,
        notes: initial.notes ?? '',
      });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof SupplierInput>(k: K, v: SupplierInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Supplier name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial ? await updateSupplier(initial.id, form) : await createSupplier(form);
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const sectionTitle = (label: string) => (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        color: brand.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        pt: 1,
      }}
    >
      {label}
    </Typography>
  );

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      title={initial ? 'Edit supplier' : 'New supplier'}
      subtitle={initial ? (initial.code ?? initial.name) : 'Add a vendor to procure from'}
    >
      {error && (
        <Alert severity="error" sx={{ borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {sectionTitle('Basic info')}
      <Stack direction="row" spacing={2}>
        <TextField
          label="Code"
          value={form.code ?? 'Auto-generated'}
          size="small"
          sx={{ width: 170 }}
          disabled
          InputProps={{ readOnly: true }}
          helperText="Generated on save"
        />
        <TextField
          label="Name *"
          value={form.name}
          onChange={(e) => patch('name', e.target.value)}
          size="small"
          required
          fullWidth
          error={!form.name.trim()}
        />
      </Stack>
      <TextField
        label="Contact person"
        value={form.contactPerson ?? ''}
        onChange={(e) => patch('contactPerson', e.target.value)}
        size="small"
        fullWidth
      />

      <Divider sx={{ my: 0.5 }} />
      {sectionTitle('Contact')}
      <Stack direction="row" spacing={2}>
        <TextField
          label="Email"
          type="email"
          value={form.email ?? ''}
          onChange={(e) => patch('email', e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Phone"
          value={form.phone ?? ''}
          onChange={(e) => patch('phone', e.target.value)}
          size="small"
          fullWidth
        />
      </Stack>
      <TextField
        label="Website"
        value={form.website ?? ''}
        onChange={(e) => patch('website', e.target.value)}
        size="small"
        fullWidth
        placeholder="https://"
      />

      <Divider sx={{ my: 0.5 }} />
      {sectionTitle('Tax & Address')}
      <TextField
        label="Tax / VAT number"
        value={form.taxNumber ?? ''}
        onChange={(e) => patch('taxNumber', e.target.value)}
        size="small"
        fullWidth
      />
      <TextField
        label="Address"
        value={form.address ?? ''}
        onChange={(e) => patch('address', e.target.value)}
        size="small"
        multiline
        minRows={2}
        fullWidth
      />
      <Stack direction="row" spacing={2}>
        <TextField
          label="City"
          value={form.city ?? ''}
          onChange={(e) => patch('city', e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Country"
          value={form.country ?? ''}
          onChange={(e) => patch('country', e.target.value)}
          size="small"
          fullWidth
        />
      </Stack>

      <Divider sx={{ my: 0.5 }} />
      {sectionTitle('Financial')}
      <Stack direction="row" spacing={2}>
        <TextField
          label="Payment terms (days)"
          type="number"
          size="small"
          fullWidth
          value={form.paymentTermDays ?? ''}
          onChange={(e) =>
            patch('paymentTermDays', e.target.value ? Number(e.target.value) : undefined)
          }
          placeholder="e.g. 30"
        />
        <TextField
          label="Credit limit"
          type="number"
          size="small"
          fullWidth
          value={form.creditLimit ?? ''}
          onChange={(e) =>
            patch('creditLimit', e.target.value ? Number(e.target.value) : undefined)
          }
          placeholder="0 = unlimited"
        />
      </Stack>
      {!initial && (
        <TextField
          label="Opening balance"
          type="number"
          size="small"
          fullWidth
          value={form.openingBalance ?? ''}
          onChange={(e) =>
            patch('openingBalance', e.target.value ? Number(e.target.value) : undefined)
          }
          helperText="Amount owed to this supplier when starting"
        />
      )}

      <Divider sx={{ my: 0.5 }} />
      <TextField
        label="Notes"
        value={form.notes ?? ''}
        onChange={(e) => patch('notes', e.target.value)}
        size="small"
        multiline
        minRows={2}
        fullWidth
      />
    </EditDrawer>
  );
}
