/**
 * Shared props interface for ALL POS layout variants.
 *
 * Every layout (Modern, Classic, Compact, Sidebar, Modal) must accept
 * this interface. The terminal page owns all state and passes it down.
 */
import type { Product } from 'src/api/smartpos/products';
import type { Customer } from 'src/api/smartpos/types';
import type { Warehouse, StockLevel } from 'src/api/smartpos/inventory';
import type { PosTerminal } from 'src/api/smartpos/posTerminals';
import type { Sale } from 'src/api/smartpos/sales';
import type { CashRegisterSession } from 'src/api/smartpos/cashRegister';
import type { Line } from './types';

export type PaymentChoice = 'CASH' | 'CARD' | 'MOBILE' | 'BANK' | 'USSD' | 'SPLIT';
export type DiscountType = 'FIXED' | 'PERCENT';
export type LayoutTab = 'all' | 'featured' | 'recent' | 'low' | 'bestsellers';

export interface PosTotals {
  subtotal: number;
  tax: number;
  discount: number;
  grand: number;
  tenderedNum: number;
  change: number;
}

export interface PosBanner {
  kind: 'success' | 'error';
  text: string;
}

export interface PosLayoutProps {
  // ── Warehouse ──
  warehouses: Warehouse[];
  warehouseId: string;
  onWarehouseChange: (id: string) => void;

  // ── Products ──
  products: Product[];
  productsLoading: boolean;
  stockMap: Record<string, StockLevel>;
  stockLoading: boolean;
  onAddProduct: (p: Product) => void;
  onPatchLine?: (index: number, patch: Partial<Line>) => void;

  // ── Search & barcode ──
  search: string;
  onSearchChange: (value: string) => void;
  barcode: string;
  onBarcodeChange: (value: string) => void;
  onBarcodeScan: () => void;
  barcodeRef: React.RefObject<HTMLInputElement | null>;

  // ── Customer ──
  customers: Customer[];
  customerId: string | null;
  onCustomerChange: (id: string | null) => void;
  onCustomerCreated?: (customer: Customer) => void;

  // ── Terminals ──
  terminals: PosTerminal[];
  linkedTerminalId: string;
  onLinkedTerminalChange: (id: string) => void;

  // ── Cart ──
  lines: Line[];
  onIncQty: (i: number) => void;
  onDecQty: (i: number) => void;
  onRemoveLine: (i: number) => void;
  onClearCart: () => void;

  // ── Payment ──
  paymentMethod: PaymentChoice;
  onPaymentMethodChange: (m: PaymentChoice) => void;
  tendered: string;
  onTenderedChange: (v: string) => void;
  discount: number;
  discountType: DiscountType;
  onDiscountChange: (v: number) => void;
  onDiscountTypeChange: (t: DiscountType) => void;
  totals: PosTotals;

  // ── Filters & product tabs ──
  categoryId: string;
  brandId: string;
  onCategoryChange: (id: string) => void;
  onBrandChange: (id: string) => void;
  activeTab: LayoutTab;
  onTabChange: (tab: LayoutTab) => void;

  // ── Status ──
  banner: PosBanner | null;
  onBannerClose: () => void;
  lastSale: Sale | null;
  onReprint: (sale: Sale) => void;
  onCheckout: () => void;
  submitting: boolean;
  canCheckout: boolean;
  online: boolean;
  queueSize: number;

  // ── Drafts / holds ──
  onHoldCart?: () => void;
  onOpenHeldCarts?: () => void;
  onTodaySales?: () => void;
  onNotify?: (message: string) => void;

  // ── Cash register (Phase 4) ──
  registerSession?: CashRegisterSession | null;
  registerLoading?: boolean;
  onOpenRegister?: () => void;
  onCloseRegister?: () => void;
}
