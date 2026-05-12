import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import {
  IconBell,
  IconPlus,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import {
  listFollowUps,
  createFollowUp,
  completeFollowUp,
  type FollowUp,
} from 'src/api/smartpos/crm';
import { tokenStore } from 'src/api/smartpos/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type FollowUpFormData = {
  customerName: string;
  type: string;
  dueDate: string;
  priority: string;
  notes: string;
};

const TYPE_OPTIONS = ['call', 'email', 'meeting'];
const TYPE_LABELS: Record<string, string> = { call: 'Call', email: 'Email', meeting: 'Meeting' };
const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const PRIORITY_LABELS: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };

const priorityColor = (p: string) => {
  switch (p) {
    case 'high': return { bg: brand.error.light, color: brand.error.dark };
    case 'medium': return { bg: brand.warning.light, color: brand.warning.dark };
    case 'low': return { bg: brand.success.light, color: brand.success.dark };
    default: return { bg: brand.neutral[100], color: brand.neutral[600] };
  }
};

const statusChip = (s: string) => {
  switch (s) {
    case 'completed': return { bg: brand.success.light, color: brand.success.dark };
    case 'missed': return { bg: brand.error.light, color: brand.error.dark };
    case 'pending': return { bg: brand.warning.light, color: brand.warning.dark };
    default: return { bg: brand.neutral[100], color: brand.neutral[600] };
  }
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  missed: 'Missed',
};

const emptyForm = (): FollowUpFormData => ({
  customerName: '',
  type: 'call',
  dueDate: new Date().toISOString().slice(0, 10),
  priority: 'medium',
  notes: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<FollowUpFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tenantId = tokenStore.getTenantId();

  const fetchFollowUps = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      setError(null);
      const page = await listFollowUps({ page: 0, size: 100 });
      setRows(page.content);
    } catch (e: any) {
      setError(e?.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setFormDialogOpen(true);
  };

  const patch = <K extends keyof FollowUpFormData>(k: K, v: FollowUpFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.dueDate) {
      setFormError('Due date is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const newFU = await createFollowUp({
        customerName: form.customerName.trim() || undefined,
        type: form.type,
        dueDate: form.dueDate,
        priority: form.priority,
        notes: form.notes.trim() || undefined,
      });
      setRows((prev) => [newFU, ...prev]);
      setFormDialogOpen(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || e?.message || 'Failed to schedule follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const updated = await completeFollowUp(id);
      setRows((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch {
      // silently ignore
    }
  };

  const columns: Column<FollowUp>[] = useMemo(
    () => [
      {
        key: 'customerName',
        label: 'Customer',
        sortable: true,
        exportValue: (f) => f.customerName,
        render: (f) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
            noWrap
          >
            {f.customerName || '—'}
          </Typography>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        width: 100,
        exportValue: (f) => f.type,
        render: (f) => (
          <Chip
            label={TYPE_LABELS[f.type] || f.type}
            size="small"
            sx={{
              height: 20,
              fontWeight: 700,
              fontSize: '0.625rem',
              letterSpacing: '0.04em',
              borderRadius: '5px',
              bgcolor: brand.neutral[100],
              color: brand.neutral[700],
              border: `1px solid ${brand.neutral[200]}`,
              '& .MuiChip-label': { px: 0.875 },
            }}
          />
        ),
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        sortable: true,
        width: 120,
        exportValue: (f) => f.dueDate,
        render: (f) => {
          const isOverdue = f.dueDate < new Date().toISOString().slice(0, 10) && f.status === 'pending';
          return (
            <Typography
              variant="body2"
              sx={{
                color: isOverdue ? brand.error.main : brand.neutral[600],
                fontSize: '0.8125rem',
                fontWeight: isOverdue ? 700 : 500,
              }}
              noWrap
            >
              {f.dueDate}
            </Typography>
          );
        },
      },
      {
        key: 'priority',
        label: 'Priority',
        width: 100,
        sortable: true,
        exportValue: (f) => f.priority,
        render: (f) => {
          const c = priorityColor(f.priority);
          return (
            <Chip
              label={PRIORITY_LABELS[f.priority] || f.priority}
              size="small"
              sx={{
                height: 20,
                fontWeight: 700,
                fontSize: '0.625rem',
                letterSpacing: '0.04em',
                borderRadius: '5px',
                bgcolor: c.bg,
                color: c.color,
                '& .MuiChip-label': { px: 0.875 },
              }}
            />
          );
        },
      },
      {
        key: 'assignedTo',
        label: 'Assigned To',
        sortable: true,
        exportValue: (f) => f.assignedTo,
        render: (f) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {f.assignedTo || '—'}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 120,
        sortable: true,
        exportValue: (f) => f.status,
        render: (f) => {
          const c = statusChip(f.status);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={STATUS_LABELS[f.status] || f.status}
                size="small"
                sx={{
                  height: 20,
                  fontWeight: 700,
                  fontSize: '0.625rem',
                  letterSpacing: '0.04em',
                  borderRadius: '5px',
                  bgcolor: c.bg,
                  color: c.color,
                  '& .MuiChip-label': { px: 0.875 },
                }}
              />
              {f.status === 'pending' && (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    py: 0,
                    px: 0.75,
                    minWidth: 'auto',
                    height: 20,
                    borderRadius: '5px',
                    textTransform: 'none',
                    lineHeight: 1,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleComplete(f.id);
                  }}
                >
                  Complete
                </Button>
              )}
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Follow-ups"
        subtitle="Schedule and manage customer follow-ups"
        actions={[
          {
            label: 'Schedule Follow-up',
            icon: <IconPlus size={18} />,
            onClick: openCreate,
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No follow-ups scheduled"
        emptyIcon={<IconBell size={32} />}
        getRowKey={(f) => f.id}
        tableKey="crm-followups"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} follow-ups` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`followups-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          rows.length === 0 && !loading
            ? { label: 'Schedule a follow-up', onClick: openCreate }
            : undefined
        }
      />

      {/* Schedule Follow-up Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          Schedule Follow-up
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Customer Name"
              fullWidth
              size="small"
              value={form.customerName}
              onChange={(e) => patch('customerName', e.target.value)}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={(e) => patch('type', e.target.value)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <MenuItem key={t} value={t}>{TYPE_LABELS[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Due Date"
              required
              fullWidth
              size="small"
              type="date"
              value={form.dueDate}
              onChange={(e) => patch('dueDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={form.priority}
                label="Priority"
                onChange={(e) => patch('priority', e.target.value)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <MenuItem key={p} value={p}>{PRIORITY_LABELS[p]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={form.notes}
              onChange={(e) => patch('notes', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Schedule Follow-up'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
