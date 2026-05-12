import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconDatabase,
  IconTrash,
  IconHistory,
  IconEdit,
} from '@tabler/icons-react';

import {
  getRetentionConfig,
  updateRetentionConfig,
  getPurgeHistory,
  manualPurge,
  type PurgeHistoryEntry,
} from 'src/api/smartpos/audit';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

interface EntityRule {
  key: string;
  label: string;
  months: number;
  min: number;
  max: number;
  description: string;
}

const DEFAULT_RULES: EntityRule[] = [
  { key: 'audit_events', label: 'Audit Events', months: 12, min: 3, max: 36, description: 'Security audit log entries' },
  { key: 'error_logs', label: 'Error Logs', months: 6, min: 1, max: 24, description: 'Application error and warning logs' },
  { key: 'revoked_sessions', label: 'Revoked Sessions', months: 3, min: 1, max: 12, description: 'Revoked user session records' },
];

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DataRetentionPage() {
  const [rules, setRules] = useState<EntityRule[]>(DEFAULT_RULES);
  const [history, setHistory] = useState<PurgeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState<EntityRule | null>(null);
  const [editValue, setEditValue] = useState(12);

  // Purge confirmation
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeRule, setPurgeRule] = useState<EntityRule | null>(null);
  const [purging, setPurging] = useState(false);

  // History expanded
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, hist] = await Promise.all([
        getRetentionConfig(),
        getPurgeHistory(),
      ]);
      setHistory(hist);

      // Parse config JSON and merge into rules
      try {
        const parsed: Record<string, number> = JSON.parse(cfg.config);
        setRules((prev) =>
          prev.map((r) => ({
            ...r,
            months: parsed[r.key] ?? r.months,
          })),
        );
      } catch {
        // keep defaults
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data retention settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditOpen = useCallback((rule: EntityRule) => {
    setEditRule(rule);
    setEditValue(rule.months);
    setEditOpen(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editRule) return;
    const updated: Record<string, number> = {};
    for (const r of rules) {
      updated[r.key] = r.key === editRule.key ? editValue : r.months;
    }
    try {
      await updateRetentionConfig(updated);
      setRules((prev) =>
        prev.map((r) => (r.key === editRule.key ? { ...r, months: editValue } : r)),
      );
      setSnackbar(`Retention for ${editRule.label} updated to ${editValue} months.`);
      setEditOpen(false);
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Failed to update retention config');
    }
  }, [editRule, editValue, rules]);

  const handlePurgeOpen = useCallback((rule: EntityRule) => {
    setPurgeRule(rule);
    setPurgeOpen(true);
  }, []);

  const handlePurgeConfirm = useCallback(async () => {
    if (!purgeRule) return;
    setPurging(true);
    try {
      const result = await manualPurge(purgeRule.key);
      setSnackbar(`Purge complete: ${result.recordsRemoved.toLocaleString()} ${purgeRule.label} records removed.`);
      setPurgeOpen(false);
      // Reload history
      const hist = await getPurgeHistory();
      setHistory(hist);
      setHistoryExpanded(true);
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Purge failed');
    } finally {
      setPurging(false);
    }
  }, [purgeRule]);

  const historyColumns: Column<PurgeHistoryEntry>[] = useMemo(
    () => [
      {
        key: 'executedAt',
        label: 'Date',
        sortable: true,
        exportValue: (e) => e.executedAt,
        render: (e) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem', fontFamily: 'monospace' }} noWrap>
            {formatTs(e.executedAt)}
          </Typography>
        ),
      },
      {
        key: 'entityType',
        label: 'Entity',
        sortable: true,
        exportValue: (e) => e.entityType,
        render: (e) => {
          const label = DEFAULT_RULES.find((r) => r.key === e.entityType)?.label ?? e.entityType;
          return (
            <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}>
              {label}
            </Typography>
          );
        },
      },
      {
        key: 'recordsRemoved',
        label: 'Records Removed',
        align: 'right',
        sortable: true,
        exportValue: (e) => String(e.recordsRemoved),
        render: (e) => (
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '0.8125rem', fontFamily: 'monospace' }}>
            {e.recordsRemoved.toLocaleString()}
          </Typography>
        ),
      },
      {
        key: 'triggeredBy',
        label: 'Trigger',
        align: 'center',
        width: 110,
        sortable: true,
        exportValue: (e) => e.triggeredBy,
        render: (e) => (
          <Chip
            label={e.triggeredBy}
            size="small"
            sx={{
              height: 20,
              fontWeight: 700,
              fontSize: '0.625rem',
              letterSpacing: '0.04em',
              borderRadius: '5px',
              bgcolor: e.triggeredBy === 'SCHEDULE' ? brand.info.light : brand.warning.light,
              color: e.triggeredBy === 'SCHEDULE' ? brand.info.dark : brand.warning.dark,
              '& .MuiChip-label': { px: 0.875 },
            }}
          />
        ),
      },
    ],
    [],
  );

  // Estimated next purge: rough calc based on retention months
  const estNextPurge = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Box>
      <PageHeader
        title="Data Retention"
        subtitle="Configure how long data is kept before automatic deletion"
        actions={[
          {
            label: 'Refresh',
            icon: <IconHistory size={18} />,
            onClick: loadData,
            variant: 'ghost',
          },
        ]}
        badge={{ label: 'Admin', tone: 'neutral' }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Info banner */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Scheduled purge runs daily at 3:00 AM. Records older than the configured retention period are permanently deleted.
      </Alert>

      {/* Rules Cards */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {rules.map((rule) => (
          <Card
            key={rule.key}
            sx={{
              p: 2.5,
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: 'none',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: brand.primary[50],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: brand.primary[600],
                    flexShrink: 0,
                  }}
                >
                  <IconDatabase size={20} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
                    {rule.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                    {rule.description}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={3} alignItems="center">
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: brand.primary[700], lineHeight: 1.2 }}>
                    {rule.months}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                    months
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[700], fontSize: '0.8rem' }}>
                    {estNextPurge(rule.months)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
                    est. next purge
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconEdit size={16} />}
                    onClick={() => handleEditOpen(rule)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      borderColor: brand.neutral[300],
                      color: brand.neutral[700],
                      '&:hover': { borderColor: brand.primary[400], color: brand.primary[700] },
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<IconTrash size={16} />}
                    onClick={() => handlePurgeOpen(rule)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    Purge Now
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>

      {/* Purge History */}
      <Card
        sx={{
          borderRadius: '12px',
          border: `1px solid ${brand.neutral[200]}`,
          boxShadow: 'none',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2.5, pt: 2.5, pb: 1 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconHistory size={20} color={brand.neutral[600]} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
              Purge History
            </Typography>
            {history.length > 0 && (
              <Chip
                label={history.length}
                size="small"
                sx={{
                  height: 20,
                  minWidth: 20,
                  fontWeight: 700,
                  fontSize: '0.625rem',
                  borderRadius: '10px',
                  bgcolor: brand.neutral[100],
                  color: brand.neutral[600],
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
          </Stack>
          <Button
            size="small"
            onClick={() => setHistoryExpanded(!historyExpanded)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
          >
            {historyExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </Stack>

        {historyExpanded && (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <DataTable
              columns={historyColumns}
              rows={history}
              loading={loading}
              emptyText="No purge history yet"
              emptyIcon={<IconHistory size={32} />}
              getRowKey={(e) => e.id}
              tableKey="retention-purge-history"
              toolbarTitle={history.length > 0 ? `${history.length} purge records` : undefined}
              enableSorting
              enableExport
              exportFileName={`purge-history-${new Date().toISOString().slice(0, 10)}`}
              page={0}
              totalPages={1}
              totalElements={history.length}
              onPageChange={() => {}}
            />
          </Box>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Edit Retention — {editRule?.label}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
              Set how many months {editRule?.label.toLowerCase()} records are kept before automatic deletion.
            </Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                value={editValue}
                onChange={(_, v) => setEditValue(v as number)}
                min={editRule?.min ?? 1}
                max={editRule?.max ?? 36}
                step={1}
                marks={[
                  { value: editRule?.min ?? 1, label: `${editRule?.min ?? 1}m` },
                  { value: editRule?.max ?? 36, label: `${editRule?.max ?? 36}m` },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} months`}
                sx={{ color: brand.primary[600] }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: brand.primary[700] }}>
                {editValue}
              </Typography>
              <Typography variant="body2" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                months
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[400], mt: 0.5, display: 'block' }}>
                Records older than {editValue} months will be deleted during the next purge cycle
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setEditOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600, color: brand.neutral[600] }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Purge Confirmation Dialog */}
      <Dialog open={purgeOpen} onClose={() => setPurgeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: brand.error.dark }}>
          Confirm Manual Purge
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: brand.neutral[700] }}>
              This will permanently delete all <strong>{purgeRule?.label}</strong> records older than{' '}
              <strong>{purgeRule?.months} months</strong>.
            </Typography>
            <Alert severity="warning">
              This action cannot be undone. Deleted records will be permanently removed from the database.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPurgeOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600, color: brand.neutral[600] }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handlePurgeConfirm}
            disabled={purging}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
            }}
          >
            {purging ? 'Purging...' : 'Confirm Purge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
