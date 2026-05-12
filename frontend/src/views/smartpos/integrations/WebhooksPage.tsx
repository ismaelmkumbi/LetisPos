/**
 * Webhooks — manage outgoing webhook subscriptions for real-time event delivery.
 * The generic webhook dispatch system is planned; this page uses mock data
 * and is structured to swap in real API calls when the backend is ready.
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconPlus,
  IconTrash,
  IconWebhook,
  IconCopy,
} from '@tabler/icons-react';

import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

/* ------------------------------------------------------------------ */

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastDelivery: string | null;
  lastStatus: 'OK' | 'FAILED' | null;
}

const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: 'wh-001',
    url: 'https://example.com/api/pos-events',
    events: ['sale.created', 'sale.updated', 'payment.received'],
    secret: 'whsec_XXXXXXXXXXXXXXXXXXXXXXXXXX',
    status: 'ACTIVE',
    lastDelivery: '2026-05-12T08:15:00Z',
    lastStatus: 'OK',
  },
  {
    id: 'wh-002',
    url: 'https://partner.tz/api/inventory-sync',
    events: ['product.created', 'product.updated', 'stock.adjusted'],
    secret: 'whsec_YYYYYYYYYYYYYYYYYYYYYYYYYY',
    status: 'ACTIVE',
    lastDelivery: '2026-05-12T07:30:00Z',
    lastStatus: 'FAILED',
  },
];

const AVAILABLE_EVENTS = [
  'sale.created',
  'sale.updated',
  'sale.voided',
  'payment.received',
  'product.created',
  'product.updated',
  'product.deleted',
  'stock.adjusted',
  'stock.transferred',
  'customer.created',
  'customer.updated',
  'purchase.created',
  'purchase.received',
];

/* ------------------------------------------------------------------ */

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);

  const emptyForm = () => ({ url: '', events: [] as string[], secret: '' });
  const [form, setForm] = useState(emptyForm());

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev)
        ? f.events.filter((e) => e !== ev)
        : [...f.events, ev],
    }));
  };

  const handleAdd = async () => {
    if (!form.url.trim()) {
      setDialogError('URL is required.');
      return;
    }
    if (form.events.length === 0) {
      setDialogError('Select at least one event.');
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      // TODO: POST /api/v1/integrations/webhooks when backend is built
      await new Promise((r) => setTimeout(r, 300));
      const newWebhook: Webhook = {
        id: `wh-${Date.now()}`,
        url: form.url.trim(),
        events: [...form.events].sort(),
        secret: form.secret.trim() || `whsec_${Math.random().toString(36).slice(2)}`,
        status: 'ACTIVE',
        lastDelivery: null,
        lastStatus: null,
      };
      setWebhooks((w) => [newWebhook, ...w]);
      setForm(emptyForm());
      setDialogOpen(false);
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Failed to create webhook');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // TODO: DELETE /api/v1/integrations/webhooks/{id}
    setWebhooks((w) => w.filter((wh) => wh.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const statusColour = (status: 'OK' | 'FAILED' | null) => {
    if (status === 'OK') return { bg: brand.success.light, fg: brand.success.dark };
    if (status === 'FAILED') return { bg: brand.error.light, fg: brand.error.dark };
    return { bg: brand.neutral[100], fg: brand.neutral[500] };
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  return (
    <Box>
      <PageHeader
        title="Webhooks"
        subtitle="Manage outgoing webhook subscriptions for real-time event delivery"
        actions={[
          {
            label: 'Add Webhook',
            icon: <IconPlus size={18} />,
            onClick: () => {
              setForm(emptyForm());
              setDialogError(null);
              setDialogOpen(true);
            },
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        Webhooks allow external services to receive real-time notifications when
        events happen in your POS. Once configured, events will be delivered as
        JSON payloads to the specified endpoint URL.
      </Alert>

      {webhooks.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <IconWebhook size={48} style={{ color: brand.neutral[300], marginBottom: 16 }} />
          <Typography color="text.secondary">
            No webhooks configured yet. Add one to start receiving events.
          </Typography>
        </Box>
      )}

      <Stack spacing={2}>
        {webhooks.map((wh) => {
          const sc = statusColour(wh.lastStatus);
          return (
            <Stack
              key={wh.id}
              direction="row"
              alignItems="flex-start"
              spacing={2}
              sx={{
                p: 2,
                border: `1px solid ${brand.neutral[200]}`,
                borderRadius: '12px',
                '&:hover': { borderColor: brand.primary[300] },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  bgcolor: brand.primary[50],
                  color: brand.primary[700],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <IconWebhook size={18} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }} noWrap>
                    {wh.url}
                  </Typography>
                  <Tooltip title="Copy URL">
                    <IconButton size="small" onClick={() => navigator.clipboard?.writeText(wh.url)}>
                      <IconCopy size={14} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                  {wh.events.map((ev) => (
                    <Chip
                      key={ev}
                      label={ev}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: brand.neutral[100],
                        color: brand.neutral[700],
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Typography variant="caption" color="text.secondary">
                    Last delivery: {formatDate(wh.lastDelivery)}
                  </Typography>
                  {wh.lastStatus && (
                    <Chip
                      label={wh.lastStatus}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: sc.bg,
                        color: sc.fg,
                      }}
                    />
                  )}
                </Stack>
              </Box>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label={wh.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: wh.status === 'ACTIVE' ? brand.success.light : brand.neutral[100],
                    color: wh.status === 'ACTIVE' ? brand.success.dark : brand.neutral[600],
                  }}
                />
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(wh)}
                    sx={{ color: brand.neutral[400], '&:hover': { color: brand.error.main } }}
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      {/* Add Webhook Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          Add Webhook
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          <Stack spacing={2.5}>
            <TextField
              label="Endpoint URL"
              required
              fullWidth
              size="small"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com/webhooks/pos"
              helperText="HTTPS endpoint that will receive POST requests"
            />
            <TextField
              label="Webhook Secret"
              fullWidth
              size="small"
              value={form.secret}
              onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
              placeholder="whsec_..."
              helperText="Used to sign payloads; leave blank to auto-generate"
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Event Types
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Select the events that should trigger this webhook.
              </Typography>
              <FormGroup sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {AVAILABLE_EVENTS.map((ev) => (
                  <FormControlLabel
                    key={ev}
                    control={
                      <Checkbox
                        size="small"
                        checked={form.events.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                      />
                    }
                    label={<Typography variant="body2">{ev}</Typography>}
                  />
                ))}
              </FormGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAdd} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Webhook'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete webhook?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            The webhook to <strong>{deleteTarget?.url}</strong> will be permanently
            removed. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
