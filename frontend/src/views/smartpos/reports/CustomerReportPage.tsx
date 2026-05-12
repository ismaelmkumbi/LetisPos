import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Chip, Typography } from '@mui/material';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportDataTable, ReportExportBar, ReportChartCard } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportSummary from 'src/components/smartpos/reports/AiReportSummary';
import AiRecommendations from 'src/components/smartpos/reports/AiRecommendations';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getCustomerSummary, getCustomerRfm, getCustomerRetention, type CustomerSummary, type TopCustomerDetail, type RfmSegments, type RetentionRate, type RfmCustomer } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function CustomerReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: startOfMonth(), dateTo: todayIso(), warehouseId: '', period: 'MONTH' });
  const [data, setData] = useState<CustomerSummary | null>(null);
  const [rfm, setRfm] = useState<RfmSegments | null>(null);
  const [retention, setRetention] = useState<RetentionRate | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCustomerSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
      getCustomerRfm({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
      getCustomerRetention({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
    ])
      .then(([d, rfmData, retData]) => {
        if (!cancelled) { setData(d); setRfm(rfmData); setRetention(retData); }
      });
    return () => { cancelled = true; };
  }, [filters.dateFrom, filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Customers', value: formatNumber(data?.totalCustomers ?? 0), color: brand.primary[600] },
    { label: 'Active This Period', value: formatNumber(data?.activeCustomers ?? 0), color: brand.success.main },
    { label: 'Total Revenue', value: formatMoney(data?.totalRevenue ?? 0), color: brand.info.main },
    { label: 'Avg Revenue/Customer', value: formatMoney(data?.avgRevenuePerCustomer ?? 0), color: brand.warning.main },
    { label: 'Retention Rate', value: retention ? `${(retention.rate * 100).toFixed(1)}%` : '—', color: retention && retention.change >= 0 ? brand.success.main : brand.error.main, change: retention ? { positive: retention.change >= 0, label: `${(retention.change * 100).toFixed(1)}%` } : null },
  ], [data, retention]);

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
      {rfm && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          {([
            { label: 'Champions', value: rfm.champions, color: brand.success.main },
            { label: 'Loyal', value: rfm.loyal, color: brand.primary[600] },
            { label: 'At Risk', value: rfm.atRisk, color: brand.warning.main },
            { label: 'Lost', value: rfm.lost, color: brand.error.main },
          ]).map((seg) => (
            <Box key={seg.label} onClick={() => setSelectedSegment(selectedSegment === seg.label ? null : seg.label)}
              sx={{
                cursor: 'pointer', flex: 1,
                border: selectedSegment === seg.label ? `2px solid ${seg.color}` : '2px solid transparent',
                borderRadius: '12px', transition: 'border-color 0.2s',
              }}>
              <ReportChartCard title={seg.label}
                options={{
                  chart: { type: 'radialBar', fontFamily: 'Inter, DM Sans, sans-serif' },
                  plotOptions: { radialBar: {
                    hollow: { size: '55%' },
                    dataLabels: { name: { show: false }, value: { fontSize: '22px', fontWeight: 700, color: seg.color } },
                  }},
                  colors: [seg.color],
                  grid: { show: false },
                }}
                series={[rfm.customers.length > 0 ? Math.round((seg.value / rfm.customers.length) * 100) : 0]}
                type="radialBar"
                height={160}
              />
            </Box>
          ))}
        </Stack>
      )}
      {selectedSegment && rfm && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{selectedSegment} Customers</Typography>
            <Button size="small" onClick={() => setSelectedSegment(null)}>Show All</Button>
          </Stack>
          <ReportDataTable
            title=""
            columns={[
              { id: 'name', label: 'Customer', render: (r: RfmCustomer) => r.customerName },
              { id: 'recency', label: 'Recency (days)', align: 'right', render: (r: RfmCustomer) => r.recency },
              { id: 'frequency', label: 'Orders', align: 'right', render: (r: RfmCustomer) => r.frequency },
              { id: 'monetary', label: 'Total Spend', align: 'right', render: (r: RfmCustomer) => formatMoney(r.monetary) },
            ]}
            rows={rfm.customers.filter((c) => c.segment === selectedSegment)}
            getRowKey={(r) => r.customerId}
          />
        </Box>
      )}
      <ReportDataTable title="Top Customers" columns={customerColumns} rows={data?.topCustomers ?? []} getRowKey={(r) => r.customerId} />
      <ReportDataTable
        title="Customer Segmentation (RFM)"
        columns={[
          { id: 'name', label: 'Customer', render: (r: RfmCustomer) => r.customerName },
          { id: 'recency', label: 'Recency (days)', align: 'right', render: (r: RfmCustomer) => r.recency },
          { id: 'frequency', label: 'Orders', align: 'right', render: (r: RfmCustomer) => r.frequency },
          { id: 'monetary', label: 'Total Spend', align: 'right', render: (r: RfmCustomer) => formatMoney(r.monetary) },
          { id: 'segment', label: 'Segment', render: (r: RfmCustomer) => {
            const colors: Record<string, string> = { Champions: brand.success.main, Loyal: brand.primary[600], 'At Risk': brand.warning.main, Lost: brand.error.main };
            return <Chip label={r.segment} size="small" sx={{ bgcolor: brand.neutral[100], color: colors[r.segment] ?? brand.neutral[600], fontWeight: 700 }} />;
          }},
        ]}
        rows={rfm?.customers ?? []}
        getRowKey={(r) => r.customerId}
      />
      <ReportExportBar reportKey="customers-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing customer data from ${filters.dateFrom} to ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
