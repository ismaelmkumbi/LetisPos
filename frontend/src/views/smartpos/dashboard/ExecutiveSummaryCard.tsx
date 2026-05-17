import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconBulb,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconRefresh,
  IconTarget,
} from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, muted } from './utils';
import EmptyPanel from './EmptyPanel';
import type { ExecutiveSummary } from 'src/api/smartpos/dashboardIntelligence';

// ── Helpers ────────────────────────────────────────────────────────────────────

const NEGATIVE_WORDS = /\b(decreas|declin|dropp|fell|down|negativ|worsen|lower|reduc|loss|lost|shrink|slow|weak)\w*\b/i;

function isNegativeChange(text: string): boolean {
  return NEGATIVE_WORDS.test(text);
}

function bulletIcon(category: string, text: string) {
  switch (category) {
    case 'HEADLINE':
      return <IconBulb size={16} />;
    case 'CHANGE':
      return isNegativeChange(text) ? <IconArrowDown size={16} /> : <IconArrowUp size={16} />;
    case 'ATTENTION':
      return <IconAlertTriangle size={16} />;
    case 'RECOMMENDATION':
      return <IconTarget size={16} />;
    default:
      return null;
  }
}

function bulletColor(category: string) {
  switch (category) {
    case 'HEADLINE':
      return brand.primary[600];
    case 'CHANGE':
      return brand.info.main;
    case 'ATTENTION':
      return brand.warning.main;
    case 'RECOMMENDATION':
      return brand.accent[600];
    default:
      return brand.neutral[500];
  }
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ExecutiveSummaryCardProps {
  data: ExecutiveSummary | null;
  loading: boolean;
  onRefresh: () => void;
  isDark: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ExecutiveSummaryCard({
  data,
  loading,
  onRefresh,
  isDark,
}: ExecutiveSummaryCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card
        elevation={0}
        sx={{
          ...cardSx(isDark),
          minHeight: 204,
          background: isDark
            ? `linear-gradient(135deg, ${brand.neutral[800]} 0%, ${brand.neutral[900]} 58%, #0A1A12 100%)`
            : 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 58%, #F0F9FF 100%)',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Skeleton width="40%" height={22} />
          <Skeleton width="90%" height={16} sx={{ mt: 2 }} />
          <Skeleton width="80%" height={16} sx={{ mt: 1.25 }} />
          <Skeleton width="60%" height={16} sx={{ mt: 1.25 }} />
          <Skeleton width="70%" height={16} sx={{ mt: 1.25 }} />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Skeleton variant="rounded" width={80} height={26} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rounded" width={80} height={26} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rounded" width={80} height={26} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rounded" width={80} height={26} sx={{ borderRadius: '8px' }} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!data) {
    return (
      <Card
        elevation={0}
        sx={{
          ...cardSx(isDark),
          minHeight: 204,
          background: isDark
            ? `linear-gradient(135deg, ${brand.neutral[800]} 0%, ${brand.neutral[900]} 58%, #0A1A12 100%)`
            : 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 58%, #F0F9FF 100%)',
        }}
      >
        <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ color: titleColor, fontWeight: 800, fontSize: 15 }}>
              Executive Summary
            </Typography>
            <IconButton size="small" onClick={onRefresh} sx={{ color: muted(isDark) }}>
              <IconRefresh size={16} />
            </IconButton>
          </Stack>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyPanel title="No summary available yet" subtitle="" height={80} compact />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ── Data state ──────────────────────────────────────────────────────────

  const { bullets, kpiSnapshot, alertSummary, provider } = data;
  const churnPct = kpiSnapshot.churnRisk * 100;

  return (
    <Card
      elevation={0}
      sx={{
        ...cardSx(isDark),
        background: isDark
          ? `linear-gradient(135deg, ${brand.neutral[800]} 0%, ${brand.neutral[900]} 58%, #0A1A12 100%)`
          : 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 58%, #F0F9FF 100%)',
      }}
    >
      <CardContent sx={{ p: 2.5, pb: collapsed ? 2.5 : 2 }}>
        {/* ── Header row ──────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography sx={{ color: titleColor, fontWeight: 800, fontSize: 15, mr: 1 }}>
            Executive Summary
          </Typography>
          {provider === 'llm' && (
            <Chip
              label="AI"
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 800,
                bgcolor: brand.info.light,
                color: brand.info.dark,
                borderRadius: '6px',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={onRefresh} sx={{ color: muted(isDark) }}>
            <IconRefresh size={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setCollapsed((v) => !v)}
            sx={{ color: muted(isDark) }}
          >
            {collapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
          </IconButton>
        </Stack>

        {/* ── Bullets ─────────────────────────────────────────────────────── */}
        <Collapse in={!collapsed}>
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {bullets.map((bp, i) => {
              const color = bulletColor(bp.category);
              return (
                <Stack
                  key={i}
                  direction="row"
                  alignItems="flex-start"
                  spacing={1}
                  sx={{ color }}
                >
                  <Box sx={{ mt: '2px', flexShrink: 0 }}>{bulletIcon(bp.category, bp.text)}</Box>
                  <Typography
                    sx={{
                      color: isDark ? brand.neutral[200] : brand.neutral[800],
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.55,
                      flex: 1,
                    }}
                  >
                    {bp.text}
                  </Typography>
                  {bp.linkTo && (
                    <IconChevronRight
                      size={14}
                      style={{
                        color: muted(isDark),
                        flexShrink: 0,
                        marginTop: 2,
                        cursor: 'pointer',
                      }}
                    />
                  )}
                </Stack>
              );
            })}
          </Stack>

          {/* ── KPI footer ──────────────────────────────────────────────── */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 2,
              pt: 1.5,
              borderTop: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[100]}`,
            }}
          >
            <Chip
              label={`${formatMoney(kpiSnapshot.revenue)}`}
              size="small"
              sx={kpiChipSx(isDark, brand.success.light, brand.success.dark)}
            />
            <Chip
              label={`${kpiSnapshot.profitMargin.toFixed(1)}% margin`}
              size="small"
              sx={kpiChipSx(isDark, brand.primary[100], brand.primary[700])}
            />
            <Chip
              label={`${alertSummary.stockAlerts} stock`}
              size="small"
              sx={kpiChipSx(
                isDark,
                brand.warning.light,
                brand.warning.dark,
              )}
            />
            <Chip
              label={`${churnPct.toFixed(1)}% churn`}
              size="small"
              sx={kpiChipSx(
                isDark,
                brand.accent[100],
                brand.accent[700],
              )}
            />
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// ── Mini KPI chip style ───────────────────────────────────────────────────────

function kpiChipSx(isDark: boolean, bg: string, fg: string) {
  return {
    height: 24,
    fontSize: 11,
    fontWeight: 700,
    bgcolor: isDark ? `${bg}22` : bg,
    color: fg,
    borderRadius: '8px',
    '& .MuiChip-label': { px: 1 },
  };
}
