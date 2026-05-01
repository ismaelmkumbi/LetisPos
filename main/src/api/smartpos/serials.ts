/**
 * IMEI / Serial registry API. Mirrors backend product-service
 * /api/v1/serials (ProductSerialController).
 */
import { api } from './client';
import type { Page, ProductSerial, SerialStatus, SerialType, UUID } from './types';

export interface SerialSearchParams {
  productId?: UUID;
  warehouseId?: UUID;
  status?: SerialStatus;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listSerials(params: SerialSearchParams = {}): Promise<Page<ProductSerial>> {
  const { data } = await api.get<Page<ProductSerial>>('/api/v1/serials', { params });
  return data;
}

export async function getSerial(id: UUID): Promise<ProductSerial> {
  const { data } = await api.get<ProductSerial>(`/api/v1/serials/${id}`);
  return data;
}

/** Resolve a scanned serial/IMEI string to its registered unit. */
export async function getSerialByNumber(serialNumber: string): Promise<ProductSerial> {
  const { data } = await api.get<ProductSerial>(`/api/v1/serials/by-number/${encodeURIComponent(serialNumber)}`);
  return data;
}

export interface CreateSerialBody {
  productId: UUID;
  variantId?: UUID;
  warehouseId?: UUID;
  serialNumber: string;
  serialType?: SerialType;
  purchaseRef?: string;
  warrantyStart?: string;   // ISO date
  warrantyEnd?: string;
  notes?: string;
}

export async function createSerial(body: CreateSerialBody): Promise<ProductSerial> {
  const { data } = await api.post<ProductSerial>('/api/v1/serials', body);
  return data;
}

export async function createSerialsBulk(items: CreateSerialBody[]): Promise<ProductSerial[]> {
  const { data } = await api.post<ProductSerial[]>('/api/v1/serials/bulk', items);
  return data;
}

export async function updateSerialStatus(id: UUID, status: SerialStatus, saleRef?: string, notes?: string): Promise<ProductSerial> {
  const { data } = await api.patch<ProductSerial>(`/api/v1/serials/${id}/status`, { status, saleRef, notes });
  return data;
}

export async function deleteSerial(id: UUID): Promise<void> {
  await api.delete(`/api/v1/serials/${id}`);
}

export type { ProductSerial, SerialStatus, SerialType };
