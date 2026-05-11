import { api } from './client';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  active: boolean;
  tenantId: string;
  createdAt: string;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  phone?: string;
}

export async function listBranches(): Promise<Branch[]> {
  const { data } = await api.get<Branch[]>('/api/v1/branches');
  return data;
}

export async function getBranch(id: string): Promise<Branch> {
  const { data } = await api.get<Branch>(`/api/v1/branches/${id}`);
  return data;
}

export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  const { data } = await api.post<Branch>('/api/v1/branches', input);
  return data;
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<Branch> {
  const { data } = await api.put<Branch>(`/api/v1/branches/${id}`, input);
  return data;
}

export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/api/v1/branches/${id}`);
}
