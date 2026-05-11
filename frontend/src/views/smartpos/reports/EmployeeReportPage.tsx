import { useEffect, useMemo, useState } from 'react';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getEmployeeSales, type EmployeeSales, type EmployeeSalesRow } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function EmployeeReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<EmployeeSales | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEmployeeSales({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Employees', value: formatNumber(data?.rows?.length ?? 0), color: brand.primary[600] },
    { label: 'Total Sales', value: formatMoney(data?.rows?.reduce((s, r) => s + r.totalNet, 0) ?? 0), color: brand.info.main },
  ], [data]);

  const columns: Column<EmployeeSalesRow>[] = [
    { id: 'name', label: 'Employee', render: (r) => r.employeeName },
    { id: 'sales', label: 'Sales Count', align: 'right', render: (r) => formatNumber(r.saleCount) },
    { id: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatMoney(r.totalNet) },
    { id: 'items', label: 'Items Sold', align: 'right', render: (r) => formatNumber(r.itemsSold) },
    { id: 'avg', label: 'Avg Sale', align: 'right', render: (r) => formatMoney(r.saleCount > 0 ? r.totalNet / r.saleCount : 0) },
  ];

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Employee Report" subtitle="Sales performance by employee">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <ReportKpiRow cards={kpis} />
      <ReportChartCard
        title="Sales by Employee"
        options={{
          chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, DM Sans, sans-serif' },
          colors: [brand.primary[600]],
          xaxis: { categories: data?.rows?.map(r => r.employeeName) ?? [] },
          dataLabels: { enabled: false },
          grid: { borderColor: brand.neutral[200] },
        }}
        series={[{ name: 'Revenue', data: data?.rows?.map(r => r.totalNet) ?? [] }]}
        type="bar" height={300}
      />
      <ReportDataTable title="Employee Performance" columns={columns} rows={data?.rows ?? []} getRowKey={(r) => r.employeeId} />
      <ReportExportBar reportKey="employee-sales" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing employee sales data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
