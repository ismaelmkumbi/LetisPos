/**
 * Dashboard Intelligence API wrapper.
 * Endpoints: demand-forecast, reorder-recommendations, profit-opportunities.
 */
import { api } from './client';

/** Generic API response envelope returned by dashboard microservice endpoints. */
export interface UnifiedResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
  statusCode?: number;
}

// ── Demand Forecast ─────────────────────────────────────────────────────────

export interface ForecastEntry {
  productId: string;
  productName: string;
  projectedDemand: number;
  confidence: number; // 0-100
  trend: string; // "UP" | "DOWN" | "STABLE"
  weeksOfData: number;
}

export interface DemandForecast {
  forecast: ForecastEntry[];
  aggregateProjectedRevenue: number;
  dataStartDate: string;
  dataEndDate: string;
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

// ── Reorder Recommendations ─────────────────────────────────────────────────

export interface ReorderEntry {
  productId: string;
  productName: string;
  currentStock: number;
  minQty: number;
  suggestedQty: number;
  dailyVelocity: number;
  urgency: string; // "HIGH" | "MEDIUM" | "LOW"
  expectedShortageDate?: string | null;
}

export interface ReorderRecommendations {
  recommendations: ReorderEntry[];
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

// ── Profit Opportunities ────────────────────────────────────────────────────

export interface OpportunityEntry {
  productId: string;
  productName: string;
  category: string;
  currentMargin: number; // percentage
  unitsSold30d: number;
  estimatedMonthlyImpact: number;
  reason: string;
}

export interface ProfitOpportunities {
  opportunities: OpportunityEntry[];
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
