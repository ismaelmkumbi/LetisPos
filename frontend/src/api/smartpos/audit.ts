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
}): Promise<AuditEvent[]> {
  const { data } = await api.get<AuditEvent[]>('/api/v1/admin/audit-events', { params });
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

// ── Data Retention ────────────────────────────────────────────────────────

export interface RetentionConfig {
  id: string;
  tenantId: string;
  config: string; // JSON string of entity->months
  updatedAt: string;
}

export interface PurgeHistoryEntry {
  id: string;
  tenantId: string;
  entityType: string;
  recordsRemoved: number;
  triggeredBy: 'SCHEDULE' | 'MANUAL';
  triggeredByActor?: string;
  executedAt: string;
}

export async function getRetentionConfig(): Promise<RetentionConfig> {
  const { data } = await api.get<RetentionConfig>('/api/v1/admin/retention');
  return data;
}

export async function updateRetentionConfig(config: Record<string, number>): Promise<RetentionConfig> {
  const { data } = await api.put<RetentionConfig>('/api/v1/admin/retention', config);
  return data;
}

export async function getPurgeHistory(): Promise<PurgeHistoryEntry[]> {
  const { data } = await api.get<PurgeHistoryEntry[]>('/api/v1/admin/retention/history');
  return data;
}

export async function manualPurge(entityType: string): Promise<{ entityType: string; recordsRemoved: number }> {
  const { data } = await api.post<{ entityType: string; recordsRemoved: number }>(`/api/v1/admin/retention/purge/${entityType}`);
  return data;
}

// ── System Status ─────────────────────────────────────────────────────────

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  lastChecked: string;
}

export async function getSystemStatus(): Promise<ServiceStatus[]> {
  const { data } = await api.get<ServiceStatus[]>('/api/v1/admin/system-status');
  return data;
}

// ── Backups ───────────────────────────────────────────────────────────────

export interface Backup {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  sizeBytes?: number;
  status: string;
  filePath?: string;
  errorMessage?: string;
  createdBy?: string;
  createdAt: string;
  completedAt?: string;
}

export async function listBackups(): Promise<Backup[]> {
  const { data } = await api.get<Backup[]>('/api/v1/admin/backups');
  return data;
}

export async function createBackup(body: { name: string; type: string; createdBy?: string }): Promise<Backup> {
  const { data } = await api.post<Backup>('/api/v1/admin/backups', body);
  return data;
}

export async function restoreBackup(id: string): Promise<void> {
  await api.post(`/api/v1/admin/backups/${id}/restore`);
}
