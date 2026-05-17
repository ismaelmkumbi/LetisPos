import { Card, CardContent, Grid, Typography } from '@mui/material';
import { IconAlertTriangle, IconShoppingCart, IconWalletOff, IconX } from '@tabler/icons-react';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, profitMargin } from './utils';
import SmallStat from './SmallStat';
import type { Dashboard, ArAging } from 'src/api/smartpos/reports';
import type { Delta } from './types';

interface FinancialHealthProps {
  data: Dashboard | null;
  expensesDelta?: Delta;
  profitMarginDelta?: Delta;
  salesDueDelta?: Delta;
  purchasesDelta?: Delta;
  arAging?: ArAging | null;
}

export default function FinancialHealth({
  data,
  expensesDelta,
  profitMarginDelta,
  salesDueDelta,
  purchasesDelta,
  arAging,
}: FinancialHealthProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const marginValue = profitMargin(data);
  const marginThreshold = marginValue >= 20 ? 'good' as const : marginValue >= 10 ? 'marginal' as const : 'poor' as const;
  const overdueAmount = arAging?.buckets
    ?.filter((b) => b.daysFrom >= 30)
    .reduce((sum, b) => sum + b.amount, 0) ?? 0;
  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Typography sx={{ fontFamily: "'Outfit','DM Sans',sans-serif", fontWeight: 800, color: isDark ? '#F1F5F9' : titleColor, fontSize: { xs: 15, sm: 17 }, letterSpacing: '-0.01em', mb: 1.5 }}>
          Financial Health
        </Typography>
        <Grid container spacing={1.25}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Expenses"
              value={formatMoney(data?.expenses.total ?? 0)}
              tone="error"
              icon={<IconWalletOff size={19} />}
              delta={expensesDelta}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Profit Margin"
              value={`${marginValue.toFixed(1)}%`}
              tone={marginValue >= 0 ? 'success' : 'error'}
              icon={<IconAlertTriangle size={19} />}
              delta={profitMarginDelta}
              threshold={marginThreshold}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Sales Due"
              value={formatMoney(data?.sales.due ?? 0)}
              tone="warning"
              icon={<IconX size={19} />}
              delta={salesDueDelta}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Purchases"
              value={formatMoney(data?.purchases.gross ?? 0)}
              tone="success"
              icon={<IconShoppingCart size={19} />}
              delta={purchasesDelta}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Overdue 30+ Days"
              value={formatMoney(overdueAmount)}
              tone="error"
              icon={<IconAlertTriangle size={19} />}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
