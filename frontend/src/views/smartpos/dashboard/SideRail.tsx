/**
 * DashboardSideRail — right column sticky panel.
 *
 * Changes:
 * - Removed "Quick actions" card entirely (per product decision)
 * - "Today needs attention" is now fully data-driven:
 *     - Low-stock alert only shown when lowStockLines > 0
 *     - Expiring batches only when expiringBatchesCount > 0
 *     - At-risk customers only when atRiskCustomerCount > 0
 *     - Negative profit alert only when profit < 0
 *     - Sales trend shown only when revenueTrend is available
 *     - If nothing needs attention → shows a clean "All looks good" state
 * - Typography: Outfit for labels, JetBrains Mono for values
 * - Alert cards use a left-border strip instead of full-bg tint for density
 */
import {
  Box, Card, CardActionArea, CardContent, Stack, Typography,
} from '@mui/material';
import {
  IconAlertTriangle, IconArrowDown, IconTrendingDown,
  IconTrendingUp, IconArrowUp, IconChevronRight,
  IconCircleCheck, IconClock,
} from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { cardSx, titleColor } from './utils';
import type { Dashboard } from 'src/api/smartpos/reports';
import type { Trend, AlertStripProps } from './types';

const LBL_FONT = "'Outfit', 'DM Sans', sans-serif";
const NUM_FONT = "'JetBrains Mono', 'DM Mono', monospace";

// ── Alert strip ──────────────────────────────────────────────────────────────
const TONE = {
  success: { color: brand.primary[600],  bg: brand.primary[50],   border: brand.primary[100]  },
  warning: { color: brand.warning.main,  bg: '#FFFBEB',           border: brand.warning.light },
  error:   { color: brand.error.main,    bg: '#FEF2F2',           border: brand.error.light   },
  fraud:   { color: brand.error.main,    bg: '#FEF2F2',           border: brand.error.light   },
} as const;

function AlertStrip({ tone, icon, title, subtitle, to }: AlertStripProps) {
  const { color, border } = TONE[tone];
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '9px',
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        bgcolor: 'transparent',
        transition: 'box-shadow 0.14s ease',
        '&:hover': { boxShadow: '0 6px 16px rgba(15,23,42,0.07)' },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{ color: 'inherit', textAlign: 'left', '& .MuiCardActionArea-focusHighlight': { bgcolor: `${color}10` } }}
      >
        <CardContent sx={{ p: '10px 12px', '&:last-child': { pb: '10px' } }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {icon}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <Typography sx={{ fontFamily: LBL_FONT, color, fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography sx={{ fontFamily: LBL_FONT, color: brand.neutral[500], fontSize: 11, mt: 0.15, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <IconChevronRight size={14} color={brand.neutral[400]} style={{ flexShrink: 0 }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface DashboardSideRailProps {
  data: Dashboard | null;
  revenueTrend: Trend | null;
  isDark: boolean;
  paymentTotal: number;
  expiringBatchesCount: number;
  expiringUnitsAtRisk: number;
  anomalySlot?: React.ReactNode;
  atRiskCustomerCount?: number;
  atRiskRevenue?: number;
}

export default function DashboardSideRail({
  data,
  revenueTrend,
  isDark,
  paymentTotal,
  expiringBatchesCount,
  expiringUnitsAtRisk,
  anomalySlot,
  atRiskCustomerCount = 0,
  atRiskRevenue = 0,
}: DashboardSideRailProps) {
  const lowStock    = data?.inventory.lowStockLines ?? 0;
  const isLoss      = (data?.netProfit ?? 0) < 0;

  // Build the attention items dynamically — only show what genuinely needs it
  const attentionItems: React.ReactNode[] = [];

  if (lowStock > 0) {
    attentionItems.push(
      <AlertStrip
        key="low-stock"
        tone="warning"
        icon={<IconAlertTriangle size={17} />}
        title={`${formatNumber(lowStock)} low-stock item${lowStock !== 1 ? 's' : ''}`}
        subtitle="Review stock levels before running out"
        to="/smartpos/stock"
      />,
    );
  }

  if (expiringBatchesCount > 0) {
    attentionItems.push(
      <AlertStrip
        key="expiring"
        tone="warning"
        icon={<IconClock size={17} />}
        title={`${expiringBatchesCount} batch${expiringBatchesCount !== 1 ? 'es' : ''} expiring soon`}
        subtitle={`${formatNumber(expiringUnitsAtRisk)} units at risk within 30 days`}
        to="/smartpos/stock?expiring=30"
      />,
    );
  }

  if (atRiskCustomerCount > 0) {
    attentionItems.push(
      <AlertStrip
        key="churn"
        tone="warning"
        icon={<IconAlertTriangle size={17} />}
        title={`${atRiskCustomerCount} customer${atRiskCustomerCount !== 1 ? 's' : ''} at churn risk`}
        subtitle={`${formatMoney(atRiskRevenue)} lifetime value at stake`}
        to="/smartpos/customers?segment=at-risk"
      />,
    );
  }

  if (isLoss) {
    attentionItems.push(
      <AlertStrip
        key="profit"
        tone="error"
        icon={<IconArrowDown size={17} />}
        title="Profit is negative this period"
        subtitle="Review expenses vs sales in reports"
        to="/smartpos/reports"
      />,
    );
  }

  if (revenueTrend) {
    attentionItems.push(
      <AlertStrip
        key="trend"
        tone={revenueTrend.positive ? 'success' : 'warning'}
        icon={revenueTrend.positive ? <IconTrendingUp size={17} /> : <IconTrendingDown size={17} />}
        title={`Sales ${revenueTrend.positive ? 'up' : 'down'} ${revenueTrend.value.toFixed(0)}% vs prior`}
        subtitle={revenueTrend.positive ? 'Open the sales report' : 'Review contributing factors'}
        to="/smartpos/reports/sales"
      />,
    );
  }

  return (
    <Stack
      spacing={1.5}
      sx={{
        pr: { xl: 0.5 },
        /* thin custom scrollbar */
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: isDark ? brand.neutral[700] : brand.neutral[200],
          borderRadius: 4,
        },
        scrollbarWidth: 'thin',
        scrollbarColor: `${isDark ? brand.neutral[700] : brand.neutral[200]} transparent`,
        pb: 2,
      }}
    >
      {/* Anomaly alerts slot */}
      {anomalySlot}

      {/* Today needs attention */}
      <Box>
        <Typography
          sx={{
            fontFamily: LBL_FONT,
            color: isDark ? brand.neutral[300] : brand.neutral[700],
            fontWeight: 700,
            fontSize: 13,
            mb: 1,
            letterSpacing: '-0.01em',
          }}
        >
          Today needs attention
        </Typography>

        {attentionItems.length > 0 ? (
          <Stack spacing={0.75}>
            {attentionItems}
          </Stack>
        ) : (
          /* All-clear state — compact, not noisy */
          <Box
            sx={{
              p: 1.5,
              borderRadius: '10px',
              border: `1px solid ${brand.primary[100]}`,
              borderLeft: `3px solid ${brand.primary[500]}`,
              bgcolor: isDark ? '#052e16' : brand.primary[50],
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <IconCircleCheck size={18} color={brand.primary[600]} />
              <Box>
                <Typography sx={{ fontFamily: LBL_FONT, color: brand.primary[700], fontWeight: 700, fontSize: 12.5 }}>
                  All looks good
                </Typography>
                <Typography sx={{ fontFamily: LBL_FONT, color: brand.primary[600], fontSize: 11, mt: 0.1 }}>
                  No issues detected today
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Payments captured summary */}
      <Card elevation={0} sx={{ ...cardSx(isDark) }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography
            sx={{
              fontFamily: LBL_FONT,
              color: isDark ? brand.neutral[400] : brand.neutral[500],
              fontWeight: 600,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              mb: 0.5,
            }}
          >
            Payments captured
          </Typography>
          <Typography
            sx={{
              fontFamily: NUM_FONT,
              color: isDark ? '#F1F5F9' : titleColor,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {formatMoney(paymentTotal)}
          </Typography>
          <Typography
            sx={{
              fontFamily: LBL_FONT,
              color: isDark ? brand.neutral[500] : brand.neutral[400],
              fontSize: 11,
              mt: 0.4,
            }}
          >
            total across all methods
          </Typography>

          {/* Trend indicator */}
          {revenueTrend && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1.25 }}>
              <Box sx={{ color: revenueTrend.positive ? brand.primary[600] : brand.error.main }}>
                {revenueTrend.positive
                  ? <IconArrowUp size={14} />
                  : <IconArrowDown size={14} />
                }
              </Box>
              <Typography
                sx={{
                  fontFamily: NUM_FONT,
                  color: revenueTrend.positive ? brand.primary[600] : brand.error.main,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {revenueTrend.value.toFixed(1)}%
              </Typography>
              <Typography sx={{ fontFamily: LBL_FONT, color: brand.neutral[400], fontSize: 11 }}>
                vs previous period
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
