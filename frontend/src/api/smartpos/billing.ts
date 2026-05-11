import { api } from './client';

export interface PlanDefinition {
  id: string;
  code: string;
  label: string;
  description?: string;
  monthlyPriceTzs: number;
  annualPriceTzs?: number;
  maxUsers: number;
  maxStores: number;
  maxProducts: number;
  features: string;
  isPublic: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planCode: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  amountTzs: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentMethod?: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export async function listPlans(): Promise<PlanDefinition[]> {
  const { data } = await api.get<PlanDefinition[]>('/api/v1/billing/plans');
  return data;
}

export async function listAllPlans(): Promise<PlanDefinition[]> {
  const { data } = await api.get<PlanDefinition[]>('/api/v1/billing/plans/admin');
  return data;
}

export async function updatePlan(code: string, update: Partial<PlanDefinition>): Promise<PlanDefinition> {
  const { data } = await api.put<PlanDefinition>(`/api/v1/billing/plans/admin/${code}`, update);
  return data;
}

export async function getSubscription(tenantId: string): Promise<Subscription | null> {
  try {
    const { data } = await api.get<Subscription>(`/api/v1/billing/subscriptions/tenant/${tenantId}`);
    return data;
  } catch {
    return null;
  }
}

export async function createSubscription(body: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/api/v1/billing/subscriptions/admin', body);
  return data;
}

export async function updateSubscription(id: string, body: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.patch<Subscription>(`/api/v1/billing/subscriptions/admin/${id}`, body);
  return data;
}

// ── Payment Methods ──

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: string;
  provider?: string;
  label: string;
  providerCustomerId?: string;
  isDefault: boolean;
  createdAt: string;
}

export async function listPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
  const { data } = await api.get<PaymentMethod[]>(`/api/v1/billing/payment-methods/tenant/${tenantId}`);
  return data;
}

export async function createPaymentMethod(body: {
  tenantId: string;
  type: string;
  provider?: string;
  label: string;
  isDefault?: boolean;
}): Promise<PaymentMethod> {
  const { data } = await api.post<PaymentMethod>('/api/v1/billing/payment-methods', body);
  return data;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await api.delete(`/api/v1/billing/payment-methods/${id}`);
}

// ── Invoices ──

export async function listInvoices(tenantId: string): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>(`/api/v1/billing/invoices/tenant/${tenantId}`);
  return data;
}
