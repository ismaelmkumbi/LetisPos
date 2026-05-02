/**
 * Notifications API — backed by notification-service:8089.
 *   /api/v1/notifications           (deliveries: search / send / retry)
 *   /api/v1/notification-templates  (template CRUD)
 *
 * All requests go through the same JWT-bearing axios client; in production the
 * gateway re-routes by path so we don't need a separate base URL here.
 */
import { api } from './client';
import type { Page, UUID } from './types';

export type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationTemplate {
  id: UUID;
  code: string;
  channel: Channel;
  name: string;
  subject?: string | null;
  body: string;
  html: boolean;
  isDefault: boolean;
  enabled: boolean;
  updatedAt: string;
}

export interface NotificationDelivery {
  id: UUID;
  channel: Channel;
  templateCode?: string | null;
  recipient: string;
  subject?: string | null;
  status: DeliveryStatus;
  errorMessage?: string | null;
  providerMessageId?: string | null;
  attempts: number;
  relatedAggregate?: string | null;
  relatedAggregateId?: UUID | null;
  createdAt: string;
  sentAt?: string | null;
  nextRetryAt?: string | null;
}

// ---------- Deliveries ----------

export interface DeliverySearchParams {
  channel?: Channel;
  status?: DeliveryStatus;
  recipient?: string;
  page?: number;
  size?: number;
}

export async function listDeliveries(params: DeliverySearchParams = {}): Promise<Page<NotificationDelivery>> {
  const { data } = await api.get<Page<NotificationDelivery>>('/api/v1/notifications', { params });
  return data;
}

export interface SendBody {
  channel: Channel;
  recipient: string;
  templateCode?: string;
  subject?: string;
  body?: string;
  html?: boolean;
  data?: Record<string, unknown>;
  relatedAggregate?: string;
  relatedAggregateId?: UUID;
}

export async function sendNotification(body: SendBody): Promise<NotificationDelivery> {
  const { data } = await api.post<NotificationDelivery>('/api/v1/notifications', body);
  return data;
}

export async function retryDelivery(id: UUID): Promise<NotificationDelivery> {
  const { data } = await api.post<NotificationDelivery>(`/api/v1/notifications/${id}/retry`);
  return data;
}

// ---------- Templates ----------

export async function listTemplates(code?: string, channel?: Channel): Promise<NotificationTemplate[]> {
  const { data } = await api.get<NotificationTemplate[]>('/api/v1/notification-templates', {
    params: { code, channel },
  });
  return data;
}

export interface CreateTemplateBody {
  code: string;
  channel: Channel;
  name: string;
  subject?: string;
  body: string;
  html?: boolean;
  isDefault?: boolean;
  enabled?: boolean;
}

export async function createTemplate(body: CreateTemplateBody): Promise<NotificationTemplate> {
  const { data } = await api.post<NotificationTemplate>('/api/v1/notification-templates', body);
  return data;
}

export async function updateTemplate(id: UUID, body: Partial<CreateTemplateBody>): Promise<NotificationTemplate> {
  const { data } = await api.put<NotificationTemplate>(`/api/v1/notification-templates/${id}`, body);
  return data;
}

export async function deleteTemplate(id: UUID): Promise<void> {
  await api.delete(`/api/v1/notification-templates/${id}`);
}
