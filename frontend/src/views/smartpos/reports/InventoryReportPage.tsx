import { useEffect, useMemo, useState } from 'react';
import { Grid } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getInventorySummary, getInventoryValuation, getDeadStock, type InventorySummary, type InventoryValuationReport, type DeadStockReport } from 'src/api/smartpos/reports';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';
import type { ApexOptions } from 'apexcharts';

const chartFont = 'Inter, DM Sans, sans-serif';
const muted = brand.neutral[500];
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function InventoryReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: '', dateTo: todayIso(), warehouseId: '', period: '' });
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [valuation, setValuation] = useState<InventoryValuationReport | null>(null);
  const [deadStock, setDeadStock] = useState<DeadStockReport | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getInventorySummary(filters.warehouseId as UUID || undefined),
      getInventoryValuation({ method: 'AVG', warehouseId: filters.warehouseId as UUID || undefined }),
      getDeadStock({ warehouseId: filters.warehouseId as UUID || undefined }),
    ])
      .then(([s, v, d]) => { if (!cancelled) { setSummary(s); setValuation(v); setDeadStock(d); } });
    return () => { cancelled = true; };
  }, [filters.warehouseId]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total SKUs', value: formatNumber(summary?.distinctProducts ?? 0), color: brand.primary[600] },
    { label: 'Total On Hand', value: formatNumber(summary?.totalOnHand ?? 0), color: brand.info.main },
    { label: 'Total Available', value: formatNumber(summary?.totalAvailable ?? 0), color: brand.success.main },
    { label: 'Low Stock Lines', value: formatNumber(summary?.lowStockLines ?? 0), color: brand.error.main },
    { label: 'Inventory Value', value: formatMoney(valuation?.totalValuation ?? 0), color: brand.warning.main },
    { label: 'Dead Stock Value', value: formatMoney(deadStock?.totalValueAtCost ?? 0), color: brand.neutral[500] },
  ], [summary, valuation, deadStock]);

  const valColumns: Column<InventoryValuationReport['rows'][number]>[] = [
    { id: 'code', label: 'Code', render: (r) => r.productCode ?? r.productId.slice(0, 8) },
    { id: 'name', label: 'Product', render: (r) => r.productName ?? '—' },
    { id: 'onHand', label: 'On Hand', align: 'right', render: (r) => formatNumber(r.onHand) },
    { id: 'unitCost', label: 'Unit Cost', align: 'right', render: (r) => formatMoney(r.unitCost) },
    { id: 'valuation', label: 'Valuation', align: 'right', render: (r) => formatMoney(r.valuation) },
  ];

  const deadColumns: Column<DeadStockReport['rows'][number]>[] = [
    { id: 'code', label: 'Code', render: (r) => r.productCode ?? '—' },
    { id: 'name', label: 'Product', render: (r) => r.productName ?? r.productId.slice(0, 8) },
    { id: 'onHand', label: 'On Hand', align: 'right', render: (r) => formatNumber(r.onHand) },
    { id: 'value', label: 'Value', align: 'right', render: (r) => formatMoney(r.valuationAtCost) },
    { id: 'lastSold', label: 'Last Sold', render: (r) => r.lastSoldDate ?? 'Never' },
  ];

  const factsJson = JSON.stringify({ summary, valuation, deadStock });
  const valBarOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: chartFont },
    colors: [brand.primary[600]],
    xaxis: { categories: valuation?.rows?.slice(0, 15).map((r) => r.productCode ?? r.productName ?? '') ?? [], labels: { style: { colors: muted, fontSize: '10px' } } },
    yaxis: { labels: { formatter: (v: number) => formatMoney(v), style: { colors: muted } } },
    dataLabels: { enabled: false },
    grid: { borderColor: brand.neutral[200] },
    plotOptions: { bar: { borderRadius: 6 } },
    tooltip: { y: { formatter: (v: number) => formatMoney(v) } },
  };

  return (
    <ReportPageShell title="Inventory Report" subtitle="Stock levels, valuation, and dead stock analysis">
      <ReportFilterBar filters={filters} onChange={setFilters} showWarehouse warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
      <AiReportSummary reportKind="inventory" factsJson={factsJson} />
      <AiRecommendations reportKind="inventory" factsJson={factsJson} />
      <ReportKpiRow cards={kpis} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ReportChartCard title="Top 15 by Valuation" options={valBarOptions}
            series={[{ name: 'Valuation', data: valuation?.rows?.slice(0, 15).map((r) => r.valuation) ?? [] }]} type="bar" />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <ReportDataTable title="Dead Stock" columns={deadColumns} rows={deadStock?.rows ?? []} getRowKey={(r, i) => `${r.productId}-${i}`} />
        </Grid>
      </Grid>
      <ReportDataTable title="Inventory Valuation" columns={valColumns} rows={valuation?.rows ?? []} getRowKey={(r, i) => `${r.productId}-${r.warehouseId}-${i}`} />
      <ReportExportBar reportKey="sales-summary-series" />
      <AiReportChat contextPrompt={`You are analyzing inventory data. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
