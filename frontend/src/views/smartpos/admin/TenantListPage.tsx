import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconBuilding,
  IconDotsVertical,
  IconEdit,
  IconPlus,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';

import {
  createTenant,
  listAllTenants,
  suspendTenant,
  reactivateTenant,
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
  PAST_DUE: 'warning',
  SUSPENDED: 'error',
  CLOSED: 'neutral',
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

  /* ── Columns ── */

  const columns: Column<Tenant>[] = useMemo(
    () => [
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
            status={t.status}
          />
        ),
      },
    ],
    [],
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
    </Box>
  );
}

/* ── More menu component ── */

function MoreMenu({
  onSuspend,
  onReactivate,
  onChangePlan,
  status,
}: {
  onSuspend: () => void;
  onReactivate: () => void;
  onChangePlan: () => void;
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
          <Button
            fullWidth
            size="small"
            startIcon={<IconEdit size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              setAnchor(null);
              onChangePlan();
            }}
            sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, color: brand.neutral[700] }}
          >
            Change Plan
          </Button>
          {(status === 'ACTIVE' || status === 'TRIAL' || status === 'PAST_DUE') && (
            <Button
              fullWidth
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setAnchor(null);
                onSuspend();
              }}
              sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, color: brand.warning.dark }}
            >
              Suspend
            </Button>
          )}
          {(status === 'SUSPENDED' || status === 'TRIAL_EXPIRED') && (
            <Button
              fullWidth
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setAnchor(null);
                onReactivate();
              }}
              sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, color: brand.success.dark }}
            >
              Reactivate
            </Button>
          )}
        </Stack>
      </Dialog>
    </>
  );
}
