import { api } from './client';
import type { Page, PriceList, PriceListLine, UUID } from './types';

export interface PriceListInput {
  name: string;
  description?: string;
  customerGroup?: string;
  currency?: string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
  lines?: PriceListLineInput[];
}

export interface PriceListLineInput {
  productId: UUID;
  variantId?: UUID | null;
  price: number;
  minQty?: number;
  maxQty?: number | null;
}

export async function listPriceLists(params?: {
  page?: number;
  size?: number;
}): Promise<Page<PriceList>> {
  const { data } = await api.get<Page<PriceList>>('/api/v1/price-lists', { params });
  return data;
}

export async function getPriceList(id: UUID): Promise<PriceList> {
  const { data } = await api.get<PriceList>(`/api/v1/price-lists/${id}`);
  return data;
}

export async function createPriceList(body: PriceListInput): Promise<PriceList> {
  const { data } = await api.post<PriceList>('/api/v1/price-lists', body);
  return data;
}

export async function updatePriceList(id: UUID, body: PriceListInput): Promise<PriceList> {
  const { data } = await api.put<PriceList>(`/api/v1/price-lists/${id}`, body);
  return data;
}

export async function deletePriceList(id: UUID): Promise<void> {
  await api.delete(`/api/v1/price-lists/${id}`);
}

export async function replacePriceListLines(
  priceListId: UUID,
  lines: PriceListLineInput[],
): Promise<PriceListLine[]> {
  const { data } = await api.put<PriceListLine[]>(
    `/api/v1/price-lists/${priceListId}/lines`,
    lines,
  );
  return data;
}
