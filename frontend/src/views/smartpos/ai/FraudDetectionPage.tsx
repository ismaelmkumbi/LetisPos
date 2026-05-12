/**
 * Fraud Detection — AI-powered anomaly detection for suspicious transactions.
 * Uses real fraud detection API backed by ai-service.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconRefresh,
  IconEye,
  IconShieldCheck,
  IconBug,
  IconX,
} from '@tabler/icons-react';

import { DataTable, StatusBadge, type Column } from 'src/components/smartpos/DataTable';
import { MetricCard } from 'src/components/smartpos/MetricCard';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { getFraudAlerts, type FlaggedTransaction as FraudAlert } from 'src/api/smartpos/ai';

const STATUS_TONES: Record<string, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  reviewed: 'success',
  dismissed: 'neutral',
};

const columns: Column<FraudAlert>[] = [
  { key: 'transactionId', label: 'Transaction ID', sortable: true, render: (row) => (
    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[900], fontSize: '0.85rem', fontFamily: 'monospace' }}>
      {row.transactionId}
    </Typography>
  )},
  { key: 'amount', label: 'Amount', align: 'right', sortable: true, render: (row) => (
    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
      TZS {row.amount.toLocaleString()}
    </Typography>
  )},
  { key: 'type', label: 'Type', sortable: true, render: (row) => (
    <Chip label={row.type} size="small" sx={{
      height: 22, fontWeight: 700, fontSize: '0.68rem', borderRadius: '6px',
      bgcolor: row.type.includes('Void') ? brand.error.light : row.type.includes('Refund') ? brand.warning.light : row.type.includes('After Hours') ? brand.purple.light : row.type.includes('Discount') ? brand.info.light : brand.warning.light,
      color: row.type.includes('Void') ? brand.error.dark : row.type.includes('Refund') ? brand.warning.dark : row.type.includes('After Hours') ? brand.purple.dark : row.type.includes('Discount') ? brand.info.dark : brand.warning.dark,
    }} />
  )},
  { key: 'riskScore', label: 'Risk Score', sortable: true, render: (row) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 100 }}>
      <LinearProgress
        variant="determinate"
        value={row.riskScore}
        sx={{
          flex: 1,
          height: 6,
          borderRadius: '3px',
          bgcolor: brand.neutral[100],
          '& .MuiLinearProgress-bar': {
            bgcolor: row.riskScore >= 80 ? brand.error.main : row.riskScore >= 60 ? brand.warning.main : brand.success.main,
            borderRadius: '3px',
          },
        }}
      />
      <Typography variant="caption" sx={{ fontWeight: 700, color: brand.neutral[700], minWidth: 28 }}>
        {row.riskScore}
      </Typography>
    </Stack>
  )},
  { key: 'detectedAt', label: 'Detected At', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true, render: (row) => (
    <StatusBadge label={row.status.charAt(0).toUpperCase() + row.status.slice(1)} tone={STATUS_TONES[row.status]} />
  )},
  { key: 'actions', label: 'Actions', align: 'center', render: (row) => (
    row.status === 'pending' ? (
      <Button
        size="small"
        variant="outlined"
        startIcon={<IconEye size={14} />}
        onClick={(e) => {
          e.stopPropagation();
          // Placeholder — would open a review drawer in production
        }}
        sx={{
          borderRadius: '8px',
          borderColor: brand.neutral[300],
          color: brand.neutral[700],
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'none',
          py: 0.25,
          px: 1,
          minHeight: 28,
          '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
        }}
      >
        Review
      </Button>
    ) : (
      <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
        {row.status === 'reviewed' ? 'Complete' : 'Dismissed'}
      </Typography>
    )
  )},
];

export default function FraudDetectionPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFraudAlerts();
      setAlerts(data);
      setLoaded(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load fraud alerts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first render
  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const today = new Date().toISOString().split('T')[0];
  const flaggedToday = alerts.filter((a) => a.detectedAt.startsWith(today)).length;
  const underReview = alerts.filter((a) => a.status === 'pending').length;
  const confirmedFraud = alerts.filter((a) => a.status === 'reviewed').length;
  const falsePositives = alerts.filter((a) => a.status === 'dismissed').length;

  return (
    <>
      <PageHeader
        title="Fraud Detection"
        subtitle="AI-powered anomaly detection for suspicious transactions"
        action={{
          label: 'Refresh Alerts',
          icon: loading ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />,
          onClick: loadAlerts,
          variant: 'ghost',
        }}
      />

      {/* Stat cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
        <MetricCard
          label="Flagged Today"
          value={flaggedToday}
          icon={<IconAlertTriangle size={16} />}
        />
        <MetricCard
          label="Under Review"
          value={underReview}
          icon={<IconBug size={16} />}
        />
        <MetricCard
          label="Confirmed Fraud"
          value={confirmedFraud}
          icon={<IconShieldCheck size={16} />}
        />
        <MetricCard
          label="False Positives"
          value={falsePositives}
          icon={<IconX size={16} />}
        />
      </Stack>

      {/* Info banner */}
      <Card
        elevation={0}
        sx={{
          mb: 2.5,
          p: 2,
          border: `1px solid ${brand.error.light}`,
          borderRadius: '8px',
          bgcolor: brand.error.light,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <IconAlertTriangle size={18} color={brand.error.main} style={{ marginTop: 2 }} />
          <Typography variant="body2" sx={{ color: brand.error.dark, fontWeight: 500, lineHeight: 1.5 }}>
            Fraud detection runs automatically on all transactions. Alerts appear here for manual review.
          </Typography>
        </Stack>
      </Card>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" onClick={loadAlerts} startIcon={<IconRefresh size={14} />}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Data table */}
      {loaded || loading ? (
        <DataTable<FraudAlert>
          columns={columns}
          rows={alerts}
          loading={loading}
          emptyText="No fraud alerts detected"
          itemLabel="alerts"
          tableKey="ai-fraud-detection"
          enableSorting
          toolbarTitle="Alert Log"
          emptyAction={{ label: 'Refresh', onClick: loadAlerts }}
        />
      ) : (
        !loading && (
          <Card
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: '8px',
              bgcolor: brand.neutral[50],
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                bgcolor: brand.neutral[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <IconShieldCheck size={28} color={brand.neutral[400]} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: brand.neutral[700], mb: 0.5 }}>
              No alerts loaded
            </Typography>
            <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 3 }}>
              Load fraud detection alerts to review suspicious transactions.
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconRefresh size={16} />}
              onClick={loadAlerts}
              sx={{
                bgcolor: brand.accent[500],
                '&:hover': { bgcolor: brand.accent[600] },
                fontWeight: 700,
                borderRadius: '10px',
              }}
            >
              Load Alerts
            </Button>
          </Card>
        )
      )}
    </>
  );
}
