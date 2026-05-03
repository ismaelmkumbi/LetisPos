export type Line = {
  productId: string;
  variantId?: string;
  productName: string;
  productCode?: string;
  unitPrice: number;
  /** List / retail price when line was added (for tier selector). */
  basePrice?: number;
  /** Product unit cost when line was added (wholesale tier). */
  unitCost?: number;
  /** UI price tier — affects unitPrice when changed. */
  priceTier?: 'retail' | 'wholesale' | 'member';
  qty: number;
  taxRate: number;
  /** Per-line discount amount (fixed or percent). */
  discount?: number;
  /** Per-line discount type. */
  discountType?: 'FIXED' | 'PERCENT';
  /** IMEI or serial number for tracked products. */
  imei?: string;
};
