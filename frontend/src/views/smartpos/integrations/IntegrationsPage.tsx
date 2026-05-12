/**
 * Integrations admin — sync log + ZATCA QR generator + provider config.
 * Webhooks (incoming) are configured at the provider end; this page just
 * surfaces the audit log so ops can see what happened.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
  CircularProgress, InputAdornment,
} from '@mui/material';
import {
  IconCopy, IconQrcode, IconFileInvoice, IconShoppingCart, IconCalculator,
  IconSend, IconDeviceMobile,
} from '@tabler/icons-react';

import {
  generateZatcaQr, listSyncs,
  getIntegrationConfigs, updateProviderConfig,
  type IntegrationProvider, type IntegrationStatus, type IntegrationSync,
  type IntegrationConfig,
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

type PageTab = 'log' | 'zatca' | 'config';

export default function IntegrationsPage() {
  const [tab, setTab] = useState<PageTab>('log');
  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="ZATCA · WooCommerce · QuickBooks — sync log + tools"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="log"    label="Sync log" />
        <Tab value="zatca"  label="ZATCA QR" />
        <Tab value="config" label="Provider Config" />
      </Tabs>
      {tab === 'log'    && <SyncLogTab />}
      {tab === 'zatca'  && <ZatcaTab />}
      {tab === 'config' && <ProviderConfigTab />}
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

// ----------------------------------------------------------------
// Provider Config Tab

interface ProviderDef {
  provider: IntegrationProvider;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  configFields: { key: string; label: string; type?: string }[];
  description: string;
}

const PROVIDER_DEFS: ProviderDef[] = [
  {
    provider: 'ZATCA',
    label: 'TRA EFD (ZATCA)',
    icon: IconFileInvoice,
    configFields: [
      { key: 'vatNumber', label: 'VAT Number' },
      { key: 'sellerName', label: 'Seller Name' },
    ],
    description: 'Saudi Arabia ZATCA Phase-1 B2C e-invoicing. Generates TLV QR codes for receipts.',
  },
  {
    provider: 'WOOCOMMERCE',
    label: 'WooCommerce',
    icon: IconShoppingCart,
    configFields: [
      { key: 'siteUrl', label: 'Store URL' },
      { key: 'consumerKey', label: 'Consumer Key', type: 'password' },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password' },
    ],
    description: 'Sync products, orders, and inventory with your WooCommerce store.',
  },
  {
    provider: 'QUICKBOOKS',
    label: 'QuickBooks',
    icon: IconCalculator,
    configFields: [
      { key: 'companyId', label: 'Company ID' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
    ],
    description: 'Push invoices, payments, and financial data to QuickBooks Online.',
  },
];

interface InformationalProvider {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
  settingsLink: string;
}

const INFO_PROVIDERS: InformationalProvider[] = [
  {
    label: 'SMS Provider',
    icon: IconSend,
    description: 'SMS gateway configuration (Twilio, Africa\'s Talking, etc.) for transactional alerts and campaigns.',
    settingsLink: '/smartpos/settings/notifications',
  },
  {
    label: 'WhatsApp API',
    icon: IconDeviceMobile,
    description: 'WhatsApp Business API for customer messaging, order confirmations, and support.',
    settingsLink: '/smartpos/settings/notifications',
  },
];

function ProviderConfigTab() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIntegrationConfigs();
      setConfigs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>;
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        Configure integration providers per tenant. Enabled providers will appear in applicable
        workflows. SMS and WhatsApp are managed under Notification Settings.
      </Alert>

      {PROVIDER_DEFS.map((def) => (
        <ProviderCard
          key={def.provider}
          def={def}
          config={configs.find((c) => c.provider === def.provider)}
          saving={saving}
          onSaved={fetchConfigs}
          setSaving={(provider, v) => setSaving((s) => ({ ...s, [provider]: v }))}
        />
      ))}

      <Typography variant="subtitle1" sx={{ mt: 1 }}>
        Additional Providers (Notification Service)
      </Typography>

      {INFO_PROVIDERS.map((info) => (
        <Card key={info.label} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ color: brand.neutral[500] }}>
              <info.icon size={28} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>{info.label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {info.description}
              </Typography>
            </Box>
            <Chip label="Notification Settings" size="small" sx={{ bgcolor: brand.neutral[100], color: brand.neutral[600] }} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

// ----------------------------------------------------------------
// Single provider card

function ProviderCard({
  def,
  config,
  saving,
  onSaved,
  setSaving,
}: {
  def: ProviderDef;
  config?: IntegrationConfig;
  saving: Record<string, boolean>;
  onSaved: () => void;
  setSaving: (provider: string, v: boolean) => void;
}) {
  const isEnabled = config?.enabled ?? false;
  const parsedConfig = (() => {
    try { return config ? JSON.parse(config.config) : {}; }
    catch { return {}; }
  })();

  const [formFields, setFormFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of def.configFields) {
      init[f.key] = parsedConfig[f.key] ?? '';
    }
    return init;
  });

  const [localEnabled, setLocalEnabled] = useState(isEnabled);
  const [cardError, setCardError] = useState<string | null>(null);
  const isChanged = localEnabled !== isEnabled ||
    def.configFields.some((f) => formFields[f.key] !== (parsedConfig[f.key] ?? ''));
  const isBusy = saving[def.provider] ?? false;

  const statusLabel = config
    ? (isEnabled ? 'Configured' : 'Disabled')
    : 'Not configured';

  const statusColor = config
    ? (isEnabled ? brand.success.dark : brand.warning.dark)
    : brand.neutral[500];

  const handleSave = async () => {
    setCardError(null);
    setSaving(def.provider, true);
    try {
      const configObj: Record<string, unknown> = {};
      for (const f of def.configFields) {
        if (formFields[f.key]) {
          configObj[f.key] = formFields[f.key];
        }
      }
      await updateProviderConfig(def.provider, {
        enabled: localEnabled,
        config: Object.keys(configObj).length > 0 ? configObj : undefined,
      });
      onSaved();
    } catch (e) {
      setCardError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(def.provider, false);
    }
  };

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ color: (PROVIDER_COLOURS[def.provider]?.fg) ?? brand.primary[600] }}>
          <def.icon size={28} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>{def.label}</Typography>
          <Typography variant="body2" color="text.secondary">{def.description}</Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Chip
            label={config ? statusLabel : 'Not Configured'}
            size="small"
            sx={{ bgcolor: statusColor, color: '#fff', fontWeight: 600 }}
          />
          <Switch
            checked={localEnabled}
            onChange={(_, v) => setLocalEnabled(v)}
          />
        </Stack>
      </Stack>

      {cardError && <Alert severity="error" sx={{ mb: 1.5 }}>{cardError}</Alert>}

      <Stack spacing={1.5} sx={{ ml: 5 }}>
        {def.configFields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            type={field.type ?? 'text'}
            size="small"
            fullWidth
            value={formFields[field.key]}
            onChange={(e) => setFormFields((s) => ({ ...s, [field.key]: e.target.value }))}
            disabled={!localEnabled}
            InputProps={
              field.type === 'password'
                ? { endAdornment: <InputAdornment position="end">••••</InputAdornment> }
                : undefined
            }
          />
        ))}
      </Stack>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={!isChanged || isBusy}
        >
          {isBusy ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
    </Card>
  );
}
