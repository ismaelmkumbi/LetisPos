/**
 * Accounting API — backed by payment-service V2.
 *   /api/v1/chart-of-accounts
 *   /api/v1/journal-entries
 *   /api/v1/financials/{trial-balance, profit-and-loss, balance-sheet}
 */
import { api } from './client';
import type { Page, UUID } from './types';

export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DR' | 'CR';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

// ---------- Chart of Accounts ----------

export interface ChartOfAccount {
  id: UUID;
  parentId?: UUID | null;
  code: string;
  name: string;
  accountClass: AccountClass;
  normalBalance: NormalBalance;
  postable: boolean;
  active: boolean;
  description?: string | null;
}

export async function listAccounts(accountClass?: AccountClass, includeInactive?: boolean): Promise<ChartOfAccount[]> {
  const { data } = await api.get<ChartOfAccount[]>('/api/v1/chart-of-accounts', {
    params: { accountClass, includeInactive },
  });
  return data;
}

export async function listTemplates(): Promise<ChartOfAccount[]> {
  const { data } = await api.get<ChartOfAccount[]>('/api/v1/chart-of-accounts/templates');
  return data;
}

export async function activateAccount(id: UUID): Promise<ChartOfAccount> {
  const { data } = await api.patch<ChartOfAccount>(`/api/v1/chart-of-accounts/${id}/activate`);
  return data;
}

export interface CreateAccountBody {
  parentId?: UUID;
  code: string;
  name: string;
  accountClass: AccountClass;
  normalBalance?: NormalBalance;
  postable?: boolean;
  active?: boolean;
  description?: string;
}

export async function createAccount(body: CreateAccountBody): Promise<ChartOfAccount> {
  const { data } = await api.post<ChartOfAccount>('/api/v1/chart-of-accounts', body);
  return data;
}

export async function updateAccount(id: UUID, body: Partial<CreateAccountBody>): Promise<ChartOfAccount> {
  const { data } = await api.put<ChartOfAccount>(`/api/v1/chart-of-accounts/${id}`, body);
  return data;
}

// ---------- Journal Entries ----------

export interface JournalEntryLine {
  id: UUID;
  accountId: UUID;
  debit: number;
  credit: number;
  memo?: string | null;
  position: number;
}

export interface JournalEntry {
  id: UUID;
  ref: string;
  entryDate: string;
  memo?: string | null;
  source: string;
  sourceRef?: string | null;
  status: JournalStatus;
  postedAt?: string | null;
  postedBy?: UUID | null;
  voidedAt?: string | null;
  voidedBy?: UUID | null;
  voidReason?: string | null;
  totalDebit: number;
  totalCredit: number;
  lines: JournalEntryLine[];
  createdAt: string;
}

export interface JournalSearchParams {
  status?: JournalStatus;
  from?: string;
  to?: string;
  source?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function listJournalEntries(params: JournalSearchParams = {}): Promise<Page<JournalEntry>> {
  const { data } = await api.get<Page<JournalEntry>>('/api/v1/journal-entries', { params });
  return data;
}

export async function getJournalEntry(id: UUID): Promise<JournalEntry> {
  const { data } = await api.get<JournalEntry>(`/api/v1/journal-entries/${id}`);
  return data;
}

export interface JournalLineInput {
  accountId: UUID;
  debit?: number;
  credit?: number;
  memo?: string;
  position?: number;
}

export interface CreateJournalEntryBody {
  ref: string;
  entryDate?: string;
  memo?: string;
  source?: string;
  sourceRef?: string;
  lines: JournalLineInput[];
  postImmediately?: boolean;
}

export async function createJournalEntry(body: CreateJournalEntryBody): Promise<JournalEntry> {
  const { data } = await api.post<JournalEntry>('/api/v1/journal-entries', body);
  return data;
}

export async function postJournalEntry(id: UUID): Promise<JournalEntry> {
  const { data } = await api.post<JournalEntry>(`/api/v1/journal-entries/${id}/post`);
  return data;
}

export async function voidJournalEntry(id: UUID, reason: string): Promise<JournalEntry> {
  const { data } = await api.post<JournalEntry>(`/api/v1/journal-entries/${id}/void`, { reason });
  return data;
}

// ---------- Financial statements ----------

export interface TrialBalanceRow {
  accountId: UUID;
  code: string;
  name: string;
  accountClass: AccountClass;
  debit: number;
  credit: number;
}
export interface TrialBalance {
  from?: string | null;
  to?: string | null;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export async function getTrialBalance(from?: string, to?: string): Promise<TrialBalance> {
  const { data } = await api.get<TrialBalance>('/api/v1/financials/trial-balance', { params: { from, to } });
  return data;
}

export interface ProfitAndLoss {
  from: string;
  to: string;
  revenue: { accountId: UUID; code: string; name: string; amount: number }[];
  expenses: { accountId: UUID; code: string; name: string; amount: number }[];
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
}

export async function getProfitAndLoss(from: string, to: string): Promise<ProfitAndLoss> {
  const { data } = await api.get<ProfitAndLoss>('/api/v1/financials/profit-and-loss', { params: { from, to } });
  return data;
}

export interface BalanceSheetSection { accountId: UUID; code: string; name: string; balance: number }
export interface BalanceSheet {
  asOf: string;
  assets: BalanceSheetSection[];
  liabilities: BalanceSheetSection[];
  equity: BalanceSheetSection[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
}

export async function getBalanceSheet(asOf: string): Promise<BalanceSheet> {
  const { data } = await api.get<BalanceSheet>('/api/v1/financials/balance-sheet', { params: { asOf } });
  return data;
}

// ─── Initialize Accounting for Tenant ─────────────────────────────────────────

export interface AccountingSetupResult {
  coaEntries: number;
  operationalAccounts: number;
  postingRules: number;
  expenseCategories: number;
  depositCategories: number;
}

export async function initializeAccounting(): Promise<AccountingSetupResult> {
  const { data } = await api.post<AccountingSetupResult>('/api/v1/chart-of-accounts/initialize');
  return data;
}

// ─── Seed default Chart of Accounts (client-side fallback) ────────────────────

const DEFAULT_COA: CreateAccountBody[] = [
  // Assets (1-XXXX)
  { code: '1-1000', name: 'Cash on Hand', accountClass: 'ASSET', normalBalance: 'DR', postable: true, description: 'Physical cash in registers and safes' },
  { code: '1-1100', name: 'Bank Accounts', accountClass: 'ASSET', normalBalance: 'DR', postable: true, description: 'All bank account balances' },
  { code: '1-1200', name: 'Accounts Receivable', accountClass: 'ASSET', normalBalance: 'DR', postable: true, description: 'Money owed by customers' },
  { code: '1-1300', name: 'Inventory', accountClass: 'ASSET', normalBalance: 'DR', postable: false, description: 'Stock held for sale' },
  { code: '1-1400', name: 'Prepaid Expenses', accountClass: 'ASSET', normalBalance: 'DR', postable: true, description: 'Payments made in advance' },
  { code: '1-1500', name: 'Fixed Assets', accountClass: 'ASSET', normalBalance: 'DR', postable: true, description: 'Equipment, furniture, vehicles, buildings' },
  { code: '1-1510', name: 'Accumulated Depreciation', accountClass: 'ASSET', normalBalance: 'CR', postable: true, description: 'Contra-asset for depreciation' },
  { code: '1-1600', name: 'Other Current Assets', accountClass: 'ASSET', normalBalance: 'DR', postable: true, description: 'Deposits, advances, other receivables' },

  // Liabilities (2-XXXX)
  { code: '2-2000', name: 'Accounts Payable', accountClass: 'LIABILITY', normalBalance: 'CR', postable: true, description: 'Money owed to suppliers' },
  { code: '2-2100', name: 'Accrued Expenses', accountClass: 'LIABILITY', normalBalance: 'CR', postable: true, description: 'Expenses incurred but not yet paid' },
  { code: '2-2200', name: 'Tax Payable', accountClass: 'LIABILITY', normalBalance: 'CR', postable: true, description: 'VAT, income tax, and other taxes owed' },
  { code: '2-2300', name: 'Loans Payable', accountClass: 'LIABILITY', normalBalance: 'CR', postable: true, description: 'Bank loans and other borrowings' },
  { code: '2-2400', name: 'Unearned Revenue', accountClass: 'LIABILITY', normalBalance: 'CR', postable: true, description: 'Payments received before goods/services delivered' },
  { code: '2-2500', name: 'Other Current Liabilities', accountClass: 'LIABILITY', normalBalance: 'CR', postable: true, description: 'Other short-term obligations' },

  // Equity (3-XXXX)
  { code: '3-3000', name: 'Owner\'s Equity', accountClass: 'EQUITY', normalBalance: 'CR', postable: true, description: 'Owner\'s capital contribution' },
  { code: '3-3100', name: 'Retained Earnings', accountClass: 'EQUITY', normalBalance: 'CR', postable: false, description: 'Accumulated profits/losses' },
  { code: '3-3200', name: 'Owner\'s Drawings', accountClass: 'EQUITY', normalBalance: 'DR', postable: true, description: 'Owner withdrawals' },

  // Revenue (4-XXXX)
  { code: '4-4000', name: 'Sales Revenue', accountClass: 'REVENUE', normalBalance: 'CR', postable: false, description: 'Revenue from product sales' },
  { code: '4-4100', name: 'Service Revenue', accountClass: 'REVENUE', normalBalance: 'CR', postable: false, description: 'Revenue from services' },
  { code: '4-4200', name: 'Sales Discounts', accountClass: 'REVENUE', normalBalance: 'DR', postable: true, description: 'Contra-revenue: discounts given' },
  { code: '4-4300', name: 'Other Income', accountClass: 'REVENUE', normalBalance: 'CR', postable: true, description: 'Interest, rent, and other income' },

  // Expenses (5-XXXX)
  { code: '5-5000', name: 'Cost of Goods Sold', accountClass: 'EXPENSE', normalBalance: 'DR', postable: false, description: 'Direct cost of products sold' },
  { code: '5-5100', name: 'Salaries and Wages', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Employee compensation' },
  { code: '5-5200', name: 'Rent Expense', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Premises and equipment rental' },
  { code: '5-5300', name: 'Utilities', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Electricity, water, internet, phone' },
  { code: '5-5400', name: 'Office Supplies', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Stationery, printing, consumables' },
  { code: '5-5500', name: 'Marketing and Advertising', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Promotion and advertising costs' },
  { code: '5-5600', name: 'Transport and Logistics', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Delivery, shipping, fuel, transport' },
  { code: '5-5700', name: 'Repairs and Maintenance', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Equipment and premises maintenance' },
  { code: '5-5800', name: 'Depreciation Expense', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Allocation of fixed asset cost' },
  { code: '5-5900', name: 'Interest Expense', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Interest on loans and borrowings' },
  { code: '5-6000', name: 'Tax Expense', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Income tax and other business taxes' },
  { code: '5-6100', name: 'Miscellaneous Expense', accountClass: 'EXPENSE', normalBalance: 'DR', postable: true, description: 'Other operating expenses' },
];

export async function seedDefaultCOA(): Promise<ChartOfAccount[]> {
  // Try the single-call backend initialization first
  try {
    await initializeAccounting();
  } catch (err) {
    console.warn('Backend initializeAccounting failed, falling back to client-side seeding:', err);
  }

  // Fallback: client-side individual creates
  const results: ChartOfAccount[] = [];
  for (const account of DEFAULT_COA) {
    try {
      const created = await createAccount(account);
      results.push(created);
    } catch (err) {
      console.warn('seedDefaultCOA: failed to create account', account.code, account.name, err);
    }
  }
  return results;
}
