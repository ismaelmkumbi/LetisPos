import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getPurchaseSummary, getPurchasesByCategory, type PurchaseSummary, type TopSupplier, type CategoryBucket } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function PurchaseReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<PurchaseSummary | null>(null);
  const [byCategory, setByCategory] = useState<CategoryBucket[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => { listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {}); }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getPurchaseSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as UUID || undefined }),
      getPurchasesByCategory({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as UUID || undefined }),
    ])
      .then(([d, cat]) => { if (!cancelled) { setData(d); setByCategory(cat); } });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo, filters.warehouseId]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Purchase Orders', value: formatNumber(data?.count ?? 0), color: brand.primary[600] },
    { label: 'Gross Purchases', value: formatMoney(data?.gross ?? 0), color: brand.info.main },
    { label: 'Paid', value: formatMoney(data?.paid ?? 0), color: brand.success.main },
    { label: 'Due', value: formatMoney(data?.due ?? 0), color: brand.error.main },
    { label: 'Avg Purchase', value: formatMoney(data?.avgPurchase ?? 0), color: brand.warning.main },
  ], [data]);

  const supplierColumns: Column<TopSupplier>[] = [
    { id: 'name', label: 'Supplier', render: (r) => r.supplierName ?? r.supplierId.slice(0, 8) },
    { id: 'orders', label: 'Orders', align: 'right', render: (r) => formatNumber(r.orderCount) },
    { id: 'spent', label: 'Total Spent', align: 'right', render: (r) => formatMoney(r.totalSpent) },
  ];

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Purchase Report" subtitle="Purchase orders, spending, and supplier analysis">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod showWarehouse warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
      <AiReportSummary reportKind="purchases" factsJson={factsJson} />
      <AiRecommendations reportKind="purchases" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <ReportChartCard
            title="Purchases by Category"
            options={{
              chart: { type: 'donut', fontFamily: 'Inter, DM Sans, sans-serif' },
              labels: byCategory.map(c => c.categoryName ?? 'Uncategorised'),
              colors: [brand.primary[600], brand.info.main, brand.success.main, brand.warning.main, brand.error.main, brand.purple.main],
              legend: { position: 'bottom' },
              plotOptions: { pie: { donut: { size: '55%' } } },
            }}
            series={byCategory.map(c => c.net)}
            type="donut"
            height={300}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <ReportDataTable
            title="By Category"
            columns={[
              { id: 'cat', label: 'Category', render: (c: CategoryBucket) => c.categoryName ?? 'Uncategorised' },
              { id: 'count', label: 'Orders', align: 'right', render: (c: CategoryBucket) => formatNumber(c.count) },
              { id: 'net', label: 'Net', align: 'right', render: (c: CategoryBucket) => formatMoney(c.net) },
            ]}
            rows={byCategory}
            getRowKey={(r, i) => r.categoryId ?? `cat-${i}`}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <ReportDataTable title="Top Suppliers" columns={supplierColumns} rows={data?.topSuppliers ?? []} getRowKey={(r) => r.supplierId} />
        </Grid>
      </Grid>
      <ReportExportBar reportKey="purchases-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} warehouseId={filters.warehouseId || undefined} />
      <AiReportChat contextPrompt={`You are analyzing purchase data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
