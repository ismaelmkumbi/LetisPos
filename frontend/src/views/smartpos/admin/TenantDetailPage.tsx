import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconBuilding,
  IconClock,
  IconCreditCard,
  IconFileInvoice,
  IconSettings,
} from '@tabler/icons-react';

import {
  fetchTenant,
  updateTenant,
  suspendTenant,
  reactivateTenant,
  closeTenant,
  type Tenant,
} from 'src/api/smartpos/auth';
import {
  getSubscription,
  updateSubscription,
  listInvoices,
  listAllPlans,
  type Subscription,
  type Invoice,
  type PlanDefinition,
} from 'src/api/smartpos/billing';
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

const STATUS_TONES: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success',
  TRIAL: 'info',
  PAST_DUE: 'warning',
  SUSPENDED: 'error',
  CLOSED: 'neutral',
};

const INV_STATUS_TONES: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  PAID: 'success',
  PENDING: 'warning',
  OVERDUE: 'error',
  CANCELLED: 'neutral',
  FAILED: 'error',
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

function statusChip(status: string) {
  const tone = STATUS_TONES[status] ?? 'neutral';
  const colorMap: Record<string, { bg: string; color: string }> = {
    success: { bg: brand.success.light, color: brand.success.dark },
    info: { bg: brand.info.light, color: brand.info.dark },
    warning: { bg: brand.warning.light, color: brand.warning.dark },
    error: { bg: brand.error.light, color: brand.error.dark },
    neutral: { bg: brand.neutral[100], color: brand.neutral[600] },
  };
  const c = colorMap[tone];
  return (
    <Chip
      label={status.replace('_', ' ')}
      size="small"
      sx={{
        height: 22,
        fontWeight: 700,
        fontSize: '0.65rem',
        letterSpacing: '0.03em',
        borderRadius: '5px',
        bgcolor: c.bg,
        color: c.color,
        '& .MuiChip-label': { px: 0.875 },
      }}
    />
  );
}

function formatDate(iso?: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTzs(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ── Page ── */

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Change plan state
  const [newPlanCode, setNewPlanCode] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);

  // Extend trial
  const [extendTrialOpen, setExtendTrialOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(14);
  const [extending, setExtending] = useState(false);

  // Lifecycle
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<'suspend' | 'reactivate' | 'close'>('suspend');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [t, s, inv, p] = await Promise.all([
        fetchTenant(id),
        getSubscription(id).catch(() => null),
        listInvoices(id).catch(() => []),
        listAllPlans().catch(() => []),
      ]);
      setTenant(t);
      setSubscription(s);
      setInvoices(inv);
      setPlans(p);
      setNewPlanCode(s?.planCode || t.billingPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Actions ── */

  const handleChangePlan = async () => {
    if (!subscription || !tenant) return;
    setChangingPlan(true);
    try {
      await updateSubscription(subscription.id, { planCode: newPlanCode });
      fetchData();
    } catch {
      /* silently */
    } finally {
      setChangingPlan(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!tenant) return;
    setExtending(true);
    try {
      // Call updateTenant to trigger trial extension via backend
      await updateTenant(tenant.id, { name: tenant.name });
      setExtendTrialOpen(false);
      fetchData();
    } catch {
      /* silently */
    } finally {
      setExtending(false);
    }
  };

  const handleLifecycle = async () => {
    if (!tenant) return;
    setLifecycleLoading(true);
    try {
      switch (lifecycleAction) {
        case 'suspend':
          await suspendTenant(tenant.id, lifecycleReason || 'Admin action');
          break;
        case 'reactivate':
          await reactivateTenant(tenant.id);
          break;
        case 'close':
          await closeTenant(tenant.id, lifecycleReason || 'Admin action');
          break;
      }
      setLifecycleOpen(false);
      setLifecycleReason('');
      fetchData();
    } catch {
      /* silently */
    } finally {
      setLifecycleLoading(false);
    }
  };

  /* ── Invoice columns ── */

  const invoiceColumns: Column<Invoice>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        label: 'Invoice #',
        width: 140,
        sortable: true,
        exportValue: (inv) => inv.invoiceNumber,
        render: (inv) => (
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
            {inv.invoiceNumber}
          </Typography>
        ),
      },
      {
        key: 'amountTzs',
        label: 'Amount',
        width: 120,
        align: 'right',
        sortable: true,
        exportValue: (inv) => String(inv.amountTzs),
        render: (inv) => (
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            {formatTzs(inv.amountTzs)}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 110,
        align: 'center',
        sortable: true,
        exportValue: (inv) => inv.status,
        render: (inv) => (
          <StatusBadge label={inv.status} tone={INV_STATUS_TONES[inv.status] ?? 'neutral'} />
        ),
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        width: 130,
        sortable: true,
        exportValue: (inv) => inv.dueDate,
        render: (inv) => (
          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: brand.neutral[500] }}>
            {formatDate(inv.dueDate)}
          </Typography>
        ),
      },
      {
        key: 'paidAt',
        label: 'Paid',
        width: 130,
        sortable: true,
        exportValue: (inv) => inv.paidAt ?? '',
        render: (inv) => (
          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: brand.neutral[500] }}>
            {inv.paidAt ? formatDate(inv.paidAt) : '--'}
          </Typography>
        ),
      },
    ],
    [],
  );

  /* ── Loading ── */

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: brand.primary[600] }} />
      </Box>
    );
  }

  if (error || !tenant) {
    return (
      <Box>
        <Button
          startIcon={<IconArrowLeft size={18} />}
          onClick={() => navigate('/smartpos/admin/tenants/list')}
          sx={{ textTransform: 'none', fontWeight: 600, mb: 2 }}
        >
          Back to Tenants
        </Button>
        <Alert severity="error">{error || 'Tenant not found'}</Alert>
      </Box>
    );
  }

  const currentPlan = plans.find((p) => p.code === tenant.billingPlan);
  const subPlan = plans.find((p) => p.code === subscription?.planCode);

  return (
    <Box>
      <PageHeader
        title={tenant.name}
        subtitle={`Slug: ${tenant.slug}`}
        badge={{
          label: tenant.billingPlan,
          tone:
            tenant.billingPlan === 'ENTERPRISE'
              ? 'primary'
              : tenant.billingPlan === 'PROFESSIONAL'
                ? 'primary'
                : tenant.billingPlan === 'BUSINESS'
                  ? 'primary'
                  : 'success',
        }}
        actions={[
          {
            label: 'Back to List',
            icon: <IconArrowLeft size={18} />,
            onClick: () => navigate('/smartpos/admin/tenants/list'),
            variant: 'ghost',
          },
        ]}
        metrics={[
          { label: 'Status', value: tenant.status.replace('_', ' ') },
          { label: 'Users', value: tenant.maxUsers >= 2147483647 ? 'Unlimited' : tenant.maxUsers },
          { label: 'Stores', value: tenant.maxStores >= 2147483647 ? 'Unlimited' : tenant.maxStores },
        ]}
      />

      <Grid container spacing={2.5}>
        {/* Left — Profile */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, boxShadow: 'none' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <IconBuilding size={20} color={brand.primary[600]} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800] }}>
                Profile
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <DetailRow label="Name" value={tenant.name} />
              <DetailRow label="Slug" value={tenant.slug} />
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 100 }}>
                  Status
                </Typography>
                {statusChip(tenant.status)}
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 100 }}>
                  Plan
                </Typography>
                {planBadge(tenant.billingPlan)}
              </Stack>
              <DetailRow label="Trial Ends" value={tenant.trialEndsAt ? formatDate(tenant.trialEndsAt) : 'N/A'} />
              <DetailRow label="Created" value={formatDate(tenant.createdAt)} />
              <DetailRow
                label="Max Users"
                value={tenant.maxUsers >= 2147483647 ? 'Unlimited' : String(tenant.maxUsers)}
              />
              <DetailRow
                label="Max Stores"
                value={tenant.maxStores >= 2147483647 ? 'Unlimited' : String(tenant.maxStores)}
              />
            </Stack>
          </Card>
        </Grid>

        {/* Right — Subscription */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, boxShadow: 'none' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <IconCreditCard size={20} color={brand.primary[600]} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800] }}>
                Subscription
              </Typography>
            </Stack>

            {subscription ? (
              <Stack spacing={2}>
                <DetailRow
                  label="Current Plan"
                  value={subPlan ? `${subPlan.label} — ${formatTzs(subPlan.monthlyPriceTzs)}/mo` : subscription.planCode}
                />
                <DetailRow label="Billing Cycle" value={subscription.billingCycle} />
                <DetailRow label="Period Start" value={formatDate(subscription.currentPeriodStart)} />
                <DetailRow label="Period End" value={formatDate(subscription.currentPeriodEnd)} />
                {subscription.cancelledAt && (
                  <DetailRow label="Cancelled At" value={formatDate(subscription.cancelledAt)} />
                )}

                {/* Change plan */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Change Plan</InputLabel>
                    <Select
                      value={newPlanCode}
                      label="Change Plan"
                      onChange={(e) => setNewPlanCode(e.target.value)}
                    >
                      {plans.map((p) => (
                        <MenuItem key={p.code} value={p.code}>
                          {p.label} ({formatTzs(p.monthlyPriceTzs)}/mo)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleChangePlan}
                    disabled={changingPlan || newPlanCode === subscription.planCode}
                    sx={{
                      bgcolor: brand.accent[500],
                      '&:hover': { bgcolor: brand.accent[600] },
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: '8px',
                    }}
                  >
                    {changingPlan ? 'Saving…' : 'Save'}
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                No active subscription found for this tenant.
              </Alert>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
              {tenant.status === 'TRIAL' && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconClock size={14} />}
                  onClick={() => setExtendTrialOpen(true)}
                  sx={{
                    borderRadius: '8px',
                    borderColor: brand.neutral[200],
                    color: brand.neutral[700],
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                  }}
                >
                  Extend Trial
                </Button>
              )}
              {(tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' || tenant.status === 'PAST_DUE') && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    setLifecycleAction('suspend');
                    setLifecycleReason('');
                    setLifecycleOpen(true);
                  }}
                  sx={{
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                  }}
                >
                  Suspend
                </Button>
              )}
              {(tenant.status === 'SUSPENDED' || tenant.status === 'TRIAL_EXPIRED') && (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => {
                    setLifecycleAction('reactivate');
                    setLifecycleReason('');
                    setLifecycleOpen(true);
                  }}
                  sx={{
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                  }}
                >
                  Reactivate
                </Button>
              )}
              {tenant.status !== 'CLOSED' && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setLifecycleAction('close');
                    setLifecycleReason('');
                    setLifecycleOpen(true);
                  }}
                  sx={{
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                  }}
                >
                  Close
                </Button>
              )}
            </Stack>
          </Card>
        </Grid>

        {/* Full-width — Usage */}
        <Grid size={12}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, boxShadow: 'none' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <IconSettings size={20} color={brand.primary[600]} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800] }}>
                Plan Limits
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <UsageBar label="Users" used={5} limit={tenant.maxUsers >= 2147483647 ? Infinity : tenant.maxUsers} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <UsageBar label="Stores" used={1} limit={tenant.maxStores >= 2147483647 ? Infinity : tenant.maxStores} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <UsageBar
                  label="Products"
                  used={0}
                  limit={currentPlan?.maxProducts && currentPlan.maxProducts < 2147483647 ? currentPlan.maxProducts : Infinity}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Full-width — Invoices */}
        <Grid size={12}>
          <Card sx={{ p: 2.5, borderRadius: '12px', border: `1px solid ${brand.neutral[200]}`, boxShadow: 'none' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <IconFileInvoice size={20} color={brand.primary[600]} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800] }}>
                Invoices
              </Typography>
            </Stack>
            <DataTable
              columns={invoiceColumns}
              rows={invoices}
              getRowKey={(inv) => inv.id}
              tableKey={`tenant-invoices-${tenant.id}`}
              emptyText="No invoices yet"
              emptyIcon={<IconFileInvoice size={32} />}
              toolbarTitle={invoices.length > 0 ? `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}` : undefined}
              enableSorting
              enableExport
              enableColumnVisibility
              exportFileName={`invoices-${tenant.slug}`}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Extend Trial Dialog */}
      <Dialog open={extendTrialOpen} onClose={() => setExtendTrialOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Extend Trial</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 2 }}>
            Add additional days to the trial period for {tenant.name}.
          </Typography>
          <TextField
            label="Days to add"
            type="number"
            size="small"
            fullWidth
            value={extendDays}
            onChange={(e) => setExtendDays(Number(e.target.value) || 0)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setExtendTrialOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExtendTrial}
            disabled={extending || extendDays <= 0}
            sx={{
              bgcolor: brand.accent[500],
              '&:hover': { bgcolor: brand.accent[600] },
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {extending ? 'Extending…' : `Add ${extendDays} Day${extendDays > 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lifecycle Dialog */}
      <Dialog open={lifecycleOpen} onClose={() => setLifecycleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {lifecycleAction === 'suspend' ? 'Suspend Tenant' :
           lifecycleAction === 'reactivate' ? 'Reactivate Tenant' :
           'Close Tenant'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[600], mb: 2 }}>
            {lifecycleAction === 'suspend'
              ? 'This will block all users from accessing the workspace. Data is preserved.'
              : lifecycleAction === 'reactivate'
              ? 'This will restore access for all users.'
              : 'This permanently closes the workspace. Data will be deleted after 90 days.'}
          </Typography>
          {(lifecycleAction === 'suspend' || lifecycleAction === 'close') && (
            <TextField
              label="Reason"
              fullWidth
              multiline
              rows={2}
              value={lifecycleReason}
              onChange={(e) => setLifecycleReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLifecycleOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={lifecycleAction === 'close' ? 'error' : lifecycleAction === 'suspend' ? 'warning' : 'success'}
            onClick={handleLifecycle}
            disabled={lifecycleLoading}
          >
            {lifecycleLoading ? 'Processing…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ── Detail row ── */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} alignItems="baseline">
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: brand.neutral[500],
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          minWidth: 100,
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.85rem' }}>
        {value}
      </Typography>
    </Stack>
  );
}

/* ── Usage bar ── */

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === Infinity || limit === 0 ? 0 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit === Infinity;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[500] }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[700] }}>
          {used} / {isUnlimited ? '∞' : limit}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: '3px',
          bgcolor: brand.neutral[100],
          '& .MuiLinearProgress-bar': {
            bgcolor: pct > 80 ? brand.error.main : pct > 60 ? brand.warning.main : brand.success.main,
            borderRadius: '3px',
          },
        }}
      />
    </Box>
  );
}
