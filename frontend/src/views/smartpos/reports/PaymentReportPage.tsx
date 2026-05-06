import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getPaymentSummary, type PaymentSummary, type PaymentMethodRow } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';

export default function PaymentReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<PaymentSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPaymentSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Inflow', value: formatMoney(data?.totalIn ?? 0), color: brand.success.main },
    { label: 'Total Outflow', value: formatMoney(data?.totalOut ?? 0), color: brand.error.main },
    { label: 'Net Flow', value: formatMoney(data?.netFlow ?? 0), color: (data?.netFlow ?? 0) >= 0 ? brand.primary[600] : brand.error.main },
    { label: 'Transactions', value: formatNumber(data?.totalCount ?? 0), color: brand.info.main },
  ], [data]);

  const methodColumns: Column<PaymentMethodRow>[] = [
    { id: 'method', label: 'Method', render: (r) => r.method },
    { id: 'total', label: 'Total', align: 'right', render: (r) => formatMoney(r.total) },
    { id: 'count', label: 'Count', align: 'right', render: (r) => formatNumber(r.count) },
  ];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: chartFont },
    labels: data?.byMethod?.map((m) => m.method) ?? [],
    colors: [brand.primary[600], brand.info.main, brand.warning.main, brand.purple.main, brand.error.main, brand.success.main],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '11px' },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  };

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Payment Report" subtitle="Cash flow, payment methods, and outstanding collections">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="payments" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ReportChartCard title="Payment Methods" options={donutOptions} series={data?.byMethod?.map((m) => m.total) ?? []} type="donut" height={300} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <ReportDataTable title="By Method" columns={methodColumns} rows={data?.byMethod ?? []} getRowKey={(r) => r.method} />
        </Grid>
      </Grid>
      <ReportExportBar reportKey="payments-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing payment data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
