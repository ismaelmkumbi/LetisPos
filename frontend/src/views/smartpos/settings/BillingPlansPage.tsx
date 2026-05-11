import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { IconFileInvoice } from '@tabler/icons-react';

import { listAllPlans, type PlanDefinition } from 'src/api/smartpos/billing';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

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

export default function BillingPlansPage() {
  const [rows, setRows] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAllPlans()
      .then((data) => {
        if (!cancelled) {
          setRows(data);
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
  }, [refreshToken]);

  const columns: Column<PlanDefinition>[] = useMemo(
    () => [
      {
        key: 'plan',
        label: 'Plan',
        sortable: true,
        exportValue: (p) => p.label,
        render: (p) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '0.8125rem' }}
              noWrap
            >
              {p.label}
            </Typography>
            {p.code === 'BUSINESS' && (
              <Chip
                label="Popular"
                size="small"
                sx={{
                  height: 20,
                  fontWeight: 700,
                  fontSize: '0.625rem',
                  letterSpacing: '0.04em',
                  borderRadius: '5px',
                  bgcolor: brand.primary[100],
                  color: brand.primary[700],
                  '& .MuiChip-label': { px: 0.875 },
                }}
              />
            )}
          </Stack>
        ),
      },
      {
        key: 'monthlyPriceTzs',
        label: 'Monthly price',
        sortable: true,
        exportValue: (p) => String(p.monthlyPriceTzs),
        render: (p) => (
          <Typography
            variant="body2"
            sx={{ color: brand.neutral[700], fontWeight: 600, fontSize: '0.8125rem' }}
          >
            {formatTzs(p.monthlyPriceTzs)}
          </Typography>
        ),
      },
      {
        key: 'maxUsers',
        label: 'Users',
        align: 'center',
        width: 80,
        sortable: true,
        exportValue: (p) => String(p.maxUsers),
        render: (p) => (
          <Typography
            variant="body2"
            sx={{ color: brand.neutral[600], fontSize: '0.8125rem', fontWeight: 500 }}
          >
            {p.maxUsers === -1 ? 'Unlimited' : p.maxUsers}
          </Typography>
        ),
      },
      {
        key: 'maxStores',
        label: 'Stores',
        align: 'center',
        width: 80,
        sortable: true,
        exportValue: (p) => String(p.maxStores),
        render: (p) => (
          <Typography
            variant="body2"
            sx={{ color: brand.neutral[600], fontSize: '0.8125rem', fontWeight: 500 }}
          >
            {p.maxStores === -1 ? 'Unlimited' : p.maxStores}
          </Typography>
        ),
      },
      {
        key: 'maxProducts',
        label: 'Products',
        align: 'center',
        width: 90,
        sortable: true,
        exportValue: (p) => String(p.maxProducts),
        render: (p) => (
          <Typography
            variant="body2"
            sx={{ color: brand.neutral[600], fontSize: '0.8125rem', fontWeight: 500 }}
          >
            {p.maxProducts === -1 ? 'Unlimited' : p.maxProducts.toLocaleString()}
          </Typography>
        ),
      },
      {
        key: 'features',
        label: 'Key Features',
        sortable: false,
        exportValue: (p) => {
          const f = parseFeatures(p.features);
          return Object.entries(f)
            .filter(([, v]) => v)
            .map(([k]) => FEATURE_LABELS[k] || k)
            .join(', ');
        },
        render: (p) => {
          const f = parseFeatures(p.features);
          const keys = Object.keys(f).filter((k) => f[k]);
          return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {keys.map((fKey) => (
                <Chip
                  key={fKey}
                  label={FEATURE_LABELS[fKey] || fKey}
                  size="small"
                  sx={{
                    height: 20,
                    fontWeight: 600,
                    fontSize: '0.625rem',
                    borderRadius: '5px',
                    bgcolor: brand.neutral[100],
                    color: brand.neutral[700],
                    '& .MuiChip-label': { px: 0.875 },
                  }}
                />
              ))}
            </Stack>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Plans"
        subtitle="Define pricing tiers, limits, and feature gating"
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
        emptyText="No plans configured yet"
        emptyIcon={<IconFileInvoice size={32} />}
        getRowKey={(p) => p.id}
        tableKey="billing-plans"
        toolbarTitle={rows.length > 0 ? `${rows.length.toLocaleString()} plans` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`plans-${new Date().toISOString().slice(0, 10)}`}
      />
    </Box>
  );
}
