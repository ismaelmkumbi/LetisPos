import { api } from './client';
import type {
  Barcode, BarcodeSymbology, Brand, Category, ComboItem, Customer, Page, Product, Supplier, UUID, Unit,
} from './types';

// ---------- Products ----------

export interface ProductSearchParams {
  search?: string;
  categoryId?: UUID;
  brandId?: UUID;
  status?: boolean;
  page?: number;
  size?: number;
  sort?: string;        // "name,asc"
}

export async function listProducts(params: ProductSearchParams = {}): Promise<Page<Product>> {
  const { data } = await api.get<Page<Product>>('/api/v1/products', { params });
  return data;
}

export async function getProduct(id: UUID): Promise<Product> {
  const { data } = await api.get<Product>(`/api/v1/products/${id}`);
  return data;
}

/** POS hot path — backed by Redis on the server. */
export async function getProductByBarcode(barcode: string): Promise<Product> {
  const { data } = await api.get<Product>(`/api/v1/products/by-barcode/${encodeURIComponent(barcode)}`);
  return data;
}

export interface ComboItemInput {
  componentProductId: UUID;
  qty: number;
  unitCost?: number;
  unitPrice?: number;
  position?: number;
}

export interface VariantInput {
  name: string;
  code?: string;
  cost?: number;
  price?: number;
  /** Wholesale (B2B) tier — overrides product wholesalePrice for this variant. */
  wholesalePrice?: number;
  /** Minimum sellable price — discounts cannot break this floor. */
  minPrice?: number;
  imageUrl?: string;
}

export interface CreateProductBody {
  code?: string;
  name: string;
  description?: string;
  categoryId?: UUID;
  /** Optional sub-category (parented under categoryId). */
  subCategoryId?: UUID;
  brandId?: UUID;
  unitId?: UUID;
  cost: number;
  price: number;
  // Multi-tier pricing (Stocky parity)
  wholesalePrice?: number;
  minPrice?: number;
  /** Loyalty points awarded per unit sold. */
  points?: number;
  taxMethod?: 'INCLUSIVE' | 'EXCLUSIVE';
  taxRate?: number;
  stockAlert?: number;
  type?: 'STANDARD' | 'SERVICE' | 'COMBO';
  status?: boolean;
  sellable?: boolean;
  featured?: boolean;
  hideOnline?: boolean;
  imageUrl?: string;
  /** Default barcode symbology used when auto-generating a barcode. */
  barcodeSymbology?: BarcodeSymbology;
  // Stocky parity (backend product-service V2)
  warrantyMonths?: number;
  guaranteeMonths?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightGrams?: number;
  trackSerial?: boolean;
  trackImei?: boolean;
  variants?: VariantInput[];
  barcodes?: { barcode: string; barcodeType?: string; primary?: boolean; variantId?: UUID }[];
  comboItems?: ComboItemInput[];
}

export async function createProduct(body: CreateProductBody): Promise<Product> {
  const { data } = await api.post<Product>('/api/v1/products', body);
  return data;
}

/**
 * Mint a fresh SKU (e.g. PROD-000042) from the backend sequence. Each call
 * consumes a value, so call this lazily on user click — not on form mount.
 */
export async function nextSku(): Promise<string> {
  const { data } = await api.get<{ code: string }>('/api/v1/products/next-sku');
  return data.code;
}

export async function updateProduct(id: UUID, body: Partial<CreateProductBody>): Promise<Product> {
  const { data } = await api.put<Product>(`/api/v1/products/${id}`, body);
  return data;
}

export async function deleteProduct(id: UUID): Promise<void> {
  await api.delete(`/api/v1/products/${id}`);
}

// ---------- Bulk create (used by AI import wizard) ----------

export interface BulkCreateProductsResponse {
  total: number;
  createdCount: number;
  failedCount: number;
  created: { index: number; id: UUID; code: string; name: string }[];
  failed:  { index: number; code: string; name: string; error: string }[];
}

/**
 * Bulk-create up to 500 products in a single call.
 * Returns per-row results so the UI can show created / failed counts and
 * highlight any row that errored out (typically a duplicate SKU).
 */
export async function bulkCreateProducts(items: CreateProductBody[]): Promise<BulkCreateProductsResponse> {
  const { data } = await api.post<BulkCreateProductsResponse>('/api/v1/products/bulk', { items });
  return data;
}

// ---------- Combo composition ----------

export async function listComboItems(productId: UUID): Promise<ComboItem[]> {
  const { data } = await api.get<ComboItem[]>(`/api/v1/products/${productId}/combo-items`);
  return data;
}

/** Replace the full combo composition in one call (backend PUT semantics). */
export async function replaceComboItems(productId: UUID, items: ComboItemInput[]): Promise<ComboItem[]> {
  const { data } = await api.put<ComboItem[]>(`/api/v1/products/${productId}/combo-items`, items);
  return data;
}

// ---------- Categories / Brands / Units ----------

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/api/v1/categories');
  return data;
}

export interface CategorySearchParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function searchCategories(params: CategorySearchParams = {}): Promise<Page<Category>> {
  const { data } = await api.get<Page<Category>>('/api/v1/categories/search', { params });
  return data;
}
export async function createCategory(body: Omit<Category, 'id'>): Promise<Category> {
  const { data } = await api.post<Category>('/api/v1/categories', body);
  return data;
}
export async function updateCategory(id: UUID, body: Omit<Category, 'id'>): Promise<Category> {
  const { data } = await api.put<Category>(`/api/v1/categories/${id}`, body);
  return data;
}
export async function deleteCategory(id: UUID): Promise<void> {
  await api.delete(`/api/v1/categories/${id}`);
}

export async function listBrands(): Promise<Brand[]> {
  const { data } = await api.get<Brand[]>('/api/v1/brands');
  return data;
}

export interface BrandSearchParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function searchBrands(params: BrandSearchParams = {}): Promise<Page<Brand>> {
  const { data } = await api.get<Page<Brand>>('/api/v1/brands/search', { params });
  return data;
}
export async function createBrand(body: Omit<Brand, 'id'>): Promise<Brand> {
  const { data } = await api.post<Brand>('/api/v1/brands', body);
  return data;
}
export async function updateBrand(id: UUID, body: Omit<Brand, 'id'>): Promise<Brand> {
  const { data } = await api.put<Brand>(`/api/v1/brands/${id}`, body);
  return data;
}
export async function deleteBrand(id: UUID): Promise<void> {
  await api.delete(`/api/v1/brands/${id}`);
}

export async function listUnits(): Promise<Unit[]> {
  const { data } = await api.get<Unit[]>('/api/v1/units');
  return data;
}

export interface UnitSearchParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function searchUnits(params: UnitSearchParams = {}): Promise<Page<Unit>> {
  const { data } = await api.get<Page<Unit>>('/api/v1/units/search', { params });
  return data;
}
export async function createUnit(body: Omit<Unit, 'id'>): Promise<Unit> {
  const { data } = await api.post<Unit>('/api/v1/units', body);
  return data;
}
export async function updateUnit(id: UUID, body: Omit<Unit, 'id'>): Promise<Unit> {
  const { data } = await api.put<Unit>(`/api/v1/units/${id}`, body);
  return data;
}
export async function deleteUnit(id: UUID): Promise<void> {
  await api.delete(`/api/v1/units/${id}`);
}

// ---------- Count Stock ----------

export interface CountStockRecord {
  id: string;
  ref: string;
  warehouseId: string;
  warehouseName?: string;
  categoryId?: string;
  categoryName?: string;
  date: string;
  status: 'OPEN' | 'POSTED' | 'CANCELLED';
  fileUrl?: string;
}

export async function listCountStockRecords(params: {
  page?: number; size?: number; search?: string;
} = {}): Promise<Page<CountStockRecord>> {
  const { data } = await api.get<Page<CountStockRecord>>('/api/v1/stock-counts', { params });
  return data;
}

export async function openStockCount(body: { warehouseId: UUID; notes?: string }): Promise<CountStockRecord> {
  const { data } = await api.post<CountStockRecord>('/api/v1/stock-counts', body);
  return data;
}

// ---------- Import Update Only ----------

export interface ImportUpdateOnlyItem {
  productCode: string;
  cost: number;
  retailPrice: number;
}

export interface ImportUpdateOnlyResult {
  total: number;
  updated: number;
  notFound: number;
  errors: number;
  messages: string[];
}

export async function importUpdateOnly(items: ImportUpdateOnlyItem[]): Promise<ImportUpdateOnlyResult> {
  const { data } = await api.post<ImportUpdateOnlyResult>('/api/v1/products/import/update-only', { items });
  return data;
}

// ---------- Opening Stock Import ----------

export interface OpeningStockImportItem {
  productCode: string;
  variantCode?: string;
  qty: number;
}

export interface OpeningStockImportResult {
  total: number;
  updated: number;
  notFound: number;
  errors: number;
  countId?: string;
  messages: string[];
}

export async function importOpeningStock(
  warehouseId: string,
  items: OpeningStockImportItem[],
): Promise<OpeningStockImportResult> {
  const { data } = await api.post<OpeningStockImportResult>('/api/v1/products/import/opening-stock', {
    warehouseId, items,
  });
  return data;
}

// Re-export types so consumers can just import from 'src/api/smartpos/products'
export type { Product, Category, Brand, Unit, Customer, Supplier, Page, Barcode, ComboItem };

// ---------- Barcodes (dedicated search endpoint) ----------

export interface BarcodeSearchParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/** Extended barcode row with product name/code (from /api/v1/barcodes/search). */
export interface BarcodeWithProduct extends Barcode {
  productId: string;
  productName: string | null;
  productCode: string | null;
}

export async function searchBarcodes(params: BarcodeSearchParams = {}): Promise<Page<BarcodeWithProduct>> {
  const { data } = await api.get<Page<BarcodeWithProduct>>('/api/v1/barcodes/search', { params });
  return data;
}
