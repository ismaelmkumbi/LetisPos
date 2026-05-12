import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { IconAlertTriangle, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { getAnomalies, type Anomaly } from 'src/api/smartpos/reports';
import type { UUID } from 'src/api/smartpos/types';

interface AnomalyAlertsProps {
  warehouseId: UUID | '';
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const isError = anomaly.severity === 'error';
  const color = isError ? brand.error.main : brand.warning.main;
  const bg = isError ? '#FEF2F2' : '#FFFBEB';
  const border = isError ? brand.error.light : brand.warning.light;
  const Icon = isError ? IconInfoCircle : IconAlertTriangle;

  const deviationLabel =
    anomaly.deviation > 0
      ? `${Math.abs(anomaly.deviation).toFixed(1)}x above avg`
      : `${Math.abs(anomaly.deviation).toFixed(1)}x below avg`;

  const valueLabel =
    anomaly.metric === 'Order Count'
      ? formatNumber(anomaly.currentValue)
      : formatMoney(anomaly.currentValue);

  const avgLabel =
    anomaly.metric === 'Order Count'
      ? formatNumber(anomaly.averageValue)
      : formatMoney(anomaly.averageValue);

  const reportLink =
    anomaly.metric === 'Expenses'
      ? '/smartpos/reports/financial'
      : '/smartpos/reports/sales';

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: `1px solid ${border}`,
        bgcolor: bg,
        transition: 'transform 0.16s ease, box-shadow 0.16s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
        },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={reportLink}
        sx={{
          color: 'inherit',
          textAlign: 'left',
          '& .MuiCardActionArea-focusHighlight': { bgcolor: `${color}22` },
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box
              sx={{
                color,
                display: 'grid',
                placeItems: 'center',
                mt: 0.25,
              }}
            >
              <Icon size={20} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color, fontWeight: 800, fontSize: 13 }}>
                {anomaly.metric} Anomaly
              </Typography>
              <Typography sx={{ color: brand.neutral[700], fontSize: 12, mt: 0.2 }}>
                {valueLabel} vs avg {avgLabel}
              </Typography>
              <Typography
                sx={{
                  color,
                  fontWeight: 700,
                  fontSize: 11,
                  mt: 0.3,
                }}
              >
                {deviationLabel}
              </Typography>
            </Box>
            <IconChevronRight size={16} color={color} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function AnomalyAlerts({ warehouseId }: AnomalyAlertsProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAnomalies({
        warehouseId: warehouseId || undefined,
      });
      setAnomalies(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // Don't render if no anomalies and not loading
  if (!loading && !error && anomalies.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 900, fontSize: 15, mb: 1, color: brand.neutral[900] }}>
        Anomaly Alerts
      </Typography>

      {loading && (
        <LinearProgress sx={{ mb: 1, borderRadius: '4px' }} />
      )}

      {error && (
        <Typography sx={{ color: brand.error.main, fontSize: 12, mb: 1 }}>
          {error}
        </Typography>
      )}

      {!loading && anomalies.length > 0 && (
        <Stack spacing={1}>
          {anomalies.slice(0, 3).map((a, i) => (
            <AnomalyCard key={`${a.metric}-${i}`} anomaly={a} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
