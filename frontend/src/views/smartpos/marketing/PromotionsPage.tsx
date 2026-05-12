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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconGift, IconPlus, IconTrash } from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import {
  listPromotions,
  createPromotion,
  deletePromotion,
  type Promotion,
  type PromotionInput,
} from 'src/api/smartpos/marketing';

// ── Helpers ─────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'Percentage',
  FIXED_AMOUNT: 'Fixed Amount',
  BUY_ONE_GET_ONE: 'Buy One Get One',
};

function computeStatus(p: Promotion): 'active' | 'scheduled' | 'ended' {
  if (!p.active) return 'ended';
  const today = new Date().toISOString().slice(0, 10);
  if (p.startDate && p.startDate > today) return 'scheduled';
  if (p.endDate && p.endDate < today) return 'ended';
  return 'active';
}

function formatDiscount(p: Promotion): string {
  if (p.type === 'PERCENTAGE') return `${p.discountValue}%`;
  if (p.type === 'FIXED_AMOUNT') return `TZS ${p.discountValue.toLocaleString()}`;
  if (p.type === 'BUY_ONE_GET_ONE') return 'Buy 1 Get 1';
  return `${p.discountValue}`;
}

const STATUS_TONES: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  scheduled: 'warning',
  ended: 'neutral',
};

// ── Component ────────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const [rows, setRows] = useState<Promotion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listPromotions({ page: 0, size: 100 });
      setRows(page.content);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ?? (e as Error).message ?? 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'PERCENTAGE',
    discountValue: '',
    startDate: '',
    endDate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const patch = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ name: '', type: 'PERCENTAGE', discountValue: '', startDate: '', endDate: '' });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!form.discountValue.trim() || isNaN(Number(form.discountValue))) {
      setFormError('Valid discount value is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const input: PromotionInput = {
        name: form.name.trim(),
        type: form.type,
        discountValue: Number(form.discountValue),
        startDate: form.startDate || new Date().toISOString().slice(0, 10),
        endDate: form.endDate || undefined,
      };
      await createPromotion(input);
      setFormOpen(false);
      await load();
    } catch (e: unknown) {
      setFormError((e as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ?? (e as Error).message ?? 'Failed to create promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePromotion(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ?? (e as Error).message ?? 'Failed to delete promotion');
      setDeleteTarget(null);
    }
  };

  const columns: Column<Promotion>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        exportValue: (p) => p.name,
        render: (p) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30, height: 30, borderRadius: '8px',
                bgcolor: brand.primary[50], color: brand.primary[700],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`, flexShrink: 0,
              }}
            >
              <IconGift size={15} />
            </Box>
            <Typography variant="body2"
              sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
              noWrap
            >
              {p.name}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        exportValue: (p) => TYPE_LABELS[p.type] ?? p.type,
        render: (p) => (
          <Chip
            label={TYPE_LABELS[p.type] ?? p.type}
            size="small"
            sx={{
              height: 20, fontWeight: 700, fontSize: '0.625rem',
              letterSpacing: '0.04em', borderRadius: '5px',
              bgcolor: brand.info.light, color: brand.info.dark,
              '& .MuiChip-label': { px: 0.875 },
            }}
          />
        ),
      },
      {
        key: 'discount',
        label: 'Discount',
        sortable: true,
        exportValue: (p) => formatDiscount(p),
        render: (p) => (
          <Typography variant="body2"
            sx={{ color: brand.neutral[800], fontWeight: 700, fontSize: '0.8125rem' }}
            noWrap
          >
            {formatDiscount(p)}
          </Typography>
        ),
      },
      {
        key: 'dates',
        label: 'Dates',
        sortable: true,
        exportValue: (p) => `${p.startDate} – ${p.endDate ?? 'No end'}`,
        render: (p) => (
          <Typography variant="body2"
            sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }}
            noWrap
          >
            {p.startDate} – {p.endDate || 'No end'}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        width: 110,
        sortable: true,
        exportValue: (p) => computeStatus(p),
        render: (p) => {
          const status = computeStatus(p);
          const tone = STATUS_TONES[status];
          const s = {
            success: { bg: brand.success.light, color: brand.success.dark },
            warning: { bg: brand.warning.light, color: brand.warning.dark },
            neutral: { bg: brand.neutral[100], color: brand.neutral[700] },
          }[tone];
          return (
            <Chip
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              size="small"
              sx={{
                height: 20, fontWeight: 700, fontSize: '0.625rem',
                letterSpacing: '0.04em', borderRadius: '5px',
                bgcolor: s.bg, color: s.color,
                '& .MuiChip-label': { px: 0.875 },
              }}
            />
          );
        },
      },
      {
        key: 'actions',
        label: '',
        align: 'right', width: 52,
        enableHiding: false,
        exportValue: () => '',
        render: (p) => (
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
            sx={{
              minWidth: 32, width: 32, height: 32, p: 0, borderRadius: '8px',
              color: brand.neutral[400],
              '&:hover': { color: brand.error.main, bgcolor: brand.error.light },
            }}
          >
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
        title="Promotions"
        subtitle="Create and manage discount promotions"
        actions={[
          { label: 'New Promotion', icon: <IconPlus size={18} />, onClick: openCreate },
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
        emptyText="No promotions created yet"
        emptyIcon={<IconGift size={32} />}
        getRowKey={(p) => p.id}
        tableKey="promotions"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} promotions` : undefined}
        enableSorting enableColumnVisibility enableExport
        exportFileName={`promotions-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          rows.length === 0 && !loading
            ? { label: 'Create your first promotion', onClick: openCreate }
            : undefined
        }
      />

      {/* Create dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          New Promotion
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2}>
            <TextField label="Name" required fullWidth size="small"
              value={form.name} onChange={(e) => patch('name', e.target.value)}
              placeholder="e.g. Summer Sale" />
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value={form.type} label="Type"
                onChange={(e) => patch('type', e.target.value)}>
                <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                <MenuItem value="FIXED_AMOUNT">Fixed Amount</MenuItem>
                <MenuItem value="BUY_ONE_GET_ONE">Buy One Get One</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={form.type === 'FIXED_AMOUNT' ? 'Discount Amount (TZS)' : 'Discount Value (%)'}
              required fullWidth size="small"
              value={form.discountValue}
              onChange={(e) => patch('discountValue', e.target.value)}
              placeholder={form.type === 'FIXED_AMOUNT' ? '5000' : '20'} />
            <TextField label="Start Date" type="date" fullWidth size="small"
              value={form.startDate} onChange={(e) => patch('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" fullWidth size="small"
              value={form.endDate} onChange={(e) => patch('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Promotion'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete promotion?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
