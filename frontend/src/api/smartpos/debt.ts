/**
 * Debt Collection API helpers (AR/AP).
 *
 * Uses existing backend endpoints and aggregates data from:
 * - GET /api/v1/payments/debt-summary
 * - GET /api/v1/payments/ar-aging
 * - GET /api/v1/payments/ap-aging
 * - GET /api/v1/sales (with paymentStatus filter)
 * - GET /api/v1/purchases (with paymentStatus filter)
 * - GET /api/v1/customers/{id}
 * - GET /api/v1/suppliers/{id}
 * - GET /api/v1/payments (for collection activity)
 */
import { api } from './client';
import { listSales, type Sale, type Purchase } from './sales';
import type { UUID, Customer } from './types';

/** Per-debtor summary */
export interface DebtorSummary {
  customerId: UUID;
  customerName: string;
  phone: string;
  email: string;
  outstanding: number;
  creditLimit: number;
  available: number;
  current: number;
  days30to60: number;
  days60to90: number;
  days90plus: number;
  invoiceCount: number;
  lastPaymentDate: string | null;
  overdue: boolean;
}

/** Per-creditor summary */
export interface CreditorSummary {
  supplierId: UUID;
  supplierName: string;
  phone: string;
  email: string;
  outstanding: number;
  current: number;
  days30to60: number;
  days60to90: number;
  days90plus: number;
  purchaseCount: number;
  lastPaymentDate: string | null;
}

/** Debt dashboard aggregate */
export interface DebtDashboard {
  totalAR: number;
  arCount: number;
  totalAP: number;
  apCount: number;
  agingAR: AgingBucket[];
  agingAP: AgingBucket[];
  recentCollections: CollectionActivity[];
  overdueAlerts: OverdueAlert[];
  topDebtors: TopDebtor[];
  topCreditors: TopCreditor[];
}

export interface AgingBucket {
  label: string;
  daysFrom: number;
  daysTo: number;
  amount: number;
  invoiceCount: number;
}

export interface CollectionActivity {
  date: string;
  description: string;
  type: 'PAYMENT' | 'SALE';
  amount: number;
  customerName: string;
}

export interface OverdueAlert {
  customerId: UUID;
  customerName: string;
  amount: number;
  daysOverdue: number;
  severity: 'WARNING' | 'CRITICAL';
}

export interface TopDebtor {
  customerId: UUID;
  customerName: string;
  outstanding: number;
}

export interface TopCreditor {
  supplierId: UUID;
  supplierName: string;
  outstanding: number;
}

function computeAgingBuckets(
  items: Array<{ date: string; dueDate?: string | null; amount: number }>,
  now = Date.now(),
): { current: number; days30to60: number; days60to90: number; days90plus: number } {
  const buckets = { current: 0, days30to60: 0, days60to90: 0, days90plus: 0 };
  for (const item of items) {
    const ref = item.dueDate || item.date;
    if (!ref) continue;
    const age = now - new Date(ref).getTime();
    const days = age / (24 * 60 * 60 * 1000);
    if (days < 0) buckets.current += item.amount;
    else if (days <= 30) buckets.current += item.amount;
    else if (days <= 60) buckets.days30to60 += item.amount;
    else if (days <= 90) buckets.days60to90 += item.amount;
    else buckets.days90plus += item.amount;
  }
  return buckets;
}

/** Fetch AR aging buckets from backend */
export async function fetchArAging(): Promise<AgingBucket[]> {
  const { data } = await api.get<AgingBucket[]>('/api/v1/payments/ar-aging');
  return data;
}

/** Fetch AP aging buckets from backend */
export async function fetchApAging(): Promise<AgingBucket[]> {
  const { data } = await api.get<AgingBucket[]>('/api/v1/payments/ap-aging');
  return data;
}

/** Fetch debt summary from backend */
export async function fetchDebtSummary(): Promise<{ totalAR: number; arCount: number; totalAP: number; apCount: number }> {
  const { data } = await api.get('/api/v1/payments/debt-summary');
  return data;
}

/** List all debtors with detailed per-customer aggregation.
 *  ⚠️ Uses client-side aggregation with hardcoded page size.
 *  If >500 unpaid/partial invoices exist, some will be silently dropped.
 *  TODO: Move aggregation to a dedicated backend endpoint.
 */
export async function listDebtors(params?: {
  overdueOnly?: boolean;
  search?: string;
}): Promise<DebtorSummary[]> {
  const [unpaidPage, partialPage] = await Promise.all([
    listSales({ paymentStatus: 'UNPAID', size: 500 }),
    listSales({ paymentStatus: 'PARTIAL', size: 500 }),
  ]);

  const allUnpaid = [...unpaidPage.content, ...partialPage.content];

  // Group by customer
  const byCustomer = new Map<UUID, Sale[]>();
  for (const sale of allUnpaid) {
    if (!sale.customerId) continue;
    const existing = byCustomer.get(sale.customerId) || [];
    existing.push(sale);
    byCustomer.set(sale.customerId, existing);
  }

  const results: DebtorSummary[] = [];
  for (const [customerId, sales] of byCustomer) {
    const outstanding = sales.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal || 0), 0);
    const aging = computeAgingBuckets(
      sales.map((s) => ({ date: s.date, dueDate: s.dueDate, amount: s.dueTotal || s.grandTotal || 0 })),
    );

    results.push({
      customerId,
      customerName: '',
      phone: '',
      email: '',
      outstanding,
      creditLimit: 0,
      available: 0,
      ...aging,
      invoiceCount: sales.length,
      lastPaymentDate: null,
      overdue: aging.days30to60 + aging.days60to90 + aging.days90plus > 0,
    });
  }

  // Enrich with customer details
  await Promise.all(
    results.map(async (d) => {
      try {
        const { data: customer } = await api.get<Customer>(`/api/v1/customers/${d.customerId}`);
        d.customerName = customer.name;
        d.creditLimit = customer.creditLimit || 0;
        d.available = Math.max(0, d.creditLimit - d.outstanding);
        d.phone = customer.phone || '';
        d.email = customer.email || '';
      } catch (err) {
        // Log for ops visibility but don't block the whole list
        if (import.meta.env.DEV) {
          console.warn(`Failed to enrich customer ${d.customerId}:`, err);
        }
        d.customerName = d.customerId.slice(0, 8);
      }
    }),
  );

  let filtered = results.filter((d) => d.outstanding > 0);
  if (params?.overdueOnly) filtered = filtered.filter((d) => d.overdue);
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((d) => d.customerName.toLowerCase().includes(q));
  }

  filtered.sort((a, b) => b.outstanding - a.outstanding);
  return filtered;
}

/** List all creditors with per-supplier aggregation.
 *  ⚠️ Uses client-side aggregation with hardcoded page size.
 *  If >500 unpaid purchases exist, some will be silently dropped.
 *  TODO: Move aggregation to a dedicated backend endpoint.
 */
export async function listCreditors(params?: { search?: string }): Promise<CreditorSummary[]> {
  const { data: purchasesPage } = await api.get('/api/v1/purchases', {
    params: { paymentStatus: 'UNPAID', size: 500 },
  });
  const { data: partialPage } = await api.get('/api/v1/purchases', {
    params: { paymentStatus: 'PARTIAL', size: 500 },
  });

  const allUnpaid = [...(purchasesPage.content || []), ...(partialPage.content || [])];

  const bySupplier = new Map<UUID, Purchase[]>();
  for (const p of allUnpaid) {
    if (!p.supplierId) continue;
    const existing = bySupplier.get(p.supplierId) || [];
    existing.push(p);
    bySupplier.set(p.supplierId, existing);
  }

  const results: CreditorSummary[] = [];
  for (const [supplierId, purchases] of bySupplier) {
    const outstanding = purchases.reduce((sum, p) => sum + (p.dueTotal || p.grandTotal || 0), 0);
    const aging = computeAgingBuckets(
      purchases.map((p) => ({ date: p.date, dueDate: p.dueDate, amount: p.dueTotal || p.grandTotal || 0 })),
    );

    results.push({
      supplierId,
      supplierName: '',
      phone: '',
      email: '',
      outstanding,
      ...aging,
      purchaseCount: purchases.length,
      lastPaymentDate: null,
    });
  }

  // Enrich with supplier details
  await Promise.all(
    results.map(async (d) => {
      try {
        const { data: supplier } = await api.get(`/api/v1/suppliers/${d.supplierId}`);
        d.supplierName = supplier.name || '';
        d.phone = supplier.phone || '';
        d.email = supplier.email || '';
      } catch {
        d.supplierName = d.supplierId.slice(0, 8);
      }
    }),
  );

  let filtered = results.filter((d) => d.outstanding > 0);
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((d) => d.supplierName.toLowerCase().includes(q));
  }
  filtered.sort((a, b) => b.outstanding - a.outstanding);
  return filtered;
}

/** Get dashboard data combining AR, AP, aging, alerts, and recent collections */
export async function getDebtDashboard(): Promise<DebtDashboard> {
  const [summary, arAging, apAging] = await Promise.all([
    fetchDebtSummary(),
    fetchArAging(),
    fetchApAging(),
  ]);

  const debtors = await listDebtors();

  // Top 5 debtors
  const topDebtors: TopDebtor[] = debtors.slice(0, 5).map((d) => ({
    customerId: d.customerId,
    customerName: d.customerName,
    outstanding: d.outstanding,
  }));

  const creditors = await listCreditors();
  const topCreditors: TopCreditor[] = creditors.slice(0, 5).map((c) => ({
    supplierId: c.supplierId,
    supplierName: c.supplierName,
    outstanding: c.outstanding,
  }));

  // Overdue alerts (debtors > 60 days)
  const overdueAlerts: OverdueAlert[] = debtors
    .filter((d) => d.days60to90 > 0 || d.days90plus > 0)
    .map((d) => ({
      customerId: d.customerId,
      customerName: d.customerName,
      amount: d.days60to90 + d.days90plus,
      daysOverdue: d.days90plus > 0 ? 90 : 60,
      severity: d.days90plus > 0 ? 'CRITICAL' as const : 'WARNING' as const,
    }))
    .slice(0, 10);

  // Recent collections (last 10 payments)
  let recentCollections: CollectionActivity[] = [];
  try {
    const { data: paymentsPage } = await api.get('/api/v1/payments', {
      params: { referenceType: 'SALE', size: 10, sort: 'date,desc' },
    });
    recentCollections = (paymentsPage.content || []).map((p: { date?: string; referenceNo?: string; amount?: number; customerName?: string }) => ({
      date: p.date,
      description: `Payment for ${p.referenceNo || 'sale'}`,
      type: 'PAYMENT' as const,
      amount: p.amount || 0,
      customerName: p.customerName || '',
    }));
  } catch { /* ignore */ }

  return {
    totalAR: summary.totalAR || 0,
    arCount: summary.arCount || 0,
    totalAP: summary.totalAP || 0,
    apCount: summary.apCount || 0,
    agingAR: arAging,
    agingAP: apAging,
    recentCollections,
    overdueAlerts,
    topDebtors,
    topCreditors,
  };
}

/** Generate a document and return its ID */
export async function generateDebtDocument(params: {
  documentType: string;
  referenceType: string;
  referenceId: string;
}): Promise<{ id: string; documentNumber: string; presignedUrl: string }> {
  const { data } = await api.post('/api/v1/documents/generate', params);
  return data;
}
