import { api } from './client';
import type { UUID, Page } from './types';

export interface CustomerGroup {
  id: UUID;
  name: string;
  description?: string;
  discountPercent: number;
  customerCount?: number;
}

export interface CustomerGroupInput {
  name: string;
  description?: string;
  discountPercent: number;
}

export async function listCustomerGroups(
  page: number,
  size: number,
): Promise<Page<CustomerGroup>> {
  const { data } = await api.get<Page<CustomerGroup>>('/api/v1/customer-groups', {
    params: { page, size },
  });
  return data;
}

export async function listAllCustomerGroups(): Promise<CustomerGroup[]> {
  const { data } = await api.get<CustomerGroup[]>('/api/v1/customer-groups/all');
  return data;
}

export async function getCustomerGroup(id: UUID): Promise<CustomerGroup> {
  const { data } = await api.get<CustomerGroup>(`/api/v1/customer-groups/${id}`);
  return data;
}

export async function createCustomerGroup(
  input: CustomerGroupInput,
): Promise<CustomerGroup> {
  const { data } = await api.post<CustomerGroup>('/api/v1/customer-groups', input);
  return data;
}

export async function updateCustomerGroup(
  id: UUID,
  input: CustomerGroupInput,
): Promise<CustomerGroup> {
  const { data } = await api.put<CustomerGroup>(`/api/v1/customer-groups/${id}`, input);
  return data;
}

export async function deleteCustomerGroup(id: UUID): Promise<void> {
  await api.delete(`/api/v1/customer-groups/${id}`);
}
