import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
  MenuItem,
} from '@mui/material';
import { IconCalendar, IconRefresh, IconSettings } from '@tabler/icons-react';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { greeting, PERIODS, PERIOD_LABELS } from './utils';
import type { GreetingBarProps } from './types';

export const LAYOUT_STORAGE_PREFIX = 'dashboard:layout:';

export const ALL_SECTIONS = [
  { key: 'executiveSummary', label: 'Executive Summary' },
  { key: 'kpiGrid', label: 'KPI Metrics' },
  { key: 'revenueChart', label: 'Revenue Chart' },
  { key: 'topPerformers', label: 'Top Performers' },
  { key: 'recentTransactions', label: 'Recent Transactions' },
  { key: 'profitOpportunities', label: 'Profit Opportunities' },
  { key: 'demandForecast', label: 'Demand Forecast' },
  { key: 'reorderRecommendations', label: 'Reorder Recommendations' },
  { key: 'financialHealth', label: 'Financial Health' },
  { key: 'operationsOverview', label: 'Operations Overview' },
  { key: 'paymentMix', label: 'Payment Mix' },
  { key: 'goalProgress', label: 'Goal Progress' },
  { key: 'customerRetention', label: 'Customer Retention' },
  { key: 'cashFlowForecast', label: 'Cash Flow Forecast' },
  { key: 'sideRail', label: 'Side Panel' },
] as const;

export type SectionKey = (typeof ALL_SECTIONS)[number]['key'];

export function loadLayout(tenantId: string): Set<SectionKey> {
  try {
    const raw = localStorage.getItem(`${LAYOUT_STORAGE_PREFIX}${tenantId}`);
    if (raw) {
      const arr = JSON.parse(raw) as SectionKey[];
      return new Set(arr);
    }
  } catch { /* ignore */ }
  return new Set(ALL_SECTIONS.map((s) => s.key));
}

export function saveLayout(tenantId: string, keys: Set<SectionKey>) {
  localStorage.setItem(
    `${LAYOUT_STORAGE_PREFIX}${tenantId}`,
    JSON.stringify([...keys]),
  );
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface CustomizeDialogProps {
  open: boolean;
  onClose: () => void;
  selected: Set<SectionKey>;
  onSave: (keys: Set<SectionKey>) => void;
}

function CustomizeDialog({ open, onClose, selected, onSave }: CustomizeDialogProps) {
  const [draft, setDraft] = useState<Set<SectionKey>>(new Set(selected));

  // Sync draft when dialog opens
  const handleOpen = () => setDraft(new Set(selected));

  const toggle = (key: SectionKey) => {
    const next = new Set(draft);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDraft(next);
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleReset = () => {
    const defaults = new Set(ALL_SECTIONS.map((s) => s.key));
    setDraft(defaults);
    onSave(defaults);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{ onEnter: handleOpen }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconSettings size={22} color={brand.primary[600]} />
        Customize Dashboard
      </DialogTitle>
      <DialogContent>
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          {ALL_SECTIONS.map((section) => (
            <FormControlLabel
              key={section.key}
              control={
                <Checkbox
                  checked={draft.has(section.key)}
                  onChange={() => toggle(section.key)}
                  size="small"
                  sx={{ color: brand.primary[600], '&.Mui-checked': { color: brand.primary[600] } }}
                />
              }
              label={section.label}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 14, fontWeight: 500 } }}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button onClick={handleReset} sx={{ color: brand.neutral[500], fontSize: 13 }}>
          Reset to default
        </Button>
        <Box>
          <Button onClick={onClose} sx={{ color: brand.neutral[600], mr: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: brand.primary[600], '&:hover': { bgcolor: brand.primary[700] } }}
          >
            Save
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default function DashboardGreetingBar({
  period,
  warehouseId,
  warehouses,
  dateRangeLabel,
  isDark,
  onPeriodChange,
  onWarehouseChange,
  lastUpdated,
  onRefresh,
}: GreetingBarProps) {
  const { user } = useAuth();
  const { salutation, wave, name } = greeting(user?.firstName);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(() =>
    loadLayout(user?.tenantId ?? ''),
  );

  const handleLayoutSave = (keys: Set<SectionKey>) => {
    setVisibleSections(keys);
    if (user?.tenantId) saveLayout(user.tenantId, keys);
    // Dispatch custom event so DashboardPage can react
    window.dispatchEvent(new CustomEvent('dashboard:layout-changed', { detail: keys }));
  };

  const pillSx = (active: boolean) => ({
    height: { xs: 30, sm: 32 },
    px: { xs: 1.1, sm: 1.35 },
    borderRadius: '8px',
    fontSize: { xs: 12, sm: 12.5 },
    fontWeight: active ? 700 : 500,
    textTransform: 'none' as const,
    bgcolor: active ? (isDark ? brand.primary[800] : brand.primary[600]) : 'transparent',
    color: active ? brand.neutral[50] : isDark ? brand.neutral[400] : brand.neutral[600],
    border: 'none',
    boxShadow: active && !isDark ? `0 4px 12px -4px ${brand.primary[600]}88` : 'none',
    minWidth: 0,
    flexShrink: 0,
    '&:hover': {
      bgcolor: active ? (isDark ? brand.primary[700] : brand.primary[700]) : isDark ? brand.neutral[800] : brand.neutral[100],
      color: active ? brand.neutral[50] : isDark ? brand.neutral[200] : brand.neutral[800],
    },
    transition: 'all 0.15s ease',
  });

  return (
    <>
      <Box
        sx={{
          mb: 1.5,
          p: { xs: 1.4, md: 1.5 },
          borderRadius: '12px',
          border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
          bgcolor: isDark ? '#111B2A' : '#FFFFFF',
          boxShadow: isDark ? 'inset 0 1px 0 rgba(148,163,184,0.05)' : '0 2px 12px rgba(15,23,42,0.04)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 1.25,
        }}
      >
        {/* Greeting */}
        <Box sx={{ flex: '0 0 auto' }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography
              sx={{
                fontFamily: "'Outfit', 'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize: { xs: 18, md: 20 },
                color: isDark ? '#F1F5F9' : brand.neutral[900],
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              {salutation},{' '}
              <Box
                component="span"
                sx={{ color: brand.primary[600] }}
              >
                {name}
              </Box>
            </Typography>
            <Box component="span" sx={{ fontSize: 18, lineHeight: 1, ml: 0.5 }}>
              {wave}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mt: 0.25 }}>
            <Typography
              sx={{
                fontFamily: "'Outfit', 'DM Sans', sans-serif",
                color: isDark ? brand.neutral[500] : brand.neutral[500],
                fontSize: 12.5,
                fontWeight: 400,
              }}
            >
              Here's what's happening with your business today.
            </Typography>
            {lastUpdated && (
              <Typography
                sx={{
                  fontFamily: "'JetBrains Mono', 'DM Mono', monospace",
                  color: brand.neutral[400],
                  fontSize: 10.5,
                }}
              >
                · {timeAgo(lastUpdated)}
              </Typography>
            )}
            {onRefresh && (
              <IconButton size="small" onClick={onRefresh} sx={{ p: 0.25 }}>
                <IconRefresh size={14} color={brand.neutral[400]} />
              </IconButton>
            )}
          </Stack>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Controls */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0.75}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          useFlexGap
          sx={{
            width: { xs: '100%', md: 'auto' },
            maxWidth: '100%',
            flex: { md: '1 1 620px' },
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
          }}
        >
          {/* Period pills */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              p: 0.35,
              borderRadius: '10px',
              bgcolor: isDark ? '#0C1421' : brand.neutral[50],
              border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
              overflow: { xs: 'auto', sm: 'visible' },
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              maxWidth: { xs: '100%', sm: 460, xl: 'none' },
              flexShrink: 0,
            }}
          >
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="small"
                variant="text"
                onClick={() => onPeriodChange(p)}
                sx={pillSx(period === p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </Box>

          {/* Warehouse selector */}
          {warehouses.length > 0 && (
            <TextField
              select
              size="small"
              value={warehouseId}
              onChange={(e) => onWarehouseChange(e.target.value)}
              sx={{
                minWidth: 160,
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  borderRadius: '9px',
                  fontWeight: 600,
                  fontSize: 13.5,
                  bgcolor: isDark ? '#0C1421' : 'transparent',
                  color: isDark ? brand.neutral[200] : brand.neutral[800],
                  '& fieldset': { borderColor: isDark ? brand.neutral[700] : brand.neutral[200] },
                  '&:hover fieldset': { borderColor: isDark ? brand.neutral[600] : brand.primary[300] },
                  '&.Mui-focused fieldset': { borderColor: isDark ? brand.primary[700] : brand.primary[500] },
                },
              }}
            >
              <MenuItem value="">All warehouses</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Date range display */}
          <Button
            variant="outlined"
            startIcon={<IconCalendar size={15} stroke={1.8} />}
            sx={{
              height: 36,
              px: 1.6,
              maxWidth: { xs: '100%', sm: 220 },
              borderRadius: '9px',
              borderColor: isDark ? brand.neutral[700] : brand.neutral[200],
              color: isDark ? brand.neutral[300] : brand.neutral[700],
              fontWeight: 700,
              fontSize: 12.5,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              bgcolor: isDark ? '#0C1421' : '#fff',
              '&:hover': {
                borderColor: isDark ? brand.neutral[600] : brand.primary[300],
                bgcolor: isDark ? brand.neutral[800] : brand.primary[50],
                color: isDark ? brand.neutral[100] : brand.primary[700],
              },
            }}
          >
            {dateRangeLabel}
          </Button>

          {/* Customize gear button */}
          <IconButton
            size="small"
            onClick={() => setCustomizeOpen(true)}
            sx={{
              height: 36,
              width: 36,
              borderRadius: '9px',
              border: `1px solid ${isDark ? brand.neutral[700] : brand.neutral[200]}`,
              color: isDark ? brand.neutral[400] : brand.neutral[600],
              bgcolor: isDark ? '#0C1421' : 'transparent',
              '&:hover': {
                borderColor: isDark ? brand.neutral[600] : brand.primary[300],
                bgcolor: isDark ? brand.neutral[800] : brand.primary[50],
                color: isDark ? brand.neutral[100] : brand.primary[700],
              },
            }}
          >
            <IconSettings size={18} />
          </IconButton>
        </Stack>
      </Box>

      <CustomizeDialog
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        selected={visibleSections}
        onSave={handleLayoutSave}
      />
    </>
  );
}
