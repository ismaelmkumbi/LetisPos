import { Card, CardContent, Grid, Typography } from '@mui/material';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { formatNumber } from 'src/utils/smartpos/currency';
import { cardSx, titleColor } from './utils';
import SmallStat from './SmallStat';
import type { Dashboard } from 'src/api/smartpos/reports';
import type { Delta } from './types';

interface OperationsOverviewProps {
  data: Dashboard | null;
  inventoryValueDelta?: Delta;
  stockAtRiskDelta?: Delta;
  totalSkusDelta?: Delta;
  stockMovementDelta?: Delta;
}

export default function OperationsOverview({
  data,
  inventoryValueDelta,
  stockAtRiskDelta,
  totalSkusDelta,
  stockMovementDelta,
}: OperationsOverviewProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 18, mb: 1.5 }}>
          Operations Overview
        </Typography>
        <Grid container spacing={1.25}>
          <Grid size={{ xs: 6 }}>
            <SmallStat
              label="Inventory Value"
              value={formatNumber(data?.inventory.totalOnHand ?? 0)}
              tone="info"
              delta={inventoryValueDelta}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <SmallStat
              label="Stock at Risk"
              value={`${formatNumber(data?.inventory.lowStockLines ?? 0)} Items`}
              tone="warning"
              delta={stockAtRiskDelta}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <SmallStat
              label="Total SKUs"
              value={formatNumber(data?.inventory.distinctProducts ?? 0)}
              tone="purple"
              delta={totalSkusDelta}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <SmallStat
              label="Stock Movement"
              value={formatNumber(data?.inventory.totalAvailable ?? 0)}
              tone="success"
              delta={stockMovementDelta}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
