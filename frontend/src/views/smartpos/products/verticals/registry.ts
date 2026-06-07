import type { ComponentType } from 'react';

/**
 * Props passed to every vertical extension form component.
 */
export interface VerticalFormProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}

/**
 * Registry entry for a vertical form component.
 */
export interface VerticalFieldConfig {
  key: string;
  label: string;
  component: ComponentType<VerticalFormProps>;
  sortOrder: number;
}

// ---------------------------------------------------------------
// In-memory registry — populated by each vertical form module
// via registerVerticalFields() at import time.
// ---------------------------------------------------------------

const registry = new Map<string, VerticalFieldConfig[]>();

export function registerVerticalFields(verticalKey: string, fields: VerticalFieldConfig[]) {
  registry.set(verticalKey, fields);
}

export function getVerticalFields(verticalKey: string): VerticalFieldConfig[] {
  return registry.get(verticalKey) ?? [];
}

export function getAllRegisteredVerticals(): string[] {
  return Array.from(registry.keys());
}
