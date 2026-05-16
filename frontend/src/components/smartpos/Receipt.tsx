/**
 * Receipt renderer for Letis POS.
 *
 * Supports polished thermal receipts (58/80/88mm) and A4 receipts from the
 * same sale payload. The thermal mode keeps the legacy Stocky receipt rhythm:
 * bold meta lines, dotted separators, payment table, thank-you footer, and a
 * reference barcode block.
 */
import { createRoot } from 'react-dom/client';
import { Dialog, DialogContent, IconButton, Box, Button, Typography, Stack } from '@mui/material';
import { IconPrinter, IconX } from '@tabler/icons-react';
import type { Sale, SaleLine } from 'src/api/smartpos/sales';
import type { UUID } from 'src/api/smartpos/types';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export type ReceiptLayout = 'standard' | 'compact' | 'detailed';
export type ReceiptPaper = '58mm' | '80mm' | '88mm' | 'a4';

/**
 * Resolved names supplied by the caller. The Sale payload carries only IDs,
 * so without these the receipt would show UUIDs for the seller / customer /
 * warehouse / product. Anything missing falls back to a sensible default.
 */
export interface ReceiptLookups {
  sellerName?: string;
  customerName?: string;
  warehouseName?: string;
  productNames?: Record<UUID, string>;
  /** Previous balance before this credit sale */
  previousBalance?: number;
  /** New balance after this credit sale */
  newBalance?: number;
}

export interface ReceiptConfig {
  layout: ReceiptLayout;
  paperSize: ReceiptPaper;
  autoPrint: boolean;
  showLogo: boolean;
  logoSize: number;
  showStoreName: boolean;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  showStoreEmail: boolean;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  storeTaxId: string;
  showRef: boolean;
  showDate: boolean;
  showSeller: boolean;
  showCustomer: boolean;
  showWarehouse: boolean;
  showBarcode: boolean;
  showTax: boolean;
  showDiscount: boolean;
  showShipping: boolean;
  showNote: boolean;
  showPaid: boolean;
  showDue: boolean;
  showPayments: boolean;
  showFooter: boolean;
  footerMessage: string;
}

export type PrintReceiptOptions = Partial<ReceiptConfig> & {
  paymentMethod?: string;
  lookups?: ReceiptLookups;
};

const DEFAULTS: ReceiptConfig = {
  layout: 'standard',
  paperSize: '80mm',
  autoPrint: true,
  showLogo: true,
  logoSize: 64,
  showStoreName: true,
  showStoreAddress: true,
  showStorePhone: true,
  showStoreEmail: true,
  storeName: 'Letis POS',
  storeAddress: '',
  storePhone: '',
  storeEmail: '',
  storeTaxId: '',
  showRef: true,
  showDate: true,
  showSeller: true,
  showCustomer: true,
  showWarehouse: true,
  showBarcode: true,
  showTax: true,
  showDiscount: true,
  showShipping: true,
  showNote: false,
  showPaid: true,
  showDue: true,
  showPayments: true,
  showFooter: true,
  footerMessage: 'Thank You For Shopping With Us. Please Come Again',
};

export function getReceiptConfig(): ReceiptConfig {
  try {
    const raw = localStorage.getItem('smartpos.pos.receiptConfig');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export function saveReceiptConfig(config: ReceiptConfig) {
  localStorage.setItem('smartpos.pos.receiptConfig', JSON.stringify(config));
}

const paperWidthMap: Record<Exclude<ReceiptPaper, 'a4'>, string> = {
  '58mm': '58mm',
  '80mm': '80mm',
  '88mm': '88mm',
};

const paperPadMap: Record<Exclude<ReceiptPaper, 'a4'>, string> = {
  '58mm': '3mm',
  '80mm': '7mm',
  '88mm': '8mm',
};

function cleanRef(ref: string) {
  return ref || 'SALE';
}

function dateTime(sale: Sale) {
  return new Date(sale.confirmedAt || sale.date || sale.createdAt).toLocaleString();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeUuid = (s: unknown): boolean => typeof s === 'string' && UUID_RE.test(s);

/** Prefer the looked-up name, ignore raw UUIDs, fall back to the supplied default. */
function nameOr(lookup: string | undefined, fallback: string): string {
  if (lookup && lookup.trim() && !looksLikeUuid(lookup)) return lookup;
  return fallback;
}

/** Resolve a product display name from the line, then the lookup map, then a generic fallback. */
function productLabel(line: SaleLine, lookups?: ReceiptLookups): string {
  if (line.productName && !looksLikeUuid(line.productName)) return line.productName;
  const fromMap = lookups?.productNames?.[line.productId];
  if (fromMap && !looksLikeUuid(fromMap)) return fromMap;
  return 'Item';
}

function money(value: number, currency: string, withCode = false) {
  if (withCode) {
    return `${currency} ${Number(value || 0).toLocaleString('en-TZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return fmt(value, currency);
}

function paymentName(method?: string) {
  if (!method) return 'Cash';
  return method
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ReceiptBody({
  sale,
  config,
  paymentMethod,
  lookups,
  preview = false,
}: {
  sale: Sale;
  config: ReceiptConfig;
  paymentMethod?: string;
  lookups?: ReceiptLookups;
  preview?: boolean;
}) {
  const isA4 = config.paperSize === 'a4';
  const className = `${isA4 ? 'receipt-a4' : 'receipt-thermal'} smartpos-receipt${preview ? ' force-show receipt-preview' : ''}`;
  return (
    <div className={className}>
      <ReceiptStyles config={config} />
      {isA4 ? (
        <A4Receipt sale={sale} config={config} paymentMethod={paymentMethod} lookups={lookups} />
      ) : (
        <ThermalReceipt
          sale={sale}
          config={config}
          paymentMethod={paymentMethod}
          lookups={lookups}
        />
      )}
    </div>
  );
}

function ReceiptStyles({ config }: { config: ReceiptConfig }) {
  const isA4 = config.paperSize === 'a4';
  const compact = config.layout === 'compact';
  const thermalPaper = config.paperSize === 'a4' ? '80mm' : config.paperSize;
  const paperWidth = isA4 ? '210mm' : paperWidthMap[thermalPaper];
  const paperPad = isA4 ? '0' : paperPadMap[thermalPaper];
  const logoSize = Math.min(config.logoSize, 80);

  return (
    <style>{`
      @media print {
        @page { size: ${isA4 ? 'A4' : `${paperWidth} auto`}; margin: ${isA4 ? '12mm' : '0'}; }
        body * { visibility: hidden !important; }
        [data-smartpos-receipt-print], [data-smartpos-receipt-print] * { visibility: visible !important; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        [data-smartpos-receipt-print] .smartpos-receipt { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: ${paperWidth}; padding: ${paperPad}; background: #fff; color: #05070b; box-shadow: none !important; box-sizing: border-box; }
        [data-smartpos-receipt-print] .receipt-a4 { width: 186mm; }
      }
      @media screen { .smartpos-receipt { display: none; } }
      .smartpos-receipt.force-show { display: block; margin: 0 auto; }
      .smartpos-receipt.receipt-preview.receipt-thermal { width: min(100%, 390px); padding: 28px 30px; font-size: 14px; line-height: 21px; }
      .smartpos-receipt.receipt-preview.receipt-thermal .store-name { font-size: 22px; }
      .smartpos-receipt.receipt-preview.receipt-thermal .meta { font-size: 14px; line-height: 21px; }
      .smartpos-receipt.receipt-preview.receipt-thermal .item-name { font-size: 14px; }
      .smartpos-receipt.receipt-preview.receipt-thermal .item-qty { font-size: 13px; }
      .smartpos-receipt.receipt-preview.receipt-thermal .items .td-total,
      .smartpos-receipt.receipt-preview.receipt-thermal .totals .grand td,
      .smartpos-receipt.receipt-preview.receipt-thermal .payment-table { font-size: 14px; }
      .smartpos-receipt.receipt-preview.receipt-thermal .footer-message { font-size: 15px; }
      .smartpos-receipt.receipt-preview.receipt-a4 { width: min(100%, 760px); }

      /* ──────────────────────────────────────────────────────────────────
       * Receipt design — matches legacy pos_master style
       * Typography: Ubuntu, 12px/18px
       * Dividers: 2px dotted #05070b (heavy, dark — same as legacy CSS)
       * Items: 2-column (name+qty left, total right) — same as legacy pos.vue
       * ────────────────────────────────────────────────────────────────── */
      .smartpos-receipt {
        font-family: Ubuntu, 'Helvetica Neue', Arial, sans-serif;
        font-size: 12px; line-height: 18px;
        color: #05070b; background: #fff;
        font-feature-settings: 'tnum' 1, 'kern' 1;
        font-variant-numeric: tabular-nums;
        box-sizing: border-box;
      }
      .smartpos-receipt *, .smartpos-receipt *::before, .smartpos-receipt *::after { box-sizing: inherit; }

      .receipt-thermal { width: ${paperWidth}; padding: ${paperPad}; margin: 0 auto; }

      /* Logo block — centered */
      .brand-mark { display: flex; justify-content: center; align-items: center; margin: 0 auto 10px; }
      .brand-mark svg { width: ${logoSize}px; height: ${logoSize}px; }

      /* Centered info block — store name + meta */
      .info { text-align: center; margin-bottom: 10px; }
      .store-name { font-size: ${compact ? 16 : 18}px; font-weight: 900; margin: 0 0 6px; line-height: 1.2; color: #05070b; }
      .meta { font-size: 11px; line-height: 16px; font-weight: 650; }
      .meta div { margin: 0; }
      .meta-label { font-weight: 700; }

      /* Section divider — heavy dotted, legacy style */
      .section-divider { border: none; border-top: 2px dotted #05070b; margin: 6px 0; }

      /* Items table — 2-column: name+qty left, total right (matches pos.vue)
         FIX: borders on td (not tr) — tr borders are ignored by many PDF engines */
      .items { width: 100%; border-collapse: collapse; }
      .items td { padding: 6px 2px; vertical-align: bottom; border-bottom: 2px dotted #05070b; }
      .items .td-info { text-align: left; width: 75%; }
      .items .td-total { text-align: right; white-space: nowrap; font-weight: 700; font-size: 12px; width: 25%; }
      .item-name { font-weight: 700; font-size: 12px; line-height: 1.3; color: #05070b; }
      .item-qty { font-size: 11px; color: #05070b; margin-top: 1px; }

      /* Totals — dotted rows on td (not tr), no background tint on grand total */
      .totals { width: 100%; border-collapse: collapse; margin-top: 0; table-layout: fixed; }
      .totals td { padding: 5px 2px; border-bottom: 2px dotted #05070b; }
      .totals tr:first-child td { border-top: none; }
      .totals .label { font-weight: 700; text-align: left; width: 70%; }
      .totals .value { text-align: right; font-weight: 700; width: 30%; }
      .totals .grand td { font-size: 13px; font-weight: 900; color: #05070b; }

      /* Payment table — #EEE header (matches legacy) */
      .payment-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
      .payment-table th { background: #EEE; padding: 5px 4px; font-weight: 700; text-align: left; border-bottom: 2px dotted #05070b; border-top: 2px dotted #05070b; }
      .payment-table th.center { text-align: center; }
      .payment-table th.right { text-align: right; }
      .payment-table td { padding: 5px 4px; border-bottom: 2px dotted #05070b; }
      .payment-table td.center { text-align: center; }
      .payment-table td.right { text-align: right; font-weight: 700; }

      /* Footer + barcode */
      .footer-message { margin: 14px 0 8px; text-align: center; font-weight: 700; line-height: 1.45; font-size: 12px; color: #05070b; page-break-inside: avoid; break-inside: avoid; }
      .barcode-wrap { margin: 6px auto 2px; text-align: center; page-break-inside: avoid; break-inside: avoid; }
      .barcode { height: 50px; width: 75%; max-width: 220px; margin: 0 auto 4px;
        background-image: repeating-linear-gradient(90deg, #05070b 0 1.5px, transparent 1.5px 3px, #05070b 3px 4.5px, transparent 4.5px 6.5px, #05070b 6.5px 8.5px, transparent 8.5px 10px, #05070b 10px 12px, transparent 12px 13.5px);
        background-color: #fff;
      }
      .barcode-text { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; font-feature-settings: 'tnum' 1; }

      .row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
      .right { text-align: right; }
      .center { text-align: center; }
      .bold { font-weight: 900; }
      .preserve-case { text-transform: none; }

      /* ── A4 — clean professional layout with multi-page handling ── */
      .receipt-a4 { font-size: 12px; color: #05070b; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
      @media print {
        .receipt-a4 { border: none; border-radius: 0; }
        .a4-table thead { display: table-header-group; }   /* repeat header on every page */
        .a4-table tfoot { display: table-row-group; }
        .a4-table tr   { page-break-inside: avoid; break-inside: avoid; }
        .a4-summary,
        .a4-footer     { page-break-inside: avoid; break-inside: avoid; }
        .a4-top        { page-break-after: avoid; }
      }
      .a4-top { display: flex; justify-content: space-between; gap: 24px; padding: 26px 30px; background: linear-gradient(135deg, #ecfdf5 0%, #ffffff 52%, #eff6ff 100%); border-bottom: 1px solid #dbeafe; }
      .a4-title { font-size: 30px; font-weight: 900; letter-spacing: -0.03em; margin: 0; }
      .a4-subtitle { margin: 5px 0 0; color: #64748b; font-weight: 700; }
      .a4-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px 30px 0; }
      .a4-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; background: #fff; }
      .a4-label { color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; }
      .a4-table { width: calc(100% - 60px); margin: 18px 30px 0; border-collapse: collapse; }
      .a4-table th { text-align: left; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding: 10px 8px; }
      .a4-table td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      .a4-summary { margin: 18px 30px 0 auto; width: 310px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
      .a4-summary .row { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; }
      .a4-summary .grand { background: #0f9f60; color: #fff; font-size: 16px; }
      .a4-footer { margin: 22px 30px 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; }
    `}</style>
  );
}

/** Inline Letis logo for receipts — printable, no external image fetch needed. */
function ReceiptLogo() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Letis POS" style={{ display: 'block' }}>
      <defs>
        <linearGradient
          id="letis-receipt-grad"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0F9F60" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#letis-receipt-grad)" />
      <path d="M21 16 L21 40 L40 40 L46 34 L41 33 L31 33 L31 16 Z" fill="#fff" opacity="0.97" />
      <path d="M40 40 L51 29 L46 24 L46 34 L40 34 Z" fill="#fff" opacity="0.6" />
      <rect x="41" y="11" width="14" height="10" rx="3" fill="#BBF7D0" opacity="0.95" />
    </svg>
  );
}

function lineUnit(line: SaleLine): string {
  const value = (line as SaleLine & { unitName?: string; unitCode?: string; unit?: string }).unitName
    || (line as SaleLine & { unitName?: string; unitCode?: string; unit?: string }).unitCode
    || (line as SaleLine & { unitName?: string; unitCode?: string; unit?: string }).unit;
  return value || 'Pc';
}

function ThermalReceipt({
  sale,
  config,
  paymentMethod,
  lookups,
}: {
  sale: Sale;
  config: ReceiptConfig;
  paymentMethod?: string;
  lookups?: ReceiptLookups;
}) {
  const paidDisplay = sale.paidTotal || sale.grandTotal;
  const change = Math.max(0, paidDisplay - sale.grandTotal);
  // Summary rows in the original sample carry the currency code.
  const fmtSummary = (v: number) => money(v, sale.currency, true);
  return (
    <>
      {config.showLogo && (
        <div className="brand-mark">
          <ReceiptLogo />
        </div>
      )}
      <div className="info">
        {config.showStoreName && (
          <div className="store-name">{config.storeName || 'Letis POS'}</div>
        )}
        <div className="meta">
          {config.showRef && (
            <div>
              <span className="meta-label">Reference</span> :{' '}
              <span className="meta-value">{cleanRef(sale.ref)}</span>
            </div>
          )}
          {config.showDate && (
            <div>
              <span className="meta-label">Date</span> :{' '}
              <span className="meta-value">{dateTime(sale)}</span>
            </div>
          )}
          {config.showSeller && (
            <div>
              <span className="meta-label">Seller</span> : {nameOr(lookups?.sellerName, 'Cashier')}
            </div>
          )}
          {config.showStoreAddress && config.storeAddress && (
            <div>
              <span className="meta-label">Address</span> : {config.storeAddress}
            </div>
          )}
          {config.showStoreEmail && config.storeEmail && (
            <div>
              <span className="meta-label">Email</span> :{' '}
              <span className="meta-value">{config.storeEmail}</span>
            </div>
          )}
          {config.showStorePhone && config.storePhone && (
            <div>
              <span className="meta-label">Phone</span> :{' '}
              <span className="meta-value">{config.storePhone}</span>
            </div>
          )}
          {config.showCustomer && (
            <div>
              <span className="meta-label">Customer</span> :{' '}
              {nameOr(lookups?.customerName, 'Walk-In-Customer')}
            </div>
          )}
          {config.showWarehouse && (
            <div>
              <span className="meta-label">Warehouse</span> :{' '}
              {nameOr(lookups?.warehouseName, 'Warehouse 1')}
            </div>
          )}
          {config.storeTaxId && (
            <div>
              <span className="meta-label">TIN</span> :{' '}
              <span className="meta-value">{config.storeTaxId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items — 2-column layout: name+qty left, total right (matches legacy pos.vue) */}
      <table className="items">
        <tbody>
          {sale.lines.map((line) => (
            <tr key={line.id}>
              {/* Left: name on line 1, qty×price on line 2 — exactly like legacy pos.vue */}
              <td className="td-info">
                <div className="item-name">{productLabel(line, lookups)}</div>
                <div className="item-qty">
                  {Number(line.qty).toFixed(2)} {lineUnit(line)} X{' '}
                  {Number(line.unitPrice || 0).toLocaleString('en', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </td>
              {/* Right: line total, right-aligned, bottom-aligned */}
              <td className="td-total">
                {Number(line.lineTotal || 0).toLocaleString('en', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="totals">
        <tbody>
          <tr>
            <td className="label">Subtotal</td>
            <td className="value">{fmtSummary(sale.subtotal)}</td>
          </tr>
          {config.showTax && (
            <tr>
              <td className="label">Order Tax</td>
              <td className="value">
                {fmtSummary(sale.taxTotal)} ({Number(sale.taxRate || 0).toFixed(2)} %)
              </td>
            </tr>
          )}
          {config.showDiscount && (
            <tr>
              <td className="label">Discount</td>
              <td className="value">{fmtSummary(sale.discountTotal)}</td>
            </tr>
          )}
          {config.showShipping && (
            <tr>
              <td className="label">Shipping</td>
              <td className="value">{fmtSummary(sale.shipping)}</td>
            </tr>
          )}
          <tr className="grand">
            <td className="label">Total</td>
            <td className="value">{fmtSummary(sale.grandTotal)}</td>
          </tr>
          {config.showPaid && (
            <tr>
              <td className="label">Paid</td>
              <td className="value">{fmtSummary(paidDisplay)}</td>
            </tr>
          )}
          {config.showDue && (
            <tr>
              <td className="label">Due</td>
              <td className="value">{fmtSummary(sale.dueTotal)}</td>
            </tr>
          )}
          {lookups?.newBalance !== undefined && (
            <>
              <tr>
                <td className="label" style={{ color: '#B45309' }}>Previous Balance</td>
                <td className="value" style={{ color: '#B45309' }}>
                  {Number(lookups.previousBalance || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="label" style={{ fontWeight: 900, color: '#B91C1C' }}>NEW BALANCE</td>
                <td className="value" style={{ fontWeight: 900, color: '#B91C1C' }}>
                  {Number(lookups.newBalance || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {config.showPayments && paidDisplay > 0 && (
        <table className="payment-table">
          <thead>
            <tr>
              <th>Paid By:</th>
              <th className="center" colSpan={2}>
                Amount:
              </th>
              <th className="right">Change:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{paymentName(paymentMethod)}</td>
              <td className="center" colSpan={2}>
                {Number(paidDisplay).toLocaleString('en', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="right">
                {change.toLocaleString('en', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {config.showNote && sale.notes && (
        <div className="footer-message preserve-case">{sale.notes}</div>
      )}
      {config.showFooter && <ThermalFooter message={config.footerMessage} />}
      {config.showBarcode && (
        <div className="barcode-wrap">
          <div className="barcode" />
          <div className="barcode-text">{cleanRef(sale.ref)}</div>
        </div>
      )}
    </>
  );
}

function ThermalFooter({ message }: { message: string }) {
  const text = message || 'Thank You For Shopping With Us. Please Come Again';
  const parts = text.includes('.')
    ? text
        .split('.')
        .map((part) => part.trim())
        .filter(Boolean)
    : [text];
  return (
    <div className="footer-message">
      {parts.map((part) => (
        <div key={part}>
          {part}
          {part.toLowerCase().includes('thank') ? '.' : ''}
        </div>
      ))}
    </div>
  );
}

function A4Receipt({
  sale,
  config,
  paymentMethod,
  lookups,
}: {
  sale: Sale;
  config: ReceiptConfig;
  paymentMethod?: string;
  lookups?: ReceiptLookups;
}) {
  const paidDisplay = sale.paidTotal || sale.grandTotal;
  const change = Math.max(0, paidDisplay - sale.grandTotal);
  const customerName = nameOr(lookups?.customerName, 'Walk-In-Customer');
  const warehouseName = nameOr(lookups?.warehouseName, 'Warehouse 1');
  const sellerName = nameOr(lookups?.sellerName, 'Cashier');
  return (
    <>
      <div className="a4-top">
        <div
          className="row"
          style={{ alignItems: 'center', justifyContent: 'flex-start', gap: 14 }}
        >
          {config.showLogo && (
            <div style={{ width: 56, height: 56, flexShrink: 0 }}>
              <ReceiptLogo />
            </div>
          )}
          <div>
            <h1 className="a4-title">{config.storeName || 'Letis POS'}</h1>
            <p className="a4-subtitle preserve-case">Printable sales receipt and tax invoice</p>
          </div>
        </div>
        <div className="right">
          <div className="a4-label">Receipt</div>
          <div className="bold preserve-case" style={{ fontSize: 22 }}>
            {cleanRef(sale.ref)}
          </div>
          <div style={{ marginTop: 4, color: '#64748b' }}>{dateTime(sale)}</div>
        </div>
      </div>
      <div className="a4-card-grid">
        <div className="a4-card">
          <div className="a4-label">From</div>
          <div className="bold" style={{ marginTop: 6 }}>
            {config.storeName || 'Letis POS'}
          </div>
          {config.storeAddress && <div>{config.storeAddress}</div>}
          {config.storeEmail && <div>{config.storeEmail}</div>}
          {config.storePhone && <div>{config.storePhone}</div>}
          {config.storeTaxId && <div>TIN: {config.storeTaxId}</div>}
        </div>
        <div className="a4-card">
          <div className="a4-label">Customer</div>
          <div className="bold" style={{ marginTop: 6 }}>
            {customerName}
          </div>
          <div>Warehouse: {warehouseName}</div>
          <div>Seller: {sellerName}</div>
          <div>Payment: {paymentName(paymentMethod)}</div>
        </div>
      </div>
      <table className="a4-table">
        <thead>
          <tr>
            <th style={{ width: '44%' }}>Product</th>
            <th className="right">Qty</th>
            <th className="right">Unit Price</th>
            {config.showDiscount && <th className="right">Discount</th>}
            {config.showTax && <th className="right">Tax</th>}
            <th className="right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((line) => (
            <tr key={line.id}>
              <td>
                <div className="bold">{productLabel(line, lookups)}</div>
                {line.productCode && (
                  <div style={{ color: '#64748b', marginTop: 3 }}>{line.productCode}</div>
                )}
              </td>
              <td className="right">{line.qty}</td>
              <td className="right">{fmt(line.unitPrice, sale.currency)}</td>
              {config.showDiscount && (
                <td className="right">{fmt(line.discount, sale.currency)}</td>
              )}
              {config.showTax && <td className="right">{line.taxRate}%</td>}
              <td className="right bold">{fmt(line.lineTotal, sale.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="a4-summary">
        <div className="row">
          <span>Subtotal</span>
          <span>{fmt(sale.subtotal, sale.currency)}</span>
        </div>
        {config.showTax && (
          <div className="row">
            <span>Order Tax</span>
            <span>{fmt(sale.taxTotal, sale.currency)}</span>
          </div>
        )}
        {config.showDiscount && (
          <div className="row">
            <span>Discount</span>
            <span>{fmt(sale.discountTotal, sale.currency)}</span>
          </div>
        )}
        {config.showShipping && (
          <div className="row">
            <span>Shipping</span>
            <span>{fmt(sale.shipping, sale.currency)}</span>
          </div>
        )}
        <div className="row grand bold">
          <span>Total</span>
          <span>{fmt(sale.grandTotal, sale.currency)}</span>
        </div>
        {config.showPaid && (
          <div className="row">
            <span>Paid</span>
            <span>{fmt(paidDisplay, sale.currency)}</span>
          </div>
        )}
        {config.showDue && (
          <div className="row">
            <span>Due</span>
            <span>{fmt(sale.dueTotal, sale.currency)}</span>
          </div>
        )}
        {lookups?.newBalance !== undefined && (
          <>
            <div className="row">
              <span style={{ color: '#B45309' }}>Previous Balance</span>
              <span style={{ color: '#B45309' }}>{Number(lookups.previousBalance || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="row grand bold" style={{ background: '#FEF3C7', color: '#B91C1C' }}>
              <span>NEW BALANCE</span>
              <span>{Number(lookups.newBalance || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
        {config.showPayments && (
          <div className="row">
            <span>Change</span>
            <span>{fmt(change, sale.currency)}</span>
          </div>
        )}
      </div>
      <div className="a4-footer">
        {config.showFooter && (
          <div>
            <div className="bold">Thank you</div>
            <div style={{ color: '#64748b', maxWidth: 360 }}>{config.footerMessage}</div>
          </div>
        )}
        {config.showBarcode && (
          <div className="barcode-wrap" style={{ margin: 0 }}>
            <div className="barcode" />
            <div className="bold">{cleanRef(sale.ref)}</div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Preview modal component — renders the receipt inside a MUI Dialog
 * exactly as it will appear when printed.
 */
export function ReceiptPreviewModal({
  open,
  onClose,
  sale,
  paymentMethod,
  lookups,
}: {
  open: boolean;
  onClose: () => void;
  sale: Sale;
  paymentMethod?: string;
  lookups?: ReceiptLookups;
}) {
  const config = getReceiptConfig();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          maxWidth: config.paperSize === 'a4' ? 900 : 560,
          width: config.paperSize === 'a4' ? 'min(94vw, 900px)' : 'min(94vw, 560px)',
          bgcolor: '#fff',
          borderRadius: '14px',
          overflow: 'hidden',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          bgcolor: '#fff',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A' }}>Invoice POS</Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
              Preview before printing
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            variant="contained"
            startIcon={<IconPrinter size={16} />}
            onClick={() => printReceipt(sale, { paymentMethod, lookups })}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
          >
            Print
          </Button>
          <IconButton size="small" onClick={onClose}>
            <IconX size={18} />
          </IconButton>
        </Stack>
      </Box>

      {/* Receipt — rendered for screen (bypasses display:none) */}
      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF6F2 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            py: 0.5,
          }}
        >
          <Box
            sx={{
              width: config.paperSize === 'a4' ? 'min(100%, 780px)' : 'min(100%, 430px)',
              bgcolor: '#fff',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.14)',
              border: '1px solid #E2E8F0',
              borderRadius: config.paperSize === 'a4' ? '12px' : '4px',
              overflow: 'hidden',
            }}
          >
            <ReceiptBody
              sale={sale}
              config={config}
              paymentMethod={paymentMethod}
              lookups={lookups}
              preview
            />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export function printReceipt(sale: Sale, options: PrintReceiptOptions = {}) {
  if (typeof window === 'undefined') return;
  const { paymentMethod, lookups, ...configOverrides } = options;
  const config = { ...getReceiptConfig(), ...configOverrides };
  const host = document.createElement('div');
  host.setAttribute('data-smartpos-receipt-print', 'true');
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <ReceiptBody sale={sale} config={config} paymentMethod={paymentMethod} lookups={lookups} />,
  );
  // 500ms: enough for React to paint + fonts to load before the print dialog opens.
  // Unmount after print dialog closes (1 second grace).
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 1000);
  }, 500);
}

/**
 * Opens the receipt preview modal imperatively (standalone usage).
 * For declarative use, render <ReceiptPreviewModal> directly.
 */
export function previewReceipt(sale: Sale, options: PrintReceiptOptions = {}) {
  if (typeof window === 'undefined') return;
  const { paymentMethod, lookups } = options;

  const host = document.createElement('div');
  host.setAttribute('data-smartpos-receipt-preview', 'true');
  document.body.appendChild(host);
  const root = createRoot(host);

  const cleanup = () => {
    root.unmount();
    host.remove();
  };

  root.render(
    <ReceiptPreviewModal
      open={true}
      onClose={cleanup}
      sale={sale}
      paymentMethod={paymentMethod}
      lookups={lookups}
    />,
  );
}

export default ReceiptBody;
