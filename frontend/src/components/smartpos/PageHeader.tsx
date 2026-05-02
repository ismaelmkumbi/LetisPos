import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { brand } from 'src/theme/smartpos/brand';

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

export function PageHeader({ title, subtitle, badge, action, actions }: PageHeaderProps) {
  const allActions = actions ?? (action ? [action] : []);

  return (
    <Box sx={{ mb: 2.25 }}>
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
                  letterSpacing: 0,
                  lineHeight: 1.1,
                  color: brand.neutral[900],
                  fontSize: { xs: '1.65rem', md: '1.9rem' },
                }}
              >
                {title}
              </Typography>
              {badge && (
                <Chip
                  label={badge.label}
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    borderRadius: '6px',
                    ...BADGE_TONES[badge.tone ?? 'neutral'],
                  }}
                />
              )}
            </Stack>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{ color: brand.neutral[500], mt: 0.75, lineHeight: 1.4, fontWeight: 600 }}
              >
                {subtitle}
              </Typography>
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
