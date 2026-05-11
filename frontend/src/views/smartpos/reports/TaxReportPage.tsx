import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getTaxSummary, getMonthlyTaxSchedule, type TaxSummary, type TaxByRate, type TaxByCategory, type MonthlyTaxBucket } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';

export default function TaxReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<TaxSummary | null>(null);
  const [monthlySchedule, setMonthlySchedule] = useState<MonthlyTaxBucket[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getTaxSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
      getMonthlyTaxSchedule({ year: new Date().getFullYear() }),
    ])
      .then(([d, ms]) => { if (!cancelled) { setData(d); setMonthlySchedule(ms); } });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Tax', value: formatMoney(data?.totalTax ?? 0), color: brand.primary[600] },
    { label: 'Taxable Sales', value: formatMoney(data?.taxableSales ?? 0), color: brand.info.main },
    { label: 'Transactions', value: formatNumber(data?.transactionCount ?? 0), color: brand.warning.main },
    { label: 'Effective Rate', value: `${data?.taxableSales && data.taxableSales > 0 ? ((data.totalTax / data.taxableSales) * 100).toFixed(1) : '0'}%`, color: brand.purple.main },
  ], [data]);

  const rateColumns: Column<TaxByRate>[] = [
    { id: 'rate', label: 'Tax Rate %', align: 'right', render: (r) => `${r.rate}%` },
    { id: 'taxable', label: 'Taxable Amount', align: 'right', render: (r) => formatMoney(r.taxableAmount) },
    { id: 'tax', label: 'Tax Amount', align: 'right', render: (r) => formatMoney(r.taxAmount) },
    { id: 'count', label: 'Transactions', align: 'right', render: (r) => formatNumber(r.count) },
  ];

  const catColumns: Column<TaxByCategory>[] = [
    { id: 'cat', label: 'Category', render: (r) => r.categoryName },
    { id: 'taxable', label: 'Taxable', align: 'right', render: (r) => formatMoney(r.taxableAmount) },
    { id: 'tax', label: 'Tax', align: 'right', render: (r) => formatMoney(r.taxAmount) },
    { id: 'count', label: 'Count', align: 'right', render: (r) => formatNumber(r.count) },
  ];

  const pieOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: chartFont },
    labels: data?.byRate?.map((r) => `${r.rate}%`) ?? [],
    colors: [brand.primary[600], brand.info.main, brand.warning.main, brand.error.main, brand.purple.main],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '11px' },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  };

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Tax Report" subtitle="Tax collected by rate, category, and period">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="tax" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ReportChartCard title="Tax by Rate" options={pieOptions} series={data?.byRate?.map((r) => r.taxAmount) ?? []} type="donut" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <ReportDataTable title="Tax by Category" columns={catColumns} rows={data?.byCategory ?? []} getRowKey={(r, i) => r.categoryName + i} />
        </Grid>
      </Grid>
      <ReportDataTable title="Tax by Rate" columns={rateColumns} rows={data?.byRate ?? []} getRowKey={(r) => String(r.rate)} />
      <ReportDataTable
        title="Monthly Tax Schedule"
        columns={[
          { id: 'month', label: 'Month', render: (m: MonthlyTaxBucket) => new Date(2024, m.month - 1).toLocaleString('en', { month: 'short' }) },
          { id: 'taxable', label: 'Taxable Sales', align: 'right', render: (m: MonthlyTaxBucket) => formatMoney(m.taxableSales) },
          { id: 'collected', label: 'Tax Collected', align: 'right', render: (m: MonthlyTaxBucket) => formatMoney(m.taxCollected) },
          { id: 'output', label: 'Output Tax', align: 'right', render: (m: MonthlyTaxBucket) => formatMoney(m.outputTax) },
          { id: 'input', label: 'Input Tax', align: 'right', render: (m: MonthlyTaxBucket) => formatMoney(m.inputTax) },
          { id: 'net', label: 'Net Payable', align: 'right', render: (m: MonthlyTaxBucket) => formatMoney(m.netPayable) },
        ]}
        rows={monthlySchedule}
        getRowKey={(r) => String(r.month)}
      />
      <ReportExportBar reportKey="tax-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing tax data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
