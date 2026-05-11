import { useEffect, useMemo, useState } from 'react';
import { ReportPageShell, ReportFilterBar, ReportKpiRow, ReportDataTable, ReportExportBar } from 'src/components/smartpos/reports';
import type { ReportFilters, KpiCard, Column } from 'src/components/smartpos/reports';
import AiReportChat from 'src/components/smartpos/reports/AiReportChat';
import { getOperationsSummary, type OperationsReport } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney, formatNumber } from 'src/utils/smartpos/currency';

interface ShiftRow {
  shiftId?: string;
  registerName?: string;
  registerId?: string;
  openedBy?: string;
  openedAt?: string;
  closedAt?: string;
  totalSales?: number;
  cash?: number;
  status?: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function OperationsReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: todayIso(), dateTo: todayIso(), warehouseId: '', period: 'TODAY' });
  const [data, setData] = useState<OperationsReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOperationsSummary({ date: filters.dateTo })
      .then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [filters.dateTo]);

  const kpis: KpiCard[] = useMemo(() => [
    { label: 'Total Sales', value: formatMoney(data?.dailyClose?.totalSales ?? 0), color: brand.primary[600] },
    { label: 'Transactions', value: formatNumber(data?.dailyClose?.totalTransactions ?? 0), color: brand.info.main },
    { label: 'Voids', value: formatNumber(data?.dailyClose?.totalVoids ?? 0), color: brand.error.main },
    { label: 'Cash to Bank', value: formatMoney(data?.dailyClose?.cashToBank ?? 0), color: brand.success.main },
  ], [data]);

  const shiftColumns: Column<ShiftRow>[] = [
    { id: 'register', label: 'Register', render: (r) => r.registerName ?? r.registerId?.slice(0, 8) },
    { id: 'openedBy', label: 'Opened By', render: (r) => r.openedBy },
    { id: 'openedAt', label: 'Opened', render: (r) => r.openedAt },
    { id: 'closedAt', label: 'Closed', render: (r) => r.closedAt ?? '—' },
    { id: 'sales', label: 'Sales', align: 'right', render: (r) => formatMoney(r.totalSales ?? 0) },
    { id: 'cash', label: 'Cash', align: 'right', render: (r) => formatMoney(r.cash ?? 0) },
    { id: 'status', label: 'Status', render: (r) => r.status },
  ];

  const factsJson = JSON.stringify(data);

  return (
    <ReportPageShell title="Operations Report" subtitle="Register summaries, shifts, and daily close">
      <ReportFilterBar filters={filters} onChange={setFilters} showPeriod />
      <ReportKpiRow cards={kpis} />
      <ReportDataTable title="Shifts & Registers" columns={shiftColumns} rows={(data?.shifts ?? []) as ShiftRow[]} getRowKey={(r, i) => r.shiftId ?? `shift-${i}`} />
      <ReportExportBar reportKey="operations-summary" dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      <AiReportChat contextPrompt={`You are analyzing operations data for ${filters.dateTo}. Data: ${factsJson}`} />
    </ReportPageShell>
  );
}
