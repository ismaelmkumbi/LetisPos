/**
 * Letis POS — shared settings page sub-components.
 * Replaces duplicated SectionLabel / Hint / AlertCard across all settings pages
 * and provides the card design system consistent with the product module.
 */
import { forwardRef, type ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconInfoCircle } from '@tabler/icons-react';
import { brand, brandGradients } from 'src/theme/smartpos/brand';

// ── Card design system (matches ProductDetailPage) ───────────────────────────

export const cardSxBase = {
  borderRadius: '12px',
  bgcolor: '#fff',
  border: `1px solid ${brand.neutral[200]}`,
} as const;

export const cardSx = {
  ...cardSxBase,
  boxShadow: `
    0 1px 2px ${brand.neutral[900]}06,
    0 4px 12px ${brand.neutral[900]}05,
    0 12px 40px -16px ${brand.neutral[900]}0A
  `,
  transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
  '&:hover': {
    boxShadow: `
      0 1px 2px ${brand.neutral[900]}08,
      0 8px 20px ${brand.neutral[900]}08,
      0 24px 56px -20px ${brand.neutral[900]}14
    `,
    borderColor: brand.neutral[300],
  },
} as const;

export const cardSxStatic = {
  ...cardSxBase,
  boxShadow: `
    0 1px 2px ${brand.neutral[900]}06,
    0 4px 12px ${brand.neutral[900]}05,
    0 12px 40px -16px ${brand.neutral[900]}0A
  `,
} as const;

// ── Section label ─────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="caption" sx={{
      fontWeight: 700, color: brand.neutral[500], mb: 0.5,
      display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {children}
    </Typography>
  );
}

// ── Section title (icon + border-bottom, matching ProductDetailPage) ──────────

export function SectionTitle({ icon, title, action }: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center"
      sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${brand.neutral[100]}` }}>
      <Box sx={{ color: brand.primary[600], display: 'flex' }}>{icon}</Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[800], flex: 1 }}>
        {title}
      </Typography>
      {action && <Box sx={{ display: 'flex' }}>{action}</Box>}
    </Stack>
  );
}

// ── Hint tooltip ──────────────────────────────────────────────────────────────

export function Hint({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <Box component="span" sx={{
        ml: 0.5, cursor: 'help', color: brand.neutral[400], verticalAlign: 'middle',
      }}>
        <IconInfoCircle size={15} />
      </Box>
    </Tooltip>
  );
}

// ── Alert / toggle card ───────────────────────────────────────────────────────

export interface AlertCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accentColor?: string;
}

export function AlertCard({
  icon, title, description, checked, onChange, accentColor,
}: AlertCardProps) {
  const color = accentColor ?? brand.primary[500];
  return (
    <Card elevation={0} sx={{
      border: `1px solid ${checked ? color : brand.neutral[200]}`,
      borderRadius: '12px',
      bgcolor: checked ? `${color}08` : 'transparent',
      boxShadow: checked
        ? `0 1px 2px ${brand.neutral[900]}06, 0 4px 12px ${brand.neutral[900]}05`
        : 'none',
      transition: 'all 0.2s',
    }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: checked ? `${color}20` : brand.neutral[100],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            <Box sx={{ color: checked ? color : brand.neutral[400] }}>{icon}</Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{title}</Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{description}</Typography>
          </Box>
          <Switch checked={checked} onChange={(_, v) => onChange(v)} />
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Loading skeleton for a single card ────────────────────────────────────────

export function CardSkeleton({ height = 160 }: { height?: number }) {
  return (
    <Skeleton variant="rounded" height={height} sx={{ borderRadius: '12px' }} />
  );
}

// ── Loading skeleton group ────────────────────────────────────────────────────

export function CardSkeletonGroup({ heights = [160, 200, 180], count = 3 }: {
  heights?: number[];
  count?: number;
}) {
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 1680, mx: 'auto' }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} height={heights[i % heights.length]} />
      ))}
    </Stack>
  );
}

// ── Floating save bar ─────────────────────────────────────────────────────────

export interface FloatingSaveBarProps {
  saving: boolean;
  onSave: () => void;
  dirty?: boolean;
  saveLabel?: string;
  onReset?: () => void;
  resetting?: boolean;
  resetLabel?: string;
  lastSavedAt?: string;
}

export const FloatingSaveBar = forwardRef<HTMLDivElement, FloatingSaveBarProps>(function FloatingSaveBar({
  saving, onSave, dirty = true, saveLabel = 'Save Changes',
  onReset, resetting, resetLabel = 'Reset to defaults',
  lastSavedAt,
}, ref) {
  return (
    <Box ref={ref} sx={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 1200,
      backdropFilter: 'blur(12px)',
      bgcolor: 'rgba(255,255,255,0.85)',
      borderRadius: '16px',
      border: `1px solid ${brand.neutral[200]}`,
      boxShadow: `0 8px 32px ${brand.neutral[900]}12`,
      p: 0.75,
    }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pl: 0.75 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dirty ? brand.warning.main : brand.success.main, flexShrink: 0 }} />
        <Typography sx={{ color: brand.neutral[600], fontSize: 12, fontWeight: 600, mr: 0.5 }}>
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </Typography>
        {lastSavedAt && (
          <Typography variant="caption" sx={{ color: brand.neutral[400], mr: 0.5 }}>
            Last saved {lastSavedAt}
          </Typography>
        )}
        {onReset && (
          <Box
            component="button"
            onClick={onReset}
            disabled={resetting || saving}
            sx={{
              border: `1px solid ${brand.warning.main}30`,
              bgcolor: 'transparent',
              color: brand.warning.dark,
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'none',
              py: 0.75,
              px: 2,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: brand.warning.light, borderColor: brand.warning.main },
              '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
            }}
          >
            {resetting ? 'Resetting…' : resetLabel}
          </Box>
        )}
        <Box
          component="button"
          onClick={onSave}
          disabled={saving || !dirty}
          sx={{
            border: 'none',
            background: brandGradients.cta,
            color: '#fff',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.82rem',
            textTransform: 'none',
            py: 1,
            px: 2.5,
            cursor: 'pointer',
            boxShadow: `0 8px 24px ${brand.primary[500]}40`,
            transition: 'all 0.2s ease',
            '&:hover': {
              background: brand.primary[700],
              boxShadow: `0 12px 32px ${brand.primary[500]}60`,
              transform: 'translateY(-2px)',
            },
            '&:active': { transform: 'translateY(0)' },
            '&:disabled': { opacity: 0.6, cursor: 'not-allowed', transform: 'none' },
          }}
        >
          {saving ? 'Saving…' : dirty ? saveLabel : 'Saved'}
        </Box>
      </Stack>
    </Box>
  );
});
