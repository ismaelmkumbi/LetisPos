/**
 * POS Settings API — receipt layout, tax defaults, currency, store info.
 * Backed by /api/v1/pos-settings (sales-service).
 */
import { api } from './client';
import type { UUID } from './types';

export interface PosSettings {
  id: UUID;
  warehouseId: UUID;

  // Receipt layout
  receiptLayout: number;
  receiptPaperSize: number;

  // Receipt display toggles
  showLogo: boolean;
  logoSize: number;
  showStoreName: boolean;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  showStoreEmail: boolean;
  showReference: boolean;
  showDate: boolean;
  showSeller: boolean;
  showCustomer: boolean;
  showWarehouse: boolean;
  showTax: boolean;
  showDiscount: boolean;
  showShipping: boolean;
  showBarcode: boolean;
  showNote: boolean;
  showPaid: boolean;
  showDue: boolean;
  showPayments: boolean;
  showFooter: boolean;

  // Store info
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  storeTaxId: string;
  footerMessage: string;

  // Printing
  autoPrint: boolean;

  // POS behaviour
  productsPerPage: number;

  // Tax defaults
  defaultTaxRate: number;
  defaultTaxMethod: 'EXCLUSIVE' | 'INCLUSIVE';

  // Currency
  currencyCode: string;
  currencySymbol: string;

  createdAt: string;
  updatedAt: string;
}

export type PosSettingsUpdate = Partial<
  Omit<PosSettings, 'id' | 'warehouseId' | 'createdAt' | 'updatedAt'>
>;

export async function getPosSettings(warehouseId: UUID): Promise<PosSettings> {
  const { data } = await api.get<PosSettings>('/api/v1/pos-settings', {
    params: { warehouseId },
  });
  return data;
}

export async function updatePosSettings(
  warehouseId: UUID,
  body: PosSettingsUpdate,
): Promise<PosSettings> {
  const { data } = await api.put<PosSettings>('/api/v1/pos-settings', body, {
    params: { warehouseId },
  });
  return data;
}
