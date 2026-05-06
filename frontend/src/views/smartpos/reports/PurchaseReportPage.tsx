import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getPurchaseSummary, type PurchaseSummary, type TopSupplier } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function PurchaseReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<PurchaseSummary | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => { listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {}); }, []);
  useEffect(() => {
    let cancelled = false;
    getPurchaseSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, warehouseId: filters.warehouseId as any })
      .then((d) => { if (!cancelled) setData(d); });
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
        <Grid size={{ xs: 12 }}>
          <ReportDataTable title="Top Suppliers" columns={supplierColumns} rows={data?.topSuppliers ?? []} getRowKey={(r) => r.supplierId} />
        </Grid>
      </Grid>
      <ReportExportBar reportKey="purchases-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} warehouseId={filters.warehouseId || undefined} />
      <AiReportChat contextPrompt={`You are analyzing purchase data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
