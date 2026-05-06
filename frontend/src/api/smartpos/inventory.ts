/**
 * Inventory Service API wrapper.
 * Mirrors the Java DTOs in io.smartpos.inventory.api.dto.
 */
import { api } from './client';
import type { Page, UUID } from './types';

// ---------- Warehouses ----------

export interface Warehouse {
  id: UUID;
  code?: string | null;
  name: string;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  zip?: string | null;
  notes?: string | null;
  active: boolean;
}

export interface WarehouseInput {
  code?: string;
  name: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  zip?: string;
  notes?: string;
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const { data } = await api.get<Warehouse[]>('/api/v1/warehouses');
  return data;
}
export async function getWarehouse(id: UUID): Promise<Warehouse> {
  const { data } = await api.get<Warehouse>(`/api/v1/warehouses/${id}`);
  return data;
}
export async function createWarehouse(body: WarehouseInput): Promise<Warehouse> {
  const { data } = await api.post<Warehouse>('/api/v1/warehouses', body);
  return data;
}
export async function updateWarehouse(id: UUID, body: WarehouseInput): Promise<Warehouse> {
  const { data } = await api.put<Warehouse>(`/api/v1/warehouses/${id}`, body);
  return data;
}
export async function deleteWarehouse(id: UUID): Promise<void> {
  await api.delete(`/api/v1/warehouses/${id}`);
}
export async function toggleWarehouseStatus(id: UUID, active: boolean): Promise<Warehouse> {
  const { data } = await api.patch<Warehouse>(`/api/v1/warehouses/${id}/status`, { active });
  return data;
}

// ---------- Stock levels ----------

export interface StockLevel {
  id: UUID;
  productId: UUID;
  variantId: UUID | null;
  warehouseId: UUID;
  onHand: number;
  reserved: number;
  available: number;
  stockAlertThreshold: number;
  version: number;
}

export async function getStockLevel(params: {
  productId: UUID; variantId?: UUID; warehouseId: UUID;
}): Promise<StockLevel> {
  const { data } = await api.get<StockLevel>('/api/v1/stock', { params });
  return data;
}

export async function listStockLevels(
  warehouseId: UUID,
  page: number = 0,
  size: number = 50,
): Promise<Page<StockLevel>> {
  const { data } = await api.get<Page<StockLevel>>('/api/v1/stock/levels', {
    params: { warehouseId, page, size },
  });
  return data;
}

export async function lowStockAlerts(
  warehouseId?: UUID,
  page: number = 0,
  size: number = 50,
): Promise<Page<StockLevel>> {
  const { data } = await api.get<Page<StockLevel>>('/api/v1/stock/alerts', {
    params: { warehouseId, page, size },
  });
  return data;
}

/** Batch stock lookup — POS product grid real-time stock counts. */
export async function batchStockLevels(
  warehouseId: UUID,
  productIds: UUID[],
): Promise<Record<string, StockLevel>> {
  if (productIds.length === 0) return {};
  const { data } = await api.get<Record<string, StockLevel>>('/api/v1/stock/batch', {
    params: { warehouseId, productIds },
    paramsSerializer: {
      serialize: (params) => {
        const sp = new URLSearchParams();
        sp.append('warehouseId', params.warehouseId);
        (params.productIds as string[]).forEach((id: string) => sp.append('productIds', id));
        return sp.toString();
      },
    },
  });
  return data;
}

// ---------- Stock reservations (POS saga) ----------

export interface ReservationLine {
  productId: UUID;
  variantId?: UUID;
  warehouseId: UUID;
  qty: number;
}

export interface Reservation {
  id: UUID;
  saleId: UUID;
  lines: ReservationLine[];
  expiresAt: string;
  status: 'ACTIVE' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';
}

export async function reserveStock(body: {
  saleId: UUID; lines: ReservationLine[]; ttlMinutes?: number;
}): Promise<Reservation> {
  const { data } = await api.post<Reservation>('/api/v1/stock/reservations', body);
  return data;
}

export async function commitReservation(saleId: UUID): Promise<void> {
  await api.post(`/api/v1/stock/reservations/${saleId}/commit`);
}

export async function releaseReservation(saleId: UUID): Promise<void> {
  await api.delete(`/api/v1/stock/reservations/${saleId}`);
}

// ---------- Transfers ----------

export type TransferStatus = 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface TransferLine {
  id?: UUID;
  productId: UUID;
  variantId?: UUID | null;
  qty: number;
  unitCost?: number;
}

export interface Transfer {
  id: UUID;
  ref: string;
  date: string;
  fromWarehouseId: UUID;
  toWarehouseId: UUID;
  status: TransferStatus;
  notes?: string | null;
  lines: TransferLine[];
}

export async function listTransfers(params: {
  status?: TransferStatus; dateFrom?: string; dateTo?: string;
  page?: number; size?: number;
} = {}): Promise<Page<Transfer>> {
  const { data } = await api.get<Page<Transfer>>('/api/v1/transfers', { params });
  return data;
}

export async function getTransfer(id: UUID): Promise<Transfer> {
  const { data } = await api.get<Transfer>(`/api/v1/transfers/${id}`);
  return data;
}

export async function createTransfer(body: {
  fromWarehouseId: UUID; toWarehouseId: UUID; date?: string;
  notes?: string; lines: TransferLine[];
}): Promise<Transfer> {
  const { data } = await api.post<Transfer>('/api/v1/transfers', body);
  return data;
}

export async function completeTransfer(id: UUID): Promise<Transfer> {
  const { data } = await api.post<Transfer>(`/api/v1/transfers/${id}/complete`);
  return data;
}

// ---------- Adjustments ----------

export interface AdjustmentLine {
  id?: UUID;
  productId: UUID;
  variantId?: UUID | null;
  qtyDelta: number;        // signed
}

export interface Adjustment {
  id: UUID;
  ref: string;
  date: string;
  warehouseId: UUID;
  reason?: string | null;
  notes?: string | null;
  lines: AdjustmentLine[];
}

export async function listAdjustments(params: {
  warehouseId?: UUID; dateFrom?: string; dateTo?: string;
  page?: number; size?: number;
} = {}): Promise<Page<Adjustment>> {
  const { data } = await api.get<Page<Adjustment>>('/api/v1/adjustments', { params });
  return data;
}

export async function getAdjustment(id: UUID): Promise<Adjustment> {
  const { data } = await api.get<Adjustment>(`/api/v1/adjustments/${id}`);
  return data;
}

export async function createAdjustment(body: {
  warehouseId: UUID; date?: string; reason?: string; notes?: string;
  lines: AdjustmentLine[];
}): Promise<Adjustment> {
  const { data } = await api.post<Adjustment>('/api/v1/adjustments', body);
  return data;
}

// ---------- Stock counts ----------

export interface StockCountLine {
  id?: UUID;
  productId: UUID;
  variantId?: UUID | null;
  systemQty: number;
  countedQty: number;
  difference?: number;
}

export interface StockCount {
  id: UUID;
  ref: string;
  warehouseId: UUID;
  status: 'OPEN' | 'POSTED' | 'CANCELLED';
  notes?: string | null;
  startedAt: string;
  postedAt?: string | null;
  lines: StockCountLine[];
}

export interface StockCountListItem {
  id: UUID;
  ref: string;
  warehouseId: UUID;
  warehouseName: string;
  status: string;
  date: string;
}

export async function listStockCounts(params: {
  search?: string; page?: number; size?: number;
} = {}): Promise<Page<StockCountListItem>> {
  const { data } = await api.get<Page<StockCountListItem>>('/api/v1/stock-counts', { params });
  return data;
}

export async function getStockCount(id: UUID): Promise<StockCount> {
  const { data } = await api.get<StockCount>(`/api/v1/stock-counts/${id}`);
  return data;
}

export async function openStockCount(body: { warehouseId: UUID; notes?: string }): Promise<StockCount> {
  const { data } = await api.post<StockCount>('/api/v1/stock-counts', body);
  return data;
}

export async function submitStockCountLines(
  id: UUID,
  lines: { productId: UUID; variantId?: UUID; countedQty: number }[],
): Promise<StockCount> {
  const { data } = await api.post<StockCount>(`/api/v1/stock-counts/${id}/lines`, { lines });
  return data;
}

export async function postStockCount(id: UUID): Promise<StockCount> {
  const { data } = await api.post<StockCount>(`/api/v1/stock-counts/${id}/post`);
  return data;
}

// ---------- Stock summary (dashboard) ----------

export interface WarehouseSummary {
  distinctProducts: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  lowStockLines: number;
}

export async function getStockSummary(warehouseId?: UUID): Promise<WarehouseSummary> {
  const { data } = await api.get<WarehouseSummary>('/api/v1/stock/summary', {
    params: { warehouseId },
  });
  return data;
}
