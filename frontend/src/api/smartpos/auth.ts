import { api, tokenStore, schedulePreemptiveRefresh } from './client';

export interface AuthUserSummary {
  id: string;
  email: string;
  tenantId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUserSummary;
}

export interface CurrentUser {
  id: string;
  email: string;
  status: string;
  tenantId: string;
  lastLoginAt: string;
  // Tenant enrichment from /me (when tenantId is set)
  tenantName?: string;
  tenantSlug?: string;
  billingPlan?: string;
  // Populated later from User Service:
  firstName?: string;
  lastName?: string;
  roles?: string[];
  permissions?: string[];
  warehouseIds?: string[];
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/v1/auth/login', { email, password });
  tokenStore.set(data.accessToken);
  tokenStore.setTenantId(data.user?.tenantId || null);
  schedulePreemptiveRefresh(data.accessToken);
  return data;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  tenantName?: string;
  tenantSlug?: string;
}

export async function register(payload: RegisterPayload): Promise<{ userId: string }> {
  const { data } = await api.post<{ userId: string }>('/api/v1/auth/register', payload);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/v1/auth/logout', {});
  } catch {
    /* still clear client state */
  } finally {
    tokenStore.clear();
  }
}

export async function fetchMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/api/v1/auth/me');
  return data;
}

/** Enriches the auth user with profile/roles/permissions from User Service. */
export async function fetchMyProfile(userId: string): Promise<Partial<CurrentUser>> {
  try {
    const { data } = await api.get(`/api/v1/users/${userId}`);
    return {
      firstName:    data.firstName,
      lastName:     data.lastName,
      roles:        data.roles,
      permissions:  data.permissions,
      warehouseIds: Array.from(data.warehouseIds ?? []),
    };
  } catch {
    // User Service not up yet, or profile not provisioned — non-fatal.
    return {};
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/api/v1/auth/password/change', { userId, currentPassword, newPassword });
}

// ── Tenant API ──

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'TRIAL' | 'TRIAL_EXPIRED' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CLOSED';
  billingPlan: 'FREE' | 'STARTER' | 'BUSINESS' | 'PROFESSIONAL' | 'ENTERPRISE';
  maxUsers: number;
  maxStores: number;
  settings: string; // JSONB — parsed by caller
  trialEndsAt?: string;
  statusChangedAt?: string;
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchTenants(): Promise<Tenant[]> {
  const { data } = await api.get<Tenant[]>('/api/v1/tenants');
  return data;
}

export async function fetchTenant(id: string): Promise<Tenant> {
  const { data } = await api.get<Tenant>(`/api/v1/tenants/${id}`);
  return data;
}

export async function createTenant(body: {
  name: string;
  slug?: string;
  billingPlan?: string;
}): Promise<Tenant> {
  const { data } = await api.post<Tenant>('/api/v1/tenants', body);
  return data;
}

export async function updateTenant(
  id: string,
  body: { name?: string; slug?: string; billingPlan?: string }
): Promise<Tenant> {
  const { data } = await api.patch<Tenant>(`/api/v1/tenants/${id}`, body);
  return data;
}

export async function suspendTenant(id: string, reason: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/suspend`, { reason });
  return data;
}

export async function reactivateTenant(id: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/reactivate`);
  return data;
}

export async function closeTenant(id: string, reason: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/close`, { reason });
  return data;
}

export async function listAllTenants(): Promise<Tenant[]> {
  const { data } = await api.get<Tenant[]>('/api/v1/tenants/admin/all');
  return data;
}
