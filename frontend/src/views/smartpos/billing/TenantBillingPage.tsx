/**
 * Letis POS -- Tenant self-service billing page.
 *
 * Shows current plan, usage vs limits, invoice history, and payment methods.
 * NOT the admin billing dashboard — for tenant users managing their own subscription.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid2 as Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { IconArrowUp } from '@tabler/icons-react';

import {
  getSubscription,
  listPlans,
  type PlanDefinition,
  type Subscription,
} from 'src/api/smartpos/billing';
import { fetchTenants, type Tenant } from 'src/api/smartpos/auth';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

export default function TenantBillingPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [ts, p] = await Promise.all([
          fetchTenants(),
          listPlans(),
        ]);
        if (cancelled) return;
        const t = ts[0] ?? null;
        setTenant(t);
        setPlans(p);

        if (t) {
          try {
            const sub = await getSubscription(t.id);
            if (!cancelled) setSubscription(sub);
          } catch {
            /* no subscription yet — not an error */
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load billing data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const currentPlan = plans.find(
    (p) => p.code === (subscription?.planCode ?? tenant?.billingPlan),
  );

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
        title="Billing"
        subtitle="Manage your subscription, view invoices, and update payment methods"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Current Plan */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Current Plan
              </Typography>

              <Typography variant="h4" sx={{ fontWeight: 800, color: brand.neutral[900] }}>
                {currentPlan?.label ?? tenant?.billingPlan ?? 'Free'}
              </Typography>

              {currentPlan && currentPlan.monthlyPriceTzs > 0 && (
                <Typography variant="body2" sx={{ color: brand.neutral[500], mt: 0.5 }}>
                  TZS {currentPlan.monthlyPriceTzs.toLocaleString()}
                  {subscription?.billingCycle === 'ANNUAL' ? '/year' : '/month'}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                {subscription && (
                  <Chip
                    label={subscription.status}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      borderRadius: '6px',
                      ...(subscription.status === 'ACTIVE'
                        ? { bgcolor: brand.success.light, color: brand.success.dark }
                        : subscription.status === 'PAST_DUE'
                          ? { bgcolor: brand.warning.light, color: brand.warning.dark }
                          : { bgcolor: brand.neutral[100], color: brand.neutral[700] }),
                    }}
                  />
                )}
                {subscription && (
                  <Chip
                    label={subscription.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      borderRadius: '6px',
                      borderColor: brand.neutral[200],
                      color: brand.neutral[600],
                    }}
                  />
                )}
              </Stack>

              {subscription?.currentPeriodEnd && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: brand.neutral[500] }}>
                  Next billing date:{' '}
                  <Box component="span" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-TZ', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Box>
                </Typography>
              )}

              <Button
                variant="outlined"
                sx={{
                  mt: 2,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderColor: brand.primary[300],
                  color: brand.primary[700],
                  '&:hover': {
                    borderColor: brand.primary[500],
                    bgcolor: brand.primary[50],
                  },
                }}
                startIcon={<IconArrowUp size={16} />}
              >
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Usage
              </Typography>

              {tenant && currentPlan ? (
                <Stack spacing={2.5}>
                  {([
                    { key: 'maxUsers' as const, label: 'Users' },
                    { key: 'maxStores' as const, label: 'Stores' },
                    { key: 'maxProducts' as const, label: 'Products' },
                  ]).map(({ key, label }) => {
                    const limit = currentPlan[key];
                    const isUnlimited = limit >= 2147483647;
                    return (
                      <Box key={key}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: brand.neutral[600], fontWeight: 500 }}>
                            {label}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                            &mdash; / {isUnlimited ? 'Unlimited' : limit.toLocaleString()}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={0}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: brand.neutral[100],
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor: brand.primary[500],
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
                  No plan information available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
