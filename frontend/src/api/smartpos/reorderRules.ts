/**
 * Reorder Rules API wrapper.
 * Mirrors the Java DTOs in io.smartpos.inventory.api.dto.
 */
import { api } from './client';
import type { Page, UUID } from './types';

export interface ReorderRule {
  id: UUID;
  productId: UUID;
  variantId?: UUID | null;
  warehouseId: UUID;
  minQty: number;
  reorderQty: number;
  supplierId?: UUID | null;
  active: boolean;
}

export interface ReorderRuleInput {
  productId: UUID;
  variantId?: UUID;
  warehouseId: UUID;
  minQty: number;
  reorderQty: number;
  supplierId?: UUID;
  active?: boolean;
}

export async function listReorderRules(params?: {
  page?: number;
  size?: number;
}): Promise<Page<ReorderRule>> {
  const { data } = await api.get<Page<ReorderRule>>('/api/v1/reorder-rules', { params });
  return data;
}

export async function getReorderRule(id: UUID): Promise<ReorderRule> {
  const { data } = await api.get<ReorderRule>(`/api/v1/reorder-rules/${id}`);
  return data;
}

export async function getTriggeredRules(warehouseId?: UUID): Promise<ReorderRule[]> {
  const { data } = await api.get<ReorderRule[]>('/api/v1/reorder-rules/triggered', {
    params: warehouseId ? { warehouseId } : {},
  });
  return data;
}

export async function createReorderRule(body: ReorderRuleInput): Promise<ReorderRule> {
  const { data } = await api.post<ReorderRule>('/api/v1/reorder-rules', body);
  return data;
}

export async function updateReorderRule(id: UUID, body: ReorderRuleInput): Promise<ReorderRule> {
  const { data } = await api.put<ReorderRule>(`/api/v1/reorder-rules/${id}`, body);
  return data;
}

export async function deleteReorderRule(id: UUID): Promise<void> {
  await api.delete(`/api/v1/reorder-rules/${id}`);
}

// ── Reorder Suggestions ───────────────────────────────────────────────────────

export interface ReorderSuggestion {
  productId: string;
  productName?: string | null;
  currentStock: number;
  suggestedQty: number;
  minQty: number;
  supplierId?: string | null;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  dailyVelocity: number;
  expectedShortageDate?: string | null;
}

export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const { data } = await api.get<ReorderSuggestion[]>('/api/v1/inventory/reorder-suggestions');
  return data;
}
