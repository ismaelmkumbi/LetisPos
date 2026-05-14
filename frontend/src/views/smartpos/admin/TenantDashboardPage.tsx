import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconBuilding,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconBan,
  IconCash,
  IconPlus,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';

import { listAllTenants, type Tenant } from 'src/api/smartpos/auth';
import { listAllPlans, type PlanDefinition } from 'src/api/smartpos/billing';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
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

function daysFromNow(iso: string) {
  const d = new Date(iso).getTime() - Date.now();
  return Math.ceil(d / (1000 * 60 * 60 * 24));
}

function formatTzs(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ── Stat card ── */

function StatCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card
      sx={{
        p: 2,
        borderRadius: '12px',
        border: `1px solid ${brand.neutral[200]}`,
        boxShadow: 'none',
        height: '100%',
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: brand.neutral[500],
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: '0.6875rem',
            }}
          >
            {label}
          </Typography>
          <Box sx={{ color, display: 'flex', opacity: 0.8 }}>{icon}</Box>
        </Stack>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: '1.75rem',
            color: brand.neutral[900],
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}

/* ── Trial expiry row ── */

interface TrialRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  daysLeft: number;
  trialEndsAt: string;
}

/* ── Activity row ── */

interface ActivityRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: string;
}

/* ── Page ── */

export default function TenantDashboardPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listAllTenants(), listAllPlans()])
      .then(([t, p]) => {
        if (!cancelled) {
          setTenants(t);
          setPlans(p);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── KPIs ── */

  const kpis = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.status === 'ACTIVE').length;
    const trial = tenants.filter((t) => t.status === 'TRIAL').length;
    const pastDue = tenants.filter((t) => t.status === 'PAST_DUE').length;
    const suspended = tenants.filter((t) => t.status === 'SUSPENDED').length;

    // MRR: sum plan prices for ACTIVE tenants
    const planMap = new Map(plans.map((p) => [p.code, p]));
    let mrr = 0;
    tenants
      .filter((t) => t.status === 'ACTIVE')
      .forEach((t) => {
        const plan = planMap.get(t.billingPlan);
        if (plan) mrr += plan.monthlyPriceTzs;
      });

    return { total, active, trial, pastDue, suspended, mrr };
  }, [tenants, plans]);

  /* ── Trials expiring within 7 days ── */

  const trialsExpiring = useMemo<TrialRow[]>(() => {
    return tenants
      .filter((t) => t.status === 'TRIAL' && t.trialEndsAt)
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.billingPlan,
        daysLeft: daysFromNow(t.trialEndsAt!),
        trialEndsAt: t.trialEndsAt!,
      }))
      .filter((t) => t.daysLeft <= 7 && t.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [tenants]);

  /* ── Recent activity ── */

  const recentActivity = useMemo<ActivityRow[]>(() => {
    return tenants
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.billingPlan,
        status: t.status,
        createdAt: t.createdAt,
      }));
  }, [tenants]);

  /* ── Columns ── */

  const trialColumns: Column<TrialRow>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Tenant',
        sortable: true,
        render: (r) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: '0.8125rem', color: brand.neutral[800] }}
          >
            {r.name}
          </Typography>
        ),
      },
      {
        key: 'plan',
        label: 'Plan',
        width: 120,
        render: (r) => planBadge(r.plan),
      },
      {
        key: 'daysLeft',
        label: 'Expires',
        width: 130,
        sortable: true,
        render: (r) => (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <IconClock size={14} color={r.daysLeft <= 2 ? brand.error.main : brand.warning.main} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontSize: '0.8125rem',
                color: r.daysLeft <= 2 ? brand.error.main : brand.warning.dark,
              }}
            >
              {r.daysLeft === 0 ? 'Today' : `${r.daysLeft} day${r.daysLeft > 1 ? 's' : ''}`}
            </Typography>
          </Stack>
        ),
      },
    ],
    [],
  );

  const activityColumns: Column<ActivityRow>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Tenant',
        sortable: true,
        render: (r) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: '0.8125rem', color: brand.neutral[800] }}
          >
            {r.name}
          </Typography>
        ),
      },
      {
        key: 'plan',
        label: 'Plan',
        width: 120,
        render: (r) => planBadge(r.plan),
      },
      {
        key: 'status',
        label: 'Status',
        width: 120,
        render: (r) => statusChip(r.status),
      },
      {
        key: 'createdAt',
        label: 'Created',
        width: 140,
        sortable: true,
        render: (r) => (
          <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: brand.neutral[500] }}>
            {formatDate(r.createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  );

  /* ── Render ── */

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: brand.primary[600] }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Tenant 360"
        subtitle="Unified administration hub for all tenant operations"
        actions={[
          {
            label: 'Create Tenant',
            icon: <IconPlus size={18} />,
            onClick: () => navigate('/smartpos/admin/tenants/list'),
            variant: 'accent',
          },
          {
            label: 'Manage Plans',
            icon: <IconSettings size={18} />,
            onClick: () => navigate('/smartpos/admin/billing/plans'),
            variant: 'ghost',
          },
        ]}
      />

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="Total Tenants"
            value={kpis.total}
            icon={<IconBuilding size={20} />}
            color={brand.primary[600]}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="Active"
            value={kpis.active}
            icon={<IconCheck size={20} />}
            color={brand.success.main}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="Trials"
            value={kpis.trial}
            icon={<IconClock size={20} />}
            color={brand.info.main}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="Past Due"
            value={kpis.pastDue}
            icon={<IconAlertTriangle size={20} />}
            color={brand.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="Suspended"
            value={kpis.suspended}
            icon={<IconBan size={20} />}
            color={brand.error.main}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatCard
            label="MRR"
            value={formatTzs(kpis.mrr)}
            icon={<IconCash size={20} />}
            color={brand.primary[600]}
            subtitle="from active tenants"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Trials expiring soon */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: '12px',
              border: `1px solid ${brand.warning.main}`,
              boxShadow: 'none',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <IconAlertTriangle size={20} color={brand.warning.main} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800] }}>
                Trials Expiring Soon
              </Typography>
              {trialsExpiring.length > 0 && (
                <Chip
                  label={trialsExpiring.length}
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: '0.675rem',
                    bgcolor: brand.warning.light,
                    color: brand.warning.dark,
                  }}
                />
              )}
            </Stack>
            {trialsExpiring.length === 0 ? (
              <Typography variant="body2" sx={{ color: brand.neutral[400], py: 2, textAlign: 'center' }}>
                No trials expiring in the next 7 days.
              </Typography>
            ) : (
              <DataTable
                columns={trialColumns}
                rows={trialsExpiring}
                getRowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/smartpos/admin/tenants/${r.id}`)}
                tableKey="trials-expiring"
                emptyText="No trials expiring soon"
                toolbarTitle={`${trialsExpiring.length} trial${trialsExpiring.length > 1 ? 's' : ''} expiring`}
              />
            )}
          </Card>
        </Grid>

        {/* Recent activity */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: 'none',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <IconUsers size={20} color={brand.primary[600]} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800] }}>
                Recent Activity
              </Typography>
            </Stack>
            <DataTable
              columns={activityColumns}
              rows={recentActivity}
              getRowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/smartpos/admin/tenants/${r.id}`)}
              tableKey="recent-tenants"
              emptyText="No tenants yet"
              toolbarTitle="Newest 5 tenants"
            />
          </Card>
        </Grid>
      </Grid>

      {/* Quick links */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconBuilding size={16} />}
          onClick={() => navigate('/smartpos/admin/tenants/list')}
          sx={{
            borderRadius: '8px',
            borderColor: brand.neutral[200],
            color: brand.neutral[700],
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'none',
            '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
          }}
        >
          View All Tenants
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconSettings size={16} />}
          onClick={() => navigate('/smartpos/admin/billing/plans')}
          sx={{
            borderRadius: '8px',
            borderColor: brand.neutral[200],
            color: brand.neutral[700],
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'none',
            '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
          }}
        >
          Manage Plans
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconCash size={16} />}
          onClick={() => navigate('/smartpos/admin/billing/invoices')}
          sx={{
            borderRadius: '8px',
            borderColor: brand.neutral[200],
            color: brand.neutral[700],
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'none',
            '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
          }}
        >
          View Invoices
        </Button>
      </Stack>
    </Box>
  );
}
