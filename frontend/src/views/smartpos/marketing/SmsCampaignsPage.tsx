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
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconInfoCircle,
  IconPlus,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

// ── Mock data ────────────────────────────────────────────────────────────────────

interface SmsCampaign {
  id: string;
  name: string;
  recipients: number;
  sent: number;
  delivered: number;
  date: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
}

const mockCampaigns: SmsCampaign[] = [
  { id: '1', name: 'Weekend Flash Sale', recipients: 450, sent: 450, delivered: 432, date: '2026-05-10', status: 'completed' },
  { id: '2', name: 'New Arrival Alert', recipients: 1200, sent: 1200, delivered: 1156, date: '2026-05-08', status: 'completed' },
  { id: '3', name: 'Loyalty Reward Reminder', recipients: 300, sent: 150, delivered: 148, date: '2026-05-12', status: 'sending' },
  { id: '4', name: 'Abandoned Cart Recovery', recipients: 89, sent: 0, delivered: 0, date: '2026-05-15', status: 'draft' },
  { id: '5', name: 'Holiday Greetings', recipients: 800, sent: 800, delivered: 0, date: '2026-05-01', status: 'failed' },
];

const statusTones: Record<SmsCampaign['status'], 'success' | 'warning' | 'info' | 'error'> = {
  draft: 'info',
  sending: 'warning',
  completed: 'success',
  failed: 'error',
};

// ── Component ────────────────────────────────────────────────────────────────────

export default function SmsCampaignsPage() {
  const [rows, setRows] = useState<SmsCampaign[]>([]);
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
    name: '',
    message: '',
    segment: 'all' as 'all' | 'loyalty' | 'vip' | 'new',
    schedule: false,
  });
  const [charCount, setCharCount] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SmsCampaign | null>(null);

  const patch = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ name: '', message: '', segment: 'all', schedule: false });
    setCharCount(0);
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Campaign name is required.');
      return;
    }
    if (!form.message.trim()) {
      setFormError('Message is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 400));
    const newCampaign: SmsCampaign = {
      id: String(Date.now()),
      name: form.name,
      recipients: form.segment === 'all' ? 1250 : form.segment === 'loyalty' ? 380 : form.segment === 'vip' ? 120 : 45,
      sent: 0,
      delivered: 0,
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

  const columns: Column<SmsCampaign>[] = useMemo(
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
                bgcolor: brand.info.light,
                color: brand.info.dark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconSend size={15} />
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
        key: 'delivered',
        label: 'Delivered',
        sortable: true,
        align: 'right',
        width: 90,
        exportValue: (c) => String(c.delivered),
        render: (c) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {c.delivered.toLocaleString()}
          </Typography>
        ),
      },
      {
        key: 'date',
        label: 'Date',
        sortable: true,
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
        title="SMS Campaigns"
        subtitle="Send bulk SMS to customer segments"
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
        SMS delivery is powered by Twilio. Configure your credentials in{' '}
        <strong>Integrations &gt; SMS Providers</strong>.
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
        emptyText="No SMS campaigns yet"
        emptyIcon={<IconSend size={32} />}
        getRowKey={(c) => c.id}
        tableKey="sms-campaigns"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} campaigns` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`sms-campaigns-${new Date().toISOString().slice(0, 10)}`}
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
          New SMS Campaign
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Campaign Name"
              required
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              placeholder="e.g. Flash Sale Alert"
            />
            <Box>
              <TextField
                label="Message"
                required
                fullWidth
                multiline
                minRows={4}
                size="small"
                value={form.message}
                onChange={(e) => {
                  patch('message', e.target.value);
                  setCharCount(e.target.value.length);
                }}
                placeholder="Type your SMS message here..."
                inputProps={{ maxLength: 320 }}
              />
              <Typography
                variant="caption"
                sx={{ color: charCount > 160 ? brand.warning.main : brand.neutral[400], mt: 0.5, display: 'block' }}
              >
                {charCount} / 320 characters{charCount > 160 ? ' (multi-part message)' : ''}
              </Typography>
            </Box>
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
            <FormControlLabel
              control={
                <Switch
                  checked={form.schedule}
                  onChange={(e) => patch('schedule', e.target.checked)}
                />
              }
              label="Schedule for later"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : form.schedule ? 'Schedule Campaign' : 'Create Campaign'}
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
