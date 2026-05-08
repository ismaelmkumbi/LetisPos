/**
 * Quotation create/edit drawer.
 *
 * Supports full quotation workflow:
 *   DRAFT → SENT → ACCEPTED/REJECTED → CONVERTED
 */
import { useEffect, useState } from 'react';
import {
  Autocomplete, Box, CircularProgress, InputAdornment, MenuItem,
  Stack, TextField, Typography, Alert,
} from '@mui/material';
import { IconUser } from '@tabler/icons-react';

import {
  createQuotation, setQuotationStatus, convertQuotation,
  type Quotation, type QuotationStatus, type SaleLine,
} from 'src/api/smartpos/sales';
import { listCustomers } from 'src/api/smartpos/customers';
import { listProducts } from 'src/api/smartpos/products';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { Customer, UUID } from 'src/api/smartpos/types';

import EditDrawer from 'src/components/smartpos/EditDrawer';
import LineEditor from 'src/components/smartpos/LineEditor';
import type { Line } from 'src/components/smartpos/PosLayouts/types';
import { brand } from 'src/theme/smartpos/brand';

export interface QuotationEditDrawerProps {
  open: boolean;
  /** Pass an existing quotation to edit, or null to create */
  initial: Quotation | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Extended quotation shape that includes optional API-returned fields. */
interface QuotationWithExtras extends Quotation {
  expiryDate?: string;
}

const STATUS_HINTS: Partial<Record<QuotationStatus, string>> = {
  DRAFT: 'Draft quotation — not yet sent to customer',
  SENT: 'Sent to customer — awaiting response',
  ACCEPTED: 'Customer accepted — ready to convert to sale',
  REJECTED: 'Customer declined this quotation',
  CONVERTED: 'Converted to sale — readonly',
};

export function QuotationEditDrawer({ open, initial, onClose, onSaved }: QuotationEditDrawerProps) {
  const isEdit = !!initial;
  const isReadonly = initial?.status === 'CONVERTED';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customerId, setCustomerId] = useState<UUID | null>(null);
  const [warehouseId, setWarehouseId] = useState<UUID>('' as UUID);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    listCustomers({ size: 200 }).then((p) => setCustomers(p.content)).catch(() => {});
    listWarehouses().then(setWarehouses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCustomerId(initial.customerId);
      setWarehouseId(initial.warehouseId);
      setLines((initial.lines ?? []).map((l: SaleLine) => ({
        productId: l.productId,
        productName: l.productName ?? '',
        unitPrice: l.unitPrice ?? 0,
        qty: l.qty ?? 1,
        taxRate: l.taxRate ?? 0,
      })));
      setNotes(initial.notes ?? '');
      setExpiryDate((initial as QuotationWithExtras).expiryDate ?? '');
    } else {
      setCustomerId(null);
      setWarehouseId('' as UUID);
      setLines([]);
      setNotes('');
      setExpiryDate('');
    }
    setError(null);
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!warehouseId) { setError('Select a warehouse'); return; }
    if (lines.length === 0) { setError('Add at least one product line'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await createQuotation({
        warehouseId,
        customerId: customerId ?? undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
        })),
        notes: notes || undefined,
        discount: 0,
        discount: 0,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (status: QuotationStatus) => {
    if (!initial) return;
    setActionLoading(true);
    try {
      if (status === 'CONVERTED') {
        await convertQuotation(initial.id);
      } else {
        await setQuotationStatus(initial.id, status);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const statusActions: { label: string; status: QuotationStatus; variant?: 'primary' }[] = [];
  if (initial?.status === 'DRAFT') {
    statusActions.push({ label: 'Send to Customer', status: 'SENT', variant: 'primary' });
  }
  if (initial?.status === 'SENT') {
    statusActions.push({ label: 'Mark Accepted', status: 'ACCEPTED', variant: 'primary' });
    statusActions.push({ label: 'Mark Rejected', status: 'REJECTED' });
  }
  if (initial?.status === 'ACCEPTED') {
    statusActions.push({ label: 'Convert to Sale', status: 'CONVERTED', variant: 'primary' });
  }

  return (
    <EditDrawer
      open={open}
      title={isEdit ? `Quotation ${initial.ref}` : 'New Quotation'}
      subtitle={isEdit && initial?.status ? STATUS_HINTS[initial.status] : 'Create a draft quotation for a customer'}
      onClose={onClose}
      onSubmit={isEdit ? () => {} : handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Saved' : 'Save Draft'}
      disabled={isReadonly || isEdit}
      size="lg"
      statusIndicator={
        isEdit && initial
          ? {
              state:
                initial.status === 'ACCEPTED' ? 'active' :
                initial.status === 'REJECTED' ? 'critical' :
                initial.status === 'CONVERTED' ? 'closed' :
                initial.status === 'SENT' ? 'attention' :
                'idle',
              label: initial.status,
            }
          : undefined
      }
      extraActions={
        isEdit && statusActions.length > 0 ? (
          <>
            {statusActions.map((a) => (
              <Box
                key={a.label}
                component="button"
                onClick={() => handleStatusAction(a.status)}
                disabled={actionLoading}
                sx={{
                  background: a.variant === 'primary' ? brand.primary[600] : 'transparent',
                  color: a.variant === 'primary' ? '#fff' : brand.neutral[700],
                  border: a.variant === 'primary' ? 'none' : `1px solid ${brand.neutral[300]}`,
                  borderRadius: '8px',
                  px: 2,
                  py: 1,
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': {
                    background: a.variant === 'primary' ? brand.primary[700] : brand.neutral[50],
                  },
                  '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                }}
              >
                {actionLoading && <CircularProgress size={14} />}
                {a.label}
              </Box>
            ))}
          </>
        ) : undefined
      }
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 1 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        {/* Customer + Warehouse row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Autocomplete
            size="small"
            options={customers}
            value={customers.find((c) => c.id === customerId) || null}
            onChange={(_, v) => setCustomerId(v?.id ?? null)}
            getOptionLabel={(c) => c.name}
            disabled={isReadonly}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Customer"
                placeholder="Walk-in Customer"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconUser size={16} color={brand.neutral[400]} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
          <TextField
            select
            size="small"
            label="Warehouse"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value as UUID)}
            disabled={isReadonly}
            sx={{ flex: 1, minWidth: 200 }}
          >
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Expiry date */}
        <TextField
          type="date"
          size="small"
          label="Expiry Date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          disabled={isReadonly}
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: 240 }}
        />

        {/* Line Editor */}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700], mb: 1.5 }}>
            Products & Services
          </Typography>
          <LineEditor
            lines={lines}
            onChange={setLines}
            searchProducts={(q) => listProducts({ search: q, size: 20 }).then((p) => p.content)}
            disabled={isReadonly}
          />
        </Box>

        {/* Notes */}
        <TextField
          label="Notes & Terms"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isReadonly}
          multiline
          rows={3}
          size="small"
          placeholder="Payment terms, validity period, additional notes…"
        />

        {/* Status actions for editable quotations */}
        {isEdit && statusActions.length > 0 && (
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 1 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Available actions
                </Typography>
                {statusActions.map((a) => (
                  <Typography key={a.label} variant="caption" sx={{ color: brand.neutral[600] }}>
                    • {a.label} — changes status from {initial?.status} to {a.status}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          </Box>
        )}
      </Stack>
    </EditDrawer>
  );
}

export default QuotationEditDrawer;
