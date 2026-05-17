import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { IconTrendingDown, IconTrendingUp, IconMinus } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import type { DemandForecast, ForecastedProduct } from 'src/api/smartpos/dashboardIntelligence';
import { cardSx, titleColor, muted, formatDateRange } from './utils';
import EmptyPanel from './EmptyPanel';

interface DemandForecastCardProps {
  data: DemandForecast | null;
  loading: boolean;
  isDark: boolean;
}

function trendChip(trend: ForecastedProduct['trend']) {
  const config: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    UP: {
      bg: brand.success.light,
      color: brand.success.dark,
      icon: <IconTrendingUp size={14} />,
      label: 'Up',
    },
    DOWN: {
      bg: brand.error.light,
      color: brand.error.dark,
      icon: <IconTrendingDown size={14} />,
      label: 'Down',
    },
    STABLE: {
      bg: brand.neutral[100],
      color: brand.neutral[700],
      icon: <IconMinus size={14} />,
      label: 'Stable',
    },
  };
  return config[trend] ?? config.STABLE;
}

function ForecastRow({
  product,
  isDark,
}: {
  product: ForecastedProduct;
  isDark: boolean;
}) {
  const chip = trendChip(product.trend);
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ px: 1, py: 0.75 }}
    >
      {/* Product name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13,
            color: titleColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {product.productName}
        </Typography>
      </Box>

      {/* Trend chip */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.4,
          px: 1,
          py: 0.3,
          borderRadius: '6px',
          bgcolor: chip.bg,
          flexShrink: 0,
          minWidth: 60,
        }}
      >
        {chip.icon}
        <Typography sx={{ fontWeight: 700, fontSize: 11, color: chip.color }}>
          {chip.label}
        </Typography>
      </Box>

      {/* Confidence bar */}
      <Box sx={{ width: 80, flexShrink: 0 }}>
        <Typography sx={{ fontSize: 10, color: muted(isDark), mb: 0.3, textAlign: 'right' }}>
          {Math.round(product.confidence)}%
        </Typography>
        <Box
          sx={{
            height: 5,
            borderRadius: '3px',
            bgcolor: isDark ? brand.neutral[700] : brand.neutral[200],
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${Math.min(product.confidence, 100)}%`,
              borderRadius: '3px',
              bgcolor:
                product.confidence >= 70
                  ? brand.success.main
                  : product.confidence >= 40
                    ? brand.warning.main
                    : brand.error.main,
              transition: 'width 0.4s ease',
            }}
          />
        </Box>
      </Box>

      {/* Projected demand */}
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 13,
          color: titleColor,
          flexShrink: 0,
          minWidth: 50,
          textAlign: 'right',
        }}
      >
        {product.projectedDemand.toLocaleString()}
      </Typography>
    </Stack>
  );
}

export default function DemandForecastCard({
  data,
  loading,
  isDark,
}: DemandForecastCardProps) {
  const hasData = data && data.products.length > 0;
  const products = data?.products ?? [];

  // Sort by projected demand descending, limit 5
  const top5 = [...products]
    .sort((a, b) => b.projectedDemand - a.projectedDemand)
    .slice(0, 5);

  const dateLabel = data ? formatDateRange(data.dateFrom, data.dateTo) : null;

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
          Demand Forecast
        </Typography>
        <Typography sx={{ color: muted(isDark), fontSize: 12, mt: 0.25, mb: 1.5 }}>
          Top products by projected demand{dateLabel ? ` — ${dateLabel}` : ''}
        </Typography>

        {loading && (
          <Stack spacing={0.5}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={36}
                sx={{ borderRadius: '8px' }}
              />
            ))}
          </Stack>
        )}

        {!loading && !hasData && (
          <EmptyPanel
            title="No forecast data"
            subtitle="No forecast data available yet."
            height={160}
            compact
          />
        )}

        {!loading && hasData && (
          <>
            {/* Header */}
            <Stack direction="row" sx={{ px: 1, pb: 0.5 }}>
              <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 11, color: muted(isDark) }}>
                Product
              </Typography>
              <Typography sx={{ width: 76, flexShrink: 0, fontWeight: 700, fontSize: 11, color: muted(isDark), textAlign: 'center' }}>
                Trend
              </Typography>
              <Typography sx={{ width: 80, flexShrink: 0, fontWeight: 700, fontSize: 11, color: muted(isDark), textAlign: 'right' }}>
                Confidence
              </Typography>
              <Typography sx={{ minWidth: 50, flexShrink: 0, fontWeight: 700, fontSize: 11, color: muted(isDark), textAlign: 'right' }}>
                Demand
              </Typography>
            </Stack>

            {/* Rows */}
            <Stack spacing={0.25}>
              {top5.map((item) => (
                <ForecastRow key={item.productId} product={item} isDark={isDark} />
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
