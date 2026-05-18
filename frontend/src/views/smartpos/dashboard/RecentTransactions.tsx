/**
 * RecentTransactions — redesigned for visual authority.
 *
 * Changes:
 * - JetBrains Mono for sale ref and grand total
 * - Outfit for labels (customer type, status)
 * - Status badge instead of plain status text
 * - Alternating icon color uses brand palette consistently (not index parity)
 * - Amount column right-aligned with green accent, stronger weight
 * - Fraud row: red left border strip instead of full-row background
 * - Date/time more subtle — pushed right with monospace
 */
import {
  Box, Card, CardContent, Chip, Stack, Tooltip, Typography,
} from '@mui/material';
import { IconAlertTriangle, IconReceipt } from '@tabler/icons-react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, darkToneBg, muted, formatSaleTime } from './utils';
import EmptyPanel from './EmptyPanel';
import type { Sale } from 'src/api/smartpos/sales';

const NUM_FONT = "'JetBrains Mono', 'DM Mono', monospace";
const LBL_FONT = "'Outfit', 'DM Sans', sans-serif";

// Cycle through accent colors for the icon badges
const ICON_PALETTES = [
  { bg: brand.primary[50],  color: brand.primary[600] },
  { bg: brand.info.light,   color: brand.info.main },
  { bg: brand.warning.light, color: brand.warning.main },
  { bg: brand.purple.light, color: brand.purple.main },
  { bg: '#F0FDF4',          color: brand.primary[500] },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PAID:        { bg: brand.primary[50],  color: brand.primary[700] },
  UNPAID:      { bg: '#FEF2F2',          color: brand.error.main   },
  PARTIAL:     { bg: brand.warning.light, color: brand.warning.main },
  VOID:        { bg: brand.neutral[100], color: brand.neutral[500] },
};

interface RecentTransactionsProps {
  rows: Sale[];
  fraudAlertIds?: Set<string>;
  fraudReasons?: Map<string, string>;
}

export default function RecentTransactions({ rows, fraudAlertIds, fraudReasons }: RecentTransactionsProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const navigate = useNavigate();

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography
            sx={{
              fontFamily: LBL_FONT,
              fontWeight: 800,
              color: isDark ? '#F1F5F9' : brand.neutral[900],
              fontSize: { xs: 15, sm: 17 },
              letterSpacing: '-0.01em',
            }}
          >
            Recent Transactions
          </Typography>
          <Typography
            component={RouterLink}
            to="/smartpos/sales"
            sx={{
              fontFamily: LBL_FONT,
              color: brand.primary[600],
              fontWeight: 700,
              fontSize: 12.5,
              textDecoration: 'none',
              '&:hover': { color: brand.primary[700] },
            }}
          >
            View all →
          </Typography>
        </Stack>

        {rows.length ? (
          <Stack spacing={0}>
            {rows.map((row, index) => {
              const ref = row.ref ?? row.id;
              const isFraud = fraudAlertIds?.has(ref) ?? false;
              const fraudReason = isFraud ? fraudReasons?.get(ref) : undefined;
              const palette = ICON_PALETTES[index % ICON_PALETTES.length];
              const statusStyle = STATUS_STYLE[row.paymentStatus] ?? STATUS_STYLE['UNPAID'];

              return (
                <Box
                  key={row.id}
                  onClick={() => navigate(`/smartpos/sales/${row.id}`)}
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    borderRadius: '8px',
                    p: '9px 8px',
                    mx: '-8px',
                    borderLeft: isFraud ? '3px solid #EF4444' : '3px solid transparent',
                    transition: 'background-color 0.15s ease',
                    '&:hover': {
                      bgcolor: isDark ? brand.neutral[700] : brand.neutral[50],
                    },
                    // Subtle divider between rows
                    '&:not(:last-child)::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 52,
                      right: 0,
                      height: '1px',
                      bgcolor: isDark ? brand.neutral[700] : brand.neutral[100],
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    {/* Icon badge */}
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        bgcolor: isFraud ? (isDark ? darkToneBg.error : '#FEF2F2') : (isDark ? `${palette.color}20` : palette.bg),
                        color: isFraud ? brand.error.main : palette.color,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconReceipt size={18} />
                    </Box>

                    {/* Left content */}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography
                          noWrap
                          sx={{
                            fontFamily: NUM_FONT,
                            color: isDark ? '#E2E8F0' : brand.neutral[900],
                            fontWeight: 700,
                            fontSize: 12.5,
                          }}
                        >
                          {row.ref ?? '—'}
                        </Typography>
                        {isFraud && (
                          <Tooltip title={fraudReason ?? 'Flagged as potential fraud'} arrow>
                            <IconAlertTriangle size={13} color="#DC2626" style={{ flexShrink: 0 }} />
                          </Tooltip>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.3 }}>
                        <Typography
                          sx={{
                            fontFamily: LBL_FONT,
                            color: muted(isDark),
                            fontSize: 11,
                          }}
                        >
                          {row.customerId ? 'Customer' : 'Walk-in'}
                        </Typography>
                        <Chip
                          label={row.paymentStatus}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 9.5,
                            fontFamily: LBL_FONT,
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            bgcolor: isDark ? `${statusStyle.color}22` : statusStyle.bg,
                            color: isDark && row.paymentStatus === 'PAID' ? brand.primary[300] : statusStyle.color,
                            border: 'none',
                            px: 0.25,
                            '& .MuiChip-label': { px: '5px' },
                          }}
                        />
                      </Stack>
                    </Box>

                    {/* Right content */}
                    <Stack alignItems="flex-end" spacing={0.25} flexShrink={0}>
                      <Typography
                        sx={{
                          fontFamily: NUM_FONT,
                          color: brand.primary[isDark ? 400 : 600],
                          fontWeight: 700,
                          fontSize: 13.5,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {formatMoney(row.grandTotal)}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: NUM_FONT,
                          color: muted(isDark),
                          fontSize: 10.5,
                        }}
                      >
                        {formatSaleTime(row.date)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <EmptyPanel
            title="No recent sales"
            subtitle="Confirmed sales will appear here."
            height={180}
          />
        )}
      </CardContent>
    </Card>
  );
}
