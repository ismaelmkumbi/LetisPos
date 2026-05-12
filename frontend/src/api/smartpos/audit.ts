import { api } from './client';
import type { Page } from './types';

export interface AuditEvent {
  id: string;
  timestamp: string;
  service: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  diff?: Record<string, { from: unknown; to: unknown }>;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ErrorLogEntry {
  id: string;
  service: string;
  level: 'ERROR' | 'WARN';
  message: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  tenantId?: string;
  occurredAt: string;
}

export interface ApiKeyData {
  id: string;
  tenantId: string;
  label: string;
  prefix: string;
  scopes: string[];
  createdById?: string;
  createdByName?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
}

export interface SessionData {
  tokenId: string;
  userId: string;
  userName: string;
  userEmail: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivityAt: string;
  createdAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

// ── Audit events ────────────────────────────────────────────────────────

export async function listAuditEvents(params: {
  page?: number;
  size?: number;
  service?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  targetType?: string;
}): Promise<Page<AuditEvent>> {
  const { data } = await api.get<Page<AuditEvent>>('/api/v1/admin/audit-events', { params });
  return data;
}

export async function getAuditEvent(id: string): Promise<AuditEvent> {
  const { data } = await api.get<AuditEvent>(`/api/v1/admin/audit-events/${id}`);
  return data;
}

// ── Error logs ──────────────────────────────────────────────────────────

export async function listErrorLogs(params: {
  page?: number;
  size?: number;
  service?: string;
  level?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Page<ErrorLogEntry>> {
  const { data } = await api.get<Page<ErrorLogEntry>>('/api/v1/admin/error-logs', { params });
  return data;
}

// ── API Keys ────────────────────────────────────────────────────────────

export async function listApiKeys(): Promise<ApiKeyData[]> {
  const { data } = await api.get<ApiKeyData[]>('/api/v1/admin/api-keys');
  return data;
}

export async function createApiKey(body: {
  label: string;
  scopes: string[];
  expiresAt?: string;
}): Promise<{ key: ApiKeyData; secret: string }> {
  const { data } = await api.post<{ key: ApiKeyData; secret: string }>(
    '/api/v1/admin/api-keys',
    body,
  );
  return data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await api.delete(`/api/v1/admin/api-keys/${id}`);
}

export async function rotateApiKey(
  id: string,
): Promise<{ key: ApiKeyData; secret: string }> {
  const { data } = await api.post<{ key: ApiKeyData; secret: string }>(
    `/api/v1/admin/api-keys/${id}/rotate`,
  );
  return data;
}

// ── Sessions ────────────────────────────────────────────────────────────

export async function listSessions(params?: {
  page?: number;
  size?: number;
}): Promise<Page<SessionData>> {
  const { data } = await api.get<Page<SessionData>>('/api/v1/admin/sessions', { params });
  return data;
}

export async function revokeSession(tokenId: string): Promise<void> {
  await api.delete(`/api/v1/admin/sessions/${tokenId}`);
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await api.post('/api/v1/admin/sessions/bulk-revoke', { userId });
}
