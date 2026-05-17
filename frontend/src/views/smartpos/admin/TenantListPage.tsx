import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconBan,
  IconBuilding,
  IconDoorExit,
  IconDotsVertical,
  IconEdit,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import { api } from 'src/api/smartpos/client';
import {
  closeTenant,
  createTenant,
  deleteTenant,
  disableTenant,
  listAllTenants,
  reactivateTenant,
  suspendTenant,
  updateTenant,
  type Tenant,
} from 'src/api/smartpos/auth';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

/* ── helpers ── */

const PLAN_COLORS: Record<string, string> = {
  STARTER: brand.neutral[500],
  BUSINESS: brand.info.main,
  PROFESSIONAL: brand.purple.main,
  ENTERPRISE: '#D4AF37',
};

const PLAN_OPTIONS = ['STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE'];

const STATUS_TONES: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success',
  TRIAL: 'info',
  TRIAL_EXPIRED: 'info',
  PAST_DUE: 'warning',
  SUSPENDED: 'error',
  CLOSED: 'neutral',
  DISABLED: 'neutral',
  DELETED: 'error',
};

function planBadge(plan: string) {
  const color = PLAN_COLORS[plan] ?? brand.neutral[500];
  return (
    <Chip
      label={plan}
      size="small"
      sx={{
        height: 22,
        fontWeight: 700,
        fontSize: '0.65rem',
        letterSpacing: '0.03em',
        borderRadius: '5px',
        bgcolor: `${color}18`,
        color,
        '& .MuiChip-label': { px: 0.875 },
      }}
    />
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const menuItemSx = {
  borderRadius: '8px',
  '&:hover': { bgcolor: brand.neutral[50] },
};

/* ── Page ── */

export default function TenantListPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    billingPlan: 'STARTER',
    adminEmail: '',
    trialDays: 30,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Change plan dialog
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<Tenant | null>(null);
  const [newPlan, setNewPlan] = useState('STARTER');
  const [changingPlan, setChangingPlan] = useState(false);

  // Suspend/Reactivate confirmation
  const [lifecycleDialog, setLifecycleDialog] = useState<{
    tenant: Tenant;
    action: 'suspend' | 'reactivate';
  } | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ tenant: Tenant } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteHard, setDeleteHard] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    listAllTenants()
      .then((data) => {
        setTenants(data);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load tenants');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  /* ── Create tenant ── */

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      await createTenant({
        name: createForm.name,
        slug: createForm.slug || undefined,
        billingPlan: createForm.billingPlan,
      });
      setCreateOpen(false);
      setCreateForm({ name: '', slug: '', billingPlan: 'STARTER', adminEmail: '', trialDays: 30 });
      fetch();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  /* ── Change plan ── */

  const handleChangePlan = async () => {
    if (!planTarget) return;
    setChangingPlan(true);
    try {
      await updateTenant(planTarget.id, { billingPlan: newPlan });
      setPlanDialogOpen(false);
      fetch();
    } catch {
      /* handled silently */
    } finally {
      setChangingPlan(false);
    }
  };

  /* ── Lifecycle ── */

  const handleLifecycle = async () => {
    if (!lifecycleDialog) return;
    setLifecycleLoading(true);
    try {
      if (lifecycleDialog.action === 'suspend') {
        await suspendTenant(lifecycleDialog.tenant.id, 'Admin action');
      } else {
        await reactivateTenant(lifecycleDialog.tenant.id);
      }
      setLifecycleDialog(null);
      fetch();
    } catch {
      /* handled silently */
    } finally {
      setLifecycleLoading(false);
    }
  };

  /* ── Close / Disable ── */

  const handleClose = async (tenant: Tenant) => {
    try {
      await closeTenant(tenant.id, 'Admin action');
      fetch();
    } catch {
      /* handled silently */
    }
  };

  const handleDisable = async (tenant: Tenant) => {
    try {
      await disableTenant(tenant.id, 'Admin action');
      fetch();
    } catch {
      /* handled silently */
    }
  };

  /* ── Delete ── */

  const handleDelete = async () => {
    if (!deleteDialog || deleteConfirmName !== deleteDialog.tenant.name) return;
    try {
      if (deleteHard) {
        await api.delete(`/api/v1/tenants/${deleteDialog.tenant.id}`, {
          params: { hard: true },
          data: { reason: 'Admin hard delete' },
        });
      } else {
        await deleteTenant(deleteDialog.tenant.id, false, 'Admin action');
      }
      setDeleteDialog(null);
      setDeleteConfirmName('');
      setDeleteHard(false);
      fetch();
    } catch {
      /* handled silently */
    }
  };

  /* ── Bulk actions ── */

  const handleBulkSuspend = async () => {
    for (const id of selectedIds) {
      try {
        await suspendTenant(id, 'Bulk admin action');
      } catch {
        /* continue */
      }
    }
    setSelectedIds(new Set());
    fetch();
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      try {
        await api.delete(`/api/v1/tenants/${id}`, { data: { reason: 'Bulk admin action' } });
      } catch {
        /* continue */
      }
    }
    setSelectedIds(new Set());
    fetch();
  };

  /* ── Filtered rows ── */

  const filtered = useMemo(() => {
    return tenants
      .filter((t) => (planFilter ? t.billingPlan === planFilter : true))
      .filter((t) => (statusFilter ? t.status === statusFilter : true))
      .filter((t) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(s) ||
          t.slug.toLowerCase().includes(s)
        );
      });
  }, [tenants, planFilter, statusFilter, search]);

  /* ── Stats ── */

  const stats = useMemo(() => {
    return [
      { label: 'Total', value: tenants.length, color: brand.neutral[700] },
      { label: 'Active', value: tenants.filter((t) => t.status === 'ACTIVE').length, color: brand.success.main },
      { label: 'Trial', value: tenants.filter((t) => t.status === 'TRIAL' || t.status === 'TRIAL_EXPIRED').length, color: brand.info.main },
      { label: 'Suspended', value: tenants.filter((t) => t.status === 'SUSPENDED').length, color: brand.warning.main },
      { label: 'Deleted', value: tenants.filter((t) => (t.status as string) === 'DELETED' || t.status === 'CLOSED' || (t.status as string) === 'DISABLED').length, color: brand.error.main },
    ];
  }, [tenants]);

  /* ── Columns ── */

  const columns: Column<Tenant>[] = useMemo(
    () => [
      {
        key: 'select',
        label: '',
        width: 40,
        enableHiding: false,
        render: (t: Tenant) => (
          <Checkbox
            checked={selectedIds.has(t.id)}
            onChange={() => {
              const next = new Set(selectedIds);
              next.has(t.id) ? next.delete(t.id) : next.add(t.id);
              setSelectedIds(next);
            }}
            onClick={(e: any) => e.stopPropagation()}
            size="small"
          />
        ),
      },
      {
        key: 'name',
        label: 'Name',
        width: 200,
        sortable: true,
        exportValue: (t) => t.name,
        render: (t) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, fontSize: '0.82rem', color: brand.neutral[800] }}
          >
            {t.name}
          </Typography>
        ),
      },
      {
        key: 'slug',
        label: 'Slug',
        width: 160,
        sortable: true,
        exportValue: (t) => t.slug,
        render: (t) => (
          <Typography
            variant="body2"
            sx={{ fontSize: '0.78rem', color: brand.neutral[500], fontFamily: 'monospace' }}
          >
            {t.slug}
          </Typography>
        ),
      },
      {
        key: 'billingPlan',
        label: 'Plan',
        width: 130,
        align: 'center',
        sortable: true,
        exportValue: (t) => t.billingPlan,
        render: (t) => planBadge(t.billingPlan),
      },
      {
        key: 'status',
        label: 'Status',
        width: 120,
        align: 'center',
        sortable: true,
        exportValue: (t) => t.status,
        render: (t) => (
          <StatusBadge label={t.status.replace('_', ' ')} tone={STATUS_TONES[t.status] ?? 'neutral'} />
        ),
      },
      {
        key: 'maxUsers',
        label: 'Users',
        width: 80,
        align: 'center',
        sortable: true,
        exportValue: (t) => String(t.maxUsers),
        render: (t) => (
          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: brand.neutral[600] }}>
            {t.maxUsers >= 2147483647 ? '--' : t.maxUsers}
          </Typography>
        ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        width: 140,
        sortable: true,
        exportValue: (t) => t.createdAt,
        render: (t) => (
          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: brand.neutral[500] }}>
            {formatDate(t.createdAt)}
          </Typography>
        ),
      },
      {
        key: 'actions',
        label: '',
        width: 50,
        align: 'right',
        enableHiding: false,
        render: (t) => (
          <MoreMenu
            onSuspend={() => setLifecycleDialog({ tenant: t, action: 'suspend' })}
            onReactivate={() => setLifecycleDialog({ tenant: t, action: 'reactivate' })}
            onChangePlan={() => {
              setPlanTarget(t);
              setNewPlan(t.billingPlan);
              setPlanDialogOpen(true);
            }}
            onClose={() => handleClose(t)}
            onDisable={() => handleDisable(t)}
            onDelete={() => {
              setDeleteDialog({ tenant: t });
              setDeleteConfirmName('');
              setDeleteHard(false);
            }}
            status={t.status}
          />
        ),
      },
    ],
    [selectedIds],
  );

  return (
    <Box>
      <PageHeader
        title="All Tenants"
        subtitle="Create, manage and monitor all tenant accounts"
        actions={[
          {
            label: 'Create Tenant',
            icon: <IconPlus size={18} />,
            onClick: () => {
              setCreateError(null);
              setCreateOpen(true);
            },
            variant: 'accent',
          },
        ]}
      />

      {/* Stats bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {stats.map((s) => (
          <Box
            key={s.label}
            sx={{
              flex: 1,
              bgcolor: '#fff',
              borderRadius: '10px',
              p: 2,
              border: `1px solid ${brand.neutral[200]}`,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Filters */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Plan</InputLabel>
          <Select
            value={planFilter}
            label="Plan"
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <MenuItem value="">All plans</MenuItem>
            {PLAN_OPTIONS.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="TRIAL">Trial</MenuItem>
            <MenuItem value="PAST_DUE">Past Due</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
            <MenuItem value="CLOSED">Closed</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search tenants…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        {(planFilter || statusFilter || search) && (
          <Button
            size="small"
            onClick={() => {
              setPlanFilter('');
              setStatusFilter('');
              setSearch('');
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <Box
          sx={{
            py: 1,
            px: 2,
            mb: 1,
            bgcolor: brand.primary[50],
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
            {selectedIds.size} selected
          </Typography>
          <Button
            size="small"
            color="warning"
            variant="outlined"
            startIcon={<IconPlayerPause size={14} />}
            onClick={handleBulkSuspend}
          >
            Suspend
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<IconTrash size={14} />}
            onClick={handleBulkDelete}
          >
            Delete
          </Button>
          <Button
            size="small"
            onClick={() => setSelectedIds(new Set())}
            sx={{ textTransform: 'none', fontWeight: 600, ml: 'auto' }}
          >
            Clear
          </Button>
        </Box>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyText="No tenants found"
        emptyIcon={<IconBuilding size={32} />}
        getRowKey={(t) => t.id}
        onRowClick={(t) => navigate(`/smartpos/admin/tenants/${t.id}`)}
        tableKey="tenant-list"
        toolbarTitle={filtered.length > 0 ? `${filtered.length} tenant${filtered.length !== 1 ? 's' : ''}` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`tenants-${new Date().toISOString().slice(0, 10)}`}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create Tenant</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{createError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tenant Name"
              size="small"
              fullWidth
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
            <TextField
              label="Slug"
              size="small"
              fullWidth
              value={createForm.slug}
              onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
              helperText="Auto-generated from name if left empty"
            />
            <TextField
              label="Admin Email"
              size="small"
              fullWidth
              type="email"
              value={createForm.adminEmail}
              onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Plan</InputLabel>
              <Select
                value={createForm.billingPlan}
                label="Plan"
                onChange={(e) => setCreateForm({ ...createForm, billingPlan: e.target.value })}
              >
                {PLAN_OPTIONS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Trial Days"
              size="small"
              fullWidth
              type="number"
              value={createForm.trialDays}
              onChange={(e) =>
                setCreateForm({ ...createForm, trialDays: Number(e.target.value) || 0 })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !createForm.name.trim()}
            sx={{
              bgcolor: brand.accent[500],
              '&:hover': { bgcolor: brand.accent[600] },
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {creating ? 'Creating…' : 'Create Tenant'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Change Plan — {planTarget?.name}
        </DialogTitle>
        <DialogContent>
          <FormControl size="small" fullWidth sx={{ mt: 1 }}>
            <InputLabel>Plan</InputLabel>
            <Select
              value={newPlan}
              label="Plan"
              onChange={(e) => setNewPlan(e.target.value)}
            >
              {PLAN_OPTIONS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleChangePlan}
            disabled={changingPlan}
            sx={{
              bgcolor: brand.accent[500],
              '&:hover': { bgcolor: brand.accent[600] },
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {changingPlan ? 'Saving…' : 'Change Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lifecycle Confirmation Dialog */}
      <Dialog
        open={!!lifecycleDialog}
        onClose={() => setLifecycleDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {lifecycleDialog?.action === 'suspend' ? 'Suspend Tenant' : 'Reactivate Tenant'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
            {lifecycleDialog?.action === 'suspend'
              ? `Are you sure you want to suspend "${lifecycleDialog?.tenant.name}"? All users will lose access until reactivated.`
              : `Are you sure you want to reactivate "${lifecycleDialog?.tenant.name}"? Users will regain access immediately.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLifecycleDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={lifecycleDialog?.action === 'suspend' ? 'warning' : 'success'}
            onClick={handleLifecycle}
            disabled={lifecycleLoading}
          >
            {lifecycleLoading
              ? 'Processing…'
              : lifecycleDialog?.action === 'suspend'
                ? 'Suspend'
                : 'Reactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: brand.error.main }}>
          Delete Tenant — {deleteDialog?.tenant?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
              This action cannot be undone. All users will lose access immediately.
            </Typography>
            <FormControl>
              <RadioGroup
                value={deleteHard ? 'hard' : 'soft'}
                onChange={(e) => setDeleteHard(e.target.value === 'hard')}
              >
                <FormControlLabel
                  value="soft"
                  control={<Radio />}
                  label="Soft Delete — data retained 30 days, slug & email reserved, reversible"
                />
                <FormControlLabel
                  value="hard"
                  control={<Radio />}
                  label="Hard Delete — immediate, irreversible, slug released"
                />
              </RadioGroup>
            </FormControl>
            <TextField
              label={`Type "${deleteDialog?.tenant?.name}" to confirm`}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setDeleteDialog(null);
              setDeleteConfirmName('');
              setDeleteHard(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteConfirmName !== deleteDialog?.tenant?.name}
            onClick={handleDelete}
          >
            {deleteHard ? 'Hard Delete' : 'Soft Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ── More menu component ── */

function MoreMenu({
  onSuspend,
  onReactivate,
  onChangePlan,
  onClose,
  onDisable,
  onDelete,
  status,
}: {
  onSuspend: () => void;
  onReactivate: () => void;
  onChangePlan: () => void;
  onClose?: () => void;
  onDisable?: () => void;
  onDelete?: () => void;
  status: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <IconDotsVertical size={16} />
      </IconButton>
      <Dialog
        open={!!anchor}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { minWidth: 200, borderRadius: '12px', p: 1 } }}
      >
        <Stack spacing={0.5}>
          {/* Change Plan — always available */}
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onChangePlan();
            }}
            sx={menuItemSx}
          >
            <ListItemIcon>
              <IconEdit size={16} />
            </ListItemIcon>
            <ListItemText
              primary="Change Plan"
              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
            />
          </MenuItem>

          <Divider />

          {/* Suspend / Reactivate */}
          {(status === 'ACTIVE' || status === 'TRIAL' || status === 'PAST_DUE') && (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onSuspend();
              }}
              sx={menuItemSx}
            >
              <ListItemIcon sx={{ color: brand.warning.dark }}>
                <IconPlayerPause size={16} />
              </ListItemIcon>
              <ListItemText
                primary="Suspend"
                primaryTypographyProps={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: brand.warning.dark,
                }}
              />
            </MenuItem>
          )}
          {(status === 'SUSPENDED' || status === 'DISABLED') && (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onReactivate();
              }}
              sx={menuItemSx}
            >
              <ListItemIcon sx={{ color: brand.success.dark }}>
                <IconPlayerPlay size={16} />
              </ListItemIcon>
              <ListItemText
                primary="Reactivate"
                primaryTypographyProps={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: brand.success.dark,
                }}
              />
            </MenuItem>
          )}

          {/* Close / Disable */}
          {(status === 'ACTIVE' || status === 'TRIAL' || status === 'PAST_DUE') && (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onDisable?.();
              }}
              sx={menuItemSx}
            >
              <ListItemIcon>
                <IconBan size={16} />
              </ListItemIcon>
              <ListItemText
                primary="Disable"
                primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              />
            </MenuItem>
          )}
          {status !== 'CLOSED' && status !== 'DELETED' && (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onClose?.();
              }}
              sx={menuItemSx}
            >
              <ListItemIcon>
                <IconDoorExit size={16} />
              </ListItemIcon>
              <ListItemText
                primary="Close"
                primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              />
            </MenuItem>
          )}

          <Divider />

          {/* Delete — always available if not already deleted */}
          {status !== 'DELETED' && (
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onDelete?.();
              }}
              sx={{ ...menuItemSx, '&:hover': { bgcolor: brand.error.light } }}
            >
              <ListItemIcon sx={{ color: brand.error.main }}>
                <IconTrash size={16} />
              </ListItemIcon>
              <ListItemText
                primary="Delete Tenant"
                primaryTypographyProps={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: brand.error.main,
                }}
              />
            </MenuItem>
          )}
        </Stack>
      </Dialog>
    </>
  );
}
