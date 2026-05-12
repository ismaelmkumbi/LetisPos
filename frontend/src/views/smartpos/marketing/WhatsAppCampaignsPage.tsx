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
import {
  IconBrandWhatsapp,
  IconInfoCircle,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

// ── Mock data ────────────────────────────────────────────────────────────────────

interface WhatsAppCampaign {
  id: string;
  name: string;
  recipients: number;
  sent: number;
  read: number;
  date: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
}

const mockCampaigns: WhatsAppCampaign[] = [
  { id: '1', name: 'Order Confirmation Templates', recipients: 560, sent: 560, read: 498, date: '2026-05-10', status: 'completed' },
  { id: '2', name: 'Back in Stock Alert', recipients: 320, sent: 320, read: 287, date: '2026-05-09', status: 'completed' },
  { id: '3', name: 'Promo Broadcast', recipients: 1500, sent: 1100, read: 0, date: '2026-05-12', status: 'sending' },
  { id: '4', name: 'Delivery Updates', recipients: 200, sent: 0, read: 0, date: '2026-05-13', status: 'draft' },
  { id: '5', name: 'Abandoned Cart Reminder', recipients: 75, sent: 75, read: 0, date: '2026-05-08', status: 'failed' },
];

const statusTones: Record<WhatsAppCampaign['status'], 'success' | 'warning' | 'info' | 'error'> = {
  draft: 'info',
  sending: 'warning',
  completed: 'success',
  failed: 'error',
};

// ── Component ────────────────────────────────────────────────────────────────────

export default function WhatsAppCampaignsPage() {
  const [rows, setRows] = useState<WhatsAppCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTimeout(() => {
      if (!cancelled) {
        setRows(mockCampaigns);
        setError(null);
        setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; };
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    templateName: '',
    param1: '',
    param2: '',
    param3: '',
    segment: 'all' as 'all' | 'loyalty' | 'vip' | 'new',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WhatsAppCampaign | null>(null);

  const patch = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ templateName: '', param1: '', param2: '', param3: '', segment: 'all' });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.templateName.trim()) {
      setFormError('Template name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 400));
    const newCampaign: WhatsAppCampaign = {
      id: String(Date.now()),
      name: form.templateName,
      recipients: form.segment === 'all' ? 950 : form.segment === 'loyalty' ? 380 : form.segment === 'vip' ? 120 : 55,
      sent: 0,
      read: 0,
      date: new Date().toISOString().slice(0, 10),
      status: 'draft',
    };
    setRows((prev) => [newCampaign, ...prev]);
    setFormOpen(false);
    setSubmitting(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const columns: Column<WhatsAppCampaign>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        exportValue: (c) => c.name,
        render: (c) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconBrandWhatsapp size={15} />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
              noWrap
            >
              {c.name}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'recipients',
        label: 'Recipients',
        sortable: true,
        align: 'right',
        width: 100,
        exportValue: (c) => String(c.recipients),
        render: (c) => (
          <Typography variant="body2" sx={{ color: brand.neutral[800], fontWeight: 600, fontSize: '0.8125rem' }} noWrap>
            {c.recipients.toLocaleString()}
          </Typography>
        ),
      },
      {
        key: 'sent',
        label: 'Sent',
        sortable: true,
        align: 'right',
        width: 80,
        exportValue: (c) => String(c.sent),
        render: (c) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {c.sent.toLocaleString()}
          </Typography>
        ),
      },
      {
        key: 'read',
        label: 'Read',
        sortable: true,
        align: 'right',
        width: 80,
        exportValue: (c) => String(c.read),
        render: (c) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {c.read.toLocaleString()}
            {c.sent > 0 && (
              <Typography component="span" variant="caption" sx={{ color: brand.neutral[400], ml: 0.5 }}>
                ({Math.round((c.read / c.sent) * 100)}%)
              </Typography>
            )}
          </Typography>
        ),
      },
      {
        key: 'date',
        label: 'Date',
        sortable: true,
        width: 110,
        exportValue: (c) => c.date,
        render: (c) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {c.date}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        width: 110,
        sortable: true,
        exportValue: (c) => c.status,
        render: (c) => {
          const tone = statusTones[c.status];
          const s = {
            success: { bg: brand.success.light, color: brand.success.dark },
            warning: { bg: brand.warning.light, color: brand.warning.dark },
            info: { bg: brand.info.light, color: brand.info.dark },
            error: { bg: brand.error.light, color: brand.error.dark },
          }[tone];
          return (
            <Chip
              label={c.status.charAt(0).toUpperCase() + c.status.slice(1)}
              size="small"
              sx={{
                height: 20,
                fontWeight: 700,
                fontSize: '0.625rem',
                letterSpacing: '0.04em',
                borderRadius: '5px',
                bgcolor: s.bg,
                color: s.color,
                '& .MuiChip-label': { px: 0.875 },
              }}
            />
          );
        },
      },
      {
        key: 'actions',
        label: '',
        align: 'right',
        width: 52,
        enableHiding: false,
        exportValue: () => '',
        render: (c) => (
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(c);
            }}
            sx={{
              minWidth: 32,
              width: 32,
              height: 32,
              p: 0,
              borderRadius: '8px',
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
        title="WhatsApp Campaigns"
        subtitle="Send WhatsApp messages via Twilio Business API"
        actions={[
          {
            label: 'New Campaign',
            icon: <IconPlus size={18} />,
            onClick: openCreate,
          },
        ]}
      />

      {/* Info banner */}
      <Alert
        severity="info"
        icon={<IconInfoCircle size={18} />}
        sx={{ mb: 2, borderRadius: '10px' }}
      >
        WhatsApp delivery is powered by Twilio. Configure in{' '}
        <strong>Integrations &gt; WhatsApp API</strong>.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No WhatsApp campaigns yet"
        emptyIcon={<IconBrandWhatsapp size={32} />}
        getRowKey={(c) => c.id}
        tableKey="whatsapp-campaigns"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} campaigns` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`whatsapp-campaigns-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          rows.length === 0 && !loading
            ? { label: 'Create your first campaign', onClick: openCreate }
            : undefined
        }
      />

      {/* New Campaign dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          New WhatsApp Campaign
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Template Name"
              required
              fullWidth
              size="small"
              value={form.templateName}
              onChange={(e) => patch('templateName', e.target.value)}
              helperText="Name of a pre-approved WhatsApp message template"
              placeholder="e.g. order_confirmation_v2"
            />
            <TextField
              label="Parameter 1"
              fullWidth
              size="small"
              value={form.param1}
              onChange={(e) => patch('param1', e.target.value)}
              placeholder="e.g. customer name"
            />
            <TextField
              label="Parameter 2"
              fullWidth
              size="small"
              value={form.param2}
              onChange={(e) => patch('param2', e.target.value)}
              placeholder="e.g. order number"
            />
            <TextField
              label="Parameter 3"
              fullWidth
              size="small"
              value={form.param3}
              onChange={(e) => patch('param3', e.target.value)}
              placeholder="e.g. delivery date"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Target Segment</InputLabel>
              <Select
                value={form.segment}
                label="Target Segment"
                onChange={(e) => patch('segment', e.target.value as typeof form.segment)}
              >
                <MenuItem value="all">All Customers</MenuItem>
                <MenuItem value="loyalty">Loyalty Members</MenuItem>
                <MenuItem value="vip">VIP Customers</MenuItem>
                <MenuItem value="new">New Customers</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Campaign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete campaign?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> will be permanently removed. This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
