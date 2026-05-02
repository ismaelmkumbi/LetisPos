/**
 * Payments + Accounts + Expenses + Deposits + Stripe API wrapper.
 * Mirrors io.smartpos.payment.api.dto.*
 */
import { api } from './client';
import type { Page, UUID } from './types';

// ---------- shared ----------

export type AccountType   = 'CASH' | 'BANK' | 'CARD' | 'MOBILE_MONEY';
export type PaymentMethod = 'CASH' | 'CARD' | 'CHECK' | 'TRANSFER' | 'MPESA' | 'STRIPE';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type ReferenceType = 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'EXPENSE' | 'DEPOSIT' | 'TRANSFER';

// ---------- Accounts ----------

export interface Account {
  id: UUID;
  name: string;
  number: string | null;
  type: AccountType;
  currency: string;
  initialBalance: number;
  balance: number;
  active: boolean;
  notes: string | null;
}

export interface AccountInput {
  name: string;
  number?: string;
  type?: AccountType;
  currency?: string;
  initialBalance?: number;
  notes?: string;
}

export async function listAccounts(): Promise<Account[]> {
  const { data } = await api.get<Account[]>('/api/v1/accounts');
  return data;
}
export async function getAccount(id: UUID): Promise<Account> {
  const { data } = await api.get<Account>(`/api/v1/accounts/${id}`);
  return data;
}
export async function createAccount(body: AccountInput): Promise<Account> {
  const { data } = await api.post<Account>('/api/v1/accounts', body);
  return data;
}
export async function updateAccount(id: UUID, body: AccountInput): Promise<Account> {
  const { data } = await api.put<Account>(`/api/v1/accounts/${id}`, body);
  return data;
}

// ---------- Account Ledger ----------

export interface LedgerEntry {
  id: UUID;
  accountId: UUID;
  txnDate: string;
  referenceType: ReferenceType | null;
  referenceId: UUID | null;
  description: string | null;
  debit: number;
  credit: number;
  balanceAfter: number;
  createdAt: string;
}

export async function getAccountLedger(
  accountId: UUID,
  params: { dateFrom?: string; dateTo?: string; page?: number; size?: number } = {},
): Promise<Page<LedgerEntry>> {
  const { data } = await api.get<Page<LedgerEntry>>(
    `/api/v1/accounts/${accountId}/ledger`, { params });
  return data;
}

// ---------- Account-to-account transfers ----------

export interface AccountTransfer {
  id: UUID;
  ref: string;
  date: string;
  fromAccountId: UUID;
  toAccountId: UUID;
  amount: number;
  notes: string | null;
}

export async function transferBetweenAccounts(body: {
  date?: string;
  fromAccountId: UUID;
  toAccountId: UUID;
  amount: number;
  notes?: string;
}): Promise<AccountTransfer> {
  const { data } = await api.post<AccountTransfer>('/api/v1/accounts/transfers', body);
  return data;
}

// ---------- Payments ----------

export interface Payment {
  id: UUID;
  ref: string;
  date: string;
  referenceType: ReferenceType;
  referenceId: UUID;
  accountId: UUID;
  amount: number;
  currency: string;
  method: PaymentMethod;
  externalRef: string | null;
  notes: string | null;
  status: PaymentStatus;
}

export interface RecordPaymentBody {
  date?: string;
  referenceType: ReferenceType;
  referenceId: UUID;
  accountId: UUID;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  externalRef?: string;
  notes?: string;
}

export async function listPayments(params: {
  referenceType?: ReferenceType; referenceId?: UUID; accountId?: UUID;
  dateFrom?: string; dateTo?: string; page?: number; size?: number;
} = {}): Promise<Page<Payment>> {
  const { data } = await api.get<Page<Payment>>('/api/v1/payments', { params });
  return data;
}

export async function recordPayment(body: RecordPaymentBody): Promise<Payment> {
  const { data } = await api.post<Payment>('/api/v1/payments', body);
  return data;
}

export async function refundPayment(id: UUID, reason?: string): Promise<void> {
  await api.post(`/api/v1/payments/${id}/refund`, { reason });
}

// ---------- Expenses ----------

export interface Expense {
  id: UUID;
  ref: string;
  date: string;
  accountId: UUID;
  categoryId: UUID | null;
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
}

export async function listExpenses(params: {
  accountId?: UUID; categoryId?: UUID; dateFrom?: string; dateTo?: string;
  page?: number; size?: number;
} = {}): Promise<Page<Expense>> {
  const { data } = await api.get<Page<Expense>>('/api/v1/expenses', { params });
  return data;
}

export async function recordExpense(body: {
  date?: string; accountId: UUID; categoryId?: UUID;
  amount: number; currency?: string; description?: string; notes?: string;
}): Promise<Expense> {
  const { data } = await api.post<Expense>('/api/v1/expenses', body);
  return data;
}

export async function listExpenseCategories(): Promise<{id: UUID; name: string; description: string | null}[]> {
  const { data } = await api.get('/api/v1/expenses/categories');
  return data;
}

export async function createExpenseCategory(body: { name: string; description?: string }) {
  const { data } = await api.post('/api/v1/expenses/categories', body);
  return data;
}

// ---------- Deposits ----------

export interface Deposit {
  id: UUID;
  ref: string;
  date: string;
  accountId: UUID;
  categoryId: UUID | null;
  amount: number;
  currency: string;
  description: string | null;
  notes: string | null;
}

export async function listDeposits(params: {
  accountId?: UUID; categoryId?: UUID; dateFrom?: string; dateTo?: string;
  page?: number; size?: number;
} = {}): Promise<Page<Deposit>> {
  const { data } = await api.get<Page<Deposit>>('/api/v1/deposits', { params });
  return data;
}

export async function recordDeposit(body: {
  date?: string; accountId: UUID; categoryId?: UUID;
  amount: number; currency?: string; description?: string; notes?: string;
}): Promise<Deposit> {
  const { data } = await api.post<Deposit>('/api/v1/deposits', body);
  return data;
}

export async function listDepositCategories() {
  const { data } = await api.get('/api/v1/deposits/categories');
  return data;
}

export async function createDepositCategory(body: { name: string; description?: string }) {
  const { data } = await api.post('/api/v1/deposits/categories', body);
  return data;
}

// ---------- Stripe ----------

/**
 * Creates a Stripe PaymentIntent. In dev mode (Stripe not configured) the
 * backend returns a mock clientSecret — the frontend should show a "card
 * payments disabled" banner and disable the Stripe tab in the checkout UI.
 */
export async function createStripeIntent(body: {
  saleId: UUID;
  amount: number;
  currency?: string;
  accountId: UUID;
}): Promise<{ clientSecret: string; intentId: string; status: string }> {
  const { data } = await api.post('/api/v1/payments/stripe/intent', body);
  return data;
}
