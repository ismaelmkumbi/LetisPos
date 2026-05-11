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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconBuilding,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

import {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  type Branch,
  type CreateBranchInput,
  type UpdateBranchInput,
} from 'src/api/smartpos/branches';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const emptyForm = (): CreateBranchInput => ({ name: '', code: '', address: '', city: '', phone: '' });

const actionBtnSx = {
  p: 0.5,
  borderRadius: '8px',
  color: brand.neutral[400],
  '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
};

export default function BranchesPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<CreateBranchInput>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; row: Branch } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listBranches()
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load branches');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFormDialogOpen(true);
  };

  const openEdit = useCallback((b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name,
      code: b.code,
      address: b.address ?? '',
      city: b.city ?? '',
      phone: b.phone ?? '',
    });
    setFormError(null);
    setFormDialogOpen(true);
    closeRowMenu();
  }, [closeRowMenu]);

  const patch = <K extends keyof CreateBranchInput>(k: K, v: CreateBranchInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!form.code.trim()) {
      setFormError('Code is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        const updateInput: UpdateBranchInput = {
          name: form.name,
          code: form.code,
          address: form.address || undefined,
          city: form.city || undefined,
          phone: form.phone || undefined,
        };
        await updateBranch(editing.id, updateInput);
      } else {
        await createBranch(form);
      }
      setRefreshToken((n) => n + 1);
      setFormDialogOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBranch(deleteTarget.id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns: Column<Branch>[] = useMemo(
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
                fontWeight: 700,
                fontSize: 12,
                border: `1px solid ${brand.neutral[200]}`,
                flexShrink: 0,
              }}
            >
              <IconBuilding size={15} />
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
        key: 'code',
        label: 'Code',
        sortable: true,
        exportValue: (b) => b.code,
        render: (b) => (
          <Typography
            variant="body2"
            sx={{ color: brand.neutral[600], fontSize: '0.8125rem', fontFamily: 'monospace' }}
            noWrap
          >
            {b.code}
          </Typography>
        ),
      },
      {
        key: 'city',
        label: 'City',
        sortable: true,
        exportValue: (b) => b.city ?? '',
        render: (b) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {b.city || '—'}
          </Typography>
        ),
      },
      {
        key: 'phone',
        label: 'Phone',
        sortable: false,
        exportValue: (b) => b.phone ?? '',
        render: (b) => (
          <Typography variant="body2" sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }} noWrap>
            {b.phone || '—'}
          </Typography>
        ),
      },
      {
        key: 'active',
        label: 'Status',
        align: 'center',
        width: 100,
        sortable: true,
        exportValue: (b) => (b.active ? 'Active' : 'Inactive'),
        render: (b) => (
          <Chip
            label={b.active ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              height: 20,
              fontWeight: 700,
              fontSize: '0.625rem',
              letterSpacing: '0.04em',
              borderRadius: '5px',
              bgcolor: b.active ? brand.success.light : brand.neutral[100],
              color: b.active ? brand.success.dark : brand.neutral[600],
              '& .MuiChip-label': { px: 0.875 },
            }}
          />
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
        title="Branches"
        subtitle="Organise warehouses into branches. Branches are optional — everything works without them."
        actions={[
          {
            label: 'Add branch',
            icon: <IconPlus size={18} />,
            onClick: openCreate,
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No branches configured yet"
        emptyIcon={<IconBuilding size={32} />}
        getRowKey={(b) => b.id}
        onRowClick={openEdit}
        tableKey="branches"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} branches` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`branches-${new Date().toISOString().slice(0, 10)}`}
        emptyAction={
          rows.length === 0 && !loading
            ? { label: 'Add your first branch', onClick: openCreate }
            : undefined
        }
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
                label: 'Edit',
                icon: <IconEdit size={18} />,
                onClick: () => {
                  if (!rowMenu) return;
                  openEdit(rowMenu.row);
                },
              },
              {
                label: 'Delete',
                icon: <IconTrash size={18} />,
                onClick: () => {
                  if (!rowMenu) return;
                  setDeleteTarget(rowMenu.row);
                  closeRowMenu();
                },
                danger: true,
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
                  color: item.danger ? 'error.main' : brand.neutral[700],
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: item.danger ? 'error.light' : brand.primary[50],
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Dialog>
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 0.5 }}>
          {editing ? 'Edit branch' : 'New branch'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Name"
              required
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
            />
            <TextField
              label="Code"
              required
              fullWidth
              size="small"
              value={form.code}
              onChange={(e) => patch('code', e.target.value)}
              helperText="Short identifier for this branch"
            />
            <TextField
              label="Address"
              fullWidth
              size="small"
              value={form.address ?? ''}
              onChange={(e) => patch('address', e.target.value)}
            />
            <TextField
              label="City"
              fullWidth
              size="small"
              value={form.city ?? ''}
              onChange={(e) => patch('city', e.target.value)}
            />
            <TextField
              label="Phone"
              fullWidth
              size="small"
              value={form.phone ?? ''}
              onChange={(e) => patch('phone', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create branch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete branch?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.name}</strong> will be permanently removed. This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
