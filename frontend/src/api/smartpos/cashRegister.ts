/**
 * Cash register session API.
 */
import { api } from './client';

export interface CashRegisterSession {
  id: string;
  warehouseId: string;
  userId: string;
  openedAt: string;
  closedAt?: string | null;
  openingBalance: number;
  countedCash?: number | null;
  expectedCash: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string | null;
}

export interface OpenRegisterRequest {
  warehouseId: string;
  openingBalance?: number;
}

export interface CloseRegisterRequest {
  countedCash: number;
  notes?: string;
}

export async function openRegister(body: OpenRegisterRequest): Promise<CashRegisterSession> {
  const { data } = await api.post<CashRegisterSession>('/api/v1/cash-registers/open', body);
  return data;
}

export async function getCurrentRegister(warehouseId: string): Promise<CashRegisterSession | null> {
  try {
    const { data, status } = await api.get<CashRegisterSession>('/api/v1/cash-registers/current', {
      params: { warehouseId },
    });
    return status === 204 ? null : data;
  } catch {
    return null;
  }
}

export async function closeRegister(warehouseId: string, body: CloseRegisterRequest): Promise<CashRegisterSession> {
  const { data } = await api.post<CashRegisterSession>(
    `/api/v1/cash-registers/close?warehouseId=${warehouseId}`,
    body,
  );
  return data;
}
