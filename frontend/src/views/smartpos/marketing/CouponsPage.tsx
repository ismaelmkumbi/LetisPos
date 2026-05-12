import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconCopy, IconPercentage, IconPlus, IconTrash } from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import {
  listCoupons,
  createCoupon,
  generateCouponCodes,
  deleteCoupon,
  type Coupon,
  type CouponInput,
} from 'src/api/smartpos/marketing';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function computeStatus(c: Coupon): 'active' | 'expired' {
  if (!c.active) return 'expired';
  const today = new Date().toISOString().slice(0, 10);
  if (c.validUntil && c.validUntil < today) return 'expired';
  if (c.validFrom && c.validFrom > today) return 'expired'; // not yet valid — treat as inactive
  if (c.maxUses != null && c.usedCount >= c.maxUses) return 'expired';
  return 'active';
}

function formatDiscount(c: Coupon): string {
  if (c.type === 'PERCENTAGE') return `${c.discountValue}%`;
  if (c.type === 'FIXED_AMOUNT') return `TZS ${c.discountValue.toLocaleString()}`;
  return `${c.discountValue}`;
}

// ── Component ────────────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listCoupons({ page: 0, size: 100 });
      setRows(page.content);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    prefix: '',
    discountValue: '',
    quantity: '',
    validFrom: '',
    validUntil: '',
    maxUses: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const patch = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openGenerate = () => {
    setForm({ prefix: '', discountValue: '', quantity: '', validFrom: '', validUntil: '', maxUses: '' });
    setFormError(null);
    setFormOpen(true);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
  };

  const handleSubmit = async () => {
    if (!form.prefix.trim()) { setFormError('Prefix is required.'); return; }
    if (!form.discountValue.trim() || isNaN(Number(form.discountValue))) {
      setFormError('Valid discount value is required.'); return;
    }
    if (!form.quantity.trim() || isNaN(Number(form.quantity)) || Number(form.quantity) < 1) {
      setFormError('Valid quantity is required.'); return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      // Create a template coupon first, then bulk generate
      const template: CouponInput = {
        code: `${form.prefix.toUpperCase()}-TEMPLATE`,
        type: 'PERCENTAGE', // default; could be made configurable
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        validFrom: form.validFrom || new Date().toISOString().slice(0, 10),
        validUntil: form.validUntil || undefined,
      };
      const created = await createCoupon(template);
      await generateCouponCodes(created.id, form.prefix.toUpperCase(), Number(form.quantity));
      // Delete the template after generating
      await deleteCoupon(created.id);
      setFormOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate coupons');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCoupon(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to delete coupon');
      setDeleteTarget(null);
    }
  };

  const columns: Column<Coupon>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'Code',
        sortable: true,
        exportValue: (c) => c.code,
        render: (c) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px',
              bgcolor: brand.purple.light, color: brand.purple.dark,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12,
              border: `1px solid ${brand.neutral[200]}`, flexShrink: 0,
            }}>
              <IconPercentage size={15} />
            </Box>
            <Typography variant="body2"
              sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem', fontFamily: 'monospace' }}
              noWrap>
              {c.code}
            </Typography>
            <Button size="small" onClick={(e) => { e.stopPropagation(); handleCopy(c.code); }}
              sx={{
                minWidth: 28, width: 28, height: 28, p: 0, borderRadius: '6px',
                color: brand.neutral[400],
                '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
              }}>
              <IconCopy size={13} />
            </Button>
          </Stack>
        ),
      },
      {
        key: 'discount',
        label: 'Discount',
        sortable: true,
        exportValue: (c) => formatDiscount(c),
        render: (c) => (
          <Typography variant="body2"
            sx={{ color: brand.neutral[800], fontWeight: 700, fontSize: '0.8125rem' }} noWrap>
            {formatDiscount(c)}
          </Typography>
        ),
      },
      {
        key: 'usage',
        label: 'Usage',
        sortable: true,
        exportValue: (c) => `${c.usedCount}${c.maxUses != null ? `/${c.maxUses}` : ''}`,
        render: (c) => {
          const total = c.maxUses ?? Infinity;
          const pct = total === Infinity ? 0 : Math.min(100, (c.usedCount / total) * 100);
          return (
            <Stack spacing={0.5} sx={{ minWidth: 80 }}>
              <Typography variant="body2"
                sx={{ color: brand.neutral[700], fontWeight: 600, fontSize: '0.8125rem' }}>
                {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}
              </Typography>
              {c.maxUses != null && (
                <Box sx={{ height: 4, borderRadius: 2, bgcolor: brand.neutral[100], overflow: 'hidden' }}>
                  <Box sx={{
                    height: '100%', width: `${pct}%`, borderRadius: 2,
                    bgcolor: c.usedCount >= c.maxUses! ? brand.error.main : brand.success.main,
                    transition: 'width 0.3s ease',
                  }} />
                </Box>
              )}
            </Stack>
          );
        },
      },
      {
        key: 'validUntil',
        label: 'Valid Until',
        sortable: true,
        exportValue: (c) => c.validUntil ?? 'No expiry',
        render: (c) => (
          <Typography variant="body2"
            sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {c.validUntil ?? 'No expiry'}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center', width: 100,
        sortable: true,
        exportValue: (c) => computeStatus(c),
        render: (c) => {
          const isActive = computeStatus(c) === 'active';
          return (
            <Chip label={isActive ? 'Active' : 'Expired'} size="small"
              sx={{
                height: 20, fontWeight: 700, fontSize: '0.625rem',
                letterSpacing: '0.04em', borderRadius: '5px',
                bgcolor: isActive ? brand.success.light : brand.neutral[100],
                color: isActive ? brand.success.dark : brand.neutral[600],
                '& .MuiChip-label': { px: 0.875 },
              }} />
          );
        },
      },
      {
        key: 'actions',
        label: '',
        align: 'right', width: 52,
        enableHiding: false,
        exportValue: () => '',
        render: (c) => (
          <Button size="small"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
            sx={{
              minWidth: 32, width: 32, height: 32, p: 0, borderRadius: '8px',
              color: brand.neutral[400],
              '&:hover': { color: brand.error.main, bgcolor: brand.error.light },
            }}>
            <IconTrash size={14} />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Coupons"
        subtitle="Generate and manage discount coupon codes"
        actions={[
          { label: 'Generate Coupons', icon: <IconPlus size={18} />, onClick: openGenerate },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No coupons generated yet"
        emptyIcon={<IconPercentage size={32} />}
        getRowKey={(c) => c.id}
        tableKey="coupons"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} coupons` : undefined}
        enableSorting enableColumnVisibility enableExport
        exportFileName={`coupons-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          rows.length === 0 && !loading
            ? { label: 'Generate your first coupons', onClick: openGenerate }
            : undefined
        }
      />

      {/* Generate dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          Generate Coupons
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2}>
            <TextField label="Code Prefix" required fullWidth size="small"
              value={form.prefix} onChange={(e) => patch('prefix', e.target.value)}
              helperText="e.g. SUMMER will generate SUMMER-0001, SUMMER-0002..."
              placeholder="SUMMER" />
            <TextField label="Discount (%)" required fullWidth size="small"
              value={form.discountValue}
              onChange={(e) => patch('discountValue', e.target.value)}
              helperText="Percentage discount value (e.g. 20 for 20% off)"
              placeholder="20" />
            <TextField label="Quantity" required fullWidth size="small" type="number"
              value={form.quantity}
              onChange={(e) => patch('quantity', e.target.value)}
              placeholder="100" />
            <TextField label="Valid From" type="date" fullWidth size="small"
              value={form.validFrom}
              onChange={(e) => patch('validFrom', e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField label="Expiry Date" type="date" fullWidth size="small"
              value={form.validUntil}
              onChange={(e) => patch('validUntil', e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField label="Usage Limit (per coupon)" fullWidth size="small" type="number"
              value={form.maxUses}
              onChange={(e) => patch('maxUses', e.target.value)}
              helperText="Leave blank for single use" placeholder="1" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete coupon?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.code}</strong> will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Copy snackbar */}
      <Snackbar open={!!copiedCode} autoHideDuration={2000}
        onClose={() => setCopiedCode(null)} message={`Copied ${copiedCode}`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
