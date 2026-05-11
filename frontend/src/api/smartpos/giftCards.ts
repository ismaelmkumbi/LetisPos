import { api } from './client';
import type { Page, UUID } from './types';

export interface GiftCard {
  id: UUID;
  cardNumber: string;
  initialBalance: number;
  currentBalance: number;
  expiryDate?: string | null;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  customerId?: UUID | null;
  purchasedBy?: UUID | null;
}

export interface IssueGiftCardRequest {
  amount: number;
  expiryDate?: string;
  customerId?: UUID;
}

export interface RedeemGiftCardRequest {
  amount: number;
  posReference?: string;
}

export async function listGiftCards(page = 0, size = 50): Promise<Page<GiftCard>> {
  const { data } = await api.get<Page<GiftCard>>('/api/v1/gift-cards', {
    params: { page, size },
  });
  return data;
}

export async function getGiftCard(id: UUID): Promise<GiftCard> {
  const { data } = await api.get<GiftCard>(`/api/v1/gift-cards/${id}`);
  return data;
}

export async function issueGiftCard(body: IssueGiftCardRequest): Promise<GiftCard> {
  const { data } = await api.post<GiftCard>('/api/v1/gift-cards', body);
  return data;
}

export async function redeemGiftCard(id: UUID, body: RedeemGiftCardRequest): Promise<GiftCard> {
  const { data } = await api.post<GiftCard>(`/api/v1/gift-cards/${id}/redeem`, body);
  return data;
}
