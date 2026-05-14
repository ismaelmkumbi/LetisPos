/**
 * LimitGate — in-page toast when user hits or approaches a plan limit.
 *
 * Renders a dismissible card (not a modal). Two variants:
 * - "reached": Hard limit hit (e.g., 2/2 users). Warning tone, upgrade CTA.
 * - "approaching": Limit near (e.g., 1/1 store, adding another). Info tone, see-plans CTA.
 *
 * Usage: <LimitGate current={users.length} max={tenant.maxUsers} resource="users" />
 */
import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { Link } from 'react-router';
import { wb } from 'src/theme/smartpos/warmBrutalism';

interface LimitGateProps {
  current: number;
  max: number;
  resource: 'users' | 'stores' | 'products';
  /** Show "approaching" variant at this ratio (default 1.0 = only when reached) */
  warnAt?: number; // 0–1 ratio of current/max
}

const RESOURCE_LABELS: Record<string, { singular: string; plural: string }> = {
  users: { singular: 'user', plural: 'users' },
  stores: { singular: 'store', plural: 'stores' },
  products: { singular: 'product', plural: 'products' },
};

export default function LimitGate({ current, max, resource, warnAt = 1.0 }: LimitGateProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const ratio = max > 0 ? current / max : 0;
  const isReached = current >= max;
  const isApproaching = ratio >= warnAt && !isReached;

  if (!isReached && !isApproaching) return null;

  const labels = RESOURCE_LABELS[resource] ?? { singular: resource, plural: `${resource}s` };
  const label = current === 1 ? labels.singular : labels.plural;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: wb.radius.lg,
        border: `1px solid ${isReached ? 'rgba(194,132,58,0.2)' : '#bfdbfe'}`,
        bgcolor: isReached ? wb.goldLight : '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 200 }}>
        <Typography sx={{ fontSize: '1.3rem' }}>{isReached ? '⚠' : 'ℹ'}</Typography>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: isReached ? '#92400e' : '#1e40af' }}>
            {isReached
              ? `${label.charAt(0).toUpperCase() + label.slice(1)} limit reached — ${current} of ${max}`
              : `Adding more ${label}?`}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: isReached ? '#a16207' : '#3b82f6', lineHeight: 1.4 }}>
            {isReached
              ? `Upgrade to a higher plan to add more ${label}.`
              : `Your current plan supports ${max} ${label}. Upgrade to add more.`}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          component={Link}
          to="/smartpos/billing"
          size="small"
          sx={{
            bgcolor: isReached ? wb.gold : '#2563eb',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.75rem',
            borderRadius: wb.radius.md,
            px: 2,
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: isReached ? '#d4953f' : '#1d4ed8' },
          }}
        >
          {isReached ? 'Upgrade →' : 'See plans →'}
        </Button>
        <Button
          size="small"
          onClick={() => setDismissed(true)}
          sx={{
            minWidth: 0,
            p: 0.5,
            color: isReached ? '#a16207' : '#64748b',
            '&:hover': { bgcolor: 'transparent', opacity: 0.7 },
          }}
        >
          <IconX size={14} />
        </Button>
      </Stack>
    </Box>
  );
}
