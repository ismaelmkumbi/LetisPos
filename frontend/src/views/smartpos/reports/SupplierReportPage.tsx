import { useEffect, useMemo, useState } from 'react';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getSupplierSummary, type SupplierReport } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function SupplierReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<SupplierReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupplierSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Suppliers', value: formatNumber(data?.totalSuppliers ?? 0), color: brand.primary[600] },
    { label: 'Total Spend', value: formatMoney(data?.totalSpend ?? 0), color: brand.info.main },
  ], [data]);

  const spendColumns: Column<SupplierReport['topSuppliers'][0]>[] = [
    { id: 'name', label: 'Supplier', render: (r) => r.supplierName },
    { id: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.orderCount) },
    { id: 'spend', label: 'Total Spend', align: 'right', render: (r) => formatMoney(r.totalSpend) },
  ];

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Supplier Report" subtitle="Supplier spend, performance, and purchase history">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="suppliers" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <ReportChartCard
        title="Spend by Supplier"
        options={{
          chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, DM Sans, sans-serif' },
          colors: [brand.primary[600]],
          xaxis: { categories: data?.topSuppliers?.map(s => s.supplierName) ?? [] },
          dataLabels: { enabled: false },
          grid: { borderColor: brand.neutral[200] },
        }}
        series={[{ name: 'Spend', data: data?.topSuppliers?.map(s => s.totalSpend) ?? [] }]}
        type="bar" height={300}
      />
      <ReportDataTable title="Top Suppliers" columns={spendColumns} rows={data?.topSuppliers ?? []} getRowKey={(r) => r.supplierId} />
      <ReportExportBar reportKey="suppliers-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing supplier data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
