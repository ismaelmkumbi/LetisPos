/**
 * AI insights API — backed by ai-service:8091.
 *   POST /api/v1/ai/{sales-trend, narrate, chat}
 */
import { api } from './client';
import type { UUID } from './types';

export interface InsightResponse {
  narrative: string;
  provider: string;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  generatedAt: string;
}

export interface SalesTrendBody {
  dateFrom: string;
  dateTo: string;
  warehouseId?: UUID;
  tone?: 'executive' | 'casual' | 'alert';
}
export async function aiSalesTrend(body: SalesTrendBody): Promise<InsightResponse> {
  const { data } = await api.post<InsightResponse>('/api/v1/ai/sales-trend', body);
  return data;
}

export interface NarrateBody {
  reportKind: string;
  factsJson: string;
  question?: string;
}
export async function aiNarrate(body: NarrateBody): Promise<InsightResponse> {
  const { data } = await api.post<InsightResponse>('/api/v1/ai/narrate', body);
  return data;
}

export interface ChatBody {
  prompt: string;
  systemPrompt?: string;
}
export async function aiChat(body: ChatBody): Promise<InsightResponse> {
  const { data } = await api.post<InsightResponse>('/api/v1/ai/chat', body);
  return data;
}

// ---------- Report AI: anomalies ----------

export interface Anomaly {
  metric: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedRange: string;
  actualValue: string;
}

export interface AnomalyResponse {
  anomalies: Anomaly[];
  provider: string;
  model: string;
  generatedAt: string;
}

export async function aiDetectAnomalies(reportKind: string, factsJson: string): Promise<AnomalyResponse> {
  const { data } = await api.post<AnomalyResponse>('/api/v1/ai/reports/anomalies', {
    reportKind,
    factsJson,
  });
  return data;
}

// ---------- Report AI: recommendations ----------

export interface Recommendation {
  title: string;
  description: string;
  category: 'INVENTORY' | 'PRICING' | 'SALES' | 'COST' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  provider: string;
  model: string;
  generatedAt: string;
}

export async function aiGetRecommendations(reportKind: string, factsJson: string): Promise<RecommendationResponse> {
  const { data } = await api.post<RecommendationResponse>('/api/v1/ai/reports/recommendations', {
    reportKind,
    factsJson,
  });
  return data;
}

// ── AI Analytics: Forecasting ────────────────────────────────────────────────

export interface ForecastItem {
  productId: string;
  productName: string;
  productCode: string;
  currentStock: number;
  projectedDemand: number;
  confidence: number;
  trend: string; // UP | DOWN | STABLE
  weeksOfData: number;
  weeklyDemandHistory: number[];
}

export async function getForecasting(): Promise<ForecastItem[]> {
  const { data } = await api.get<ForecastItem[]>('/api/v1/ai/forecasting');
  return data;
}

// ── AI Analytics: Customer Analytics ─────────────────────────────────────────

export interface CustomerSegment {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  visits: number;
  lastPurchase: string;
  segment: string;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  repeatRate: number;
  avgOrderValue: number;
  churnRisk: number;
  segments: CustomerSegment[];
  topCustomers: TopCustomer[];
}

export async function getCustomerAnalytics(): Promise<CustomerAnalytics> {
  const { data } = await api.get<CustomerAnalytics>('/api/v1/ai/customer-analytics');
  return data;
}

// ── AI Analytics: Fraud Detection ────────────────────────────────────────────

export interface FlaggedTransaction {
  transactionId: string;
  amount: number;
  type: string;
  riskScore: number;
  reasons: string[];
  detectedAt: string;
  status: string;
}

export async function getFraudAlerts(): Promise<FlaggedTransaction[]> {
  const { data } = await api.get<FlaggedTransaction[]>('/api/v1/ai/fraud-detection');
  return data;
}
