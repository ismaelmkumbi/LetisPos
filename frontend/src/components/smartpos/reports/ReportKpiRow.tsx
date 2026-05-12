import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';

export interface KpiCard {
  label: string;
  value: string;
  change?: { positive: boolean; label: string } | null;
  sparkline?: number[];
  color?: string;
  onClick?: () => void;
}

interface Props {
  cards: KpiCard[];
}

const chartFont = 'Inter, DM Sans, sans-serif';

function sparkOptions(color: string): ApexOptions {
  return {
    chart: { type: 'area', sparkline: { enabled: true }, toolbar: { show: false }, fontFamily: chartFont },
    colors: [color],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.2, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
  };
}

export default function ReportKpiRow({ cards }: Props) {
  const cols = cards.length <= 4 ? cards.length : 4;
  const size = cols === 4 ? { xs: 12, sm: 6, md: 3 } as const
    : cols === 3 ? { xs: 12, sm: 4 } as const
    : cols === 2 ? { xs: 12, sm: 6 } as const
    : { xs: 12 } as const;

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {cards.map((card, i) => (
        <Grid size={size} key={i}>
          <Card elevation={0} onClick={card.onClick}
            sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%', cursor: card.onClick ? 'pointer' : 'default' }}>
            <CardContent sx={{ p: 2.25 }}>
              <Typography sx={{ color: brand.neutral[600], fontSize: 12, fontWeight: 600 }}>{card.label}</Typography>
              <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: 22, mt: 0.75 }}>{card.value}</Typography>
              {card.change && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  {card.change.positive ? <IconArrowUp size={14} color={brand.success.main} /> : <IconArrowDown size={14} color={brand.error.main} />}
                  <Typography sx={{ color: card.change.positive ? brand.success.main : brand.error.main, fontWeight: 700, fontSize: 12 }}>
                    {card.change.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.neutral[400] }}>vs prior</Typography>
                </Stack>
              )}
              {card.sparkline && card.sparkline.length > 0 && (
                <Box sx={{ mt: 1, mx: -1, mb: -1 }}>
                  <Chart options={sparkOptions(card.color ?? brand.primary[600])} series={[{ data: card.sparkline }]} type="area" height={40} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
