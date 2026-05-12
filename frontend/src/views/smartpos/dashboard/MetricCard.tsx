import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { IconArrowUp } from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { cardSx, muted, titleColor, sparkOptions } from './utils';
import EmptyPanel from './EmptyPanel';
import type { MetricCardProps } from './types';

export default function MetricCard({
  label,
  value,
  change,
  icon,
  color,
  series,
}: MetricCardProps) {
  const { activeMode: _am2 } = useContext(CustomizerContext);
  const isDark = _am2 === 'dark';
  return (
    <Card elevation={0} sx={{ ...cardSx(isDark), minHeight: 204 }}>
      <CardContent sx={{ p: 1.75, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: `${color}12`,
            color,
            display: 'grid',
            placeItems: 'center',
            mb: 1.25,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ color: titleColor, fontWeight: 700, fontSize: 13 }}>{label}</Typography>
        <Typography sx={{ color: titleColor, fontWeight: 900, fontSize: 20, mt: 0.75 }}>
          {value}
        </Typography>
        {change ? (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            <IconArrowUp size={14} color={brand.primary[600]} />
            <Typography sx={{ color: brand.primary[600], fontWeight: 800, fontSize: 12 }}>
              {change}
            </Typography>
          </Stack>
        ) : (
          <Typography sx={{ color: muted(isDark), fontSize: 12, mt: 1 }}>Live total</Typography>
        )}
        <Typography sx={{ color: muted(isDark), fontSize: 12 }}>selected period</Typography>
        <Box sx={{ mt: 'auto', mx: -1, mb: -1 }}>
          {series.length ? (
            <Chart
              options={sparkOptions(color)}
              series={[{ name: label, data: series }]}
              type="area"
              height={46}
            />
          ) : (
            <EmptyPanel title="" subtitle="No series" height={46} compact />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
