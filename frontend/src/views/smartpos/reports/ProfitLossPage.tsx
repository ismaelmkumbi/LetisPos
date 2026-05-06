import { useEffect, useMemo, useState } from 'react';
import { Box, Card, Divider, Grid, Stack, Typography } from '@mui/material';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { ReportPageShell, ReportFilterBar, ReportChartCard, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getProfitLoss, type ProfitLoss } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];

export default function ProfitLossPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<ProfitLoss | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfitLoss({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const profitMargin = data?.revenueNet && data.revenueNet > 0 ? (data.netProfit / data.revenueNet) * 100 : 0;

  const barOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: chartFont },
    colors: [brand.primary[600], brand.error.main, brand.warning.main, brand.success.main],
    xaxis: { categories: ['Revenue (Net)', 'COGS', 'OpEx', 'Net Profit'], labels: { style: { colors: muted } } },
    yaxis: { labels: { formatter: (v: number) => formatMoney(v), style: { colors: muted } } },
    dataLabels: { enabled: false },
    grid: { borderColor: brand.neutral[200] },
    plotOptions: { bar: { borderRadius: 8, columnWidth: '50%' } },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  }), []);

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Profit & Loss Statement" subtitle="Revenue, costs, expenses, and net profit breakdown">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="profit-loss" factsJson={factsJson} />
      <AiRecommendations reportKind="profit-loss" factsJson={factsJson} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="Revenue (Net)" value={formatMoney(data?.revenueNet ?? 0)} positive />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="COGS" value={formatMoney(data?.costOfGoodsSold ?? 0)} positive={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="Gross Profit" value={formatMoney(data?.grossProfit ?? 0)} positive={(data?.grossProfit ?? 0) >= 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PlCard label="Operating Expenses" value={formatMoney(data?.operatingExpenses ?? 0)} positive={false} />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportChartCard title="P&L Breakdown" options={barOptions}
            series={[{ name: 'Amount', data: [data?.revenueNet ?? 0, data?.costOfGoodsSold ?? 0, data?.operatingExpenses ?? 0, data?.netProfit ?? 0] }]} type="bar" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%' }}>
            <Box sx={{ p: 2.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 17, color: brand.neutral[900], mb: 2 }}>Summary</Typography>
              <Stack spacing={1.5} divider={<Divider />}>
                <Row label="Revenue (Gross)" value={formatMoney(data?.revenueGross ?? 0)} />
                <Row label="Discounts" value={`-${formatMoney(data?.revenueDiscount ?? 0)}`} color={brand.error.main} />
                <Row label="Revenue (Net)" value={formatMoney(data?.revenueNet ?? 0)} bold />
                <Row label="Cost of Goods Sold" value={`-${formatMoney(data?.costOfGoodsSold ?? 0)}`} color={brand.error.main} />
                <Row label="Gross Profit" value={formatMoney(data?.grossProfit ?? 0)} bold color={(data?.grossProfit ?? 0) >= 0 ? brand.success.main : brand.error.main} />
                <Row label="Operating Expenses" value={`-${formatMoney(data?.operatingExpenses ?? 0)}`} color={brand.error.main} />
                <Row label="Net Profit" value={formatMoney(data?.netProfit ?? 0)} bold color={(data?.netProfit ?? 0) >= 0 ? brand.success.main : brand.error.main} large />
                <Row label="Profit Margin" value={`${profitMargin.toFixed(1)}%`} />
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>
      <ReportExportBar reportKey="sales-summary-series" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing P&L data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}

function Row({ label, value, bold, color, large }: { label: string; value: string; bold?: boolean; color?: string; large?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography sx={{ color: muted, fontWeight: bold ? 700 : 400 }}>{label}</Typography>
      <Typography sx={{ fontWeight: bold ? (large ? 900 : 800) : 700, fontSize: large ? 15 : 14, color: color ?? brand.neutral[900] }}>{value}</Typography>
    </Stack>
  );
}

function PlCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', height: '100%' }}>
      <Box sx={{ p: 2.25 }}>
        <Typography sx={{ color: brand.neutral[600], fontSize: 12, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: 22, mt: 0.75 }}>{value}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
          {positive ? <IconArrowUp size={14} color={brand.success.main} /> : <IconArrowDown size={14} color={brand.error.main} />}
          <Typography sx={{ color: brand.neutral[500], fontSize: 12 }}>This period</Typography>
        </Stack>
      </Box>
    </Card>
  );
}
