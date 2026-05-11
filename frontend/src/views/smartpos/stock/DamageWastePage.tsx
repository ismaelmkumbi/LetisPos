import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconCheck,
  IconTrash,
  IconX,
} from '@tabler/icons-react';

import { api } from 'src/api/smartpos/client';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { listProducts } from 'src/api/smartpos/products';
import type { Product, Page, UUID } from 'src/api/smartpos/types';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

// ─── Types ────────────────────────────────────────────────────────────────────

type DamageType = 'DAMAGE' | 'WASTE';
type DamageStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

const REASON_CODES = ['Expired', 'Broken', 'Theft', 'Quality Defect', 'Spoilage', 'Other'] as const;
type ReasonCode = (typeof REASON_CODES)[number];

interface DamageRecord {
  id: UUID;
  ref: string;
  date: string;
  warehouseId: UUID;
  warehouseName?: string;
  productId: UUID;
  productName?: string;
  variantId?: UUID | null;
  qty: number;
  reasonCode: ReasonCode | string;
  type: DamageType;
  notes?: string | null;
  status: DamageStatus;
  createdBy?: string | null;
  approvedBy?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
}

interface DamageFormState {
  warehouseId: string;
  product: Product | null;
  productSearch: string;
  qty: string;
  reasonCode: ReasonCode | '';
  type: DamageType;
  notes: string;
}

const EMPTY_FORM: DamageFormState = {
  warehouseId: '',
  product: null,
  productSearch: '',
  qty: '',
  reasonCode: '',
  type: 'DAMAGE',
  notes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DamageWastePage() {
  const [tab, setTab] = useState(0);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses()
      .then((ws) => {
        setWarehouses(ws);
        setForm((f) => {
          if (!f.warehouseId && ws[0]) return { ...f, warehouseId: ws[0].id };
          return f;
        });
      })
      .catch(() => {});
  }, []);

  // ── Tab 1: Record Damage form ─────────────────────────────────────────────
  const [form, setForm] = useState<DamageFormState>(EMPTY_FORM);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Debounced product search
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (form.productSearch.length < 2) {
      setProductOptions([]);
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setProductLoading(true);
      try {
        const p = await listProducts({ search: form.productSearch, size: 15 });
        setProductOptions(p.content);
      } catch {
        setProductOptions([]);
      } finally {
        setProductLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [form.productSearch]);

  // ── Tab 2: Pending approval (state + fetch, declared above Tab 1's submit
  //     because handleSubmit calls fetchPending on success)
  const [pendingRows, setPendingRows] = useState<DamageRecord[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [pendingTotalElements, setPendingTotalElements] = useState(0);

  const fetchPending = useCallback(async (page = 0) => {
    setPendingLoading(true);
    try {
      const { data } = await api.get<Page<DamageRecord>>('/api/v1/adjustments', {
        params: { status: 'PENDING_REVIEW', page, size: 20 },
      });
      setPendingRows(data.content);
      setPendingTotalPages(data.totalPages || 1);
      setPendingTotalElements(data.totalElements || 0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load adjustments');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.warehouseId || !form.product || !form.qty || !form.reasonCode) return;
    setSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);
    try {
      await api.post('/api/v1/adjustments/damage', {
        warehouseId: form.warehouseId,
        productId: form.product.id,
        qty: Number(form.qty),
        reasonCode: form.reasonCode,
        type: form.type,
        notes: form.notes || null,
      });
      setSuccessMsg(`Recorded ${form.type.toLowerCase()} of ${form.qty} × ${form.product.name}`);
      setForm(EMPTY_FORM);
      setTab(1);
      fetchPending();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setFormError(err?.response?.data?.message ?? err?.message ?? 'Failed to record');
    } finally {
      setSubmitting(false);
    }
  }, [form, fetchPending]);

  useEffect(() => {
    if (tab === 1) fetchPending(pendingPage);
  }, [tab, pendingPage, fetchPending]);

  // Approve handler
  const [approving, setApproving] = useState<string | null>(null);
  const handleApprove = useCallback(async (id: UUID) => {
    setApproving(id);
    setError(null);
    try {
      await api.post(`/api/v1/adjustments/damage/${id}/approve`);
      fetchPending(pendingPage);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Approval failed');
    } finally {
      setApproving(null);
    }
  }, [pendingPage, fetchPending]);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<DamageRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    setError(null);
    try {
      await api.post(`/api/v1/adjustments/damage/${rejectTarget.id}/reject`, {
        reason: rejectReason,
      });
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason('');
      fetchPending(pendingPage);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Rejection failed');
    } finally {
      setRejecting(false);
    }
  }, [rejectTarget, rejectReason, pendingPage, fetchPending]);

  // ── Columns for pending table ──────────────────────────────────────────────
  const columns: Column<DamageRecord>[] = useMemo(() => [
    {
      key: 'ref', label: 'Ref', width: 120,
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {r.ref}
        </Typography>
      ),
    },
    {
      key: 'product', label: 'Product', width: 200,
      render: (r) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
            {r.productName ?? r.productId.slice(0, 8)}
          </Typography>
          {r.variantId && (
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}>
              variant {r.variantId.slice(0, 8)}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'qty', label: 'Qty', align: 'right', width: 70,
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {r.qty}
        </Typography>
      ),
    },
    {
      key: 'type', label: 'Type', align: 'center', width: 90,
      render: (r) => (
        <Chip
          size="small"
          label={r.type}
          sx={{
            height: 20,
            fontWeight: 700,
            fontSize: '0.625rem',
            borderRadius: '5px',
            bgcolor: r.type === 'DAMAGE' ? brand.neutral[200] : brand.neutral[100],
            color: r.type === 'DAMAGE' ? brand.neutral[700] : brand.neutral[600],
          }}
        />
      ),
    },
    {
      key: 'reasonCode', label: 'Reason', width: 120,
      render: (r) => (
        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: brand.neutral[600] }}>
          {r.reasonCode}
        </Typography>
      ),
    },
    {
      key: 'date', label: 'Date', width: 110,
      render: (r) => (
        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>
          {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Typography>
      ),
    },
    {
      key: 'createdBy', label: 'User', width: 120,
      render: (r) => (
        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: brand.neutral[500] }}>
          {r.createdBy ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center', width: 110,
      render: (r) => {
        const tone = r.status === 'PENDING_REVIEW' ? 'warning'
          : r.status === 'APPROVED' ? 'error'
          : 'neutral';
        const label = r.status === 'PENDING_REVIEW' ? 'Pending'
          : r.status === 'APPROVED' ? 'Approved'
          : 'Rejected';
        return <StatusBadge label={label} tone={tone} />;
      },
    },
    {
      key: 'actions', label: '', width: 160,
      render: (r) => {
        if (r.status !== 'PENDING_REVIEW') return null;
        const isBusy = approving === r.id || rejecting;
        return (
          <Stack direction="row" spacing={0.75}>
            <Button
              size="small"
              variant="contained"
              disabled={isBusy}
              onClick={(e) => { e.stopPropagation(); handleApprove(r.id); }}
              startIcon={approving === r.id ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <IconCheck size={14} />}
              sx={{
                textTransform: 'none',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: '6px',
                minHeight: 26,
                px: 1.25,
                bgcolor: brand.primary[600],
                '&:hover': { bgcolor: brand.primary[700] },
                '&:disabled': { bgcolor: brand.neutral[200], color: brand.neutral[400] },
              }}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={isBusy}
              onClick={(e) => { e.stopPropagation(); setRejectTarget(r); setRejectOpen(true); setRejectReason(''); }}
              startIcon={<IconX size={14} />}
              sx={{
                textTransform: 'none',
                fontSize: '0.7rem',
                fontWeight: 600,
                borderRadius: '6px',
                minHeight: 26,
                px: 1.25,
                borderColor: brand.error.main,
                color: brand.error.main,
                '&:hover': { borderColor: brand.error.dark, bgcolor: brand.error.light },
                '&:disabled': { borderColor: brand.neutral[200], color: brand.neutral[400] },
              }}
            >
              Reject
            </Button>
          </Stack>
        );
      },
    },
  ], [approving, rejecting, handleApprove]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Damage & Waste"
        subtitle="Record damaged or wasted stock, track approvals"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2.5,
          borderBottom: 1,
          borderColor: brand.neutral[200],
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            minHeight: 40,
            px: 2.5,
            color: brand.neutral[500],
            '&.Mui-selected': { color: brand.primary[600] },
          },
          '& .MuiTabs-indicator': { bgcolor: brand.primary[600], height: 3 },
        }}
      >
        <Tab
          label="Record Damage"
          icon={<IconAlertTriangle size={18} />}
          iconPosition="start"
        />
        <Tab
          label={`Pending Approval${pendingTotalElements > 0 ? ` (${pendingTotalElements})` : ''}`}
          icon={<IconCheck size={18} />}
          iconPosition="start"
        />
      </Tabs>

      {/* ── Tab 1: Record Damage ─────────────────────────────────────────── */}
      {tab === 0 && (
        <Box sx={{ maxWidth: 560 }}>
          <Stack spacing={2.5}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)} sx={{ fontSize: '0.8rem' }}>
                {formError}
              </Alert>
            )}

            {/* Warehouse */}
            <TextField
              select
              size="small"
              label="Warehouse"
              value={form.warehouseId}
              onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
            >
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </TextField>

            {/* Product autocomplete */}
            <Autocomplete
              value={form.product}
              onChange={(_, v) => setForm((f) => ({ ...f, product: v }))}
              inputValue={form.productSearch}
              onInputChange={(_, v) => setForm((f) => ({ ...f, productSearch: v }))}
              options={productOptions}
              loading={productLoading}
              getOptionLabel={(p) => `${p.name} (${p.code ?? p.id.slice(0, 8)}…)`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product"
                  size="small"
                  placeholder="Search by name or code…"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {productLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText="No products found"
              size="small"
            />

            {/* Quantity */}
            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={form.qty}
              onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
              inputProps={{ min: 1, step: 1 }}
              placeholder="0"
              required
            />

            {/* Reason code */}
            <TextField
              select
              size="small"
              label="Reason code"
              value={form.reasonCode}
              onChange={(e) => setForm((f) => ({ ...f, reasonCode: e.target.value as ReasonCode }))}
            >
              {REASON_CODES.map((rc) => (
                <MenuItem key={rc} value={rc}>{rc}</MenuItem>
              ))}
            </TextField>

            {/* Type toggle */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[600], fontSize: '0.8rem', minWidth: 38 }}>
                Type
              </Typography>
              <ToggleButtonGroup
                value={form.type}
                exclusive
                size="small"
                onChange={(_, v) => { if (v) setForm((f) => ({ ...f, type: v })); }}
              >
                <ToggleButton
                  value="DAMAGE"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    px: 2,
                    borderRadius: '8px !important',
                    borderColor: brand.neutral[300],
                    '&.Mui-selected': {
                      bgcolor: brand.neutral[600],
                      color: '#fff',
                      '&:hover': { bgcolor: brand.neutral[700] },
                    },
                  }}
                >
                  Damage
                </ToggleButton>
                <ToggleButton
                  value="WASTE"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    px: 2,
                    borderRadius: '8px !important',
                    borderColor: brand.neutral[300],
                    '&.Mui-selected': {
                      bgcolor: brand.warning.main,
                      color: '#fff',
                      '&:hover': { bgcolor: brand.warning.dark },
                    },
                  }}
                >
                  Waste
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {/* Notes */}
            <TextField
              label="Notes"
              multiline
              rows={3}
              size="small"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes…"
            />

            {/* Submit */}
            <Button
              variant="contained"
              disabled={!form.warehouseId || !form.product || !form.qty || !form.reasonCode || submitting}
              onClick={handleSubmit}
              startIcon={submitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <IconTrash size={16} />}
              sx={{
                alignSelf: 'flex-start',
                textTransform: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '8px',
                px: 3,
                py: 1,
                bgcolor: brand.neutral[700],
                '&:hover': { bgcolor: brand.neutral[800] },
                '&:disabled': { bgcolor: brand.neutral[200], color: brand.neutral[400] },
              }}
            >
              {submitting ? 'Recording…' : 'Record Damage / Waste'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Tab 2: Pending Approval ──────────────────────────────────────── */}
      {tab === 1 && (
        <DataTable
          tableKey="damage-waste-pending"
          columns={columns}
          rows={pendingRows}
          loading={pendingLoading}
          page={pendingPage}
          totalPages={pendingTotalPages}
          totalElements={pendingTotalElements}
          pageSize={20}
          onPageChange={setPendingPage}
          getRowKey={(r) => r.id}
          emptyText="No pending damage or waste records."
          toolbarTitle={pendingTotalElements > 0 ? `${pendingTotalElements} record${pendingTotalElements !== 1 ? 's' : ''}` : undefined}
          enableExport
          exportFileName="damage-waste"
        />
      )}

      {/* ── Reject Dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={rejectOpen}
        onClose={() => { if (!rejecting) { setRejectOpen(false); setRejectTarget(null); } }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            border: `1px solid ${brand.neutral[200]}`,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.125rem', pb: 0.5 }}>
          Reject Record
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {rejectTarget && (
              <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                Rejecting <strong>{rejectTarget.ref}</strong> —{' '}
                {rejectTarget.productName ?? rejectTarget.productId.slice(0, 8)} ({rejectTarget.qty} units)
              </Typography>
            )}
            <TextField
              label="Rejection reason"
              multiline
              rows={3}
              size="small"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this record being rejected?"
              required
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => { setRejectOpen(false); setRejectTarget(null); }}
            disabled={rejecting}
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: brand.neutral[600],
              borderRadius: '8px',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!rejectReason.trim() || rejecting}
            onClick={handleRejectConfirm}
            startIcon={rejecting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <IconX size={16} />}
            sx={{
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '8px',
              bgcolor: brand.error.main,
              '&:hover': { bgcolor: brand.error.dark },
              '&:disabled': { bgcolor: brand.neutral[200], color: brand.neutral[400] },
            }}
          >
            {rejecting ? 'Rejecting…' : 'Confirm Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
