/**
 * Register a new serial / IMEI, or change the status of an existing one.
 *
 * The "register" path uses POST /serials with productId + serialNumber;
 * editing an existing row opens the same drawer but only allows status
 * + warranty date / notes changes (matches PATCH /serials/{id}/status).
 */
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';

import EditDrawer from 'src/components/smartpos/EditDrawer';
import {
  createSerial, updateSerialStatus,
  type CreateSerialBody, type ProductSerial, type SerialStatus, type SerialType,
} from 'src/api/smartpos/serials';
import { listProducts, type Product } from 'src/api/smartpos/products';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';

export interface SerialEditDrawerProps {
  open: boolean;
  initial?: ProductSerial | null;
  onClose: () => void;
  onSaved: (s: ProductSerial) => void;
}

const emptyBody: CreateSerialBody = {
  productId: '' as UUID,
  serialNumber: '',
  serialType: 'SERIAL',
};

/** Critical status transitions that require a confirmation dialog. */
const CRITICAL_TRANSITIONS: Partial<Record<SerialStatus, string>> = {
  SOLD:      'Marking this unit as SOLD records it as sold. This affects inventory tracking.',
  DEFECTIVE: 'Marking this unit as DEFECTIVE removes it from available stock. This should only be done for damaged or faulty units.',
  RETURNED:  'Marking this unit as RETURNED brings it back into available inventory. Confirm the unit is in resellable condition.',
};

export default function SerialEditDrawer({ open, initial, onClose, onSaved }: SerialEditDrawerProps) {
  const [body, setBody] = useState<CreateSerialBody>(emptyBody);
  const [statusBody, setStatusBody] = useState<{ status: SerialStatus; saleRef?: string; notes?: string }>({
    status: 'IN_STOCK',
  });
  const [productPicker, setProductPicker] = useState('');
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Status change confirmation dialog ──────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SerialStatus | null>(null);
  const prevStatusRef = useRef<SerialStatus | null>(null);

  useEffect(() => {
    if (initial) {
      setStatusBody({
        status: initial.status,
        saleRef: initial.saleRef ?? undefined,
        notes: initial.notes ?? undefined,
      });
      prevStatusRef.current = initial.status;
    } else {
      setBody(emptyBody);
    }
    setError(null);
  }, [initial, open]);

  // Product picker — debounced server search.
  useEffect(() => {
    if (initial) return;
    const handle = setTimeout(() => {
      listProducts({ search: productPicker, size: 8 })
        .then((p) => setProductOptions(p.content))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [productPicker, initial]);

  const patch = <K extends keyof CreateSerialBody>(k: K, v: CreateSerialBody[K]) =>
    setBody((b) => ({ ...b, [k]: v }));

  const doSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let saved: ProductSerial;
      if (initial) {
        saved = await updateSerialStatus(initial.id, statusBody.status, statusBody.saleRef, statusBody.notes);
      } else {
        if (!body.productId)  throw new Error('Pick a product first.');
        if (!body.serialNumber.trim()) throw new Error('Serial number is required.');
        saved = await createSerial(body);
      }
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? (e as Error).message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    // Check for critical status transitions when editing
    if (initial && prevStatusRef.current && statusBody.status !== prevStatusRef.current) {
      const reason = CRITICAL_TRANSITIONS[statusBody.status];
      if (reason) {
        setPendingStatus(statusBody.status);
        setConfirmOpen(true);
        return;  // Confirmation dialog will call doSave
      }
    }
    await doSave();
  };

  const handleConfirmSave = async () => {
    setConfirmOpen(false);
    setPendingStatus(null);
    await doSave();
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      title={initial ? 'Update serial' : 'Register serial / IMEI'}
      subtitle={initial ? initial.serialNumber : 'Add a serialised unit to inventory'}
    >
      {error && <Alert severity="error">{error}</Alert>}

      {!initial && (
        <>
          <Autocomplete
            options={productOptions}
            value={null}
            inputValue={productPicker}
            onInputChange={(_, v) => setProductPicker(v)}
            onChange={(_, p) => p && patch('productId', p.id)}
            getOptionLabel={(p) => `${p.code} — ${p.name}`}
            renderInput={(params) => (
              <TextField {...params} label="Product" size="small" required />
            )}
            size="small"
          />
          {body.productId && (
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Selected product id: <code>{String(body.productId).slice(0, 8)}…</code>
            </Typography>
          )}

          <Stack direction="row" spacing={2}>
            <TextField
              label="Serial / IMEI" value={body.serialNumber}
              onChange={(e) => patch('serialNumber', e.target.value)}
              size="small" required fullWidth
            />
            <TextField
              label="Type" select value={body.serialType ?? 'SERIAL'}
              onChange={(e) => patch('serialType', e.target.value as SerialType)}
              size="small" sx={{ minWidth: 120 }}
            >
              <MenuItem value="SERIAL">Serial</MenuItem>
              <MenuItem value="IMEI">IMEI</MenuItem>
              <MenuItem value="MAC">MAC</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Warranty start" type="date" value={body.warrantyStart ?? ''}
              onChange={(e) => patch('warrantyStart', e.target.value || undefined)}
              size="small" fullWidth InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Warranty end" type="date" value={body.warrantyEnd ?? ''}
              onChange={(e) => patch('warrantyEnd', e.target.value || undefined)}
              size="small" fullWidth InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <TextField
            label="Notes" value={body.notes ?? ''}
            onChange={(e) => patch('notes', e.target.value)}
            size="small" multiline minRows={2} fullWidth
          />
        </>
      )}

      {initial && (
        <>
          <TextField
            label="Status" select value={statusBody.status}
            onChange={(e) => setStatusBody((s) => ({ ...s, status: e.target.value as SerialStatus }))}
            size="small" fullWidth
          >
            {(['IN_STOCK','RESERVED','SOLD','RETURNED','DEFECTIVE'] as SerialStatus[]).map((s) =>
              <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField
            label="Sale reference (optional)"
            value={statusBody.saleRef ?? ''}
            onChange={(e) => setStatusBody((s) => ({ ...s, saleRef: e.target.value || undefined }))}
            size="small" fullWidth
          />
          <TextField
            label="Notes" value={statusBody.notes ?? ''}
            onChange={(e) => setStatusBody((s) => ({ ...s, notes: e.target.value || undefined }))}
            size="small" multiline minRows={2} fullWidth
          />
        </>
      )}

      {/* ── Status change confirmation dialog ── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Change status to {pendingStatus}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingStatus && CRITICAL_TRANSITIONS[pendingStatus]}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmSave} sx={{ fontWeight: 700 }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </EditDrawer>
  );
}
