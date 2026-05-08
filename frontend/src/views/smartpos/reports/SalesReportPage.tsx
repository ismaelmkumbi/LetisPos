import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import ExecutiveSummary from 'src/components/smartpos/reports/ExecutiveSummary';
import SmartInsights from 'src/components/smartpos/reports/SmartInsights';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getSalesSummary, getTopProducts, getTopCustomers, getSalesByDimension, type SalesSummary, type TopProduct, type TopCustomer, type SalesByDimensionReport } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];

export default function SalesReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [byDimension, setByDimension] = useState<SalesByDimensionReport | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getSalesSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as UUID || undefined }),
      getTopProducts({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as UUID || undefined, limit: 20 }),
      getTopCustomers({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, limit: 20 }),
      getSalesByDimension({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, dimension: 'CATEGORY' }),
    ])
      .then(([s, tp, tc, dim]) => {
        if (cancelled) return;
        setSales(s); setTopProducts(tp); setTopCustomers(tc); setByDimension(dim);
      });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo, filters.warehouseId]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Gross Sales', value: formatMoney(sales?.gross ?? 0), color: brand.primary[600], sparkline: sales?.series?.map((s) => s.net) ?? [] },
    { label: 'Net Sales', value: formatMoney(sales?.net ?? 0), color: brand.info.main, sparkline: sales?.series?.map((s) => s.net) ?? [] },
    { label: 'Tax Collected', value: formatMoney(sales?.tax ?? 0), color: brand.warning.main },
    { label: 'Discounts', value: formatMoney(sales?.discount ?? 0), color: brand.error.main },
    { label: 'Orders', value: formatNumber(sales?.count ?? 0), color: brand.purple.main, sparkline: sales?.series?.map((s) => s.count) ?? [] },
    { label: 'Avg Sale', value: formatMoney(sales?.avgSale ?? 0), color: brand.success.main },
    { label: 'Paid', value: formatMoney(sales?.paid ?? 0), color: brand.primary[600] },
    { label: 'Due', value: formatMoney(sales?.due ?? 0), color: brand.error.main },
  ], [sales]);

  const revenueOptions: ApexOptions = useMemo(() => ({
    chart: { type: 'line', toolbar: { show: false }, fontFamily: chartFont, zoom: { enabled: false } },
    colors: [brand.primary[600], brand.info.main],
    stroke: { curve: 'smooth', width: 2.5 },
    dataLabels: { enabled: false },
    grid: { borderColor: brand.neutral[200], strokeDashArray: 0 },
    xaxis: { categories: sales?.series?.map((s) => s.date) ?? [], labels: { style: { colors: muted, fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v: number) => formatMoney(v), style: { colors: muted } } },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
    legend: { position: 'top', fontSize: '12px' },
  }), [sales]);

  const productColumns: Column<TopProduct>[] = [
    { id: 'name', label: 'Product', render: (r) => r.productName ?? r.productId.slice(0, 8) },
    { id: 'qty', label: 'Qty Sold', align: 'right', render: (r) => formatNumber(r.qty) },
    { id: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatMoney(r.revenue) },
  ];

  const customerColumns: Column<TopCustomer>[] = [
    { id: 'customer', label: 'Customer', render: (r) => r.customerId.slice(0, 8) },
    { id: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.orderCount) },
    { id: 'spent', label: 'Total Spent', align: 'right', render: (r) => formatMoney(r.totalSpent) },
  ];

  const factsJson = JSON.stringify({ sales, topProducts: topProducts.slice(0, 10), topCustomers: topCustomers.slice(0, 10) });

  return (
    <ReportPageShell title="Sales Report" subtitle="Revenue trends, top products, customers, and category breakdown">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod showWarehouse
        warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
      <ReportKpiRow cards={kpis} />
      <ExecutiveSummary reportKind="SALES" factsJson={factsJson} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ReportChartCard title="Revenue Trend" options={revenueOptions}
            series={[
              { name: 'Net Revenue', data: sales?.series?.map((s) => s.net) ?? [] },
              { name: 'Orders', data: sales?.series?.map((s) => s.count) ?? [] },
            ]} type="line" />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ReportChartCard title="By Category" options={{
            chart: { type: 'donut', fontFamily: chartFont },
            labels: byDimension?.buckets?.map((b) => b.dimensionName ?? 'Other') ?? [],
            colors: [brand.primary[600], brand.info.main, brand.warning.main, brand.purple.main, brand.error.main, brand.success.main],
            dataLabels: { enabled: false },
            legend: { position: 'bottom', fontSize: '11px' },
            tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
          }} series={byDimension?.buckets?.map((b) => b.net) ?? []} type="donut" height={300} />
        </Grid>
      </Grid>
      <SmartInsights reportKind="SALES" factsJson={factsJson} />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportDataTable title="Top Products" columns={productColumns} rows={topProducts} getRowKey={(r) => r.productId} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportDataTable title="Top Customers" columns={customerColumns} rows={topCustomers} getRowKey={(r) => r.customerId} />
        </Grid>
      </Grid>
      <ReportExportBar reportKey="sales-summary-series" dateFrom={filters.dateFrom} dateTo={filters.dateTo} warehouseId={filters.warehouseId || undefined} />
      <AiReportChat contextPrompt={`You are analyzing sales data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
