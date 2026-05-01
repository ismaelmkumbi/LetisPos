/**
 * AI-assisted product authoring — backed by ai-service.
 *
 *   POST /api/v1/ai/products/suggest      — single product name → suggested fields
 *   POST /api/v1/ai/products/import-map   — xlsx/csv rows → mapped products
 *
 * Both endpoints require the {@code product.create} authority on the JWT.
 */
import { api } from './client';
import type { UUID, BarcodeSymbology } from './types';

// ── Shared shapes ──────────────────────────────────────────────────────────

export interface NamedRef { id: UUID; name: string }

export interface WorkspaceContext {
  categories?: NamedRef[];
  brands?: NamedRef[];
  units?: NamedRef[];
  currency?: string;
  defaultTaxRate?: number;
}

// ── Smart fill ─────────────────────────────────────────────────────────────

export interface ProductSuggestBody {
  name: string;
  hint?: string;
  context?: WorkspaceContext;
}

export interface ProductSuggestion {
  name: string;
  description?: string | null;
  categoryId?: UUID | null;
  brandId?: UUID | null;
  unitId?: UUID | null;
  barcodeSymbology?: BarcodeSymbology | null;
  code?: string | null;
  cost?: number | null;
  price?: number | null;
  wholesalePrice?: number | null;
  minPrice?: number | null;
  taxRate?: number | null;
  confidence: number;
  rationale?: string | null;
  provider: string;
  model: string;
  generatedAt: string;
}

export async function aiSuggestProduct(body: ProductSuggestBody): Promise<ProductSuggestion> {
  const { data } = await api.post<ProductSuggestion>('/api/v1/ai/products/suggest', body);
  return data;
}

// ── Smart import ──────────────────────────────────────────────────────────

export interface ImportRow { row: number; values: Record<string, string> }

export interface ProductImportMapBody {
  headers: string[];
  rows: ImportRow[];
  context?: WorkspaceContext;
}

export interface MappedRow {
  row: number;
  name: string;
  description?: string | null;
  categoryId?: UUID | null;
  brandId?: UUID | null;
  unitId?: UUID | null;
  code?: string | null;
  barcodeSymbology?: BarcodeSymbology | null;
  cost?: number | null;
  price?: number | null;
  wholesalePrice?: number | null;
  minPrice?: number | null;
  taxRate?: number | null;
  confidence: number;
  warnings: string[];
}

export interface ProductImportMapResponse {
  rows: MappedRow[];
  warnings: string[];
  provider: string;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  generatedAt: string;
}

export async function aiImportMap(body: ProductImportMapBody): Promise<ProductImportMapResponse> {
  const { data } = await api.post<ProductImportMapResponse>('/api/v1/ai/products/import-map', body);
  return data;
}
