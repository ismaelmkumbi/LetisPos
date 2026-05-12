import { Card, CardContent, Grid, Typography } from '@mui/material';
import { IconAlertTriangle, IconShoppingCart, IconWalletOff, IconX } from '@tabler/icons-react';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { formatMoney } from 'src/utils/smartpos/currency';
import { cardSx, titleColor, profitMargin } from './utils';
import SmallStat from './SmallStat';
import type { Dashboard } from 'src/api/smartpos/reports';

interface FinancialHealthProps {
  data: Dashboard | null;
}

export default function FinancialHealth({ data }: FinancialHealthProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 1.5 }}>
          Financial Health
        </Typography>
        <Grid container spacing={1.25}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Expenses"
              value={formatMoney(data?.expenses.total ?? 0)}
              tone="error"
              icon={<IconWalletOff size={19} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Profit Margin"
              value={`${profitMargin(data).toFixed(1)}%`}
              tone={profitMargin(data) >= 0 ? 'success' : 'error'}
              icon={<IconAlertTriangle size={19} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Sales Due"
              value={formatMoney(data?.sales.due ?? 0)}
              tone="warning"
              icon={<IconX size={19} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SmallStat
              label="Purchases"
              value={formatMoney(data?.purchases.gross ?? 0)}
              tone="success"
              icon={<IconShoppingCart size={19} />}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
