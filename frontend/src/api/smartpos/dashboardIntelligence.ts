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
