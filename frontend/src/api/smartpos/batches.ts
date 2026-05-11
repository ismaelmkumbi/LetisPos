/**
 * Batch / Lot tracking API wrapper.
 * Mirrors the Java DTOs in io.smartpos.product.api.dto.BatchDto.
 */
import { api } from './client';
import type { Page, ProductBatch, UUID } from './types';

export type { ProductBatch };

export interface BatchSearchParams {
  productId?: UUID;
  warehouseId?: UUID;
  status?: string;
  expiringBefore?: string;
  expiringAfter?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface CreateBatchInput {
  batchNumber: string;
  productId: UUID;
  variantId?: UUID;
  warehouseId: UUID;
  manufacturingDate?: string;
  expiryDate?: string;
  qty: number;
}

export async function listBatches(
  params: BatchSearchParams = {},
): Promise<Page<ProductBatch>> {
  const { data } = await api.get<Page<ProductBatch>>('/api/v1/batches', { params });
  return data;
}

export async function getBatch(id: UUID): Promise<ProductBatch> {
  const { data } = await api.get<ProductBatch>(`/api/v1/batches/${id}`);
  return data;
}

export async function createBatch(body: CreateBatchInput): Promise<ProductBatch> {
  const { data } = await api.post<ProductBatch>('/api/v1/batches', body);
  return data;
}

export async function getExpiringBatches(
  params?: { warehouseId?: UUID; withinDays?: number },
): Promise<ProductBatch[]> {
  const { data } = await api.get<ProductBatch[]>('/api/v1/batches/expiring', { params });
  return data;
}
