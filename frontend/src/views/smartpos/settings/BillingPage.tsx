import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconCreditCard,
  IconReceipt,
  IconSettings,
} from '@tabler/icons-react';

import { listPlans, type PlanDefinition } from 'src/api/smartpos/billing';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { useNavigate } from 'react-router';

const FEATURE_LABELS: Record<string, string> = {
  accounting: 'Accounting',
  purchases: 'Purchases',
  reports: 'Reports',
  hrm: 'HR & Payroll',
  api: 'API Access',
  multi_currency: 'Multi-currency',
  multi_company: 'Multi-company',
  white_label: 'White-label',
  support: 'Support',
};

function formatTzs(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseFeatures(features: string): Record<string, boolean> {
  try {
    return JSON.parse(features);
  } catch {
    return {};
  }
}

export default function BillingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPlans()
      .then((data) => {
        if (!cancelled) {
          setPlans(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load plans');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box>
      <PageHeader
        title="Subscription & Billing"
        subtitle="Manage plans, subscriptions, and payment methods"
        actions={[
          {
            label: 'Manage Plans',
            icon: <IconSettings size={18} />,
            onClick: () => navigate('/smartpos/admin/billing/plans'),
          },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: brand.primary[600] }} />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {plans.map((plan) => {
            const isPopular = plan.code === 'BUSINESS';
            const features = parseFeatures(plan.features);
            const enabledFeatures = Object.entries(features)
              .filter(([, v]) => v)
              .map(([k]) => k);

            return (
              <Grid key={plan.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    border: `1.5px solid ${isPopular ? brand.primary[400] : brand.neutral[200]}`,
                    bgcolor: isPopular ? brand.primary[50] : '#fff',
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: isPopular ? brand.primary[500] : brand.neutral[300],
                      boxShadow: `0 4px 16px ${brand.neutral[900]}0A`,
                    },
                  }}
                >
                  {isPopular && (
                    <Chip
                      label="Most popular"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        bgcolor: brand.primary[600],
                        color: '#fff',
                        borderRadius: '6px',
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                  )}

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      color: brand.neutral[800],
                      fontSize: '0.95rem',
                      mb: 0.5,
                    }}
                  >
                    {plan.label}
                  </Typography>

                  <Stack direction="row" alignItems="baseline" spacing={0.25} sx={{ mb: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: '1.75rem',
                        color: brand.neutral[900],
                        letterSpacing: '-0.5px',
                      }}
                    >
                      {formatTzs(plan.monthlyPriceTzs)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                      /mo
                    </Typography>
                  </Stack>

                  {plan.description && (
                    <Typography
                      variant="body2"
                      sx={{ color: brand.neutral[600], fontSize: '0.8125rem', mb: 2, lineHeight: 1.5 }}
                    >
                      {plan.description}
                    </Typography>
                  )}

                  <Stack spacing={0.75} sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: brand.primary[500],
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: brand.neutral[700], fontWeight: 600, fontSize: '0.8125rem' }}>
                        {plan.maxUsers === -1 ? 'Unlimited users' : `${plan.maxUsers} users`}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: brand.primary[500],
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: brand.neutral[700], fontWeight: 600, fontSize: '0.8125rem' }}>
                        {plan.maxStores === -1 ? 'Unlimited stores' : `${plan.maxStores} stores`}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: brand.primary[500],
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: brand.neutral[700], fontWeight: 600, fontSize: '0.8125rem' }}>
                        {plan.maxProducts === -1 ? 'Unlimited products' : `${plan.maxProducts.toLocaleString()} products`}
                      </Typography>
                    </Stack>
                  </Stack>

                  {enabledFeatures.length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                      {enabledFeatures.map((fKey) => (
                        <Chip
                          key={fKey}
                          label={FEATURE_LABELS[fKey] || fKey}
                          size="small"
                          sx={{
                            height: 20,
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            borderRadius: '5px',
                            bgcolor: brand.neutral[100],
                            color: brand.neutral[700],
                            '& .MuiChip-label': { px: 0.875 },
                          }}
                        />
                      ))}
                    </Stack>
                  )}

                  <Box sx={{ mt: 'auto' }}>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<IconReceipt size={14} />}
                        disabled
                        sx={{
                          borderRadius: '8px',
                          borderColor: brand.neutral[200],
                          color: brand.neutral[500],
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          py: 0.25,
                          minHeight: 30,
                        }}
                      >
                        View Invoices
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<IconCreditCard size={14} />}
                        disabled
                        sx={{
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          py: 0.25,
                          minHeight: 30,
                          bgcolor: brand.primary[600],
                          '&:hover': { bgcolor: brand.primary[700] },
                        }}
                      >
                        Subscribe
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
