import { useEffect, useMemo, useState } from 'react';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getCustomerSummary, type CustomerSummary, type TopCustomerDetail } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function CustomerReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCustomerSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Customers', value: formatNumber(data?.totalCustomers ?? 0), color: brand.primary[600] },
    { label: 'Active This Period', value: formatNumber(data?.activeCustomers ?? 0), color: brand.success.main },
    { label: 'Total Revenue', value: formatMoney(data?.totalRevenue ?? 0), color: brand.info.main },
    { label: 'Avg Revenue/Customer', value: formatMoney(data?.avgRevenuePerCustomer ?? 0), color: brand.warning.main },
  ], [data]);

  const customerColumns: Column<TopCustomerDetail>[] = [
    { id: 'name', label: 'Customer', render: (r) => r.customerName ?? r.customerId.slice(0, 8) },
    { id: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.orderCount) },
    { id: 'spent', label: 'Total Spent', align: 'right', render: (r) => formatMoney(r.totalSpent) },
    { id: 'lastPurchase', label: 'Last Purchase', render: (r) => r.lastPurchase ?? '—' },
  ];

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Customer Report" subtitle="Customer spend, frequency, and retention analysis">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <AiReportSummary reportKind="customers" factsJson={factsJson} />
      <AiRecommendations reportKind="customers" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <ReportDataTable title="Top Customers" columns={customerColumns} rows={data?.topCustomers ?? []} getRowKey={(r) => r.customerId} />
      <ReportExportBar reportKey="customers-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing customer data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
