/**
 * Sales + POS + Quotations + Purchases API wrapper.
 * Mirrors io.smartpos.sales.api.dto.*
 */
import { api } from './client';
import type { Page, UUID } from './types';

// ---------- shared ----------

export type TaxMethod = 'INCLUSIVE' | 'EXCLUSIVE';
export type DiscountType = 'FIXED' | 'PERCENT';
export type SaleStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
export type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
export type ReturnStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface SaleLineInput {
  productId: UUID;
  variantId?: UUID;
  productName?: string;
  productCode?: string;
  unitPrice: number;
  qty: number;
  discount?: number;
  discountType?: DiscountType;
  taxRate?: number;
  taxMethod?: TaxMethod;
}

export interface SaleLine {
  id: UUID;
  productId: UUID;
  variantId: UUID | null;
  productName: string;
  productCode?: string | null;
  unitPrice: number;
  qty: number;
  discount: number;
  discountType: DiscountType;
  taxRate: number;
  taxMethod: TaxMethod;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

// ---------- Sale ----------

export interface Sale {
  id: UUID;
  ref: string;
  date: string;
  customerId: UUID | null;
  warehouseId: UUID;
  userId: UUID | null;
  pos: boolean;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxTotal: number;
  taxRate: number;
  taxMethod: TaxMethod;
  discountTotal: number;
  shipping: number;
  grandTotal: number;
  paidTotal: number;
  dueTotal: number;
  currency: string;
  exchangeRate: number;
  notes: string | null;
  lines: SaleLine[];
  createdAt: string;
  confirmedAt: string | null;
}

export interface CreateSaleBody {
  date?: string;
  customerId?: UUID;
  warehouseId: UUID;
  lines: SaleLineInput[];
  discount?: number;
  taxMethod?: TaxMethod;
  shipping?: number;
  currency?: string;
  exchangeRate?: number;
  notes?: string;
  isPos?: boolean;
}

export async function listSales(
  params: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: UUID;
    warehouseId?: UUID;
    status?: SaleStatus;
    page?: number;
    size?: number;
    sort?: string;
  } = {},
): Promise<Page<Sale>> {
  const { data } = await api.get<Page<Sale>>('/api/v1/sales', { params });
  return data;
}

export async function getSale(id: UUID): Promise<Sale> {
  const { data } = await api.get<Sale>(`/api/v1/sales/${id}`);
  return data;
}

export async function createSale(body: CreateSaleBody): Promise<Sale> {
  const { data } = await api.post<Sale>('/api/v1/sales', body);
  return data;
}

export async function commitSale(id: UUID): Promise<Sale> {
  const { data } = await api.post<Sale>(`/api/v1/sales/${id}/commit`);
  return data;
}

export async function cancelSale(id: UUID): Promise<Sale> {
  const { data } = await api.post<Sale>(`/api/v1/sales/${id}/cancel`);
  return data;
}

/** Downloads the invoice PDF as a Blob the caller can save or print. */
export async function getInvoicePdf(id: UUID): Promise<Blob> {
  const { data } = await api.get<Blob>(`/api/v1/sales/${id}/invoice.pdf`, {
    responseType: 'blob',
  });
  return data;
}

// ---------- Offline POS sync ----------
//
// Mirrors backend OfflineSyncController:
//   POST /api/v1/offline/sync
//   body: { terminalId, clientBatchId, items: [{clientOpId, sale}] }
//   returns: { batchId, total, success, failed, items: [{clientOpId, saleId, status, error}] }
//
// Idempotency: re-uploading the same (terminalId, clientOpId) returns the
// previously-issued saleId without re-creating the sale.

export interface OfflineSyncItem {
  clientOpId: string;
  sale: CreateSaleBody;
}

export interface OfflineBatchUpload {
  terminalId: UUID;
  clientBatchId: string;
  items: OfflineSyncItem[];
}

export interface OfflineItemResult {
  clientOpId: string;
  saleId: UUID | null;
  status: 'OK' | 'FAILED';
  error: string | null;
}

export interface OfflineBatchResult {
  batchId: UUID;
  total: number;
  success: number;
  failed: number;
  items: OfflineItemResult[];
}

export async function syncOfflineBatch(batch: OfflineBatchUpload): Promise<OfflineBatchResult> {
  const { data } = await api.post<OfflineBatchResult>('/api/v1/offline/sync', batch);
  return data;
}

// ---------- Top-level Sale Returns search ----------
//
// Backed by /api/v1/returns (sales-service). Per-sale create/get still
// lives at /api/v1/sales/{id}/returns and /api/v1/sales/returns/{id}.

export interface SaleReturnSearchParams {
  from?: string; // ISO date
  to?: string;
  customerId?: UUID;
  warehouseId?: UUID;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  page?: number;
  size?: number;
}

export async function listSaleReturns(
  params: SaleReturnSearchParams = {},
): Promise<Page<SaleReturn>> {
  const { data } = await api.get<Page<SaleReturn>>('/api/v1/returns', { params });
  return data;
}

// ---------- Sale Returns ----------

export interface SaleReturn {
  id: UUID;
  ref: string;
  date: string;
  saleId: UUID;
  customerId: UUID | null;
  warehouseId: UUID;
  status: ReturnStatus;
  reason: string | null;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  lines: {
    id: UUID;
    productId: UUID;
    variantId: UUID | null;
    productName: string;
    unitPrice: number;
    qty: number;
    lineTotal: number;
  }[];
}

export async function createSaleReturn(
  saleId: UUID,
  body: {
    date?: string;
    reason?: string;
    lines: {
      productId: UUID;
      variantId?: UUID;
      productName?: string;
      unitPrice: number;
      qty: number;
    }[];
  },
): Promise<SaleReturn> {
  const { data } = await api.post<SaleReturn>(`/api/v1/sales/${saleId}/returns`, body);
  return data;
}

export async function getSaleReturn(returnId: UUID): Promise<SaleReturn> {
  const { data } = await api.get<SaleReturn>(`/api/v1/sales/returns/${returnId}`);
  return data;
}

// ---------- Stats ----------

export interface SaleStats {
  count: number;
  gross: number;
  tax: number;
  discount: number;
  net: number;
  paid: number;
  due: number;
}

export async function getSaleStats(
  params: {
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: UUID;
    customerId?: UUID;
  } = {},
): Promise<SaleStats> {
  const { data } = await api.get<SaleStats>('/api/v1/sales/stats', { params });
  return data;
}

export interface TopProduct {
  productId: UUID;
  productName: string;
  totalQty: number;
  totalAmount: number;
}

export async function getTopProducts(
  params: {
    dateFrom?: string;
    dateTo?: string;
    warehouseId?: UUID;
    limit?: number;
  } = {},
): Promise<TopProduct[]> {
  const { data } = await api.get<TopProduct[]>('/api/v1/sales/top-products', { params });
  return data;
}

// ---------- POS fast path ----------

/** Create + reserve + commit in one atomic call (counter purchase). */
export async function posCheckout(body: CreateSaleBody): Promise<Sale> {
  const { data } = await api.post<Sale>('/api/v1/pos/sales', body);
  return data;
}

/** Live total calculation — tax/discount/subtotal/grand — without persistence. */
export async function posQuote(body: {
  lines: SaleLineInput[];
  discount?: number;
  taxMethod?: TaxMethod;
  shipping?: number;
}): Promise<{
  lines: {
    productId: UUID;
    unitPrice: number;
    qty: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
  }[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  shipping: number;
  grandTotal: number;
}> {
  const { data } = await api.post('/api/v1/pos/quote', body);
  return data;
}

// ---------- POS drafts ----------

export interface Draft {
  id: UUID;
  userId: UUID;
  warehouseId: UUID;
  customerId: UUID | null;
  label: string | null;
  data: unknown; // the frontend owns the shape
  updatedAt: string;
}

export async function listDrafts(): Promise<Draft[]> {
  const { data } = await api.get<Draft[]>('/api/v1/pos/drafts');
  return data;
}
export async function getDraft(id: UUID): Promise<Draft> {
  const { data } = await api.get<Draft>(`/api/v1/pos/drafts/${id}`);
  return data;
}
export async function saveDraft(body: {
  warehouseId: UUID;
  customerId?: UUID;
  label?: string;
  data: unknown;
}): Promise<Draft> {
  const { data } = await api.post<Draft>('/api/v1/pos/drafts', body);
  return data;
}
export async function updateDraft(
  id: UUID,
  body: {
    warehouseId: UUID;
    customerId?: UUID;
    label?: string;
    data: unknown;
  },
): Promise<Draft> {
  const { data } = await api.put<Draft>(`/api/v1/pos/drafts/${id}`, body);
  return data;
}
export async function deleteDraft(id: UUID): Promise<void> {
  await api.delete(`/api/v1/pos/drafts/${id}`);
}

// ---------- Quotations ----------

export interface Quotation {
  id: UUID;
  ref: string;
  date: string;
  customerId: UUID | null;
  warehouseId: UUID;
  status: QuotationStatus;
  subtotal: number;
  taxTotal: number;
  taxMethod: TaxMethod;
  discountTotal: number;
  shipping: number;
  grandTotal: number;
  currency: string;
  notes: string | null;
  convertedSaleId: UUID | null;
  lines: SaleLine[];
}

export async function listQuotations(
  params: {
    dateFrom?: string;
    dateTo?: string;
    customerId?: UUID;
    status?: QuotationStatus;
    page?: number;
    size?: number;
  } = {},
): Promise<Page<Quotation>> {
  const { data } = await api.get<Page<Quotation>>('/api/v1/quotations', { params });
  return data;
}

export async function getQuotation(id: UUID): Promise<Quotation> {
  const { data } = await api.get<Quotation>(`/api/v1/quotations/${id}`);
  return data;
}

export async function createQuotation(body: CreateSaleBody): Promise<Quotation> {
  const { data } = await api.post<Quotation>('/api/v1/quotations', body);
  return data;
}

export async function setQuotationStatus(id: UUID, status: QuotationStatus): Promise<Quotation> {
  const { data } = await api.patch<Quotation>(`/api/v1/quotations/${id}/status`, null, {
    params: { status },
  });
  return data;
}

export async function convertQuotation(id: UUID): Promise<Sale> {
  const { data } = await api.post<Sale>(`/api/v1/quotations/${id}/convert`);
  return data;
}

// ---------- Purchases ----------

export interface Purchase {
  id: UUID;
  ref: string;
  date: string;
  dueDate: string | null;
  supplierId: UUID | null;
  supplierName: string | null;
  warehouseId: UUID;
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxTotal: number;
  taxMethod: TaxMethod;
  discountTotal: number;
  shipping: number;
  grandTotal: number;
  paidTotal: number;
  dueTotal: number;
  currency: string;
  notes: string | null;
  attachmentUrl: string | null;
  receivedAt: string | null;
  createdBy: UUID | null;
  createdAt: string;
  updatedAt: string;
  lines: SaleLine[];
}

export interface CreatePurchaseBody {
  date?: string;
  dueDate?: string;
  supplierId?: UUID;
  warehouseId: UUID;
  lines: SaleLineInput[]; // unitPrice field here means unit_cost
  discount?: number;
  taxMethod?: TaxMethod;
  shipping?: number;
  currency?: string;
  exchangeRate?: number;
  notes?: string;
  attachmentUrl?: string;
}

export interface PurchaseSearchParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  supplierId?: UUID;
  warehouseId?: UUID;
  status?: PurchaseStatus;
  paymentStatus?: PaymentStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listPurchases(params: PurchaseSearchParams = {}): Promise<Page<Purchase>> {
  const { data } = await api.get<Page<Purchase>>('/api/v1/purchases', { params });
  return data;
}

export async function getPurchase(id: UUID): Promise<Purchase> {
  const { data } = await api.get<Purchase>(`/api/v1/purchases/${id}`);
  return data;
}

export async function createPurchase(body: CreatePurchaseBody): Promise<Purchase> {
  const { data } = await api.post<Purchase>('/api/v1/purchases', body);
  return data;
}

export async function updatePurchase(id: UUID, body: CreatePurchaseBody): Promise<Purchase> {
  const { data } = await api.put<Purchase>(`/api/v1/purchases/${id}`, body);
  return data;
}

export async function receivePurchase(id: UUID): Promise<Purchase> {
  const { data } = await api.post<Purchase>(`/api/v1/purchases/${id}/receive`);
  return data;
}

export async function cancelPurchase(id: UUID, reason?: string): Promise<Purchase> {
  const { data } = await api.post<Purchase>(`/api/v1/purchases/${id}/cancel`, { reason });
  return data;
}

export async function deletePurchase(id: UUID): Promise<void> {
  await api.delete(`/api/v1/purchases/${id}`);
}

// ─── Purchase payments ───

export interface PurchasePayment {
  id: UUID;
  purchaseId: UUID;
  accountId: UUID;
  accountName?: string;
  amount: number;
  method: string;
  date: string;
  notes?: string | null;
}

export async function addPaymentToPurchase(
  purchaseId: UUID,
  body: { accountId: UUID; amount: number; method: string; date?: string; notes?: string },
): Promise<PurchasePayment> {
  const { data } = await api.post<PurchasePayment>(`/api/v1/purchases/${purchaseId}/payments`, body);
  return data;
}

export async function getPurchasePayments(purchaseId: UUID): Promise<PurchasePayment[]> {
  const { data } = await api.get<PurchasePayment[]>(`/api/v1/purchases/${purchaseId}/payments`);
  return data;
}

// ---------- Purchase Returns ----------

export interface PurchaseReturn {
  id: UUID;
  ref: string;
  date: string;
  purchaseId: UUID;
  warehouseId: UUID;
  status: ReturnStatus;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  notes: string | null;
  lines: SaleLine[];
}

export interface CreatePurchaseReturnBody {
  purchaseId: UUID;
  warehouseId: UUID;
  date?: string;
  lines: { productId: UUID; variantId?: UUID; qty: number; unitPrice: number; taxRate?: number }[];
  notes?: string;
}

export async function listPurchaseReturns(
  params: {
    purchaseId?: UUID;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    size?: number;
  } = {},
): Promise<Page<PurchaseReturn>> {
  const { data } = await api.get<Page<PurchaseReturn>>('/api/v1/purchase-returns', { params });
  return data;
}

export async function createPurchaseReturn(
  body: CreatePurchaseReturnBody,
): Promise<PurchaseReturn> {
  const { data } = await api.post<PurchaseReturn>('/api/v1/purchase-returns', body);
  return data;
}
