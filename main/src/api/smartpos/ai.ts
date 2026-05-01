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
