import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconSettings, IconTarget } from '@tabler/icons-react';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import { cardSx, titleColor } from './utils';
import type { GoalProgressProps } from './types';

interface Goals {
  monthlyRevenueTarget: number;
  dailyOrdersTarget: number;
  profitMarginTarget: number;
}

const STORAGE_PREFIX = 'dashboard:goals:';

function loadGoals(tenantId: string): Goals {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tenantId}`);
    if (raw) return JSON.parse(raw) as Goals;
  } catch { /* ignore corrupt storage */ }
  return { monthlyRevenueTarget: 0, dailyOrdersTarget: 0, profitMarginTarget: 0 };
}

function saveGoals(tenantId: string, goals: Goals) {
  localStorage.setItem(`${STORAGE_PREFIX}${tenantId}`, JSON.stringify(goals));
}

function ProgressRow({
  label,
  current,
  target,
  format,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  format: (v: number) => string;
  unit: string;
  color: string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = target > 0 ? target - current : 0;

  let pacingLabel = '';
  let pacingColor: string = brand.neutral[400];
  if (target > 0 && pct > 0) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = now.getDate();
    const expectedPct = label === 'Daily Orders' ? 100 : (daysElapsed / daysInMonth) * 100;
    if (pct >= expectedPct * 0.9) { pacingLabel = 'On track'; pacingColor = brand.success.main; }
    else if (pct >= expectedPct * 0.7) { pacingLabel = 'Slightly behind'; pacingColor = brand.warning.main; }
    else { pacingLabel = 'At risk'; pacingColor = brand.error.main; }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
        <Typography sx={{ color: titleColor, fontWeight: 800, fontSize: 13 }}>
          {label}
        </Typography>
        <Typography sx={{ color: brand.neutral[600], fontSize: 12 }}>
          {target > 0 ? `${format(current)} / ${format(target)} ${unit}` : 'No target set'}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: '4px',
          bgcolor: `${color}1A`,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: '4px' },
        }}
      />
      {target > 0 && (
        <Stack direction="row" alignItems="center" sx={{ mt: 0.4 }}>
          <Typography sx={{ color: brand.neutral[500], fontSize: 11 }}>
            {pct >= 100
              ? 'Target reached!'
              : `${format(remaining)} ${unit} to go (${pct.toFixed(0)}%)`}
          </Typography>
          {pacingLabel && (
            <Chip
              label={pacingLabel}
              size="small"
              sx={{
                height: 20, fontSize: 10, fontWeight: 700, ml: 1,
                bgcolor: pacingColor + '22', color: pacingColor,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}

export default function GoalProgress({
  currentRevenue,
  currentOrders,
  currentMargin,
  tenantId,
}: GoalProgressProps) {
  const { activeMode: _am } = useContext(CustomizerContext);
  const isDark = _am === 'dark';
  const [goals, setGoals] = useState<Goals>(() => loadGoals(tenantId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Goals>(goals);

  const openDialog = () => {
    setDraft(goals);
    setDialogOpen(true);
  };

  const handleSave = () => {
    setGoals(draft);
    saveGoals(tenantId, draft);
    setDialogOpen(false);
  };

  return (
    <>
      <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1.5 }}
          >
            <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
              Goal Progress
            </Typography>
            <IconButton size="small" onClick={openDialog}>
              <IconSettings size={18} color={brand.neutral[500]} />
            </IconButton>
          </Stack>

          <Stack spacing={1.75}>
            <ProgressRow
              label="Monthly Revenue"
              current={currentRevenue}
              target={goals.monthlyRevenueTarget}
              format={formatMoney}
              unit=""
              color={brand.primary[600]}
            />
            <ProgressRow
              label="Daily Orders"
              current={currentOrders}
              target={goals.dailyOrdersTarget}
              format={formatNumber}
              unit="orders"
              color={brand.info.main}
            />
            <ProgressRow
              label="Profit Margin"
              current={currentMargin}
              target={goals.profitMarginTarget}
              format={(v) => `${v.toFixed(1)}%`}
              unit=""
              color={brand.warning.main}
            />
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <IconTarget size={22} color={brand.primary[600]} />
          Set Your Goals
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Monthly Revenue Target"
              type="number"
              fullWidth
              value={draft.monthlyRevenueTarget || ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, monthlyRevenueTarget: Number(e.target.value) || 0 }))
              }
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Daily Orders Target"
              type="number"
              fullWidth
              value={draft.dailyOrdersTarget || ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dailyOrdersTarget: Number(e.target.value) || 0 }))
              }
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Profit Margin Target (%)"
              type="number"
              fullWidth
              value={draft.profitMarginTarget || ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, profitMarginTarget: Number(e.target.value) || 0 }))
              }
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: brand.neutral[600] }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: brand.primary[600], '&:hover': { bgcolor: brand.primary[700] } }}
          >
            Save Goals
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
