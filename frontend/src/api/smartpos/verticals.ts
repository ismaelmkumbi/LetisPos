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

/** List all registered vertical definitions (system catalog). */
export async function listVerticalDefinitions(): Promise<VerticalDefinition[]> {
  const { data } = await api.get<VerticalDefinition[]>('/api/v1/verticals/fields');
  return data;
}

/** Get field definitions for a specific vertical (for dynamic form rendering). */
export async function getVerticalFields(
  verticalKey: string,
): Promise<VerticalFieldDefinition[]> {
  const { data } = await api.get<VerticalFieldDefinition[]>(
    `/api/v1/verticals/${verticalKey}/fields`,
  );
  return data;
}

/** Get active verticals for the current tenant. */
export async function getMyVerticals(): Promise<TenantVertical[]> {
  const { data } = await api.get<TenantVertical[]>('/api/v1/tenants/me/verticals');
  return data;
}

/** Activate a vertical for the current tenant. */
export async function activateVertical(verticalKey: string): Promise<void> {
  await api.post('/api/v1/tenants/me/verticals', { verticalKey });
}

/** Deactivate a vertical for the current tenant. */
export async function deactivateVertical(verticalKey: string): Promise<void> {
  await api.delete(`/api/v1/tenants/me/verticals/${verticalKey}`);
}
