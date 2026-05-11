/**
 * Tax management API.
 *
 * NOTE: Backend tax endpoints do not exist yet in payment-service.
 * The API functions below call the expected endpoints; they will
 * return 404 until the backend is implemented.
 */
import { api } from './client';
import type { UUID } from './types';

// ---------- Tax Rate ----------

export type TaxType = 'VAT' | 'GST' | 'SERVICE' | 'SALES' | 'EXCISE' | 'CUSTOM';

export interface TaxRate {
  id: UUID;
  name: string;
  rate: number; // percentage, e.g. 18.0 for 18%
  type: TaxType;
  active: boolean;
  description?: string | null;
}

export interface TaxRateInput {
  name: string;
  rate: number;
  type: TaxType;
  active?: boolean;
  description?: string;
}

// ---------- Tax Summary ----------

export interface TaxSummary {
  thisMonth: number;
  thisQuarter: number;
  thisYear: number;
  /** Per-rate breakdown for the current period */
  breakdown: { taxRateId: UUID; name: string; rate: number; collected: number }[];
}

// ---------- API calls ----------

export async function listTaxRates(): Promise<TaxRate[]> {
  const { data } = await api.get<TaxRate[]>('/api/v1/taxes');
  return data;
}

export async function createTaxRate(body: TaxRateInput): Promise<TaxRate> {
  const { data } = await api.post<TaxRate>('/api/v1/taxes', body);
  return data;
}

export async function updateTaxRate(id: UUID, body: Partial<TaxRateInput>): Promise<TaxRate> {
  const { data } = await api.put<TaxRate>(`/api/v1/taxes/${id}`, body);
  return data;
}

export async function toggleTaxRateActive(id: UUID): Promise<TaxRate> {
  const { data } = await api.patch<TaxRate>(`/api/v1/taxes/${id}/toggle-active`);
  return data;
}

export async function getTaxSummary(): Promise<TaxSummary> {
  const { data } = await api.get<TaxSummary>('/api/v1/taxes/summary');
  return data;
}
