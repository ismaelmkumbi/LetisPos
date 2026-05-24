import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
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
  IconDeviceFloppy,
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

export default function PlatformSettingsPage() {
  const [services, setServices] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Modal state
  const [selected, setSelected] = useState<ServiceGroup | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await listServices());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  const openModal = (svc: ServiceGroup) => {
    setSelected(svc);
    setEdits({});
    setRevealed(new Set());
    setModalError(null);
    setSaved(false);
  };

  const closeModal = () => setSelected(null);

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
    setModalError(null);
    try {
      const result = await updatePlatformSettings(entries);
      setEdits({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Update local state so table reflects changes without full reload
      if (selected) {
        const updated = { ...selected, settings: selected.settings.map((s) => {
          const newVal = result[s.key];
          if (newVal !== undefined) return { ...s, value: newVal };
          return s;
        })};
        setSelected(updated);
        setServices((prev) => prev.map((s) => s.serviceKey === updated.serviceKey ? updated : s));
      }
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const dirtyCount = Object.keys(edits).length;

  const columns: Column<ServiceGroup>[] = [
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
      width: 130,
      align: 'center',
      sortable: false,
      exportValue: (r) => `${configuredCount(r)}/${r.settings.length} configured`,
      render: (r) => {
        const n = configuredCount(r);
        const total = r.settings.length;
        return (
          <Chip
            size="small"
            label={n === total ? 'Configured' : n > 0 ? `${n}/${total}` : 'Not set'}
            sx={{
              height: 22, fontWeight: 700, fontSize: '0.6875rem',
              bgcolor: n === total ? brand.success.light : n > 0 ? brand.warning.light : brand.neutral[100],
              color: n === total ? brand.success.dark : n > 0 ? brand.warning.dark : brand.neutral[500],
            }}
          />
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      width: 120,
      sortable: true,
      exportValue: (r) => r.category,
      render: (r) => (
        <Chip
          size="small" label={r.category.toUpperCase()}
          sx={{ height: 20, fontWeight: 600, fontSize: '0.625rem', bgcolor: brand.neutral[100], color: brand.neutral[600], textTransform: 'uppercase' }}
        />
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Platform Settings"
        subtitle="Manage external service keys — click a service to edit its configuration"
        actions={[
          {
            label: 'Refresh',
            icon: <IconRefresh size={17} />,
            onClick: () => setRefreshToken((n) => n + 1),
            variant: 'ghost',
          },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={services}
        loading={loading}
        emptyText="No platform settings found. Run the V17 migration."
        emptyIcon={<IconSettings size={32} />}
        getRowKey={(r) => r.serviceKey}
        tableKey="platform-services"
        toolbarTitle={services.length > 0 ? `${services.length} services` : undefined}
        onRowClick={openModal}
        enableSorting
        enableExport
        exportFileName={`platform-settings-${new Date().toISOString().slice(0, 10)}`}
      />

      {/* ── Edit Modal ── */}
      <Dialog
        open={!!selected}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        {selected && (
          <>
            <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: brand.primary[600], display: 'flex' }}>{serviceIcon(selected.serviceIcon)}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    {selected.serviceName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                    {selected.settings.length} configuration{selected.settings.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                {configuredCount(selected) === selected.settings.length && (
                  <Chip label="Active" size="small" sx={{ bgcolor: brand.success.light, color: brand.success.dark, fontWeight: 700 }} />
                )}
              </Stack>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
              {modalError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setModalError(null)}>{modalError}</Alert>}
              {saved && <Alert severity="success" sx={{ mb: 2 }}>Settings saved. Services pick up changes on next restart.</Alert>}

              <Stack spacing={2}>
                {selected.settings.map((s) => {
                  const editedValue = edits[s.key] !== undefined ? edits[s.key] : null;
                  const isRevealed = revealed.has(s.key);
                  const displayValue = editedValue ?? s.value ?? '';

                  return (
                    <Box key={s.key}>
                      <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>
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
                              <IconButton size="small" onClick={() => setRevealed((prev) => {
                                const next = new Set(prev);
                                next.has(s.key) ? next.delete(s.key) : next.add(s.key);
                                return next;
                              })}>
                                {isRevealed ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                          sx: { borderRadius: '10px', fontSize: '0.8125rem' },
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: editedValue !== null ? brand.primary[50] : '#fff',
                            borderColor: editedValue !== null ? brand.primary[300] : undefined,
                          },
                        }}
                      />
                      {editedValue !== null && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                          <IconCheck size={12} color={brand.success.main} />
                          <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>Modified</Typography>
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              <Button onClick={closeModal} disabled={saving} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || dirtyCount === 0}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={16} />}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 2.5 }}
              >
                {saving ? 'Saving...' : dirtyCount ? `Save ${dirtyCount} change${dirtyCount > 1 ? 's' : ''}` : 'Saved'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
