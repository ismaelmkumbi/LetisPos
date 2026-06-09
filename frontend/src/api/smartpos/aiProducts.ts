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
  const { data } = await api.post<ProductSuggestion>('/api/v1/ai/products/suggest', body, { timeout: 60_000 });
  return data;
}

// ── Describe (free-text → full product profile) ──────────────────────────

export interface ProductDescribeBody {
  description: string;
  context?: WorkspaceContext;
}

export interface ProductDescribeResponse {
  name: string;
  description?: string | null;
  categoryId?: UUID | null;
  subCategoryId?: UUID | null;
  brandId?: UUID | null;
  unitId?: UUID | null;
  barcodeSymbology?: BarcodeSymbology | null;
  code?: string | null;
  cost?: number | null;
  price?: number | null;
  wholesalePrice?: number | null;
  minPrice?: number | null;
  taxRate?: number | null;
  taxMethod?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  stockAlert?: number | null;
  type?: 'STANDARD' | 'SERVICE' | 'COMBO' | null;
  warrantyMonths?: number | null;
  guaranteeMonths?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  weightGrams?: number | null;
  trackSerial?: boolean | null;
  trackImei?: boolean | null;
  featured?: boolean | null;
  hideOnline?: boolean | null;
  points?: number | null;
  confidence: number;
  fieldConfidence?: Record<string, number> | null;
  rationale?: string | null;
  provider: string;
  model: string;
  generatedAt: string;
}

export async function aiDescribeProduct(body: ProductDescribeBody): Promise<ProductDescribeResponse> {
  const { data } = await api.post<ProductDescribeResponse>('/api/v1/ai/products/describe', body, { timeout: 60_000 });
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
  /** Raw category value from spreadsheet when no matching ID was found */
  suggestedCategoryName?: string | null;
  /** Raw brand value from spreadsheet when no matching ID was found */
  suggestedBrandName?: string | null;
  /** Raw unit value from spreadsheet when no matching ID was found */
  suggestedUnitName?: string | null;
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
  const { data } = await api.post<ProductImportMapResponse>('/api/v1/ai/products/import-map', body, { timeout: 90_000 });
  return data;
}

// ── Vision: photo → full product profile ──────────────────────────────────

export interface ProductFromImageBody {
  /** base64 data URLs (e.g. "data:image/jpeg;base64,/9j/...") or external https URLs. */
  imageDataUrls: string[];
  hint?: string;
  context?: WorkspaceContext;
}

export async function aiProductFromImage(body: ProductFromImageBody): Promise<ProductDescribeResponse> {
  const { data } = await api.post<ProductDescribeResponse>('/api/v1/ai/products/from-image', body, { timeout: 60_000 });
  return data;
}

// ── Vision: batch image import → mapped product rows ──────────────────────

export interface ProductImportFromImagesBody {
  imageDataUrls: string[];
  hint?: string;
  context?: WorkspaceContext;
}

export async function aiImportFromImages(
  body: ProductImportFromImagesBody,
): Promise<ProductImportMapResponse> {
  const { data } = await api.post<ProductImportMapResponse>(
    '/api/v1/ai/products/import-from-images',
    body,
    { timeout: 120_000 },
  );
  return data;
}

// ── Disambiguation: vague seed → up to 4 candidate variants ───────────────

export interface ProductCandidatesResponse {
  top: ProductSuggestion;
  candidates: ProductSuggestion[];
  ambiguous: boolean;
  clarification?: string | null;
  provider: string;
  model: string;
  generatedAt: string;
}

export async function aiProductCandidates(body: ProductSuggestBody): Promise<ProductCandidatesResponse> {
  const { data } = await api.post<ProductCandidatesResponse>('/api/v1/ai/products/candidates', body, { timeout: 60_000 });
  return data;
}
