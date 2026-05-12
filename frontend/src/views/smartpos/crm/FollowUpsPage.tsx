import { useMemo, useState } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUp {
  id: string;
  customer: string;
  type: string;
  dueDate: string;
  priority: string;
  assignedTo: string;
  status: string;
}

type FollowUpFormData = {
  customer: string;
  type: string;
  dueDate: string;
  priority: string;
  notes: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_FOLLOWUPS: FollowUp[] = [
  { id: '1', customer: 'Jane Mushi', type: 'Call', dueDate: '2026-05-12', priority: 'High', assignedTo: 'Anna Kimaro', status: 'Pending' },
  { id: '2', customer: 'David Msangi', type: 'Email', dueDate: '2026-05-13', priority: 'Medium', assignedTo: 'John Banda', status: 'Pending' },
  { id: '3', customer: 'Moses Mwakibete', type: 'Meeting', dueDate: '2026-05-11', priority: 'High', assignedTo: 'Anna Kimaro', status: 'Completed' },
  { id: '4', customer: 'Rehema Saleh', type: 'Call', dueDate: '2026-05-14', priority: 'Low', assignedTo: 'John Banda', status: 'Pending' },
  { id: '5', customer: 'Fatma Omari', type: 'Email', dueDate: '2026-05-10', priority: 'Medium', assignedTo: 'Anna Kimaro', status: 'Missed' },
  { id: '6', customer: 'Hassan Juma', type: 'Call', dueDate: '2026-05-09', priority: 'High', assignedTo: 'John Banda', status: 'Completed' },
];

const TYPE_OPTIONS = ['Call', 'Email', 'Meeting'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const CUSTOMERS = ['Jane Mushi', 'David Msangi', 'Moses Mwakibete', 'Rehema Saleh', 'Fatma Omari', 'Hassan Juma'];

const priorityColor = (p: string) => {
  switch (p) {
    case 'High': return { bg: brand.error.light, color: brand.error.dark };
    case 'Medium': return { bg: brand.warning.light, color: brand.warning.dark };
    case 'Low': return { bg: brand.success.light, color: brand.success.dark };
    default: return { bg: brand.neutral[100], color: brand.neutral[600] };
  }
};

const statusChip = (s: string) => {
  switch (s) {
    case 'Completed': return { bg: brand.success.light, color: brand.success.dark };
    case 'Missed': return { bg: brand.error.light, color: brand.error.dark };
    case 'Pending': return { bg: brand.warning.light, color: brand.warning.dark };
    default: return { bg: brand.neutral[100], color: brand.neutral[600] };
  }
};

const emptyForm = (): FollowUpFormData => ({
  customer: CUSTOMERS[0],
  type: 'Call',
  dueDate: new Date().toISOString().slice(0, 10),
  priority: 'Medium',
  notes: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const [rows, setRows] = useState<FollowUp[]>(MOCK_FOLLOWUPS);
  const loading = false;
  const error: string | null = null;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<FollowUpFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    await new Promise((r) => setTimeout(r, 400));
    const newFU: FollowUp = {
      id: String(Date.now()),
      customer: form.customer,
      type: form.type,
      dueDate: form.dueDate,
      priority: form.priority,
      assignedTo: 'Anna Kimaro',
      status: 'Pending',
    };
    setRows((prev) => [newFU, ...prev]);
    setSubmitting(false);
    setFormDialogOpen(false);
  };

  const columns: Column<FollowUp>[] = useMemo(
    () => [
      {
        key: 'customer',
        label: 'Customer',
        sortable: true,
        exportValue: (f) => f.customer,
        render: (f) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
            noWrap
          >
            {f.customer}
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
            label={f.type}
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
          const isOverdue = f.dueDate < new Date().toISOString().slice(0, 10) && f.status === 'Pending';
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
              label={f.priority}
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
            {f.assignedTo}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 110,
        sortable: true,
        exportValue: (f) => f.status,
        render: (f) => {
          const c = statusChip(f.status);
          return (
            <Chip
              label={f.status}
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
            <FormControl fullWidth size="small">
              <InputLabel>Customer</InputLabel>
              <Select
                value={form.customer}
                label="Customer"
                onChange={(e) => patch('customer', e.target.value)}
              >
                {CUSTOMERS.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={(e) => patch('type', e.target.value)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
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
                  <MenuItem key={p} value={p}>{p}</MenuItem>
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
