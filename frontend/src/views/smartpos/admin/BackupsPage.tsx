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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconDatabase,
  IconDownload,
  IconDotsVertical,
  IconPlus,
  IconRestore,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { listBackups, createBackup, restoreBackup, type Backup } from 'src/api/smartpos/audit';

interface BackupRecord {
  id: string;
  name: string;
  sizeMB: number;
  type: string;
  status: string;
  createdAt: string;
}

function mapApiToRecord(b: Backup): BackupRecord {
  return {
    id: b.id,
    name: b.name,
    sizeMB: b.sizeBytes ? b.sizeBytes / 1_000_000 : 0,
    type: b.type === 'full' ? 'Full' : b.type === 'incremental' ? 'Incremental' : b.type,
    status:
      b.status === 'completed' ? 'Completed'
      : b.status === 'in_progress' ? 'In Progress'
      : b.status === 'failed' ? 'Failed'
      : b.status === 'pending' ? 'Pending'
      : b.status,
    createdAt: b.createdAt,
  };
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Completed: { bg: brand.success.light, color: brand.success.dark },
  'In Progress': { bg: brand.info.light, color: brand.info.dark },
  Failed: { bg: brand.error.light, color: brand.error.dark },
  Pending: { bg: brand.warning.light, color: brand.warning.dark },
};

const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  Full: { bg: brand.primary[50], color: brand.primary[700] },
  Incremental: { bg: brand.purple.light, color: brand.purple.dark },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const actionBtnSx = {
  p: 0.5,
  borderRadius: '8px',
  color: brand.neutral[400],
  '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
};

interface CreateForm {
  name: string;
  type: string;
  notes: string;
}

const emptyCreateForm = (): CreateForm => ({
  name: `backup-${new Date().toISOString().slice(0, 10)}`,
  type: 'full',
  notes: '',
});

export default function BackupsPage() {
  const [rows, setRows] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm());
  const [creating, setCreating] = useState(false);

  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [restoring, setRestoring] = useState(false);

  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; row: BackupRecord } | null>(null);
  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  const fetchBackups = useCallback(() => {
    setLoading(true);
    listBackups()
      .then((data) => {
        setRows(data.map(mapApiToRecord));
        setError(null);
      })
      .catch(() => setError('Failed to load backups'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const patch = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setCreateForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      await createBackup({
        name: createForm.name.trim(),
        type: createForm.type,
        createdBy: createForm.notes || undefined,
      });
      setCreateOpen(false);
      setCreateForm(emptyCreateForm());
      // Poll for status updates (async backup processing)
      setTimeout(() => fetchBackups(), 1000);
      setTimeout(() => fetchBackups(), 3000);
    } catch {
      setError('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await restoreBackup(restoreTarget.id);
    } catch {
      setError('Failed to restore backup');
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
    }
  };

  const handleDownload = (_backup: BackupRecord) => {
    void _backup;
    // In a real app, this would trigger a download
    closeRowMenu();
  };

  const columns: Column<BackupRecord>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        exportValue: (b) => b.name,
        render: (b) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconDatabase size={15} />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
              noWrap
            >
              {b.name}
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'sizeMB',
        label: 'Size',
        sortable: true,
        align: 'right',
        width: 90,
        exportValue: (b) => `${b.sizeMB.toFixed(1)} MB`,
        render: (b) => (
          <Typography
            variant="body2"
            sx={{
              color: brand.neutral[600],
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
            }}
          >
            {b.sizeMB > 0 ? `${b.sizeMB.toFixed(1)} MB` : '--'}
          </Typography>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        align: 'center',
        width: 120,
        exportValue: (b) => b.type,
        render: (b) => {
          const s = TYPE_STYLES[b.type] ?? TYPE_STYLES.Full;
          return (
            <Chip
              label={b.type}
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
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        width: 120,
        exportValue: (b) => b.status,
        render: (b) => {
          const s = STATUS_STYLES[b.status] ?? STATUS_STYLES.Completed;
          return (
            <Chip
              label={b.status}
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
        key: 'createdAt',
        label: 'Created At',
        sortable: true,
        width: 180,
        exportValue: (b) => formatDate(b.createdAt),
        render: (b) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }}>
            {formatDate(b.createdAt)}
          </Typography>
        ),
      },
      {
        key: 'actions',
        label: '',
        align: 'right',
        width: 52,
        enableHiding: false,
        exportValue: () => '',
        render: (b) => (
          <Tooltip title="More actions">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setRowMenu({ anchor: e.currentTarget, row: b });
              }}
              sx={actionBtnSx}
              aria-haspopup="true"
            >
              <IconDotsVertical size={14} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  const isMenuOpen = Boolean(rowMenu);

  return (
    <Box>
      <PageHeader
        title="Backups"
        subtitle="Manage database and file backups"
        actions={[
          {
            label: 'Create Backup',
            icon: <IconPlus size={18} />,
            onClick: () => {
              setCreateForm(emptyCreateForm());
              setCreateOpen(true);
            },
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 2, borderRadius: '10px', fontWeight: 500 }}>
        Backups are stored securely and can be restored on demand.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No backups found"
        emptyIcon={<IconDatabase size={32} />}
        getRowKey={(b) => b.id}
        tableKey="backups"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} backups` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`backups-${new Date().toISOString().slice(0, 10)}`}
      />

      {/* Row action menu */}
      {isMenuOpen && (
        <Dialog
          open={isMenuOpen}
          onClose={closeRowMenu}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: '12px' } }}
        >
          <Box sx={{ p: 1 }}>
            {[
              {
                label: 'Download',
                icon: <IconDownload size={18} />,
                onClick: () => handleDownload(rowMenu!.row),
              },
              {
                label: 'Restore',
                icon: <IconRestore size={18} />,
                onClick: () => {
                  setRestoreTarget(rowMenu!.row);
                  closeRowMenu();
                },
              },
            ].map((item) => (
              <Button
                key={item.label}
                fullWidth
                onClick={item.onClick}
                startIcon={item.icon}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1,
                  px: 1.5,
                  borderRadius: '8px',
                  color: brand.neutral[700],
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: brand.primary[50],
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Dialog>
      )}

      {/* Create Backup Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          Create Backup
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Backup Name"
              fullWidth
              size="small"
              value={createForm.name}
              onChange={(e) => patch('name', e.target.value)}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={createForm.type}
                label="Type"
                onChange={(e) => patch('type', e.target.value)}
              >
                <MenuItem value="full">Full Backup</MenuItem>
                <MenuItem value="incremental">Incremental Backup</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Notes (optional)"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={createForm.notes}
              onChange={(e) => patch('notes', e.target.value)}
              placeholder="Reason for this backup..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !createForm.name.trim()}
          >
            {creating ? 'Creating…' : 'Create Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: brand.warning.dark }}>
          Restore Backup?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            You are about to restore <strong>{restoreTarget?.name}</strong>. This will overwrite the
            current database with the data from this backup.
          </DialogContentText>
          <Alert severity="warning" sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.8125rem' }}>
            This action cannot be undone. Make sure you have a recent backup before proceeding.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRestoreTarget(null)} disabled={restoring}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestore}
            disabled={restoring}
          >
            {restoring ? 'Restoring…' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
