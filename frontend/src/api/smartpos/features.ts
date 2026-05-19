import { api } from './client';
import type { AxiosResponse } from 'axios';

// Types
export interface FeatureDefinition {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  active: boolean;
  sortOrder: number;
}

export interface FeatureAssignment {
  id: string;
  featureKey: string;
  assignmentLevel: 'PLAN' | 'TENANT' | 'USER';
  targetId: string;
  granted: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface MenuNode {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  route: string | null;
  sectionHeader: boolean;
  children: MenuNode[];
}

export interface MenuDefinition {
  id: string;
  parent: MenuDefinition | null;
  key: string;
  label: string;
  icon: string | null;
  route: string | null;
  requiredFeatureKey: string | null;
  sortOrder: number;
  visible: boolean;
  sectionHeader: boolean;
  children: MenuDefinition[];
}

export interface CreateFeatureRequest {
  key: string;
  label: string;
  description?: string;
  category: string;
  sortOrder: number;
}

export interface UpdateFeatureRequest {
  label: string;
  description?: string;
  category: string;
  sortOrder: number;
  active: boolean;
}

export interface CreateAssignmentRequest {
  featureKey: string;
  assignmentLevel: 'PLAN' | 'TENANT' | 'USER';
  targetId: string;
  granted: boolean;
}

export interface CreateMenuRequest {
  key: string;
  label: string;
  icon?: string;
  route?: string;
  requiredFeatureKey?: string;
  sortOrder: number;
  sectionHeader: boolean;
  parentId?: string;
}

export interface UpdateMenuRequest {
  label: string;
  icon?: string;
  route?: string;
  requiredFeatureKey?: string;
  sortOrder: number;
  visible: boolean;
  sectionHeader: boolean;
  parentId?: string;
}

export interface ReorderItem {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

// Public
export async function getMyMenu(): Promise<MenuNode[]> {
  const res: AxiosResponse<MenuNode[]> = await api.get('/api/v1/menu');
  return res.data;
}

// Admin: features
export async function getAllFeatures(): Promise<FeatureDefinition[]> {
  const res: AxiosResponse<FeatureDefinition[]> = await api.get('/api/v1/admin/features');
  return res.data;
}

export async function createFeature(data: CreateFeatureRequest): Promise<FeatureDefinition> {
  const res: AxiosResponse<FeatureDefinition> = await api.post('/api/v1/admin/features', data);
  return res.data;
}

export async function updateFeature(id: string, data: UpdateFeatureRequest): Promise<FeatureDefinition> {
  const res: AxiosResponse<FeatureDefinition> = await api.put(`/api/v1/admin/features/${id}`, data);
  return res.data;
}

export async function deleteFeature(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/features/${id}`);
}

// Admin: assignments
export async function getAssignments(params?: {
  level?: string;
  targetId?: string;
}): Promise<FeatureAssignment[]> {
  const res: AxiosResponse<FeatureAssignment[]> = await api.get('/api/v1/admin/features/assignments', { params });
  return res.data;
}

export async function createAssignment(data: CreateAssignmentRequest): Promise<FeatureAssignment> {
  const res: AxiosResponse<FeatureAssignment> = await api.post('/api/v1/admin/features/assignments', data);
  return res.data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/features/assignments/${id}`);
}

// Admin: menu
export async function getFullMenu(): Promise<MenuDefinition[]> {
  const res: AxiosResponse<MenuDefinition[]> = await api.get('/api/v1/admin/menu');
  return res.data;
}

export async function createMenuItem(data: CreateMenuRequest): Promise<MenuDefinition> {
  const res: AxiosResponse<MenuDefinition> = await api.post('/api/v1/admin/menu', data);
  return res.data;
}

export async function updateMenuItem(id: string, data: UpdateMenuRequest): Promise<MenuDefinition> {
  const res: AxiosResponse<MenuDefinition> = await api.put(`/api/v1/admin/menu/${id}`, data);
  return res.data;
}

export async function deleteMenuItem(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/menu/${id}`);
}

export async function reorderMenu(items: ReorderItem[]): Promise<void> {
  await api.put('/api/v1/admin/menu/reorder', items);
}
