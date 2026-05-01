/**
 * Recurring invoices API — backed by sales-service /api/v1/recurring-invoices.
 * One template + cadence; the backend scheduler materialises Sales daily.
 */
import { api } from './client';
import type { Page, UUID } from './types';

export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurringStatus    = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface RecurringInvoiceLine {
  id: UUID;
  productId: UUID;
  variantId?: UUID | null;
  productName?: string | null;
  productCode?: string | null;
  qty: number;
  unitPrice: number;
  discount?: number | null;
  discountType?: 'FIXED' | 'PERCENT' | null;
  taxRate?: number | null;
  taxMethod?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  position: number;
}

export interface RecurringInvoice {
  id: UUID;
  ref: string;
  name?: string | null;
  customerId?: UUID | null;
  warehouseId: UUID;
  frequency: RecurringFrequency;
  intervalCount: number;
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  lastRunDate?: string | null;
  occurrencesMax?: number | null;
  occurrencesCount: number;
  status: RecurringStatus;
  currency: string;
  discount?: number | null;
  shipping?: number | null;
  taxMethod?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  sendNotification: boolean;
  notes?: string | null;
  lines: RecurringInvoiceLine[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurringSearchParams {
  status?: RecurringStatus;
  customerId?: UUID;
  warehouseId?: UUID;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listRecurring(params: RecurringSearchParams = {}): Promise<Page<RecurringInvoice>> {
  const { data } = await api.get<Page<RecurringInvoice>>('/api/v1/recurring-invoices', { params });
  return data;
}

export async function getRecurring(id: UUID): Promise<RecurringInvoice> {
  const { data } = await api.get<RecurringInvoice>(`/api/v1/recurring-invoices/${id}`);
  return data;
}

export interface RecurringLineInput {
  productId: UUID;
  variantId?: UUID;
  productName?: string;
  productCode?: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'FIXED' | 'PERCENT';
  taxRate?: number;
  taxMethod?: 'INCLUSIVE' | 'EXCLUSIVE';
  position?: number;
}

export interface CreateRecurringBody {
  ref: string;
  name?: string;
  customerId?: UUID;
  warehouseId: UUID;
  frequency: RecurringFrequency;
  intervalCount?: number;
  startDate: string;
  endDate?: string;
  occurrencesMax?: number;
  currency?: string;
  discount?: number;
  shipping?: number;
  taxMethod?: 'INCLUSIVE' | 'EXCLUSIVE';
  sendNotification?: boolean;
  notes?: string;
  lines: RecurringLineInput[];
}

export async function createRecurring(body: CreateRecurringBody): Promise<RecurringInvoice> {
  const { data } = await api.post<RecurringInvoice>('/api/v1/recurring-invoices', body);
  return data;
}

export async function updateRecurring(id: UUID, body: Partial<CreateRecurringBody>): Promise<RecurringInvoice> {
  const { data } = await api.put<RecurringInvoice>(`/api/v1/recurring-invoices/${id}`, body);
  return data;
}

export async function pauseRecurring(id: UUID): Promise<RecurringInvoice> {
  const { data } = await api.post<RecurringInvoice>(`/api/v1/recurring-invoices/${id}/pause`); return data;
}
export async function resumeRecurring(id: UUID): Promise<RecurringInvoice> {
  const { data } = await api.post<RecurringInvoice>(`/api/v1/recurring-invoices/${id}/resume`); return data;
}
export async function cancelRecurring(id: UUID): Promise<RecurringInvoice> {
  const { data } = await api.post<RecurringInvoice>(`/api/v1/recurring-invoices/${id}/cancel`); return data;
}
export async function runNow(id: UUID): Promise<{ id: UUID; ref: string }> {
  const { data } = await api.post<{ id: UUID; ref: string }>(`/api/v1/recurring-invoices/${id}/run-now`);
  return data;
}
export async function deleteRecurring(id: UUID): Promise<void> {
  await api.delete(`/api/v1/recurring-invoices/${id}`);
}
