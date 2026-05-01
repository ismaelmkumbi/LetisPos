/**
 * Create / edit a recurring invoice template.
 *
 * Lines are managed inline — small editor; for large catalogues users will
 * typically use the dedicated Sales builder, then "promote" to recurring.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, FormControlLabel, IconButton, InputAdornment, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import EditDrawer from 'src/components/smartpos/EditDrawer';
import {
  createRecurring, updateRecurring,
  type CreateRecurringBody, type RecurringFrequency, type RecurringInvoice, type RecurringLineInput,
} from 'src/api/smartpos/recurring';
import { listProducts, type Product } from 'src/api/smartpos/products';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { listCustomers } from 'src/api/smartpos/customers';
import type { Customer, UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { DEFAULT_CURRENCY } from 'src/utils/smartpos/currency';

interface LineRow extends RecurringLineInput { _key: number; _label?: string }

const empty: CreateRecurringBody = {
  ref: '', warehouseId: '' as UUID,
  frequency: 'MONTHLY', intervalCount: 1, startDate: new Date().toISOString().slice(0, 10),
  currency: DEFAULT_CURRENCY, sendNotification: true, lines: [],
};

export interface RecurringEditDrawerProps {
  open: boolean;
  initial?: RecurringInvoice | null;
  onClose: () => void;
  onSaved: (r: RecurringInvoice) => void;
}

export default function RecurringEditDrawer({ open, initial, onClose, onSaved }: RecurringEditDrawerProps) {
  const [body, setBody] = useState<CreateRecurringBody>(empty);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPicker, setProductPicker] = useState('');
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listWarehouses().then(setWarehouses).catch(() => {});
    listCustomers({ size: 200 }).then((p) => setCustomers(p.content)).catch(() => {});
  }, [open]);

  useEffect(() => {
    const handle = setTimeout(() => {
      listProducts({ search: productPicker, size: 8 }).then((p) => setProductOptions(p.content)).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [productPicker]);

  useEffect(() => {
    if (initial) {
      setBody({
        ref: initial.ref, name: initial.name ?? undefined,
        customerId: initial.customerId ?? undefined,
        warehouseId: initial.warehouseId,
        frequency: initial.frequency, intervalCount: initial.intervalCount,
        startDate: initial.startDate, endDate: initial.endDate ?? undefined,
        occurrencesMax: initial.occurrencesMax ?? undefined,
        currency: initial.currency,
        discount: initial.discount ?? undefined,
        shipping: initial.shipping ?? undefined,
        taxMethod: initial.taxMethod ?? undefined,
        sendNotification: initial.sendNotification,
        notes: initial.notes ?? undefined,
        lines: [],
      });
      setLines(initial.lines.map((l, i) => ({
        _key: i + 1,
        productId: l.productId, qty: l.qty, unitPrice: l.unitPrice,
        position: l.position,
        _label: l.productName ? `${l.productCode ?? ''} ${l.productName}` : undefined,
      })));
    } else {
      setBody(empty);
      setLines([]);
    }
    setError(null);
  }, [initial, open]);

  const patch = <K extends keyof CreateRecurringBody>(k: K, v: CreateRecurringBody[K]) =>
    setBody((b) => ({ ...b, [k]: v }));

  const addLine = (p: Product) => {
    setLines((rs) => [
      ...rs,
      {
        _key: Date.now(),
        productId: p.id, qty: 1, unitPrice: p.price,
        position: rs.length, _label: `${p.code} ${p.name}`,
      },
    ]);
  };

  const updateLine = (key: number, patch: Partial<LineRow>) =>
    setLines((rs) => rs.map((r) => r._key === key ? { ...r, ...patch } : r));

  const removeLine = (key: number) =>
    setLines((rs) => rs.filter((r) => r._key !== key));

  const handleSubmit = async () => {
    if (!body.ref.trim() || !body.warehouseId || lines.length === 0) {
      setError('Ref, warehouse, and at least one line are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateRecurringBody = {
        ...body,
        lines: lines.map((l, i) => ({
          productId: l.productId,
          qty: Number(l.qty) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          position: i,
        })),
      };
      const saved = initial
        ? await updateRecurring(initial.id, payload)
        : await createRecurring(payload);
      onSaved(saved);
      onClose();
    } catch (e) {
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
      title={initial ? 'Edit recurring' : 'New recurring template'}
      subtitle={initial ? `${initial.ref} · ${initial.status}` : 'Auto-generate sales on a cadence'}
      width={560}
    >
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={2}>
        <TextField label="Ref" required value={body.ref} size="small" sx={{ width: 160 }}
          onChange={(e) => patch('ref', e.target.value)} />
        <TextField label="Display name" value={body.name ?? ''} size="small" fullWidth
          onChange={(e) => patch('name', e.target.value)} />
      </Stack>

      <Stack direction="row" spacing={2}>
        <Autocomplete
          fullWidth size="small"
          options={warehouses}
          value={warehouses.find((w) => w.id === body.warehouseId) ?? null}
          getOptionLabel={(w) => w.name}
          onChange={(_, v) => patch('warehouseId', (v?.id ?? '') as UUID)}
          renderInput={(p) => <TextField {...p} label="Warehouse" size="small" required />}
        />
        <Autocomplete
          fullWidth size="small"
          options={customers}
          value={customers.find((c) => c.id === body.customerId) ?? null}
          getOptionLabel={(c) => c.name}
          onChange={(_, v) => patch('customerId', v?.id as UUID | undefined)}
          renderInput={(p) => <TextField {...p} label="Customer (optional)" size="small" />}
        />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField select size="small" label="Frequency" value={body.frequency}
          onChange={(e) => patch('frequency', e.target.value as RecurringFrequency)} sx={{ minWidth: 140 }}>
          {(['DAILY','WEEKLY','MONTHLY','YEARLY'] as RecurringFrequency[]).map((f) =>
            <MenuItem key={f} value={f}>{f}</MenuItem>)}
        </TextField>
        <TextField type="number" size="small" label="Every (interval)" sx={{ width: 140 }}
          value={body.intervalCount ?? 1}
          onChange={(e) => patch('intervalCount', Math.max(1, Number(e.target.value)))} />
        <TextField size="small" label="Currency" sx={{ width: 100 }}
          value={body.currency ?? DEFAULT_CURRENCY} onChange={(e) => patch('currency', e.target.value)} />
      </Stack>

      <Stack direction="row" spacing={2}>
        <TextField type="date" label="Start date" size="small" fullWidth required
          value={body.startDate} onChange={(e) => patch('startDate', e.target.value)}
          InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="End date (optional)" size="small" fullWidth
          value={body.endDate ?? ''} onChange={(e) => patch('endDate', e.target.value || undefined)}
          InputLabelProps={{ shrink: true }} />
        <TextField type="number" label="Max occurrences" size="small" sx={{ width: 160 }}
          value={body.occurrencesMax ?? ''}
          onChange={(e) => patch('occurrencesMax', e.target.value === '' ? undefined : Number(e.target.value))} />
      </Stack>

      <FormControlLabel
        control={<Switch checked={body.sendNotification !== false}
          onChange={(e) => patch('sendNotification', e.target.checked)} />}
        label="Send receipt by email/SMS each run"
      />

      {/* Lines */}
      <Typography variant="subtitle2" sx={{ color: brand.neutral[700], fontWeight: 700 }}>Lines</Typography>
      <Stack spacing={1}>
        {lines.map((l) => (
          <Stack key={l._key} direction="row" spacing={1} alignItems="center">
            <TextField size="small" sx={{ flex: 1 }} value={l._label ?? l.productId.slice(0, 8) + '…'} disabled />
            <TextField type="number" size="small" sx={{ width: 80 }} label="Qty"
              value={l.qty} onChange={(e) => updateLine(l._key, { qty: Number(e.target.value) })} />
            <TextField type="number" size="small" sx={{ width: 110 }} label="Unit price"
              value={l.unitPrice} onChange={(e) => updateLine(l._key, { unitPrice: Number(e.target.value) })}
              InputProps={{ startAdornment: <InputAdornment position="start">TZS</InputAdornment> }} />
            <IconButton size="small" onClick={() => removeLine(l._key)}>
              <IconTrash size={16} />
            </IconButton>
          </Stack>
        ))}
        <Autocomplete
          size="small"
          options={productOptions}
          value={null}
          inputValue={productPicker}
          onInputChange={(_, v) => setProductPicker(v)}
          onChange={(_, p) => { if (p) { addLine(p); setProductPicker(''); } }}
          getOptionLabel={(p) => `${p.code} — ${p.name}`}
          renderInput={(params) => (
            <TextField {...params} placeholder="Add a product…" size="small"
              InputProps={{ ...params.InputProps, startAdornment: <IconPlus size={16} style={{ marginRight: 4 }} /> }} />
          )}
        />
      </Stack>

      <TextField label="Notes" size="small" multiline minRows={2} fullWidth
        value={body.notes ?? ''} onChange={(e) => patch('notes', e.target.value)} />
    </EditDrawer>
  );
}
