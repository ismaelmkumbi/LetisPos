import { Box, Button, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import {
  IconAlertTriangle,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { cardSx, titleColor } from './utils';
import type { Dashboard } from 'src/api/smartpos/reports';
import type { Trend, AlertStripProps } from './types';

function AlertStrip({ tone, icon, title, subtitle, to }: AlertStripProps) {
  const map = {
    success: { color: brand.primary[600], bg: '#F0FDF4', border: brand.primary[100] },
    warning: { color: brand.warning.main, bg: '#FFFBEB', border: brand.warning.light },
    error: { color: brand.error.main, bg: '#FEF2F2', border: brand.error.light },
  };
  const current = map[tone];
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: `1px solid ${current.border}`,
        bgcolor: current.bg,
        height: '100%',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
          borderColor: current.color,
        },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={to}
        sx={{
          height: '100%',
          color: 'inherit',
          textAlign: 'left',
          '& .MuiCardActionArea-focusHighlight': { bgcolor: current.color },
        }}
      >
        <CardContent sx={{ p: 1.35, '&:last-child': { pb: 1.35 } }}>
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Box sx={{ color: current.color, display: 'grid', placeItems: 'center' }}>{icon}</Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color: current.color, fontWeight: 800, fontSize: 13 }}>
                {title}
              </Typography>
              <Typography sx={{ color: brand.neutral[700], fontSize: 11.5, mt: 0.2 }}>
                {subtitle}
              </Typography>
            </Box>
            <IconChevronRight size={18} color={brand.neutral[700]} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

interface DashboardSideRailProps {
  data: Dashboard | null;
  revenueTrend: Trend | null;
  isDark: boolean;
  paymentTotal: number;
  expiringBatchesCount: number;
  expiringUnitsAtRisk: number;
}

export default function DashboardSideRail({
  data,
  revenueTrend,
  isDark,
  paymentTotal,
  expiringBatchesCount,
  expiringUnitsAtRisk,
}: DashboardSideRailProps) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        position: { xl: 'sticky' },
        top: { xl: 82 },
      }}
    >
      <Box>
        <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 15, mb: 1 }}>
          Today needs attention
        </Typography>
        <Stack spacing={1}>
          <AlertStrip
            tone="warning"
            icon={<IconAlertTriangle size={22} />}
            title={`${formatNumber(data?.inventory.lowStockLines ?? 0)} low-stock items`}
            subtitle="Review stock levels and restock decisions"
            to="/smartpos/stock"
          />
          {expiringBatchesCount > 0 && (
            <AlertStrip
              tone="warning"
              icon={<IconClock size={22} />}
              title={`${expiringBatchesCount} batch${expiringBatchesCount !== 1 ? 'es' : ''} expiring within 30 days`}
              subtitle={`${expiringUnitsAtRisk} unit${expiringUnitsAtRisk !== 1 ? 's' : ''} at risk — review expiry dates`}
              to="/smartpos/stock?expiring=30"
            />
          )}
          <AlertStrip
            tone="error"
            icon={<IconInfoCircle size={22} />}
            title={
              data && data.netProfit < 0
                ? 'Profit is negative'
                : 'Review profit health'
            }
            subtitle="Compare sales, purchases, and expenses"
            to="/smartpos/reports"
          />
          <AlertStrip
            tone="success"
            icon={<IconCircleCheck size={22} />}
            title={
              revenueTrend
                ? `Sales ${revenueTrend.positive ? 'up' : 'down'} ${revenueTrend.value.toFixed(0)}%`
                : 'Sales trend pending'
            }
            subtitle={revenueTrend ? 'Open the sales report' : 'Record more sales to calculate movement'}
            to="/smartpos/reports"
          />
        </Stack>
      </Box>

      <Card elevation={0} sx={cardSx(isDark)}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 15, mb: 1.25 }}>
            Quick actions
          </Typography>
          <Stack spacing={1}>
            <Button
              component={RouterLink as React.ElementType}
              to="/smartpos/sales/new"
              variant="contained"
              fullWidth
              sx={{
                justifyContent: 'space-between',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                bgcolor: brand.primary[600],
                '&:hover': { bgcolor: brand.primary[700] },
              }}
              endIcon={<IconChevronRight size={17} />}
            >
              New sale
            </Button>
            <Button
              component={RouterLink as React.ElementType}
              to="/smartpos/products"
              variant="outlined"
              fullWidth
              sx={{
                justifyContent: 'space-between',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
                color: titleColor,
              }}
              endIcon={<IconChevronRight size={17} />}
            >
              Manage stock
            </Button>
            <Button
              component={RouterLink as React.ElementType}
              to="/smartpos/reports"
              variant="outlined"
              fullWidth
              sx={{
                justifyContent: 'space-between',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
                color: titleColor,
              }}
              endIcon={<IconChevronRight size={17} />}
            >
              View reports
            </Button>
          </Stack>

          <Box
            sx={{
              mt: 1.5,
              p: 1.25,
              borderRadius: '10px',
              bgcolor: isDark ? brand.neutral[900] : brand.neutral[50],
              border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
            }}
          >
            <Typography sx={{ color: isDark ? brand.neutral[400] : brand.neutral[500], fontSize: 12, fontWeight: 700 }}>
              Payments captured
            </Typography>
            <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 20, mt: 0.25 }}>
              {formatMoney(paymentTotal)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
