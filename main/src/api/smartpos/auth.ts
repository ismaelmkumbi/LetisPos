import { api, tokenStore } from './client';

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
  tokenStore.setRefresh(data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefresh();
  try {
    if (refreshToken) await api.post('/api/v1/auth/logout', { refreshToken });
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
