import { useEffect, useState } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import {
  createSupplier, updateSupplier, type SupplierInput,
} from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import EditDrawer from 'src/components/smartpos/EditDrawer';

export interface SupplierEditDrawerProps {
  open: boolean;
  initial?: Supplier | null;
  onClose: () => void;
  onSaved: (s: Supplier) => void;
}

const empty: SupplierInput = {
  name: '', email: '', phone: '', taxNumber: '', address: '',
  city: '', country: '', notes: '', code: '',
};

export default function SupplierEditDrawer({ open, initial, onClose, onSaved }: SupplierEditDrawerProps) {
  const [form, setForm] = useState<SupplierInput>(empty);
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
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial
        ? await updateSupplier(initial.id, form)
        : await createSupplier(form);
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
      open={open} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}
      title={initial ? 'Edit supplier' : 'New supplier'}
      subtitle={initial ? (initial.code ?? initial.name) : 'Add a vendor to procure from'}
    >
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={2}>
        <TextField label="Code" value={form.code ?? ''} onChange={(e) => patch('code', e.target.value)} size="small" sx={{ width: 140 }} />
        <TextField label="Name" value={form.name} onChange={(e) => patch('name', e.target.value)} size="small" required fullWidth />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField label="Email" type="email" value={form.email ?? ''} onChange={(e) => patch('email', e.target.value)} size="small" fullWidth />
        <TextField label="Phone" value={form.phone ?? ''} onChange={(e) => patch('phone', e.target.value)} size="small" fullWidth />
      </Stack>
      <TextField label="Tax number" value={form.taxNumber ?? ''} onChange={(e) => patch('taxNumber', e.target.value)} size="small" fullWidth />
      <TextField label="Address" value={form.address ?? ''} onChange={(e) => patch('address', e.target.value)} size="small" multiline minRows={2} fullWidth />
      <Stack direction="row" spacing={2}>
        <TextField label="City" value={form.city ?? ''} onChange={(e) => patch('city', e.target.value)} size="small" fullWidth />
        <TextField label="Country" value={form.country ?? ''} onChange={(e) => patch('country', e.target.value)} size="small" fullWidth />
      </Stack>
      <TextField label="Notes" value={form.notes ?? ''} onChange={(e) => patch('notes', e.target.value)} size="small" multiline minRows={2} fullWidth />
    </EditDrawer>
  );
}
