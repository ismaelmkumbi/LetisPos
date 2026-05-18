import { api } from './client';

export async function runWacBackfill(): Promise<{ updated: number; costsFound: number; message?: string }> {
  const { data } = await api.post('/api/v1/sales/backfill-wac');
  return data;
}
