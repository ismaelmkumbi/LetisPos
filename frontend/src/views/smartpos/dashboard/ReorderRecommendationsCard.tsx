import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { IconShoppingCart } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import type { ReorderRecommendations, ReorderRecommendationItem } from 'src/api/smartpos/dashboardIntelligence';
import { cardSx, titleColor, muted } from './utils';
import EmptyPanel from './EmptyPanel';

interface ReorderRecommendationsCardProps {
  data: ReorderRecommendations | null;
  loading: boolean;
  isDark: boolean;
}

function urgencyBadge(urgency: ReorderRecommendationItem['urgency']) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    HIGH: { bg: brand.error.light, color: brand.error.dark, label: 'HIGH' },
    MEDIUM: { bg: brand.warning.light, color: brand.warning.dark, label: 'MED' },
    LOW: { bg: brand.neutral[100], color: brand.neutral[700], label: 'LOW' },
  };
  return config[urgency] ?? config.LOW;
}

function formatShortageDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Now';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays}d`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function RecommendationRow({
  item,
  onClick,
  isDark,
}: {
  item: ReorderRecommendationItem;
  onClick: () => void;
  isDark: boolean;
}) {
  const badge = urgencyBadge(item.urgency);
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '8px',
        border: 'none',
        bgcolor: 'transparent',
        '&:hover': { bgcolor: isDark ? brand.neutral[800] : brand.neutral[50] },
        transition: 'background-color 0.15s ease',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <Stack spacing={0.75} sx={{ px: 1.5, py: 1 }}>
        {/* Top row: urgency badge + product name */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              px: 1,
              py: 0.2,
              borderRadius: '4px',
              bgcolor: badge.bg,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 10, color: badge.color }}>
              {badge.label}
            </Typography>
          </Box>
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
            {item.productName}
          </Typography>
          {item.expectedShortageDate && (
            <Typography
              sx={{
                ml: 'auto',
                fontSize: 11,
                fontWeight: 600,
                color: item.urgency === 'HIGH' ? brand.error.main : muted(isDark),
                flexShrink: 0,
              }}
            >
              {formatShortageDate(item.expectedShortageDate)}
            </Typography>
          )}
        </Stack>

        {/* Bottom row: stock details */}
        <Stack direction="row" spacing={2}>
          <Typography sx={{ fontSize: 11, color: muted(isDark) }}>
            Stock:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: titleColor }}>
              {item.currentStock}
            </Box>
            {' / min '}
            <Box component="span" sx={{ fontWeight: 700, color: titleColor }}>
              {item.minQty}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 11, color: muted(isDark) }}>
            Suggested:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: titleColor }}>
              {item.suggestedQty}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 11, color: muted(isDark) }}>
            Velocity:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: titleColor }}>
              {item.dailyVelocity.toFixed(1)}/day
            </Box>
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}

export default function ReorderRecommendationsCard({
  data,
  loading,
  isDark,
}: ReorderRecommendationsCardProps) {
  const navigate = useNavigate();
  const hasData = (data?.recommendations?.length ?? 0) > 0;
  const recommendations = data?.recommendations ?? [];

  return (
    <Card
      elevation={0}
      sx={{
        ...cardSx(isDark),
        height: '100%',
        borderLeft: `3px solid ${brand.warning.main}`,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
          <IconShoppingCart size={20} color={brand.warning.main} />
          <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
            Reorder Recommendations
          </Typography>
        </Stack>

        {loading && (
          <Stack spacing={0.75}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={64}
                sx={{ borderRadius: '8px' }}
              />
            ))}
          </Stack>
        )}

        {!loading && !hasData && (
          <EmptyPanel
            title="No reorder recommendations"
            subtitle="No reorder recommendations — all stock levels are healthy."
            height={160}
            compact
          />
        )}

        {!loading && hasData && (
          <>
            <Stack spacing={0.25}>
              {recommendations.map((item) => (
                <RecommendationRow
                  key={item.productId}
                  item={item}
                  onClick={() => navigate(`/smartpos/products/${item.productId}`)}
                  isDark={isDark}
                />
              ))}
            </Stack>

            <Typography
              sx={{
                color: muted(isDark),
                fontSize: 11,
                mt: 1.5,
                textAlign: 'center',
              }}
            >
              Click a row to view product details
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}
