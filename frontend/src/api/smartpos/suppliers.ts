/**
 * Suppliers API — enterprise vendor management.
 * Mirrors io.smartpos.product.api.dto.SupplierDto
 */
import { api } from './client';
import type { Page, Supplier, UUID } from './types';

// ---------- Search / list ----------

export interface SupplierSearchParams {
  search?: string;
  active?: boolean;
  city?: string;
  country?: string;
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

// ---------- Create / update ----------

export interface SupplierInput {
  code?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  paymentTermDays?: number;
  creditLimit?: number;
  openingBalance?: number;
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

export async function toggleSupplierActive(id: UUID): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/api/v1/suppliers/${id}/toggle-active`);
  return data;
}

// ---------- Balance ----------

export interface SupplierBalance {
  supplierId: UUID;
  supplierName: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
}

export async function getSupplierBalance(id: UUID): Promise<SupplierBalance> {
  const { data } = await api.get<SupplierBalance>(`/api/v1/suppliers/${id}/balance`);
  return data;
}

// ---------- Summary / stats ----------

export interface SupplierSummary {
  totalPurchases: number;
  totalPaid: number;
  totalDue: number;
  purchaseCount: number;
  lastPurchaseDate?: string | null;
}

export async function getSupplierSummary(id: UUID): Promise<SupplierSummary> {
  const { data } = await api.get<SupplierSummary>(`/api/v1/suppliers/${id}/summary`);
  return data;
}
