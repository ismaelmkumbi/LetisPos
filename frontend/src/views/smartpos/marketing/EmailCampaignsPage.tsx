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
  IconMail,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

// ── Mock data ────────────────────────────────────────────────────────────────────

interface EmailCampaign {
  id: string;
  subject: string;
  recipients: number;
  opened: number;
  clicked: number;
  date: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
}

const mockCampaigns: EmailCampaign[] = [
  { id: '1', subject: 'New Summer Collection Is Here!', recipients: 2500, opened: 1200, clicked: 340, date: '2026-05-10', status: 'completed' },
  { id: '2', subject: 'Your Exclusive VIP Discount', recipients: 120, opened: 98, clicked: 45, date: '2026-05-09', status: 'completed' },
  { id: '3', subject: 'Flash Sale — 24 Hours Only', recipients: 3500, sent: 2000, opened: 0, clicked: 0, date: '2026-05-12', status: 'sending' },
  { id: '4', subject: 'Welcome to Letis POS', recipients: 150, sent: 0, opened: 0, clicked: 0, date: '2026-05-14', status: 'draft' },
  { id: '5', subject: 'Monthly Newsletter — May', recipients: 1800, sent: 1800, opened: 0, clicked: 0, date: '2026-05-01', status: 'failed' },
].map((c) => ({
  ...c,
  recipients: c.recipients,
  sent: (c as Record<string, unknown>).sent as number ?? c.recipients,
})) as EmailCampaign[];

const statusTones: Record<EmailCampaign['status'], 'success' | 'warning' | 'info' | 'error'> = {
  draft: 'info',
  sending: 'warning',
  completed: 'success',
  failed: 'error',
};

// ── Component ────────────────────────────────────────────────────────────────────

export default function EmailCampaignsPage() {
  const [rows, setRows] = useState<EmailCampaign[]>([]);
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
    subject: '',
    body: '',
    segment: 'all' as 'all' | 'loyalty' | 'vip' | 'new',
    schedule: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EmailCampaign | null>(null);

  const patch = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ subject: '', body: '', segment: 'all', schedule: false });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.subject.trim()) {
      setFormError('Subject is required.');
      return;
    }
    if (!form.body.trim()) {
      setFormError('Email body is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 400));
    const newCampaign: EmailCampaign = {
      id: String(Date.now()),
      subject: form.subject,
      recipients: form.segment === 'all' ? 3200 : form.segment === 'loyalty' ? 580 : form.segment === 'vip' ? 120 : 89,
      opened: 0,
      clicked: 0,
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

  const columns: Column<EmailCampaign>[] = useMemo(
    () => [
      {
        key: 'subject',
        label: 'Subject',
        sortable: true,
        exportValue: (c) => c.subject,
        render: (c) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: brand.purple.light,
                color: brand.purple.dark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconMail size={15} />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
              noWrap
            >
              {c.subject}
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
        key: 'opened',
        label: 'Opened',
        sortable: true,
        align: 'right',
        width: 80,
        exportValue: (c) => String(c.opened),
        render: (c) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {c.opened.toLocaleString()}
            {c.recipients > 0 && c.status !== 'draft' && (
              <Typography component="span" variant="caption" sx={{ color: brand.neutral[400], ml: 0.5 }}>
                ({Math.round((c.opened / c.recipients) * 100)}%)
              </Typography>
            )}
          </Typography>
        ),
      },
      {
        key: 'clicked',
        label: 'Clicked',
        sortable: true,
        align: 'right',
        width: 80,
        exportValue: (c) => String(c.clicked),
        render: (c) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {c.clicked.toLocaleString()}
            {c.opened > 0 && (
              <Typography component="span" variant="caption" sx={{ color: brand.neutral[400], ml: 0.5 }}>
                ({Math.round((c.clicked / Math.max(1, c.opened)) * 100)}%)
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
        title="Email Campaigns"
        subtitle="Send promotional emails to your customers"
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
        Email delivery is handled by the notification service.
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
        emptyText="No email campaigns yet"
        emptyIcon={<IconMail size={32} />}
        getRowKey={(c) => c.id}
        tableKey="email-campaigns"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} campaigns` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`email-campaigns-${new Date().toISOString().slice(0, 10)}`}
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
          New Email Campaign
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Subject"
              required
              fullWidth
              size="small"
              value={form.subject}
              onChange={(e) => patch('subject', e.target.value)}
              placeholder="e.g. New Collection Launch"
            />
            <TextField
              label="Email Body"
              required
              fullWidth
              multiline
              minRows={5}
              size="small"
              value={form.body}
              onChange={(e) => patch('body', e.target.value)}
              placeholder="Compose your email content here..."
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
            <strong>{deleteTarget?.subject}</strong> will be permanently removed. This action cannot be
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
