import { api } from './client';
import type { Customer, Page, UUID } from './types';

export interface CustomerSearchParams {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listCustomers(params: CustomerSearchParams = {}): Promise<Page<Customer>> {
  const { data } = await api.get<Page<Customer>>('/api/v1/customers', { params });
  return data;
}

export async function getCustomer(id: UUID): Promise<Customer> {
  const { data } = await api.get<Customer>(`/api/v1/customers/${id}`);
  return data;
}

export interface CustomerInput {
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  creditLimit?: number;
  notes?: string;
}

export async function createCustomer(body: CustomerInput): Promise<Customer> {
  const { data } = await api.post<Customer>('/api/v1/customers', body);
  return data;
}

export async function updateCustomer(id: UUID, body: CustomerInput): Promise<Customer> {
  const { data } = await api.put<Customer>(`/api/v1/customers/${id}`, body);
  return data;
}

export async function deleteCustomer(id: UUID): Promise<void> {
  await api.delete(`/api/v1/customers/${id}`);
}
