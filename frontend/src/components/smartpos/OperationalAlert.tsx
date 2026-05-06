/**
 * Contextual operational alert for validation, risk, fraud, and info states.
 * Used across Returns, Quotations, and Sales for workflow guidance.
 */
import { Box, Stack, Typography, IconButton } from '@mui/material';
import {
  IconAlertTriangle,
  IconShield,
  IconInfoCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';

export type AlertContext = 'validation' | 'risk' | 'fraud' | 'info' | 'success';

export interface OperationalAlertProps {
  context: AlertContext;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  count?: number;
  onDismiss?: () => void;
}

const CONFIG: Record<
  AlertContext,
  { borderColor: string; bg: string; iconColor: string; Icon: typeof IconInfoCircle }
> = {
  validation: {
    borderColor: brand.operational.attention.dot,
    bg: brand.operational.attention.bg,
    iconColor: brand.operational.attention.dot,
    Icon: IconAlertTriangle,
  },
  risk: {
    borderColor: brand.operational.attention.dot,
    bg: brand.operational.attention.bg,
    iconColor: brand.operational.attention.dot,
    Icon: IconAlertTriangle,
  },
  fraud: {
    borderColor: brand.operational.critical.dot,
    bg: brand.operational.critical.bg,
    iconColor: brand.operational.critical.dot,
    Icon: IconShield,
  },
  info: {
    borderColor: brand.info.main,
    bg: brand.info.light,
    iconColor: brand.info.main,
    Icon: IconInfoCircle,
  },
  success: {
    borderColor: brand.success.main,
    bg: brand.success.light,
    iconColor: brand.success.main,
    Icon: IconCheck,
  },
};

export function OperationalAlert({
  context,
  title,
  message,
  action,
  count,
  onDismiss,
}: OperationalAlertProps) {
  const cfg = CONFIG[context];
  const { Icon } = cfg;

  return (
    <Box
      sx={{
        borderLeft: `3px solid ${cfg.borderColor}`,
        bgcolor: cfg.bg,
        borderRadius: '6px',
        px: 1.75,
        py: 1.25,
        mb: 2,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ color: cfg.iconColor, display: 'flex', flexShrink: 0 }}>
          <Icon size={16} stroke={2} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: brand.neutral[800] }}
            >
              {title}
            </Typography>
            {count !== undefined && count > 0 && (
              <Box
                sx={{
                  bgcolor: cfg.borderColor,
                  color: '#fff',
                  borderRadius: '10px',
                  px: 0.75,
                  py: 0.125,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {count}
              </Box>
            )}
          </Stack>
          {message && (
            <Typography
              variant="caption"
              sx={{ color: brand.neutral[500], display: 'block', mt: 0.25 }}
            >
              {message}
            </Typography>
          )}
          {action && (
            <Box
              component="button"
              onClick={action.onClick}
              sx={{
                mt: 0.75,
                background: 'none',
                border: 'none',
                p: 0,
                fontWeight: 600,
                fontSize: '0.75rem',
                color: brand.primary[700],
                cursor: 'pointer',
                '&:hover': { color: brand.primary[800], textDecoration: 'underline' },
              }}
            >
              {action.label}
            </Box>
          )}
        </Box>
        {onDismiss && (
          <IconButton size="small" onClick={onDismiss} sx={{ flexShrink: 0 }}>
            <IconX size={14} />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}

export default OperationalAlert;
