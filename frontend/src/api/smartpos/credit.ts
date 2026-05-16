/**
 * Credit / debt API helpers.
 *
 * All data is derived from existing Sale + Payment + Customer endpoints.
 * No new backend controllers required.
 */
import { api } from './client';
import { listSales, type Sale } from './sales';
import { listPayments, type Payment } from './payments';
import type { UUID, Customer } from './types';

export interface CustomerDebt {
  customerId: UUID;
  customerName: string;
  outstanding: number;
  creditLimit: number;
  available: number;
  lastPaymentDate: string | null;
  overdue: boolean;
  saleCount: number;
}

export interface DebtAging {
  current: number;
  days30to60: number;
  days60to90: number;
  days90plus: number;
}

/** Aggregate unpaid sales grouped by customer. */
export async function listDebtors(params?: {
  overdueOnly?: boolean;
  search?: string;
}): Promise<CustomerDebt[]> {
  const [salesPage, partialPage] = await Promise.all([
    listSales({ paymentStatus: 'UNPAID', size: 500 }),
    listSales({ paymentStatus: 'PARTIAL', size: 500 }),
  ]);

  const unpaidSales = [...salesPage.content, ...partialPage.content];

  const byCustomer = new Map<UUID, Sale[]>();
  for (const sale of unpaidSales) {
    if (!sale.customerId) continue;
    const existing = byCustomer.get(sale.customerId) || [];
    existing.push(sale);
    byCustomer.set(sale.customerId, existing);
  }

  const results: CustomerDebt[] = [];
  for (const [customerId, sales] of byCustomer) {
    const outstanding = sales.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
    const oldest = sales.reduce((min, s) =>
      s.createdAt < min ? s.createdAt : min, sales[0].createdAt);

    const now = Date.now();
    const overdue = new Date(oldest).getTime() < now - 30 * 24 * 60 * 60 * 1000;

    results.push({
      customerId,
      customerName: '',
      outstanding,
      creditLimit: 0,
      available: 0,
      lastPaymentDate: null,
      overdue,
      saleCount: sales.length,
    });
  }

  const customerFetches = results.map(async (d) => {
    try {
      const { data: customer } = await api.get<Customer>(`/api/v1/customers/${d.customerId}`);
      d.customerName = customer.name;
      d.creditLimit = customer.creditLimit;
      d.available = Math.max(0, customer.creditLimit - d.outstanding);
    } catch {
      d.customerName = d.customerId.slice(0, 8);
    }
  });
  await Promise.all(customerFetches);

  // Populate lastPaymentDate from the most recent payment across each debtor's unpaid sales
  const paymentFetches = results.map(async (d) => {
    const saleIds = byCustomer.get(d.customerId)?.map((s) => s.id) || [];
    if (saleIds.length === 0) return;
    let latest: string | null = null;
    await Promise.all(
      saleIds.map(async (saleId) => {
        try {
          const page = await listPayments({ referenceType: 'SALE', referenceId: saleId, size: 50 });
          for (const p of page.content) {
            if (!latest || p.date > latest) {
              latest = p.date;
            }
          }
        } catch { /* skip */ }
      }),
    );
    d.lastPaymentDate = latest;
  });
  await Promise.all(paymentFetches);

  let filtered = results.filter((d) => d.outstanding > 0);
  if (params?.overdueOnly) filtered = filtered.filter((d) => d.overdue);
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((d) => d.customerName.toLowerCase().includes(q));
  }

  filtered.sort((a, b) => b.outstanding - a.outstanding);
  return filtered;
}

/** Get debt breakdown for one customer. */
export async function getCustomerDebt(customerId: UUID): Promise<{
  customer: Customer;
  balance: number;
  creditLimit: number;
  available: number;
  aging: DebtAging;
  sales: Sale[];
  payments: Payment[];
}> {
  let customer: Customer;
  try {
    const { data } = await api.get<Customer>(`/api/v1/customers/${customerId}`);
    customer = data;
  } catch (err: any) {
    throw new Error(`Failed to fetch customer ${customerId}: ${err?.message || err}`);
  }
  const salesPage = await listSales({ customerId, paymentStatus: 'UNPAID', size: 200 });
  const partialPage = await listSales({ customerId, paymentStatus: 'PARTIAL', size: 200 });
  const paidPage = await listSales({ customerId, paymentStatus: 'PAID', size: 200 });

  const allSales = [...salesPage.content, ...partialPage.content, ...paidPage.content];
  const unpaidSales = [...salesPage.content, ...partialPage.content];

  const balance = unpaidSales.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);

  const now = Date.now();
  const aging: DebtAging = { current: 0, days30to60: 0, days60to90: 0, days90plus: 0 };
  for (const sale of unpaidSales) {
    const age = now - new Date(sale.createdAt).getTime();
    const days = age / (24 * 60 * 60 * 1000);
    const due = sale.dueTotal || sale.grandTotal;
    if (days < 30) aging.current += due;
    else if (days < 60) aging.days30to60 += due;
    else if (days < 90) aging.days60to90 += due;
    else aging.days90plus += due;
  }

  const paymentPages = await Promise.all(
    allSales.map((sale) =>
      listPayments({ referenceType: 'SALE', referenceId: sale.id, size: 50 }).catch(() => null),
    ),
  );
  const payments: Payment[] = paymentPages
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .flatMap((p) => p.content);

  return {
    customer,
    balance,
    creditLimit: customer.creditLimit,
    available: Math.max(0, customer.creditLimit - balance),
    aging,
    sales: allSales,
    payments,
  };
}

/** Get total outstanding debt for dashboard widget. */
export async function getTotalOutstanding(): Promise<{
  total: number;
  overdueTotal: number;
  debtorCount: number;
  collectedThisMonth: number;
}> {
  const [unpaidPage, partialPage] = await Promise.all([
    listSales({ paymentStatus: 'UNPAID', size: 500 }),
    listSales({ paymentStatus: 'PARTIAL', size: 500 }),
  ]);

  const allUnpaid = [...unpaidPage.content, ...partialPage.content];
  const customerIds = new Set(allUnpaid.map((s) => s.customerId).filter(Boolean));
  const now = Date.now();
  const thirtyDays = now - 30 * 24 * 60 * 60 * 1000;

  let total = 0;
  let overdueTotal = 0;
  for (const sale of allUnpaid) {
    const due = sale.dueTotal || sale.grandTotal;
    total += due;
    if (new Date(sale.createdAt).getTime() < thirtyDays) {
      overdueTotal += due;
    }
  }

  // ISO date string; backend compares dates, not timestamps, so timezone offset is harmless
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  let collectedThisMonth = 0;
  try {
    // TODO: paginate if a store exceeds 500 payment transactions/month
    const page = await listPayments({ referenceType: 'SALE', dateFrom: monthStart, size: 500 });
    collectedThisMonth = page.content.reduce((sum, p) => sum + p.amount, 0);
  } catch { /* skip */ }

  return {
    total,
    overdueTotal,
    debtorCount: customerIds.size,
    collectedThisMonth,
  };
}
