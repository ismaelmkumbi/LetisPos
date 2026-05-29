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
  tenantStatus?: string;    // TRIAL, ACTIVE, PAST_DUE, etc.
  maxUsers?: number;
  maxStores?: number;
  trialEndsAt?: string;
  // From JWT claims (included in /api/v1/auth/me):
  features?: string[];
  // Filtered menu from /api/v1/menu:
  menu?: import('./features').MenuNode[];
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
  billingPlan?: string;
  phoneNumber?: string;
}

export interface RegisterResponse {
  userId: string;
  channels: string[];
  contact: string;
  message?: string;
  /** Present when user is ACTIVE — login tokens returned immediately */
  accessToken?: string;
  refreshToken?: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await api.post<LoginResponse | RegisterResponse>('/api/v1/auth/register', payload);
  // If user is ACTIVE (verified immediately), login tokens are returned
  const loginResp = data as LoginResponse;
  if (loginResp.accessToken) {
    tokenStore.set(loginResp.accessToken);
    tokenStore.setTenantId(loginResp.user?.tenantId || null);
    schedulePreemptiveRefresh(loginResp.accessToken);
    return { userId: loginResp.user.id, channels: ['EMAIL'], contact: loginResp.user.email ?? '' };
  }
  return data as RegisterResponse;
}

export async function verifyAccount(token: string): Promise<{ status: string; contact: string }> {
  const { data } = await api.post<{ status: string; contact: string }>('/api/v1/auth/verify', { token });
  return data;
}

export async function resendVerification(userId: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/api/v1/auth/resend-verification', { userId });
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

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/api/v1/auth/password/forgot', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/api/v1/auth/password/reset', { token, password });
}

export async function resendVerificationByEmail(email: string): Promise<void> {
  await api.post('/api/v1/auth/resend-verification', { email });
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
  billingPlan: 'STARTER' | 'BUSINESS' | 'PROFESSIONAL' | 'ENTERPRISE';
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

export async function deleteTenant(id: string, hard?: boolean, reason?: string): Promise<void> {
  if (hard) {
    await api.delete(`/api/v1/tenants/${id}`, { params: { hard: true, reason } });
  } else {
    await api.delete(`/api/v1/tenants/${id}`, { data: { reason: reason || 'Admin action' } });
  }
}

export async function disableTenant(id: string, reason: string): Promise<Tenant> {
  const { data } = await api.post<Tenant>(`/api/v1/tenants/${id}/disable`, { reason });
  return data;
}

export async function deleteUser(id: string, hard?: boolean): Promise<void> {
  if (hard) {
    await api.delete(`/api/v1/admin/users/${id}/hard`);
  } else {
    await api.delete(`/api/v1/admin/users/${id}`);
  }
}

export interface UserSearchParams {
  search?: string;
  tenantId?: string;
  status?: string;
  page?: number;
  size?: number;
}

export async function searchAllUsers(params: UserSearchParams = {}): Promise<{
  content: Array<{
    id: string;
    email: string;
    status: string;
    tenantId: string;
    createdAt: string;
  }>;
  totalElements: number;
}> {
  const { data } = await api.get('/api/v1/admin/users', { params });
  return data;
}
