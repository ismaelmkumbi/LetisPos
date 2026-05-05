/**
 * POS Settings API — receipt layout, tax defaults, currency, store info,
 * loyalty programme, discount rules, locale, notifications, and more.
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

  // Store branding
  logoUrl: string;
  storeWebsite: string;

  // Printing
  autoPrint: boolean;

  // POS behaviour
  productsPerPage: number;
  allowNegativeStock: boolean;
  requireCustomerOnSale: boolean;
  requireNoteOnSale: boolean;
  lowStockThreshold: number;
  enableSound: boolean;
  kioskIdleTimeoutSec: number;

  // Sale reference numbering
  saleRefPrefix: string;
  saleRefPadding: number;

  // Tax defaults
  defaultTaxRate: number;
  defaultTaxMethod: 'EXCLUSIVE' | 'INCLUSIVE';

  // Discount & approval rules
  maxDiscountPercent: number;
  requirePinForDiscount: boolean;
  managerApprovalAbove: number | null;

  // Currency
  currencyCode: string;
  currencySymbol: string;

  // Locale / regional
  timezone: string;
  dateFormat: string;
  timeFormat: string;

  // Loyalty programme
  enableLoyalty: boolean;
  loyaltyPointsPerUnit: number;
  loyaltyValuePerPoint: number;
  loyaltyMinRedeemPoints: number;

  // Notifications / alerts
  lowStockAlertEnabled: boolean;
  dailySummaryEnabled: boolean;
  alertEmail: string;

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

/** Partial update — only provided fields are applied on the server. */
export async function updatePosSettings(
  warehouseId: UUID,
  body: PosSettingsUpdate,
): Promise<PosSettings> {
  const { data } = await api.patch<PosSettings>('/api/v1/pos-settings', body, {
    params: { warehouseId },
  });
  return data;
}

/** Restore factory defaults for the given warehouse. */
export async function resetPosSettings(warehouseId: UUID): Promise<PosSettings> {
  const { data } = await api.post<PosSettings>(
    '/api/v1/pos-settings/reset',
    null,
    { params: { warehouseId } },
  );
  return data;
}
