import { Box, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
import { IconAlertTriangle, IconBriefcase } from '@tabler/icons-react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, muted, formatSaleTime } from './utils';
import EmptyPanel from './EmptyPanel';
import type { Sale } from 'src/api/smartpos/sales';

interface RecentTransactionsProps {
  rows: Sale[];
  fraudAlertIds?: Set<string>;
  fraudReasons?: Map<string, string>;
}

export default function RecentTransactions({ rows, fraudAlertIds, fraudReasons }: RecentTransactionsProps) {
  const { activeMode: _am3 } = useContext(CustomizerContext);
  const isDark = _am3 === 'dark';
  const navigate = useNavigate();

  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
          <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18 }}>
            Recent Transactions
          </Typography>
          <Typography
            component={RouterLink}
            to="/smartpos/sales"
            sx={{ color: brand.primary[600], fontWeight: 700, fontSize: 13 }}
          >
            View all
          </Typography>
        </Stack>
        {rows.length ? (
          <Stack spacing={0.5}>
            {rows.map((row, index) => {
              const ref = row.ref ?? row.id;
              const isFraud = fraudAlertIds?.has(ref) ?? false;
              const fraudReason = isFraud ? fraudReasons?.get(ref) : undefined;

              return (
                <Box
                  key={row.id}
                  onClick={() => navigate(`/smartpos/sales/${row.id}`)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: '8px',
                    p: 0.75,
                    mx: -0.75,
                    transition: 'background-color 0.15s ease',
                    bgcolor: isFraud ? '#FEF2F2' : 'transparent',
                    '&:hover': {
                      bgcolor: isFraud ? '#FEE2E2' : isDark ? brand.neutral[700] : brand.neutral[50],
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        bgcolor: index % 2 ? brand.info.light : brand.primary[50],
                        color: index % 2 ? brand.info.main : brand.primary[600],
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconBriefcase size={19} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography noWrap sx={{ color: titleColor, fontWeight: 800, fontSize: 13 }}>
                          {row.ref}
                        </Typography>
                        {isFraud && (
                          <Tooltip title={fraudReason ?? 'Flagged as potential fraud'} arrow>
                            <IconAlertTriangle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
                          </Tooltip>
                        )}
                      </Stack>
                      <Typography noWrap sx={{ color: muted(isDark), fontSize: 12 }}>
                        {row.customerId ? 'Customer sale' : 'Walk-in sale'} - {row.paymentStatus}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: muted(isDark), fontSize: 12 }}>
                      {formatSaleTime(row.date)}
                    </Typography>
                    <Typography
                      sx={{
                        color: brand.primary[600],
                        fontWeight: 900,
                        fontSize: 13,
                        minWidth: 88,
                        textAlign: 'right',
                      }}
                    >
                      {formatMoney(row.grandTotal)}
                    </Typography>
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
