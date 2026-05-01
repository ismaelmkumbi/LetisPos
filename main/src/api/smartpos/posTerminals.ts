/**
 * POS terminals + customer-display SSE — backed by sales-service V4.
 * Hardware (camera scanner, scale) lives client-side; only the terminal
 * registry + the broadcast/subscribe pair live on the server.
 */
import { api, API_BASE_URL, tokenStore } from './client';
import type { UUID } from './types';

export interface PosTerminal {
  id: UUID;
  name: string;
  code: string;
  warehouseId: UUID;
  pairingToken: string;
  cashierUserId?: UUID | null;
  active: boolean;
  lastSeenAt?: string | null;
  notes?: string | null;
}

export async function listTerminals(warehouseId?: UUID): Promise<PosTerminal[]> {
  const { data } = await api.get<PosTerminal[]>('/api/v1/pos-terminals', { params: { warehouseId } });
  return data;
}

export async function getTerminal(id: UUID): Promise<PosTerminal> {
  const { data } = await api.get<PosTerminal>(`/api/v1/pos-terminals/${id}`);
  return data;
}

export async function createTerminal(body: { name: string; code: string; warehouseId: UUID; notes?: string }): Promise<PosTerminal> {
  const { data } = await api.post<PosTerminal>('/api/v1/pos-terminals', body);
  return data;
}

export async function pairTerminal(token: string): Promise<PosTerminal> {
  const { data } = await api.post<PosTerminal>(`/api/v1/pos-terminals/pair/${encodeURIComponent(token)}`);
  return data;
}

export async function rotateToken(id: UUID): Promise<PosTerminal> {
  const { data } = await api.post<PosTerminal>(`/api/v1/pos-terminals/${id}/rotate-token`);
  return data;
}

/** Cashier UI publishes a cart event to the paired customer display. */
export async function publishDisplayEvent(id: UUID, type: string, payload: unknown): Promise<{ delivered: number }> {
  const { data } = await api.post<{ delivered: number }>(`/api/v1/pos-terminals/${id}/events`, payload, {
    params: { type },
  });
  return data;
}

/** Returns an EventSource for a terminal's customer-display stream.
 *  Native EventSource doesn't accept custom headers — the JWT is appended
 *  to the URL as a query param so the gateway can authenticate. */
export function openDisplayStream(terminalId: UUID): EventSource {
  const url = `${API_BASE_URL}/api/v1/pos-terminals/${terminalId}/stream?access_token=${encodeURIComponent(tokenStore.get() ?? '')}`;
  return new EventSource(url);
}
