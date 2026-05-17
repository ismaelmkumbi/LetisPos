/**
 * Dashboard Intelligence API — backed by report-service /api/v1/dashboard/*
 */
import { api } from './client';

// ── Unified Response Envelope ──────────────────────────────────────────────

export type ResponseStatus = 'ok' | 'degraded' | 'error';

export interface Alert {
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface FreshnessEntry {
  lastUpdated: string;        // ISO-8601 instant
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

export interface ResponseMeta {
  generatedAt: string;        // ISO-8601 instant
  dataFreshness: DataFreshnessMap;
  alerts: Alert[];
}

export interface UnifiedResponse<T> {
  status: ResponseStatus;
  data: T | null;
  meta: ResponseMeta | null;
}

// ── Status Endpoint ────────────────────────────────────────────────────────

export interface DashboardIntelligenceStatus {
  service: string;
  version: string;
  serverTime: string;
  aiServiceReachable: boolean;
  salesServiceReachable: boolean;
  inventoryServiceReachable: boolean;
  paymentServiceReachable: boolean;
}

export async function getDashboardIntelligenceStatus(): Promise<
  UnifiedResponse<DashboardIntelligenceStatus>
> {
  const { data } = await api.get<
    UnifiedResponse<DashboardIntelligenceStatus>
  >('/api/v1/dashboard/status');
  return data;
}
