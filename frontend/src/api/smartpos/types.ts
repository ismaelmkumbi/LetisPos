/**
 * Shared TypeScript types that mirror backend DTOs (SmartPOS Product Service).
 * Keep in sync with:
 *   - io.smartpos.product.api.dto.ProductDto
 *   - io.smartpos.product.api.dto.CustomerDto
 *   - io.smartpos.product.api.dto.SupplierDto
 *   - etc.
 */

export type UUID = string;

export type TaxMethod = 'INCLUSIVE' | 'EXCLUSIVE';
export type ProductType = 'STANDARD' | 'SERVICE' | 'COMBO';
export type BarcodeType = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPC' | 'QR';

/** Symbology stored on the product itself (used as default at sale time). */
export type BarcodeSymbology = 'CODE128' | 'CODE39' | 'EAN8' | 'EAN13' | 'UPC';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-based)
  size: number;
  first: boolean;
  last: boolean;
}

export interface Variant {
  id: UUID;
  name: string;
  code?: string | null;
  cost?: number | null;
  price?: number | null;
  /** Wholesale (B2B) tier price for this variant — falls back to {@link price}. */
  wholesalePrice?: number | null;
  /** Minimum sellable price for this variant — discounts cannot break this floor. */
  minPrice?: number | null;
  imageUrl?: string | null;
}

export interface Barcode {
  id: UUID;
  variantId?: UUID | null;
  barcode: string;
  barcodeType: BarcodeType;
  primary: boolean;
}

export interface Product {
  id: UUID;
  code: string;
  name: string;
  description?: string | null;
  categoryId?: UUID | null;
  /** Optional sub-category (parented under categoryId via Category.parentId). */
  subCategoryId?: UUID | null;
  brandId?: UUID | null;
  unitId?: UUID | null;
  cost: number;
  price: number;
  /** Wholesale (B2B) tier — falls back to {@link price} when null. */
  wholesalePrice?: number | null;
  /** Minimum sellable price — cashiers cannot discount below this floor. */
  minPrice?: number | null;
  /** Loyalty points awarded per unit sold. */
  points?: number | null;
  taxMethod: TaxMethod;
  taxRate: number;
  stockAlert: number;
  variant: boolean;
  type: ProductType;
  status: boolean;
  sellable?: boolean;
  /** Marketing flag — surface on the storefront's "featured" rail. */
  featured?: boolean;
  /** Hide from the public online store but keep selling at the POS. */
  hideOnline?: boolean;
  imageUrl?: string | null;
  /** Default barcode symbology used when auto-generating a barcode. */
  barcodeSymbology?: BarcodeSymbology | null;
  // Stocky parity additions (backend product-service V2)
  warrantyMonths?: number | null;
  guaranteeMonths?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  weightGrams?: number | null;
  trackSerial?: boolean;
  trackImei?: boolean;
  variants: Variant[];
  barcodes: Barcode[];
  comboItems?: ComboItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ComboItem {
  id: UUID;
  componentProductId: UUID;
  qty: number;
  unitCost?: number | null;
  unitPrice?: number | null;
  position: number;
}

// IMEI / serial registry (backend ProductSerial)
export type SerialType = 'SERIAL' | 'IMEI' | 'MAC';
export type SerialStatus = 'IN_STOCK' | 'RESERVED' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';

export interface ProductSerial {
  id: UUID;
  productId: UUID;
  variantId?: UUID | null;
  warehouseId?: UUID | null;
  serialNumber: string;
  serialType: SerialType;
  status: SerialStatus;
  purchaseRef?: string | null;
  saleRef?: string | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  notes?: string | null;
}

export interface Category {
  id: UUID;
  parentId?: UUID | null;
  name: string;
  code?: string | null;
  imageUrl?: string | null;
  description?: string | null;
}

export interface Brand {
  id: UUID;
  name: string;
  imageUrl?: string | null;
  description?: string | null;
}

export interface Unit {
  id: UUID;
  name: string;
  shortName: string;
  baseUnitId?: UUID | null;
  conversionFactor: number;
}

export interface Customer {
  id: UUID;
  code?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  creditLimit: number;
  notes?: string | null;
  active: boolean;
}

export interface Supplier {
  id: UUID;
  code?: string | null;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  paymentTermDays?: number | null;
  creditLimit?: number | null;
  balance?: number | null;
  openingBalance?: number | null;
  notes?: string | null;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PriceList {
  id: UUID;
  name: string;
  description?: string | null;
  customerGroup?: string | null;
  currency: string;
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  lines?: PriceListLine[];
}

export interface PriceListLine {
  id: UUID;
  productId: UUID;
  variantId?: UUID | null;
  price: number;
  minQty: number;
  maxQty?: number | null;
}

export interface ProductBatch {
  id: UUID;
  batchNumber: string;
  productId: UUID;
  variantId?: UUID | null;
  warehouseId: UUID;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  onHand: number;
  reserved: number;
  available: number;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
}
