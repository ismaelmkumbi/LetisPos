/**
 * AnomalyAlerts — renders up to 3 anomaly cards.
 *
 * Behaviour:
 * - On API error (including 500): renders nothing — anomalies are non-critical
 *   and a backend outage should not pollute the dashboard UI.
 * - On empty result: renders nothing (no "all clear" noise).
 */
import { useContext } from 'react';
import {
  Box, Card, CardActionArea, CardContent,
  LinearProgress, Stack, Typography,
} from '@mui/material';
import { IconAlertTriangle, IconChevronRight, IconInfoCircle } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { UUID } from 'src/api/smartpos/types';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { darkToneBg } from './utils';
import { useAnomalies } from './hooks';
import type { Anomaly } from 'src/api/smartpos/reports';

const NUM_FONT = "'JetBrains Mono', 'DM Mono', monospace";
const LBL_FONT = "'Outfit', 'DM Sans', sans-serif";

interface AnomalyAlertsProps {
  warehouseId: UUID | '';
  enabled?: boolean;
}

function AnomalyCard({ anomaly, isDark }: { anomaly: Anomaly; isDark: boolean }) {
  const isError = anomaly.severity === 'error';
  const color  = isError ? brand.error.main    : brand.warning.main;
  const bg     = isDark ? (isError ? darkToneBg.error : darkToneBg.warning) : isError ? '#FEF2F2' : '#FFFBEB';
  const border = isDark ? (isError ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.30)') : isError ? brand.error.light : brand.warning.light;
  const Icon   = isError ? IconInfoCircle      : IconAlertTriangle;

  const deviationLabel =
    anomaly.deviation > 0
      ? `${Math.abs(anomaly.deviation).toFixed(1)}× above avg`
      : `${Math.abs(anomaly.deviation).toFixed(1)}× below avg`;

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
        borderRadius: '10px',
        border: `1px solid ${border}`,
        bgcolor: bg,
        transition: 'transform 0.16s ease, box-shadow 0.16s ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 8px 20px rgba(15,23,42,0.08)' },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={reportLink}
        sx={{ color: 'inherit', textAlign: 'left', '& .MuiCardActionArea-focusHighlight': { bgcolor: `${color}18` } }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ color, display: 'grid', placeItems: 'center', mt: 0.15, flexShrink: 0 }}>
              <Icon size={18} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontFamily: LBL_FONT, color, fontWeight: 700, fontSize: 12.5 }}>
                {anomaly.metric} anomaly
              </Typography>
              <Typography sx={{ fontFamily: NUM_FONT, color: isDark ? brand.neutral[200] : brand.neutral[700], fontSize: 11.5, mt: 0.15 }}>
                {valueLabel} vs avg {avgLabel}
              </Typography>
              <Typography sx={{ fontFamily: LBL_FONT, color, fontWeight: 600, fontSize: 10.5, mt: 0.2 }}>
                {deviationLabel}
              </Typography>
            </Box>
            <IconChevronRight size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function AnomalyAlerts({ warehouseId, enabled = true }: AnomalyAlertsProps) {
  const { user } = useAuth();
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  const anomaliesQuery = useAnomalies(
    warehouseId || undefined,
    user?.tenantId,
    enabled,
  );

  const anomalies = anomaliesQuery.data ?? [];
  const loading = anomaliesQuery.isLoading;
  const failed = anomaliesQuery.isError;

  // Render nothing on error, on empty, or while loading with no prior data
  if (!enabled) return null;
  if (failed || (!loading && anomalies.length === 0)) return null;

  return (
    <Box>
      {loading && anomalies.length === 0 ? (
        <LinearProgress sx={{ borderRadius: '4px', height: 2, mb: 0.5 }} />
      ) : (
        <>
          <Typography
            sx={{
              fontFamily: LBL_FONT,
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: isDark ? brand.warning.main : brand.warning.dark,
              mb: 1,
            }}
          >
            ⚠ Anomalies detected
          </Typography>
          <Stack spacing={0.75}>
            {anomalies.slice(0, 3).map((a, i) => (
              <AnomalyCard key={`${a.metric}-${i}`} anomaly={a} isDark={isDark} />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

export default AnomalyAlerts;