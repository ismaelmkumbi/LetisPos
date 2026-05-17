import {
  Box,
  Card,
  CardContent,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { IconCash } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import type { ProfitOpportunities, UnderpricedItem } from 'src/api/smartpos/dashboardIntelligence';
import { cardSx, titleColor, muted } from './utils';
import EmptyPanel from './EmptyPanel';

interface ProfitOpportunitiesCardProps {
  data: ProfitOpportunities | null;
  loading: boolean;
  isDark: boolean;
}

function marginColor(margin: number) {
  if (margin < 10) return brand.error.main;
  if (margin <= 15) return brand.warning.main;
  return brand.success.main;
}

function marginBgColor(margin: number) {
  if (margin < 10) return brand.error.light;
  if (margin <= 15) return brand.warning.light;
  return brand.success.light;
}

function OpportunityRow({
  item,
  isDark,
}: {
  item: UnderpricedItem;
  isDark: boolean;
}) {
  return (
    <Stack
      spacing={0.5}
      sx={{ px: 1, py: 0.75 }}
    >
      {/* Product name + category */}
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13,
            color: titleColor,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.productName}
        </Typography>
        <Typography sx={{ fontSize: 11, color: muted(isDark), flexShrink: 0 }}>
          {item.category}
        </Typography>
      </Stack>

      {/* Margin + impact + reason */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {/* Current margin badge */}
        <Box
          sx={{
            px: 1,
            py: 0.2,
            borderRadius: '4px',
            bgcolor: marginBgColor(item.currentMargin),
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 11, color: marginColor(item.currentMargin) }}>
            {item.currentMargin.toFixed(1)}% margin
          </Typography>
        </Box>

        {/* Estimated monthly impact */}
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: brand.success.dark, flexShrink: 0 }}>
          +{formatMoney(item.estimatedMonthlyImpact)}/mo
        </Typography>

        {/* Reason */}
        <Typography
          sx={{
            fontSize: 11,
            color: muted(isDark),
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.reason}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default function ProfitOpportunitiesCard({
  data,
  loading,
  isDark,
}: ProfitOpportunitiesCardProps) {
  const hasData = data && data.items.length > 0;
  const items = data?.items ?? [];
  const totalImpact = data?.totalEstimatedMonthlyImpact ?? 0;

  return (
    <Card
      elevation={0}
      sx={{
        ...cardSx(isDark),
        height: '100%',
        borderLeft: `3px solid ${brand.success.main}`,
      }}
    >
      <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
          <IconCash size={20} color={brand.success.main} />
          <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
            Profit Opportunities
          </Typography>
        </Stack>

        {loading && (
          <Stack spacing={0.75}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={52}
                sx={{ borderRadius: '8px' }}
              />
            ))}
          </Stack>
        )}

        {!loading && !hasData && (
          <EmptyPanel
            title="No underpriced items"
            subtitle="No underpriced items detected — margins look healthy."
            height={160}
            compact
          />
        )}

        {!loading && hasData && (
          <>
            <Stack spacing={0.25} sx={{ flex: 1 }}>
              {items.map((item) => (
                <OpportunityRow key={item.productId} item={item} isDark={isDark} />
              ))}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {/* Footer: total estimated monthly impact */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: titleColor }}>
                Total est. monthly impact
              </Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: brand.success.dark }}>
                +{formatMoney(totalImpact)}
              </Typography>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
