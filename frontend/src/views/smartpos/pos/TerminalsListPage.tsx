/**
 * Registered POS terminals — admin page.
 * "Pairing token" is the 12-char code shown on the customer display screen
 * for an operator to enter when first wiring up a till.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { IconCopy, IconPlus, IconRefresh } from '@tabler/icons-react';

import {
  createTerminal, listTerminals, rotateToken,
  type PosTerminal,
} from 'src/api/smartpos/posTerminals';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import type { UUID } from 'src/api/smartpos/types';

export default function TerminalsListPage() {
  const [rows, setRows] = useState<PosTerminal[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; code: string; warehouseId: UUID | ''; notes: string }>({
    name: '', code: '', warehouseId: '', notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listTerminals(), listWarehouses()])
      .then(([t, w]) => { if (!cancelled) { setRows(t); setWarehouses(w); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [refreshToken]);

  const whName = (id: UUID) => warehouses.find((w) => w.id === id)?.name ?? id.slice(0, 8) + '…';

  const cols: Column<PosTerminal>[] = [
    {
      key: 'name', label: 'Terminal',
      render: (t) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.name}</Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}>
            {t.code}
          </Typography>
        </Stack>
      ),
    },
    { key: 'warehouseId', label: 'Warehouse', render: (t) => whName(t.warehouseId) },
    {
      key: 'pairingToken', label: 'Pairing token', align: 'center',
      render: (t) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
          <Typography variant="body2" sx={{
            fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1,
            bgcolor: brand.accent[50], color: brand.accent[700], px: 1, py: 0.25, borderRadius: 1,
          }}>
            {t.pairingToken}
          </Typography>
          <Tooltip title="Copy">
            <IconButton size="small" onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(t.pairingToken);
            }}>
              <IconCopy size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rotate token">
            <IconButton size="small" onClick={async (e) => {
              e.stopPropagation();
              try { await rotateToken(t.id); setRefreshToken((x) => x + 1); }
              catch (err) { setError(err instanceof Error ? err.message : 'Rotate failed'); }
            }}>
              <IconRefresh size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
    { key: 'lastSeenAt', label: 'Last seen', render: (t) => t.lastSeenAt ? new Date(t.lastSeenAt).toLocaleString() : '—' },
    {
      key: 'active', label: 'Status', align: 'center',
      render: (t) => t.active
        ? <Chip label="Active" size="small" sx={{ bgcolor: brand.success.light, color: brand.success.dark, fontWeight: 600 }} />
        : <Chip label="Off"    size="small" sx={{ bgcolor: brand.neutral[100], color: brand.neutral[500] }} />,
    },
    {
      key: 'open', label: '', align: 'right',
      render: (t) => (
        <Button size="small" variant="outlined" component="a"
          href={`/smartpos/pos/display/${t.id}`} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}>
          Open display
        </Button>
      ),
    },
  ];

  const handleCreate = async () => {
    if (!form.name || !form.code || !form.warehouseId) {
      setError('Name, code and warehouse are required.');
      return;
    }
    try {
      await createTerminal({
        name: form.name, code: form.code,
        warehouseId: form.warehouseId as UUID,
        notes: form.notes || undefined,
      });
      setOpen(false);
      setForm({ name: '', code: '', warehouseId: '', notes: '' });
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  return (
    <>
      <PageHeader
        title="POS terminals"
        subtitle="Register tills and pair customer-display screens"
        action={{ label: 'New terminal', icon: <IconPlus size={18} />, onClick: () => setOpen(true) }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable columns={cols} rows={rows} loading={loading} getRowKey={(t) => t.id} />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New POS terminal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Display name" size="small" value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <TextField label="Code" size="small" value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              helperText="Short code shown on the till (e.g. TILL-01)" />
            <TextField select size="small" label="Warehouse" value={form.warehouseId}
              onChange={(e) => setForm((s) => ({ ...s, warehouseId: e.target.value as UUID }))}
              SelectProps={{ native: true }}>
              <option value="">—</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </TextField>
            <TextField label="Notes" size="small" multiline minRows={2} value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
