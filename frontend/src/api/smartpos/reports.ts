/**
 * Reports + exports API wrapper.
 * Mirrors io.smartpos.report.api.dto.*
 */
import { api } from './client';
import type { UUID } from './types';

// ---------- Dashboard ----------

export type Period = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'YTD' | 'LAST_30_DAYS';

export interface Dashboard {
  from: string;
  to: string;
  sales: {
    count: number; gross: number; tax: number; discount: number;
    net: number; paid: number; due: number;
  };
  purchases: { count: number; gross: number; paid: number; due: number };
  payments: { count: number; totalIn: number; totalOut: number };
  expenses: { total: number; count: number };
  inventory: {
    distinctProducts: number; totalOnHand: number;
    totalAvailable: number; lowStockLines: number;
  };
  salesSeries: { date: string; net: number; count: number }[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  netProfit: number;
}

export async function getDashboard(params: {
  warehouseId?: UUID;
  period?: Period;
} = {}): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>('/api/v1/reports/dashboard', { params });
  return data;
}

export interface PaymentMethodMixRow {
  method: string;
  total: number;
  count: number;
}

export async function getPaymentMethodMix(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<PaymentMethodMixRow[]> {
  const { data } = await api.get<PaymentMethodMixRow[]>('/api/v1/payments/by-method', { params });
  return data;
}

// ---------- Sales summary ----------

export interface SalesSummary {
  from: string;
  to: string;
  count: number;
  gross: number; tax: number; discount: number;
  net: number; paid: number; due: number;
  avgSale: number;
  series: { date: string; net: number; count: number }[];
}

export async function getSalesSummary(params: {
  dateFrom?: string; dateTo?: string; warehouseId?: UUID; customerId?: UUID;
} = {}): Promise<SalesSummary> {
  const { data } = await api.get<SalesSummary>('/api/v1/reports/sales/summary', { params });
  return data;
}

// ---------- Top products / customers ----------

export interface TopProduct {
  productId: UUID;
  productName: string;
  qty: number;
  revenue: number;
}

export interface TopCustomer {
  customerId: UUID;
  totalSpent: number;
  orderCount: number;
}

export async function getTopProducts(params: {
  dateFrom?: string; dateTo?: string; warehouseId?: UUID; limit?: number;
} = {}): Promise<TopProduct[]> {
  const { data } = await api.get<TopProduct[]>('/api/v1/reports/sales/top-products', { params });
  return data;
}

export async function getTopCustomers(params: {
  dateFrom?: string; dateTo?: string; limit?: number;
} = {}): Promise<TopCustomer[]> {
  const { data } = await api.get<TopCustomer[]>('/api/v1/reports/sales/top-customers', { params });
  return data;
}

// ---------- Inventory summary ----------

export interface InventorySummary {
  distinctProducts: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  lowStockLines: number;
}

export async function getInventorySummary(warehouseId?: UUID): Promise<InventorySummary> {
  const { data } = await api.get<InventorySummary>('/api/v1/reports/inventory/summary', {
    params: warehouseId ? { warehouseId } : {},
  });
  return data;
}

// ---------- Profit & Loss ----------

export interface ProfitLoss {
  from: string;
  to: string;
  revenueGross: number;
  revenueDiscount: number;
  revenueNet: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
}

export async function getProfitLoss(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<ProfitLoss> {
  const { data } = await api.get<ProfitLoss>('/api/v1/reports/profit-loss', { params });
  return data;
}

// ---------- Advanced reports (Stocky parity, backend report-service V3) ----------

export interface WarrantyReportRow {
  serialId: UUID;
  productId: UUID;
  productCode?: string | null;
  productName?: string | null;
  serialNumber: string;
  serialType: string;
  saleRef?: string | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  status: 'ACTIVE' | 'EXPIRED';
  daysRemaining: number;
}
export interface WarrantyReport {
  from?: string | null;
  to?: string | null;
  rows: WarrantyReportRow[];
  total: number;
}
export async function getWarrantyReport(params: { dateFrom?: string; dateTo?: string }): Promise<WarrantyReport> {
  const { data } = await api.get<WarrantyReport>('/api/v1/reports/warranty', { params });
  return data;
}

export interface DeadStockRow {
  productId: UUID; productCode?: string | null; productName?: string | null;
  warehouseId: UUID;
  onHand: number; unitCost: number; valuationAtCost: number;
  lastSoldDate?: string | null;
}
export interface DeadStockReport {
  lookbackDays: number;
  asOf: string;
  rows: DeadStockRow[];
  totalValueAtCost: number;
}
export async function getDeadStock(params: { lookbackDays?: number; warehouseId?: UUID }): Promise<DeadStockReport> {
  const { data } = await api.get<DeadStockReport>('/api/v1/reports/dead-stock', { params });
  return data;
}

export interface InventoryValuationRow {
  productId: UUID; productCode?: string | null; productName?: string | null;
  warehouseId: UUID;
  onHand: number; unitCost: number; valuation: number;
}
export interface InventoryValuationReport {
  asOf: string;
  method: 'FIFO' | 'AVG' | 'LATEST';
  rows: InventoryValuationRow[];
  totalQty: number;
  totalValuation: number;
}
export async function getInventoryValuation(params: {
  asOf?: string; method?: 'FIFO' | 'AVG' | 'LATEST'; warehouseId?: UUID;
}): Promise<InventoryValuationReport> {
  const { data } = await api.get<InventoryValuationReport>('/api/v1/reports/inventory-valuation', { params });
  return data;
}

export interface SalesByDimensionBucket {
  dimensionId?: UUID | null;
  dimensionName?: string | null;
  lines: number;
  qty: number;
  gross: number;
  tax: number;
  net: number;
}
export interface SalesByDimensionReport {
  from: string; to: string;
  dimension: 'CATEGORY' | 'BRAND';
  buckets: SalesByDimensionBucket[];
  totalGross: number;
  totalNet: number;
}
export async function getSalesByDimension(params: {
  dateFrom: string; dateTo: string; dimension: 'CATEGORY' | 'BRAND';
}): Promise<SalesByDimensionReport> {
  const { data } = await api.get<SalesByDimensionReport>('/api/v1/reports/sales-by-dimension', { params });
  return data;
}

// ---------- Tax summary ----------

export interface TaxByRate {
  rate: number;
  taxAmount: number;
  taxableAmount: number;
  count: number;
}

export interface TaxByCategory {
  categoryName: string;
  taxAmount: number;
  taxableAmount: number;
  count: number;
}

export interface TaxSummary {
  from: string;
  to: string;
  totalTax: number;
  taxableSales: number;
  transactionCount: number;
  byRate: TaxByRate[];
  byCategory: TaxByCategory[];
}

export async function getTaxSummary(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<TaxSummary> {
  const { data } = await api.get<TaxSummary>('/api/v1/reports/tax-summary', { params });
  return data;
}

// ---------- Purchase summary ----------

export interface PurchaseSummary {
  from: string; to: string;
  count: number; gross: number; paid: number; due: number;
  avgPurchase: number;
  series: { date: string; net: number; count: number }[];
  topSuppliers: TopSupplier[];
}

export interface TopSupplier {
  supplierId: UUID; supplierName: string;
  orderCount: number; totalSpent: number;
}

export async function getPurchaseSummary(params: {
  dateFrom?: string; dateTo?: string; warehouseId?: UUID;
} = {}): Promise<PurchaseSummary> {
  const { data } = await api.get<PurchaseSummary>('/api/v1/reports/purchases/summary', { params });
  return data;
}

// ---------- Payment summary ----------

export interface PaymentMethodRow {
  method: string; total: number; count: number;
}

export interface PaymentSummary {
  from: string; to: string;
  totalCount: number;
  totalIn: number; totalOut: number; netFlow: number;
  outstanding: number;
  inflowSeries: { date: string; net: number; count: number }[];
  byMethod: PaymentMethodRow[];
}

export async function getPaymentSummary(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<PaymentSummary> {
  const { data } = await api.get<PaymentSummary>('/api/v1/reports/payments/summary', { params });
  return data;
}

// ---------- Customer summary ----------

export interface TopCustomerDetail {
  customerId: UUID; customerName: string | null;
  orderCount: number; totalSpent: number;
  lastPurchase: string | null;
}

export interface FrequencyBucket {
  label: string; customerCount: number; revenueShare: number;
}

export interface CustomerSummary {
  from: string; to: string;
  totalCustomers: number; activeCustomers: number; newCustomers: number;
  totalRevenue: number; avgRevenuePerCustomer: number;
  topCustomers: TopCustomerDetail[];
  frequencyDistribution: FrequencyBucket[];
}

export async function getCustomerSummary(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<CustomerSummary> {
  const { data } = await api.get<CustomerSummary>('/api/v1/reports/customers/summary', { params });
  return data;
}

// ---------- Employee sales ----------

export interface EmployeeSalesRow {
  employeeId: UUID; employeeName: string;
  saleCount: number; totalNet: number;
  totalGross: number; itemsSold: number;
}

export interface EmployeeSales {
  from: string; to: string;
  rows: EmployeeSalesRow[];
}

export async function getEmployeeSales(params: {
  dateFrom?: string; dateTo?: string;
} = {}): Promise<EmployeeSales> {
  const { data } = await api.get<EmployeeSales>('/api/v1/reports/sales/by-employee', { params });
  return data;
}

// ---------- Exports (sync) ----------

export type ExportFormat = 'PDF' | 'XLSX' | 'CSV';
export type ExportReportKey =
  | 'sales-summary-series'
  | 'sales-top-products'
  | 'sales-top-customers'
  | 'tax-summary'
  | 'purchases-summary'
  | 'payments-summary'
  | 'customers-summary';

/**
 * Triggers a synchronous export and returns the file as a Blob (ready for
 * `URL.createObjectURL` + a download link in the UI). Best for small result
 * sets; for heavy exports prefer the async job flow below.
 */
export async function exportReport(params: {
  reportKey: ExportReportKey;
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: UUID;
  limit?: number;
}): Promise<{ blob: Blob; filename: string }> {
  const response = await api.get('/api/v1/reports/export', {
    params,
    responseType: 'blob',
  });
  // Extract filename from Content-Disposition
  const cd = response.headers['content-disposition'] as string | undefined;
  let filename = params.reportKey + '.' + params.format.toLowerCase();
  if (cd) {
    const m = /filename="?([^"]+)"?/.exec(cd);
    if (m) filename = m[1];
  }
  return { blob: response.data as Blob, filename };
}

// ---------- Exports (async jobs — Phase 6c) ----------

export type ExportJobStatus = 'PENDING' | 'RUNNING' | 'READY' | 'FAILED';

/** Mirrors io.smartpos.report.api.dto.ExportJobDto */
export interface ExportJob {
  id: UUID;
  reportKey: string;
  format: ExportFormat;
  status: ExportJobStatus;
  fileUrl: string | null;       // presigned MinIO URL when status === 'READY'
  fileSize: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface SubmitExportJobRequest {
  reportKey: ExportReportKey;
  format: ExportFormat;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: UUID;
  limit?: number;
}

/**
 * Queues an async export. Returns immediately with a PENDING job row; poll
 * {@link getExportJob} (or use {@link pollExportJob}) until status becomes
 * READY and `fileUrl` is populated.
 */
export async function submitExportJob(body: SubmitExportJobRequest): Promise<ExportJob> {
  const { data } = await api.post<ExportJob>('/api/v1/reports/export/jobs', body);
  return data;
}

export async function getExportJob(id: UUID): Promise<ExportJob> {
  const { data } = await api.get<ExportJob>(`/api/v1/reports/export/jobs/${id}`);
  return data;
}

export interface PollExportJobOptions {
  intervalMs?: number;   // default 1500
  timeoutMs?: number;    // default 120_000
  signal?: AbortSignal;
  onTick?: (job: ExportJob) => void;
}

/**
 * Polls an export job until it reaches a terminal state (READY or FAILED)
 * or the timeout elapses. Resolves with the terminal job; rejects on abort
 * or timeout.
 */
export async function pollExportJob(
  id: UUID,
  opts: PollExportJobOptions = {},
): Promise<ExportJob> {
  const interval = opts.intervalMs ?? 1500;
  const timeout = opts.timeoutMs ?? 120_000;
  const start = Date.now();

  for (;;) {
    if (opts.signal?.aborted) {
      throw new DOMException('Export poll aborted', 'AbortError');
    }
    const job = await getExportJob(id);
    opts.onTick?.(job);
    if (job.status === 'READY' || job.status === 'FAILED') return job;
    if (Date.now() - start > timeout) {
      throw new Error(`Export job ${id} timed out after ${timeout}ms (status=${job.status})`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

/**
 * End-to-end helper: submit, poll, and resolve with the finished job.
 * Throws if the job ends in FAILED.
 */
export async function runExportJob(
  body: SubmitExportJobRequest,
  opts?: PollExportJobOptions,
): Promise<ExportJob> {
  const submitted = await submitExportJob(body);
  const finished = await pollExportJob(submitted.id, opts);
  if (finished.status === 'FAILED') {
    throw new Error(finished.error || `Export failed for ${body.reportKey}`);
  }
  return finished;
}

// ─── Hourly Sales ───

export interface HourlyBucket { hour: number; count: number; net: number; }
export async function getSalesByHour(params: { dateFrom?: string; dateTo?: string; warehouseId?: UUID } = {}): Promise<HourlyBucket[]> {
  const { data } = await api.get<HourlyBucket[]>('/api/v1/reports/sales/by-hour', { params });
  return data;
}

// ─── Discounts & Voids ───

export interface DiscountVoidAnalysis { totalDiscounts: number; discountCount: number; totalVoids: number; voidCount: number; discountRate: number; voidRate: number; }
export async function getDiscountsVoids(params: { dateFrom?: string; dateTo?: string; warehouseId?: UUID } = {}): Promise<DiscountVoidAnalysis> {
  const { data } = await api.get<DiscountVoidAnalysis>('/api/v1/reports/sales/discounts-voids', { params });
  return data;
}

// ─── Customer RFM ───

export interface RfmCustomer { customerId: UUID; customerName: string; recency: number; frequency: number; monetary: number; segment: string; }
export interface RfmSegments { champions: number; loyal: number; atRisk: number; lost: number; customers: RfmCustomer[]; }
export async function getCustomerRfm(params: { dateFrom?: string; dateTo?: string } = {}): Promise<RfmSegments> {
  const { data } = await api.get<RfmSegments>('/api/v1/reports/customers/rfm', { params });
  return data;
}

// ─── Customer Retention ───

export interface RetentionRate { rate: number; returningCustomers: number; totalCustomers: number; priorPeriodRate: number; change: number; }
export async function getCustomerRetention(params: { dateFrom?: string; dateTo?: string } = {}): Promise<RetentionRate> {
  const { data } = await api.get<RetentionRate>('/api/v1/reports/customers/retention', { params });
  return data;
}

// ─── Purchases by Category ───

export interface CategoryBucket { categoryId?: UUID | null; categoryName?: string | null; count: number; net: number; }
export async function getPurchasesByCategory(params: { dateFrom?: string; dateTo?: string; warehouseId?: UUID } = {}): Promise<CategoryBucket[]> {
  const { data } = await api.get<CategoryBucket[]>('/api/v1/reports/purchases/by-category', { params });
  return data;
}

// ─── AR Aging ───

export interface AgingBucket { label: string; daysFrom: number; daysTo: number; amount: number; invoiceCount: number; }
export interface ArAging { buckets: AgingBucket[]; totalOutstanding: number; }
export async function getArAging(params: { asOf?: string } = {}): Promise<ArAging> {
  const { data } = await api.get<ArAging>('/api/v1/reports/payments/aging', { params });
  return data;
}

// ─── Monthly Tax Schedule ───

export interface MonthlyTaxBucket { month: number; taxableSales: number; taxCollected: number; outputTax: number; inputTax: number; netPayable: number; }
export async function getMonthlyTaxSchedule(params: { year?: number } = {}): Promise<MonthlyTaxBucket[]> {
  const { data } = await api.get<MonthlyTaxBucket[]>('/api/v1/reports/tax/monthly-schedule', { params });
  return data;
}

// ─── Inventory Turnover ───

export interface TurnoverRow { productId: UUID; productName: string; productCode?: string | null; avgInventory: number; costOfGoodsSold: number; turnoverRatio: number; }
export async function getInventoryTurnover(params: { warehouseId?: UUID; months?: number } = {}): Promise<TurnoverRow[]> {
  const { data } = await api.get<TurnoverRow[]>('/api/v1/reports/inventory/turnover', { params });
  return data;
}

// ─── Inventory Movers ───

export interface MoverRow { productId: UUID; productName: string; qtySold: number; revenue: number; direction: string; }
export interface MoversReport { top: MoverRow[]; bottom: MoverRow[]; }
export async function getInventoryMovers(params: { warehouseId?: UUID; limit?: number } = {}): Promise<MoversReport> {
  const { data } = await api.get<MoversReport>('/api/v1/reports/inventory/movers', { params });
  return data;
}
