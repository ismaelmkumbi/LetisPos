import { useEffect, useState } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import {
  createWarehouse, updateWarehouse, type Warehouse, type WarehouseInput,
} from 'src/api/smartpos/inventory';
import EditDrawer from 'src/components/smartpos/EditDrawer';

export interface WarehouseEditDrawerProps {
  open: boolean;
  initial?: Warehouse | null;
  onClose: () => void;
  onSaved: (w: Warehouse) => void;
}

const empty: WarehouseInput = { name: '', code: '', city: '', country: '', phone: '', email: '', zip: '', notes: '' };

export default function WarehouseEditDrawer({ open, initial, onClose, onSaved }: WarehouseEditDrawerProps) {
  const [form, setForm] = useState<WarehouseInput>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        code: initial.code ?? '',
        name: initial.name,
        city: initial.city ?? '',
        country: initial.country ?? '',
        phone: initial.phone ?? '',
        email: initial.email ?? '',
        zip: initial.zip ?? '',
        notes: initial.notes ?? '',
      });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof WarehouseInput>(k: K, v: WarehouseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const saved = initial ? await updateWarehouse(initial.id, form) : await createWarehouse(form);
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
      title={initial ? 'Edit warehouse' : 'New warehouse'}
      subtitle={initial ? (initial.code ?? initial.name) : 'Add a stock location'}
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
      <Stack direction="row" spacing={2}>
        <TextField label="City" value={form.city ?? ''} onChange={(e) => patch('city', e.target.value)} size="small" fullWidth />
        <TextField label="Country" value={form.country ?? ''} onChange={(e) => patch('country', e.target.value)} size="small" fullWidth />
        <TextField label="ZIP" value={form.zip ?? ''} onChange={(e) => patch('zip', e.target.value)} size="small" sx={{ width: 120 }} />
      </Stack>
      <TextField label="Notes" value={form.notes ?? ''} onChange={(e) => patch('notes', e.target.value)} size="small" multiline minRows={2} fullWidth />
    </EditDrawer>
  );
}
