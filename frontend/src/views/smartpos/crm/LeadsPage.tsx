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
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import {
  IconPlus,
  IconUsers,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  assignedTo: string;
  created: string;
}

type LeadFormData = {
  name: string;
  company: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'Jane Mushi', company: 'Dar Express Ltd', phone: '+255 712 345 678', email: 'jane@darexpress.co.tz', source: 'Referral', status: 'New', assignedTo: 'Anna Kimaro', created: '2026-05-10' },
  { id: '2', name: 'David Msangi', company: 'Arusha General Traders', phone: '+255 752 111 222', email: 'david@arusha.co.tz', source: 'Website', status: 'Qualified', assignedTo: 'John Banda', created: '2026-05-09' },
  { id: '3', name: 'Moses Mwakibete', company: 'Mwanza Wholesale Ltd', phone: '+255 783 444 555', email: 'moses@mwanzawholesale.co.tz', source: 'Walk-in', status: 'Contacted', assignedTo: 'Anna Kimaro', created: '2026-05-08' },
  { id: '4', name: 'Rehema Saleh', company: 'Zanzibar Distributors', phone: '+255 773 666 777', email: 'rehema@znzdist.co.tz', source: 'Social', status: 'New', assignedTo: 'John Banda', created: '2026-05-07' },
  { id: '5', name: 'Hassan Juma', company: 'Mbeya Agro Supply', phone: '+255 762 888 999', email: 'hassan@mbeyaagro.co.tz', source: 'Referral', status: 'Lost', assignedTo: 'Anna Kimaro', created: '2026-05-06' },
  { id: '6', name: 'Fatma Omari', company: 'Dodoma Retail Hub', phone: '+255 712 223 344', email: 'fatma@dodomaretail.co.tz', source: 'Website', status: 'Qualified', assignedTo: 'John Banda', created: '2026-05-05' },
];

const SOURCE_OPTIONS = ['Referral', 'Website', 'Walk-in', 'Social'];
const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Lost'];

const emptyForm = (): LeadFormData => ({
  name: '',
  company: '',
  phone: '',
  email: '',
  source: 'Website',
  notes: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [rows, setRows] = useState<Lead[]>(MOCK_LEADS);
  const loading = false;
  const error: string | null = null;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<LeadFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setFormDialogOpen(true);
  };

  const patch = <K extends keyof LeadFormData>(k: K, v: LeadFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!form.phone.trim()) {
      setFormError('Phone is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 400));
    const newLead: Lead = {
      id: String(Date.now()),
      name: form.name,
      company: form.company,
      phone: form.phone,
      email: form.email,
      source: form.source,
      status: 'New',
      assignedTo: 'Anna Kimaro',
      created: new Date().toISOString().slice(0, 10),
    };
    setRows((prev) => [newLead, ...prev]);
    setSubmitting(false);
    setFormDialogOpen(false);
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    setRows((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
    );
  };

  const columns: Column<Lead>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        exportValue: (l) => l.name,
        render: (l) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconUsers size={15} />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
              noWrap
            >
              {l.name}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'company',
        label: 'Company',
        sortable: true,
        exportValue: (l) => l.company,
        render: (l) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {l.company || '—'}
          </Typography>
        ),
      },
      {
        key: 'phone',
        label: 'Phone',
        sortable: false,
        exportValue: (l) => l.phone,
        render: (l) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {l.phone || '—'}
          </Typography>
        ),
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        exportValue: (l) => l.email,
        render: (l) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {l.email || '—'}
          </Typography>
        ),
      },
      {
        key: 'source',
        label: 'Source',
        sortable: true,
        width: 110,
        exportValue: (l) => l.source,
        render: (l) => (
          <Chip
            label={l.source}
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
        key: 'status',
        label: 'Status',
        width: 150,
        sortable: true,
        exportValue: (l) => l.status,
        render: (l) => (
          <FormControl size="small" sx={{ minWidth: 120 }} onClick={(e) => e.stopPropagation()}>
            <Select
              value={l.status}
              onChange={(e: SelectChangeEvent) => handleStatusChange(l.id, e.target.value)}
              sx={{
                height: 28,
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.neutral[200] },
                bgcolor: '#fff',
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s} sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ),
      },
      {
        key: 'assignedTo',
        label: 'Assigned To',
        sortable: true,
        exportValue: (l) => l.assignedTo,
        render: (l) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {l.assignedTo}
          </Typography>
        ),
      },
      {
        key: 'created',
        label: 'Created',
        sortable: true,
        width: 110,
        exportValue: (l) => l.created,
        render: (l) => (
          <Typography variant="body2" sx={{ color: brand.neutral[500], fontSize: '0.75rem' }} noWrap>
            {l.created}
          </Typography>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Leads"
        subtitle="Track and manage potential customers"
        actions={[
          {
            label: 'New Lead',
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
        emptyText="No leads yet"
        emptyIcon={<IconUsers size={32} />}
        getRowKey={(l) => l.id}
        tableKey="crm-leads"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} leads` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`leads-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          rows.length === 0 && !loading
            ? { label: 'Add your first lead', onClick: openCreate }
            : undefined
        }
      />

      {/* Create Lead Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          New Lead
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Name"
              required
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
            />
            <TextField
              label="Company"
              fullWidth
              size="small"
              value={form.company}
              onChange={(e) => patch('company', e.target.value)}
            />
            <TextField
              label="Phone"
              required
              fullWidth
              size="small"
              value={form.phone}
              onChange={(e) => patch('phone', e.target.value)}
            />
            <TextField
              label="Email"
              fullWidth
              size="small"
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select
                value={form.source}
                label="Source"
                onChange={(e) => patch('source', e.target.value)}
              >
                {SOURCE_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
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
            {submitting ? 'Saving...' : 'Create Lead'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
