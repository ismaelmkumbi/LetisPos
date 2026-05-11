import { Card, CardContent, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  title: string;
  options: ApexOptions;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  type: 'line' | 'bar' | 'area' | 'donut' | 'pie' | 'radialBar';
  height?: number;
}

export default function ReportChartCard({ title, options, series, type, height = 300 }: Props) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Typography sx={{ fontWeight: 800, color: brand.neutral[900], fontSize: 17, mb: 1 }}>{title}</Typography>
        {series && (Array.isArray(series) ? series.length > 0 : true) ? (
          <Chart options={options} series={series} type={type} height={height} />
        ) : (
          <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: brand.neutral[500], fontSize: 13 }}>No data for this period</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
