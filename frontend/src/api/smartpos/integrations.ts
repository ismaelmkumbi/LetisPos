/**
 * Integrations API — backed by integration-service:8092.
 *   /api/v1/integrations/{syncs, zatca/qr, woocommerce/products/{id}, quickbooks/invoices/{id}}
 */
import { api } from './client';
import type { Page, UUID } from './types';

export type IntegrationProvider  = 'ZATCA' | 'WOOCOMMERCE' | 'QUICKBOOKS';
export type IntegrationDirection = 'IN' | 'OUT';
export type IntegrationStatus    = 'PENDING' | 'OK' | 'FAILED';

export interface IntegrationSync {
  id: UUID;
  provider: IntegrationProvider;
  direction: IntegrationDirection;
  entityType: string;
  entityId?: UUID | null;
  externalId?: string | null;
  status: IntegrationStatus;
  attempts: number;
  requestBody?: string | null;
  responseBody?: string | null;
  errorMessage?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface SyncSearchParams {
  provider?: IntegrationProvider;
  status?: IntegrationStatus;
  page?: number;
  size?: number;
}

export async function listSyncs(params: SyncSearchParams = {}): Promise<Page<IntegrationSync>> {
  const { data } = await api.get<Page<IntegrationSync>>('/api/v1/integrations/syncs', { params });
  return data;
}

// ZATCA
export interface ZatcaQrParams {
  saleId: UUID;
  invoiceTimestampIso: string;
  invoiceTotal: string;
  vatTotal: string;
}
export async function generateZatcaQr(params: ZatcaQrParams): Promise<{ qr: string }> {
  const { data } = await api.post<{ qr: string }>('/api/v1/integrations/zatca/qr', null, { params });
  return data;
}

// WooCommerce
export async function pushWooProduct(productId: UUID, payload: Record<string, unknown>): Promise<IntegrationSync> {
  const { data } = await api.post<IntegrationSync>(`/api/v1/integrations/woocommerce/products/${productId}`, payload);
  return data;
}

// QuickBooks
export async function pushQbInvoice(saleId: UUID, payload: Record<string, unknown>): Promise<IntegrationSync> {
  const { data } = await api.post<IntegrationSync>(`/api/v1/integrations/quickbooks/invoices/${saleId}`, payload);
  return data;
}

// ---- Integration Provider Config ----

export interface IntegrationConfig {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  enabled: boolean;
  config: string; // JSON string of provider-specific settings
  createdAt: string;
  updatedAt: string;
}

export interface ProviderConfigUpdate {
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export async function getIntegrationConfigs(): Promise<IntegrationConfig[]> {
  const { data } = await api.get<IntegrationConfig[]>('/api/v1/integrations/config');
  return data;
}

export async function updateProviderConfig(
  provider: IntegrationProvider,
  update: ProviderConfigUpdate
): Promise<IntegrationConfig> {
  const { data } = await api.put<IntegrationConfig>(
    `/api/v1/integrations/config/${provider.toLowerCase()}`, update
  );
  return data;
}
