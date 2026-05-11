import { api } from './client';
import type { Page, UUID } from './types';

export interface StoreCreditTransaction {
  id: UUID;
  customerId: UUID;
  amount: number;
  type: 'RETURN_CREDIT' | 'DEPOSIT' | 'REDEMPTION' | 'ADJUSTMENT';
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface AddCreditRequest {
  customerId: UUID;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface RedeemCreditRequest {
  customerId: UUID;
  amount: number;
  posReference?: string;
}

export interface CustomerBalance {
  customerId: UUID;
  balance: number;
}

export async function listStoreCreditTransactions(customerId: UUID, page = 0, size = 50): Promise<Page<StoreCreditTransaction>> {
  const { data } = await api.get<Page<StoreCreditTransaction>>('/api/v1/store-credit', {
    params: { customerId, page, size },
  });
  return data;
}

export async function getCustomerBalance(customerId: UUID): Promise<CustomerBalance> {
  const { data } = await api.get<CustomerBalance>('/api/v1/store-credit/balance', {
    params: { customerId },
  });
  return data;
}

export async function addStoreCredit(body: AddCreditRequest): Promise<StoreCreditTransaction> {
  const { data } = await api.post<StoreCreditTransaction>('/api/v1/store-credit', body);
  return data;
}

export async function redeemStoreCredit(body: RedeemCreditRequest): Promise<StoreCreditTransaction> {
  const { data } = await api.post<StoreCreditTransaction>('/api/v1/store-credit/redeem', body);
  return data;
}
