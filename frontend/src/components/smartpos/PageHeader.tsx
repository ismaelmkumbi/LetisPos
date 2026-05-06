import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconChevronRight } from '@tabler/icons-react';
import { Link } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { StatusIndicator, type OperationalState } from './StatusIndicator';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'accent' | 'ghost';
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; tone?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' };
  action?: PageHeaderAction;
  actions?: PageHeaderAction[];
  /** Breadcrumb trail rendered above the title */
  breadcrumbs?: BreadcrumbItem[];
  /** Operational status indicator (register state, workflow state) */
  status?: { state: OperationalState; label: string };
  /** Compact metric pills shown next to the badge */
  metrics?: { label: string; value: string | number }[];
  /** Live indicator with pulsing dot and text */
  liveIndicator?: { text: string };
}

const BADGE_TONES = {
  primary: { bg: brand.primary[50],    color: brand.primary[700] },
  success: { bg: brand.success.light,  color: brand.success.dark },
  warning: { bg: brand.warning.light,  color: brand.warning.dark },
  error:   { bg: brand.error.light,    color: brand.error.dark },
  neutral: { bg: brand.neutral[100],   color: brand.neutral[700] },
};

const ACTION_STYLES = {
  primary: {
    variant: 'contained' as const,
    sx: {
      background: `linear-gradient(135deg, ${brand.primary[500]} 0%, ${brand.primary[700]} 100%)`,
      '&:hover': {
        background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[800]} 100%)`,
      },
    },
  },
  accent: {
    variant: 'contained' as const,
    sx: {
      background: `linear-gradient(135deg, ${brand.accent[400]} 0%, ${brand.accent[600]} 100%)`,
      '&:hover': {
        background: `linear-gradient(135deg, ${brand.accent[500]} 0%, ${brand.accent[700]} 100%)`,
      },
    },
  },
  ghost: {
    variant: 'outlined' as const,
    sx: {
      borderColor: brand.neutral[300],
      color: brand.neutral[700],
      '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
    },
  },
};

export function PageHeader({
  title, subtitle, badge, action, actions,
  breadcrumbs, status, metrics, liveIndicator,
}: PageHeaderProps) {
  const allActions = actions ?? (action ? [action] : []);

  return (
    <Box sx={{ mb: 2.25 }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.25 }}>
          {breadcrumbs.map((b, i) => (
            <Stack key={i} direction="row" spacing={0.5} alignItems="center">
              {i > 0 && <IconChevronRight size={12} color={brand.neutral[400]} stroke={2} />}
              {b.href ? (
                <Typography
                  component={Link}
                  to={b.href}
                  variant="caption"
                  sx={{
                    color: brand.neutral[500],
                    fontWeight: 500,
                    textDecoration: 'none',
                    '&:hover': { color: brand.primary[600] },
                  }}
                >
                  {b.label}
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: brand.neutral[700], fontWeight: 600 }}>
                  {b.label}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                  color: brand.neutral[900],
                  fontSize: { xs: '1.8rem', md: '2.1rem' },
                }}
              >
                {title}
              </Typography>
              {badge && (
                <Chip
                  label={badge.label}
                  size="small"
                  sx={{
                    height: 24,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    borderRadius: '8px',
                    ...BADGE_TONES[badge.tone ?? 'neutral'],
                  }}
                />
              )}
              {status && (
                <Box sx={{ ml: 0.5 }}>
                  <StatusIndicator state={status.state} label={status.label} size="sm" pulse />
                </Box>
              )}
            </Stack>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{ color: brand.neutral[500], mt: 0.75, lineHeight: 1.4, fontWeight: 600, fontSize: '0.9rem' }}
              >
                {subtitle}
              </Typography>
            )}
            {/* Metrics pills */}
            {metrics && metrics.length > 0 && (
              <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                {metrics.map((m, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                      {m.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
                      {m.value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
            {/* Live indicator */}
            {liveIndicator && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }}>
                <Box
                  sx={{
                    width: 6, height: 6, borderRadius: '50%',
                    bgcolor: brand.success.main,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.4 },
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                  {liveIndicator.text}
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>

        {allActions.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', rowGap: 1 }}>
            {allActions.map((a, i) => {
              const style = ACTION_STYLES[a.variant ?? (i === allActions.length - 1 ? 'accent' : 'ghost')];
              return (
                <Button
                  key={i}
                  variant={style.variant}
                  onClick={a.onClick}
                  startIcon={a.icon}
                  sx={{
                    minHeight: 46,
                    px: 2,
                    fontWeight: 800,
                    borderRadius: '10px',
                    textTransform: 'none',
                    boxShadow: style.variant === 'contained' ? `0 12px 24px -16px ${brand.primary[800]}` : 'none',
                    ...style.sx,
                  }}
                >
                  {a.label}
                </Button>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export default PageHeader;
