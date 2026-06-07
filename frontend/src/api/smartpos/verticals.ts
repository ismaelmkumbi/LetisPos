/**
 * Vertical Extensions API — tenant vertical activation, field definitions.
 * Backed by /api/v1/verticals and /api/v1/tenants/me/verticals.
 */
import { api } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface VerticalDefinition {
  key: string;
  label: string;
  description?: string | null;
  category: string;
  featureKey: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface TenantVertical {
  vertical_key: string;
  activated_at: string;
  label: string;
  description?: string | null;
}

export interface VerticalFieldDefinition {
  fieldKey: string;
  fieldType: string;
  label: string;
  required: boolean;
  validationPattern?: string | null;
  sortOrder: number;
}

// ── API Calls ──────────────────────────────────────────────────────────────

/** List all registered vertical definitions (system catalog).
 *  Returns empty array if product-service is not deployed. */
export async function listVerticalDefinitions(): Promise<VerticalDefinition[]> {
  try {
    const { data } = await api.get<VerticalDefinition[]>('/api/v1/verticals/fields');
    return data;
  } catch { return []; }
}

/** Get field definitions for a specific vertical (for dynamic form rendering).
 *  Returns empty array if product-service is not deployed. */
export async function getVerticalFields(
  verticalKey: string,
): Promise<VerticalFieldDefinition[]> {
  try {
    const { data } = await api.get<VerticalFieldDefinition[]>(
      `/api/v1/verticals/${verticalKey}/fields`,
    );
    return data;
  } catch { return []; }
}

/** Get active verticals for the current tenant.
 *  When the verticals service is unavailable (404/500),
 *  returns an empty array so the app doesn't crash. */
export async function getMyVerticals(): Promise<TenantVertical[]> {
  try {
    const { data } = await api.get<TenantVertical[]>('/api/v1/tenants/me/verticals');
    return data;
  } catch {
    // product-service may not be deployed in all environments
    return [];
  }
}

/** Activate a vertical for the current tenant. No-op if service unavailable. */
export async function activateVertical(verticalKey: string): Promise<void> {
  try { await api.post('/api/v1/tenants/me/verticals', { verticalKey }); } catch {}
}

/** Deactivate a vertical for the current tenant. No-op if service unavailable. */
export async function deactivateVertical(verticalKey: string): Promise<void> {
  try { await api.delete(`/api/v1/tenants/me/verticals/${verticalKey}`); } catch {}
}
