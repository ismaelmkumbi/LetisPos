/**
 * Notification templates — manage email/SMS/WhatsApp message bodies.
 * Stocky parity: per-(code, channel) defaults, {{placeholder}} substitution.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';

import {
  listTemplates, deleteTemplate,
  type Channel, type NotificationTemplate,
} from 'src/api/smartpos/notifications';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import TemplateEditDrawer from './TemplateEditDrawer';
import { brand } from 'src/theme/smartpos/brand';

const CHANNEL_COLOURS: Record<Channel, { bg: string; fg: string }> = {
  EMAIL:    { bg: brand.primary[50], fg: brand.primary[700] },
  SMS:      { bg: brand.info.light,  fg: brand.info.dark },
  WHATSAPP: { bg: brand.success.light, fg: brand.success.dark },
};

export default function TemplatesListPage() {
  const [rows, setRows] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel | ''>('');
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTemplates(undefined, channel || undefined)
      .then((items) => !cancelled && setRows(items))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [channel, refreshToken]);

  const cols: Column<NotificationTemplate>[] = [
    {
      key: 'code', label: 'Code',
      render: (t) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {t.code}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
            {t.name}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'channel', label: 'Channel', align: 'center',
      render: (t) => {
        const c = CHANNEL_COLOURS[t.channel];
        return <Chip label={t.channel} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
    { key: 'subject', label: 'Subject', render: (t) => t.subject ?? '—' },
    {
      key: 'isDefault', label: 'Default', align: 'center',
      render: (t) => t.isDefault
        ? <Chip label="Default" size="small" sx={{ bgcolor: brand.accent[50], color: brand.accent[700] }} />
        : '',
    },
    {
      key: 'enabled', label: 'Enabled', align: 'center',
      render: (t) => t.enabled
        ? <Chip label="On" size="small" sx={{ bgcolor: brand.success.light, color: brand.success.dark }} />
        : <Chip label="Off" size="small" sx={{ bgcolor: brand.neutral[100], color: brand.neutral[500] }} />,
    },
  ];

  const handleDelete = async (t: NotificationTemplate) => {
    if (!window.confirm(`Delete template ${t.code}?`)) return;
    try {
      await deleteTemplate(t.id);
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <>
      <PageHeader
        title="Notification templates"
        subtitle="Email / SMS / WhatsApp messages used by Sales, Quotations, Returns…"
        action={{
          label: 'New template',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          select size="small" label="Channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel | '')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {(['EMAIL','SMS','WHATSAPP'] as Channel[]).map((c) =>
            <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        onRowClick={(t) => { setEditing(t); setDrawerOpen(true); }}
        getRowKey={(t) => t.id}
        emptyText="No templates yet"
      />

      {/* Quick delete from row context — handled by drawer; keep this exported for tests */}
      <TemplateEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
        onDelete={editing ? () => handleDelete(editing) : undefined}
      />
    </>
  );
}
