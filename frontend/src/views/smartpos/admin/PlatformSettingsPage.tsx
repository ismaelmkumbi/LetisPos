import { useCallback, useEffect, useMemo, useState } from 'react';
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
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconBrain,
  IconCash,
  IconCheck,
  IconCreditCard,
  IconEye,
  IconEyeOff,
  IconMail,
  IconMessage,
  IconRefresh,
  IconSettings,
} from '@tabler/icons-react';

import {
  listServices,
  updatePlatformSettings,
  type ServiceGroup,
  type UpdateEntry,
} from 'src/api/smartpos/platformSettings';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { EditDrawer } from 'src/components/smartpos/EditDrawer';
import { StatusIndicator, type OperationalState } from 'src/components/smartpos/StatusIndicator';
import { brand } from 'src/theme/smartpos/brand';

const ICON_MAP: Record<string, React.ReactNode> = {
  brain: <IconBrain size={18} />,
  mail: <IconMail size={18} />,
  message: <IconMessage size={18} />,
  'credit-card': <IconCreditCard size={18} />,
  cash: <IconCash size={18} />,
};

function serviceIcon(icon: string) {
  return ICON_MAP[icon] ?? <IconSettings size={18} />;
}

function configuredCount(svc: ServiceGroup): number {
  return svc.settings.filter((s) => s.value && s.value !== '****').length;
}

function serviceStatus(svc: ServiceGroup): OperationalState {
  const n = configuredCount(svc);
  if (n === svc.settings.length) return 'active';
  if (n > 0) return 'attention';
  return 'idle';
}

export default function PlatformSettingsPage() {
  const [services, setServices] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Drawer state
  const [selected, setSelected] = useState<ServiceGroup | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Discard confirmation
  const [discardOpen, setDiscardOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await listServices());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  const dirtyCount = Object.keys(edits).length;

  // ── Drawer handlers ──

  const openDrawer = (svc: ServiceGroup) => {
    setSelected(svc);
    setEdits({});
    setRevealed(new Set());
    setDrawerError(null);
    setSaved(false);
  };

  const requestClose = () => {
    if (dirtyCount > 0) {
      setDiscardOpen(true);
    } else {
      setSelected(null);
    }
  };

  const confirmDiscard = () => {
    setDiscardOpen(false);
    setSelected(null);
  };

  const setEdit = (key: string, current: string | null, value: string) => {
    if (value === (current ?? '')) {
      setEdits((prev) => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      setEdits((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    const entries: UpdateEntry[] = Object.entries(edits).map(([k, v]) => ({ key: k, value: v }));
    if (entries.length === 0) return;
    setSaving(true);
    setDrawerError(null);
    try {
      const result = await updatePlatformSettings(entries);
      setEdits({});
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      if (selected) {
        const updated: ServiceGroup = {
          ...selected,
          settings: selected.settings.map((s) => {
            const newVal = result[s.key];
            if (newVal !== undefined) return { ...s, value: newVal };
            return s;
          }),
        };
        setSelected(updated);
        setServices((prev) =>
          prev.map((s) => (s.serviceKey === updated.serviceKey ? updated : s)),
        );
      }
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setDrawerError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ──

  const columns: Column<ServiceGroup>[] = useMemo(() => [
    {
      key: 'service',
      label: 'Service',
      sortable: true,
      exportValue: (r) => r.serviceName,
      render: (r) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36, height: 36, borderRadius: '10px',
              bgcolor: brand.primary[50], color: brand.primary[600],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {serviceIcon(r.serviceIcon)}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
              {r.serviceName}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              {r.settings.length} setting{r.settings.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 150,
      align: 'center',
      render: (r) => {
        const state = serviceStatus(r);
        const label = state === 'active' ? 'Configured'
          : state === 'attention' ? `${configuredCount(r)}/${r.settings.length} set`
          : 'Not configured';
        return <StatusIndicator state={state} label={label} size="sm" />;
      },
      exportValue: (r) => {
        const state = serviceStatus(r);
        return state === 'active' ? 'Configured' : state === 'attention' ? 'Partial' : 'Not set';
      },
    },
    {
      key: 'category',
      label: 'Category',
      width: 110,
      sortable: true,
      exportValue: (r) => r.category,
      render: (r) => (
        <Chip
          size="small" label={r.category.toUpperCase()}
          sx={{ height: 20, fontWeight: 600, fontSize: '0.625rem', bgcolor: brand.neutral[100], color: brand.neutral[600] }}
        />
      ),
    },
  ], []);

  // ── Render ──

  return (
    <Box>
      <PageHeader
        title="Platform Settings"
        subtitle="Manage external service API keys and provider configuration"
        actions={[
          {
            label: 'Refresh',
            icon: <IconRefresh size={17} />,
            onClick: () => setRefreshToken((n) => n + 1),
            variant: 'ghost',
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={services}
        loading={loading}
        emptyText="No platform settings found"
        emptyIcon={<IconSettings size={32} />}
        getRowKey={(r) => r.serviceKey}
        tableKey="platform-services"
        itemLabel="services"
        toolbarTitle={services.length > 0 ? `${services.length} service${services.length !== 1 ? 's' : ''}` : undefined}
        onRowClick={openDrawer}
        enableSorting
        enableExport
        exportFileName={`platform-settings-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          services.length === 0 && !loading
            ? { label: 'Refresh', onClick: () => setRefreshToken((n) => n + 1) }
            : undefined
        }
      />

      {/* ── Edit Drawer ── */}
      <EditDrawer
        open={!!selected}
        title={selected?.serviceName ?? ''}
        subtitle={selected ? `${selected.settings.length} configuration${selected.settings.length !== 1 ? 's' : ''}` : undefined}
        onClose={requestClose}
        onSubmit={handleSave}
        submitting={saving}
        submitLabel={dirtyCount ? `Save ${dirtyCount} change${dirtyCount > 1 ? 's' : ''}` : 'Saved'}
        disabled={dirtyCount === 0}
        statusIndicator={selected ? { state: serviceStatus(selected), label: serviceStatus(selected) === 'active' ? 'Configured' : 'Incomplete' } : undefined}
        size="md"
      >
        {selected && (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {drawerError && (
              <Alert severity="error" onClose={() => setDrawerError(null)}>{drawerError}</Alert>
            )}
            {saved && (
              <Alert severity="success">Settings saved. Services pick up changes on next restart.</Alert>
            )}

            {selected.settings.map((s) => {
              const editedValue = edits[s.key] !== undefined ? edits[s.key] : null;
              const isRevealed = revealed.has(s.key);
              const displayValue = editedValue ?? s.value ?? '';

              return (
                <Box key={s.key}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: brand.neutral[500], fontWeight: 700, fontSize: '0.7rem',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      display: 'block', mb: 0.5,
                    }}
                  >
                    {s.label}
                  </Typography>
                  {s.description && (
                    <Typography variant="caption" sx={{ color: brand.neutral[400], display: 'block', mb: 0.5 }}>
                      {s.description}
                    </Typography>
                  )}
                  <TextField
                    size="small"
                    fullWidth
                    type={s.encrypted && !isRevealed && !editedValue ? 'password' : 'text'}
                    value={editedValue ?? (s.encrypted && s.value === '****' && !isRevealed ? '****' : displayValue)}
                    onChange={(e) => setEdit(s.key, s.value, e.target.value)}
                    InputProps={{
                      endAdornment: s.encrypted ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setRevealed((prev) => {
                              const next = new Set(prev);
                              next.has(s.key) ? next.delete(s.key) : next.add(s.key);
                              return next;
                            })}
                          >
                            {isRevealed ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                      sx: { borderRadius: '10px', fontSize: '0.8125rem' },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        bgcolor: editedValue !== null ? brand.primary[50] : 'transparent',
                        borderColor: editedValue !== null ? brand.primary[300] : undefined,
                        transition: 'all 0.15s ease',
                      },
                    }}
                  />
                  {editedValue !== null && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                      <IconCheck size={12} color={brand.success.main} />
                      <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>
                        Modified
                      </Typography>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </EditDrawer>

      {/* ── Discard confirmation ── */}
      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Discard changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have {dirtyCount} unsaved change{dirtyCount > 1 ? 's' : ''}. Closing will discard them.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDiscardOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Keep editing
          </Button>
          <Button onClick={confirmDiscard} color="error" variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
