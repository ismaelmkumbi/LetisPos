/**
 * Integrations admin — sync log + ZATCA QR generator + manual push helpers.
 * Webhooks (incoming) are configured at the provider end; this page just
 * surfaces the audit log so ops can see what happened.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { IconCopy, IconQrcode } from '@tabler/icons-react';

import {
  generateZatcaQr, listSyncs,
  type IntegrationProvider, type IntegrationStatus, type IntegrationSync,
} from 'src/api/smartpos/integrations';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import type { UUID } from 'src/api/smartpos/types';

const STATUS_COLOURS: Record<IntegrationStatus, { bg: string; fg: string }> = {
  PENDING: { bg: brand.warning.light, fg: brand.warning.dark },
  OK:      { bg: brand.success.light, fg: brand.success.dark },
  FAILED:  { bg: brand.error.light,   fg: brand.error.dark },
};

const PROVIDER_COLOURS: Record<IntegrationProvider, { bg: string; fg: string }> = {
  ZATCA:       { bg: brand.accent[50], fg: brand.accent[700] },
  WOOCOMMERCE: { bg: brand.primary[50], fg: brand.primary[700] },
  QUICKBOOKS:  { bg: brand.info.light,  fg: brand.info.dark },
};

export default function IntegrationsPage() {
  const [tab, setTab] = useState<'log' | 'zatca'>('log');
  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="ZATCA · WooCommerce · QuickBooks — sync log + tools"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="log"   label="Sync log" />
        <Tab value="zatca" label="ZATCA QR" />
      </Tabs>
      {tab === 'log'   && <SyncLogTab />}
      {tab === 'zatca' && <ZatcaTab />}
    </>
  );
}

// ----------------------------------------------------------------

function SyncLogTab() {
  const [rows, setRows] = useState<IntegrationSync[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<IntegrationProvider | ''>('');
  const [status, setStatus]     = useState<IntegrationStatus | ''>('');
  const [open, setOpen] = useState<IntegrationSync | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSyncs({ provider: provider || undefined, status: status || undefined, page, size: 20 })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [provider, status, page]);

  const cols: Column<IntegrationSync>[] = [
    {
      key: 'provider', label: 'Provider', align: 'center',
      render: (s) => {
        const c = PROVIDER_COLOURS[s.provider];
        return <Chip label={s.provider} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'direction', label: 'Dir', align: 'center', render: (s) => <Chip label={s.direction} size="small" /> },
    { key: 'entityType', label: 'Entity',
      render: (s) => `${s.entityType}${s.entityId ? ` · ${s.entityId.slice(0, 8)}…` : ''}` },
    { key: 'externalId', label: 'External id', render: (s) => s.externalId ?? '—' },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (s) => {
        const c = STATUS_COLOURS[s.status];
        return <Chip label={s.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'attempts', label: 'Att', align: 'right' },
    { key: 'when', label: 'When', render: (s) => new Date(s.completedAt ?? s.createdAt).toLocaleString() },
  ];

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Provider" value={provider}
          onChange={(e) => { setProvider(e.target.value as IntegrationProvider | ''); setPage(0); }}
          sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {(['ZATCA','WOOCOMMERCE','QUICKBOOKS'] as IntegrationProvider[]).map((p) =>
            <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value as IntegrationStatus | ''); setPage(0); }}
          sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          {(['PENDING','OK','FAILED'] as IntegrationStatus[]).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(s) => setOpen(s)}
        getRowKey={(s) => s.id}
      />

      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle>Sync detail</DialogTitle>
        <DialogContent>
          {open && (
            <Stack spacing={1.5}>
              <Typography variant="caption">Created: {new Date(open.createdAt).toLocaleString()}</Typography>
              {open.errorMessage && <Alert severity="error">{open.errorMessage}</Alert>}
              <Typography variant="subtitle2">Request</Typography>
              <Card variant="outlined" sx={{ p: 1, bgcolor: brand.neutral[50] }}>
                <pre style={{ margin: 0, fontSize: 12, overflowX: 'auto' }}>{open.requestBody ?? '—'}</pre>
              </Card>
              <Typography variant="subtitle2">Response</Typography>
              <Card variant="outlined" sx={{ p: 1, bgcolor: brand.neutral[50] }}>
                <pre style={{ margin: 0, fontSize: 12, overflowX: 'auto' }}>{open.responseBody ?? '—'}</pre>
              </Card>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------

function ZatcaTab() {
  const [form, setForm] = useState({
    saleId: '' as UUID | '',
    invoiceTimestampIso: new Date().toISOString(),
    invoiceTotal: '',
    vatTotal: '',
  });
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.saleId || !form.invoiceTotal || !form.vatTotal) {
      setError('Sale id, invoice total and VAT total are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await generateZatcaQr({
        saleId: form.saleId as UUID,
        invoiceTimestampIso: form.invoiceTimestampIso,
        invoiceTotal: form.invoiceTotal,
        vatTotal: form.vatTotal,
      });
      setQr(r.qr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'QR generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        ZATCA Phase-1 (B2C simplified). Generates a base64 TLV QR payload from
        seller name, VAT number, timestamp, totals — print on the receipt.
      </Alert>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={2}>
        <TextField label="Sale id" required size="small" fullWidth value={form.saleId}
          onChange={(e) => setForm((s) => ({ ...s, saleId: e.target.value as UUID }))} />
        <TextField label="Invoice timestamp (ISO)" required size="small" sx={{ minWidth: 220 }}
          value={form.invoiceTimestampIso}
          onChange={(e) => setForm((s) => ({ ...s, invoiceTimestampIso: e.target.value }))} />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField label="Invoice total (with VAT)" required size="small" fullWidth value={form.invoiceTotal}
          onChange={(e) => setForm((s) => ({ ...s, invoiceTotal: e.target.value }))} />
        <TextField label="VAT total" required size="small" fullWidth value={form.vatTotal}
          onChange={(e) => setForm((s) => ({ ...s, vatTotal: e.target.value }))} />
      </Stack>
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" startIcon={<IconQrcode size={16} />} onClick={handleGenerate} disabled={busy}
          sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
          {busy ? 'Generating…' : 'Generate QR payload'}
        </Button>
      </Stack>

      {qr && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">QR payload (base64 TLV)</Typography>
            <Tooltip title="Copy">
              <IconButton size="small" onClick={() => navigator.clipboard?.writeText(qr)}>
                <IconCopy size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Box sx={{ mt: 1, p: 1.5, bgcolor: brand.neutral[50], borderRadius: 1, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
            {qr}
          </Box>
        </Card>
      )}
    </Stack>
  );
}
