/**
 * Dashboard Intelligence API — backed by report-service.
 *   GET /api/v1/dashboard/status
 *   GET /api/v1/dashboard/executive-summary
 */
import { api } from './client';

// ── Unified Response wrapper ─────────────────────────────────────────────────

export interface FreshnessEntry {
  lastUpdated: string; // ISO-8601 instant
  status: 'FRESH' | 'STALE' | 'ERROR';
  errorMessage?: string | null;
}

export interface DataFreshnessMap {
  sales: FreshnessEntry;
  inventory: FreshnessEntry;
  payments: FreshnessEntry;
  purchases: FreshnessEntry;
  customers: FreshnessEntry;
}

export interface ResponseAlert {
  level: string;
  message: string;
}

export interface ResponseMeta {
  generatedAt: string; // ISO-8601 instant
  dataFreshness?: DataFreshnessMap | null;
  alerts?: ResponseAlert[] | null;
}

export interface UnifiedResponse<T> {
  status: 'ok' | 'degraded' | 'error';
  data: T | null;
  meta?: ResponseMeta | null;
}

// ── Executive Summary ───────────────────────────────────────────────────────

export interface BulletPoint {
  category: 'HEADLINE' | 'CHANGE' | 'ATTENTION' | 'RECOMMENDATION';
  text: string;
  linkTo?: string | null;
}

export interface KpiSnapshot {
  revenue: number;
  netProfit: number;
  orderCount: number;
  profitMargin: number;
  lowStockLines: number;
  totalCustomers: number;
  churnRisk: number;
  repeatRate: number;
}

export interface AlertSummary {
  fraudAlerts: number;
  stockAlerts: number;
  paymentAlerts: number;
}

export interface ExecutiveSummary {
  bullets: BulletPoint[];
  kpiSnapshot: KpiSnapshot;
  alertSummary: AlertSummary;
  provider: 'template' | 'llm';
}

export async function getExecutiveSummary(
  date?: string,
  refresh?: boolean,
): Promise<UnifiedResponse<ExecutiveSummary>> {
  const { data } = await api.get<UnifiedResponse<ExecutiveSummary>>(
    '/api/v1/dashboard/executive-summary',
    { params: { date, refresh: refresh ? 'true' : undefined } },
  );
  return data;
}
