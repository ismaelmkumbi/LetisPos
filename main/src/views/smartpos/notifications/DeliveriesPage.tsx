/**
 * Delivery log — every send attempt with status, attempts, and a one-click
 * retry for FAILED rows. Combines an ad-hoc "Send test" form for ops.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconRefresh, IconSend } from '@tabler/icons-react';

import {
  listDeliveries, retryDelivery, sendNotification,
  type Channel, type DeliveryStatus, type NotificationDelivery, type SendBody,
} from 'src/api/smartpos/notifications';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const STATUS_COLOURS: Record<DeliveryStatus, { bg: string; fg: string }> = {
  PENDING: { bg: brand.warning.light, fg: brand.warning.dark },
  SENT:    { bg: brand.success.light, fg: brand.success.dark },
  FAILED:  { bg: brand.error.light,   fg: brand.error.dark },
};

export default function DeliveriesPage() {
  const [rows, setRows] = useState<NotificationDelivery[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<Channel | ''>('');
  const [status, setStatus]   = useState<DeliveryStatus | ''>('');
  const [recipient, setRecipient] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendBody, setSendBody] = useState<SendBody>({ channel: 'EMAIL', recipient: '', body: '' });
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      listDeliveries({
        channel: channel || undefined,
        status: status || undefined,
        recipient: recipient || undefined,
        page, size: 20,
      })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [channel, status, recipient, page, refreshToken]);

  const handleRetry = async (d: NotificationDelivery) => {
    try {
      await retryDelivery(d.id);
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    }
  };

  const handleSend = async () => {
    setSendError(null);
    try {
      await sendNotification(sendBody);
      setSendOpen(false);
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed');
    }
  };

  const cols: Column<NotificationDelivery>[] = [
    { key: 'channel', label: 'Channel',  render: (d) => <Chip label={d.channel} size="small" /> },
    { key: 'recipient', label: 'Recipient' },
    { key: 'templateCode', label: 'Template', render: (d) => d.templateCode ?? '—' },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (d) => {
        const c = STATUS_COLOURS[d.status];
        return <Chip label={d.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'attempts', label: 'Attempts', align: 'right' },
    {
      key: 'when', label: 'When',
      render: (d) => new Date(d.sentAt ?? d.createdAt).toLocaleString(),
    },
    {
      key: 'actions', label: '', align: 'right',
      render: (d) => (d.status === 'FAILED'
        ? <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRetry(d); }} title="Retry">
            <IconRefresh size={16} />
          </IconButton>
        : null),
    },
  ];

  return (
    <>
      <PageHeader
        title="Notification deliveries"
        subtitle="Recent email / SMS / WhatsApp send attempts"
        action={{
          label: 'Send notification',
          icon: <IconSend size={18} />,
          onClick: () => { setSendBody({ channel: 'EMAIL', recipient: '', body: '' }); setSendOpen(true); },
        }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          select size="small" label="Channel"
          value={channel} onChange={(e) => { setChannel(e.target.value as Channel | ''); setPage(0); }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {(['EMAIL','SMS','WHATSAPP'] as Channel[]).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="Status"
          value={status} onChange={(e) => { setStatus(e.target.value as DeliveryStatus | ''); setPage(0); }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {(['PENDING','SENT','FAILED'] as DeliveryStatus[]).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField
          size="small" label="Recipient contains"
          value={recipient} onChange={(e) => { setRecipient(e.target.value); setPage(0); }}
          sx={{ minWidth: 220 }}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(d) => d.id}
      />

      <Dialog open={sendOpen} onClose={() => setSendOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send notification</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {sendError && <Alert severity="error">{sendError}</Alert>}
            <Stack direction="row" spacing={2}>
              <TextField
                select size="small" label="Channel" value={sendBody.channel}
                onChange={(e) => setSendBody((b) => ({ ...b, channel: e.target.value as Channel }))}
                sx={{ minWidth: 140 }}
              >
                {(['EMAIL','SMS','WHATSAPP'] as Channel[]).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField
                size="small" label="Recipient" value={sendBody.recipient} fullWidth
                onChange={(e) => setSendBody((b) => ({ ...b, recipient: e.target.value }))}
                helperText="email, +E.164 phone, or whatsapp:+E.164"
              />
            </Stack>
            <TextField
              size="small" label="Template code (optional)" value={sendBody.templateCode ?? ''}
              onChange={(e) => setSendBody((b) => ({ ...b, templateCode: e.target.value || undefined }))}
            />
            <TextField
              size="small" label="Subject (email only)" value={sendBody.subject ?? ''}
              onChange={(e) => setSendBody((b) => ({ ...b, subject: e.target.value || undefined }))}
            />
            <TextField
              size="small" label="Body (overrides template if filled)" value={sendBody.body ?? ''}
              onChange={(e) => setSendBody((b) => ({ ...b, body: e.target.value || undefined }))}
              multiline minRows={3}
            />
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Either pick a template OR fill in body directly.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSend}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
