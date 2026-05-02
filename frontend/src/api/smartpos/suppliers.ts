import { api } from './client';
import type { Page, Supplier, UUID } from './types';

export interface SupplierSearchParams {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listSuppliers(params: SupplierSearchParams = {}): Promise<Page<Supplier>> {
  const { data } = await api.get<Page<Supplier>>('/api/v1/suppliers', { params });
  return data;
}

export async function getSupplier(id: UUID): Promise<Supplier> {
  const { data } = await api.get<Supplier>(`/api/v1/suppliers/${id}`);
  return data;
}

export interface SupplierInput {
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
}

export async function createSupplier(body: SupplierInput): Promise<Supplier> {
  const { data } = await api.post<Supplier>('/api/v1/suppliers', body);
  return data;
}

export async function updateSupplier(id: UUID, body: SupplierInput): Promise<Supplier> {
  const { data } = await api.put<Supplier>(`/api/v1/suppliers/${id}`, body);
  return data;
}

export async function deleteSupplier(id: UUID): Promise<void> {
  await api.delete(`/api/v1/suppliers/${id}`);
}
