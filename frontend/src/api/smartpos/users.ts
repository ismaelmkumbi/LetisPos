/**
 * User & Role management API wrappers.
 * User endpoints → UserController (/api/v1/users)
 * Role endpoints → RoleController (/api/v1/roles)
 * Permission endpoint → RoleController (/api/v1/permissions)
 */
import { api } from './client';
import type { Page, UUID } from './types';

// ─── Users ────────────────────────────────────────────────────────────

export interface UserDto {
  id: UUID;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  address: string;
  city: string;
  country: string;
  isAllWarehouses: boolean;
  active: boolean;
  warehouseIds: UUID[];
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  isAllWarehouses?: boolean;
  active?: boolean;
  warehouseIds?: UUID[];
  roleIds?: UUID[];
}

export async function listUsers(params?: {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
}): Promise<Page<UserDto>> {
  const { data } = await api.get<Page<UserDto>>('/api/v1/users', { params });
  return data;
}

export async function getUser(id: UUID): Promise<UserDto> {
  const { data } = await api.get<UserDto>(`/api/v1/users/${id}`);
  return data;
}

export async function updateUser(id: UUID, body: UpdateUserRequest): Promise<UserDto> {
  const { data } = await api.put<UserDto>(`/api/v1/users/${id}`, body);
  return data;
}

export async function setUserStatus(id: UUID, active: boolean): Promise<void> {
  await api.patch(`/api/v1/users/${id}/status`, { active });
}

export async function assignUserWarehouses(
  id: UUID,
  warehouseIds: UUID[],
): Promise<void> {
  await api.put(`/api/v1/users/${id}/warehouses`, { warehouseIds });
}

// ─── Roles ────────────────────────────────────────────────────────────

export interface RoleDto {
  id: UUID;
  name: string;
  label: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export interface CreateRoleRequest {
  name: string;
  label?: string;
  description?: string;
  permissionIds?: UUID[];
}

export async function listRoles(): Promise<RoleDto[]> {
  const { data } = await api.get<RoleDto[]>('/api/v1/roles');
  return data;
}

export async function createRole(body: CreateRoleRequest): Promise<RoleDto> {
  const { data } = await api.post<RoleDto>('/api/v1/roles', body);
  return data;
}

export async function updateRole(id: UUID, body: CreateRoleRequest): Promise<RoleDto> {
  const { data } = await api.put<RoleDto>(`/api/v1/roles/${id}`, body);
  return data;
}

export async function deleteRole(id: UUID): Promise<void> {
  await api.delete(`/api/v1/roles/${id}`);
}

export async function setRolePermissions(
  id: UUID,
  permissionIds: UUID[],
): Promise<RoleDto> {
  const { data } = await api.put<RoleDto>(`/api/v1/roles/${id}/permissions`, {
    permissionIds,
  });
  return data;
}

// ─── Permissions ──────────────────────────────────────────────────────

export interface PermissionDto {
  id: UUID;
  name: string;
  description: string;
}

export async function listPermissions(): Promise<PermissionDto[]> {
  const { data } = await api.get<PermissionDto[]>('/api/v1/permissions');
  return data;
}
