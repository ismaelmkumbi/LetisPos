import { useEffect, useMemo, useState } from 'react';
import { Grid, Chip } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportChartCard, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getInventorySummary, getInventoryValuation, getDeadStock, getInventoryTurnover, getInventoryMovers, type InventorySummary, type InventoryValuationReport, type DeadStockReport, type TurnoverRow, type MoversReport, type MoverRow } from 'src/api/smartpos/reports';
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
  const [turnover, setTurnover] = useState<TurnoverRow[]>([]);
  const [movers, setMovers] = useState<MoversReport | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  useEffect(() => {
    listWarehouses().then((w) => setWarehouses(w.filter((r) => r.active))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getInventorySummary(filters.warehouseId as UUID || undefined),
      getInventoryValuation({ method: 'AVG', warehouseId: filters.warehouseId as UUID || undefined }),
      getDeadStock({ warehouseId: filters.warehouseId as UUID || undefined }),
      getInventoryTurnover({ warehouseId: filters.warehouseId as UUID || undefined }),
      getInventoryMovers({ warehouseId: filters.warehouseId as UUID || undefined }),
    ])
      .then(([s, v, d, t, m]) => { if (!cancelled) { setSummary(s); setValuation(v); setDeadStock(d); setTurnover(t); setMovers(m); } });
    return () => { cancelled = true; };
  }, [filters.warehouseId]);

  // Resolve product names for any products missing them
  useEffect(() => {
    const rows = [...(valuation?.rows ?? []), ...(deadStock?.rows ?? []), ...turnover];
    const looksLikeUuid = (s?: string) => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);\
    const missing = rows.filter(r => !r.productName || looksLikeUuid(r.productName)).map(r => r.productId);
    if (missing.length === 0) return;
    let cancelled = false;
    import('src/api/smartpos/products').then(({ listProducts }) => {
      listProducts({ size: 200 }).then(p => {
        if (cancelled) return;
        setProductNames(prev => {
          const next = { ...prev };
          for (const prod of p.content) next[prod.id] = prod.name;
          for (const id of missing) { if (!next[id]) next[id] = id.slice(0, 8) + '…'; }
          return next;
        });
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [valuation, deadStock, turnover]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total SKUs', value: formatNumber(summary?.distinctProducts ?? 0), color: brand.primary[600] },
    { label: 'Total On Hand', value: formatNumber(summary?.totalOnHand ?? 0), color: brand.info.main },
    { label: 'Total Available', value: formatNumber(summary?.totalAvailable ?? 0), color: brand.success.main },
    { label: 'Low Stock Lines', value: formatNumber(summary?.lowStockLines ?? 0), color: brand.error.main },
    { label: 'Inventory Value', value: formatMoney(valuation?.totalValuation ?? 0), color: brand.warning.main },
    { label: 'Dead Stock Value', value: formatMoney(deadStock?.totalValueAtCost ?? 0), color: brand.neutral[500] },
  ], [summary, valuation, deadStock]);

  const valColumns: Column<InventoryValuationReport['rows'][number]>[] = [
    { id: 'code', label: 'Code', render: (r) => r.productCode ?? r.productName ?? productNames[r.productId] ?? r.productId.slice(0, 8) },
    { id: 'name', label: 'Product', render: (r) => r.productName ?? '—' },
    { id: 'onHand', label: 'On Hand', align: 'right', render: (r) => formatNumber(r.onHand) },
    { id: 'unitCost', label: 'Unit Cost', align: 'right', render: (r) => formatMoney(r.unitCost) },
    { id: 'valuation', label: 'Valuation', align: 'right', render: (r) => formatMoney(r.valuation) },
  ];

  const deadColumns: Column<DeadStockReport['rows'][number]>[] = [
    { id: 'code', label: 'Code', render: (r) => r.productCode ?? '—' },
    { id: 'name', label: 'Product', render: (r) => r.productName ?? productNames[r.productId] ?? r.productId.slice(0, 8) },
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
      <ReportDataTable
        title="Inventory Turnover"
        columns={[
          { id: 'product', label: 'Product', render: (r: TurnoverRow) => r.productName ?? productNames[r.productId] ?? r.productId.slice(0, 8) },
          { id: 'avgInv', label: 'Avg Inventory', align: 'right', render: (r: TurnoverRow) => formatNumber(r.avgInventory) },
          { id: 'cogs', label: 'COGS', align: 'right', render: (r: TurnoverRow) => formatMoney(r.costOfGoodsSold) },
          { id: 'ratio', label: 'Turnover Ratio', align: 'right', render: (r: TurnoverRow) => r.turnoverRatio.toFixed(1) },
        ]}
        rows={turnover}
        getRowKey={(r) => r.productId}
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportDataTable
            title="Top Movers"
            columns={[
              { id: 'product', label: 'Product', render: (r: MoverRow) => r.productName },
              { id: 'qty', label: 'Qty Sold', align: 'right', render: (r: MoverRow) => formatNumber(r.qtySold) },
              { id: 'revenue', label: 'Revenue', align: 'right', render: (r: MoverRow) => formatMoney(r.revenue) },
              { id: 'dir', label: 'Direction', render: (r: MoverRow) => (
                <Chip label={r.direction} size="small" sx={{ bgcolor: brand.success.light, color: brand.success.dark, fontWeight: 700 }} />
              )},
            ]}
            rows={movers?.top ?? []}
            getRowKey={(r) => r.productId}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReportDataTable
            title="Bottom Movers"
            columns={[
              { id: 'product', label: 'Product', render: (r: MoverRow) => r.productName },
              { id: 'qty', label: 'Qty Sold', align: 'right', render: (r: MoverRow) => formatNumber(r.qtySold) },
              { id: 'revenue', label: 'Revenue', align: 'right', render: (r: MoverRow) => formatMoney(r.revenue) },
              { id: 'dir', label: 'Direction', render: (r: MoverRow) => (
                <Chip label={r.direction} size="small" sx={{ bgcolor: brand.error.light, color: brand.error.dark, fontWeight: 700 }} />
              )},
            ]}
            rows={movers?.bottom ?? []}
            getRowKey={(r) => r.productId}
          />
        </Grid>
      </Grid>
      <ReportExportBar reportKey="sales-summary-series" />
      <AiReportChat contextPrompt={`You are analyzing inventory data. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
