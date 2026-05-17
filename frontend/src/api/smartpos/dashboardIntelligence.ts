/**
 * Dashboard Intelligence API wrapper.
 * Endpoints: demand-forecast, reorder-recommendations, profit-opportunities.
 */
import { api } from './client';
import type { UUID } from './types';

/** Generic API response envelope returned by dashboard microservice endpoints. */
export interface UnifiedResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
  statusCode?: number;
}

// ── Demand Forecast ───────────────────────────────────────────────────────────

export interface ForecastedProduct {
  productId: UUID;
  productName: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  confidence: number; // 0-100
  projectedDemand: number;
}

export interface DemandForecast {
  products: ForecastedProduct[];
  dateFrom: string;
  dateTo: string;
}

export async function getDemandForecast(
  horizon?: number,
  warehouseId?: string,
): Promise<UnifiedResponse<DemandForecast>> {
  const { data } = await api.get<UnifiedResponse<DemandForecast>>(
    '/api/v1/dashboard/demand-forecast',
    { params: { horizon: horizon ?? 7, warehouseId } },
  );
  return data;
}

// ── Reorder Recommendations ──────────────────────────────────────────────────

export interface ReorderRecommendationItem {
  productId: UUID;
  productName: string;
  currentStock: number;
  minQty: number;
  suggestedQty: number;
  supplierId?: UUID | null;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  dailyVelocity: number;
  expectedShortageDate?: string | null;
}

export interface ReorderRecommendations {
  recommendations: ReorderRecommendationItem[];
}

export async function getReorderRecommendations(
  warehouseId?: string,
): Promise<UnifiedResponse<ReorderRecommendations>> {
  const { data } = await api.get<UnifiedResponse<ReorderRecommendations>>(
    '/api/v1/dashboard/reorder-recommendations',
    { params: { warehouseId } },
  );
  return data;
}

// ── Profit Opportunities ─────────────────────────────────────────────────────

export interface UnderpricedItem {
  productId: UUID;
  productName: string;
  category: string;
  currentMargin: number; // percentage (e.g. 8.5 = 8.5%)
  suggestedMargin?: number | null;
  estimatedMonthlyImpact: number; // additional revenue if margin corrected
  reason: string;
}

export interface ProfitOpportunities {
  items: UnderpricedItem[];
  totalEstimatedMonthlyImpact: number;
}

export async function getProfitOpportunities(
  warehouseId?: string,
): Promise<UnifiedResponse<ProfitOpportunities>> {
  const { data } = await api.get<UnifiedResponse<ProfitOpportunities>>(
    '/api/v1/dashboard/profit-opportunities',
    { params: { warehouseId } },
  );
  return data;
}

// ── Customer Retention ──────────────────────────────────────────────────────

export interface AtRiskCustomer {
  customerId: string;
  name: string;
  lastVisitDays: number;
  lifetimeValue: number;
  segment: string; // "At Risk" | "Lost"
  visits: number;
}

export interface CustomerRetention {
  atRiskCustomers: AtRiskCustomer[];
  totalAtRiskRevenue: number;
  totalCustomers: number;
  churnRisk: number;
}

export async function getCustomerRetention(): Promise<UnifiedResponse<CustomerRetention>> {
  const { data } = await api.get<UnifiedResponse<CustomerRetention>>(
    '/api/v1/dashboard/customer-retention',
  );
  return data;
}

// ── Cash Flow Forecast ──────────────────────────────────────────────────────

export interface DailyProjection {
  date: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  closingBalance: number;
  isDangerDay: boolean;
}

export interface CashFlowForecast {
  dailyProjections: DailyProjection[];
  openingBalance: number;
  lowestBalance: number;
  lowestBalanceDate: string;
  safetyThreshold: number;
}

export async function getCashFlowForecast(days?: number): Promise<UnifiedResponse<CashFlowForecast>> {
  const { data } = await api.get<UnifiedResponse<CashFlowForecast>>(
    '/api/v1/dashboard/cash-flow-forecast',
    { params: { days: days ?? 30 } },
  );
  return data;
}

// ── Executive Summary ─────────────────────────────────────────────────────────

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
