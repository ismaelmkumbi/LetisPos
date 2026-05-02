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

export async function listAccounts(accountClass?: AccountClass): Promise<ChartOfAccount[]> {
  const { data } = await api.get<ChartOfAccount[]>('/api/v1/chart-of-accounts', {
    params: { accountClass },
  });
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
