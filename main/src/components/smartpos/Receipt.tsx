/**
 * Thermal receipt renderer — 58/80mm thermal printer compatible.
 *
 * Renders a hidden-print-only block that `window.print()` picks up.
 * Use `printReceipt(sale)` to trigger: it injects, prints, and cleans up.
 *
 * CSS rules:
 *  - Screen display: hidden (`display: none`)
 *  - Print display: block, monospace, narrow width
 *  - Header + footer suppressed via a `@page` rule
 */
import { createRoot } from 'react-dom/client';
import type { Sale } from 'src/api/smartpos/sales';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

function ReceiptBody({ sale, storeName }: { sale: Sale; storeName: string }) {
  const date = new Date(sale.date || sale.createdAt);
  return (
    <div className="smartpos-receipt">
      <style>{`
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body * { visibility: hidden; }
          .smartpos-receipt, .smartpos-receipt * { visibility: visible; }
          .smartpos-receipt {
            position: absolute; left: 0; top: 0;
            width: 80mm; padding: 4mm;
            font-family: 'Courier New', monospace;
            font-size: 12px; color: #000; background: #fff;
          }
        }
        .smartpos-receipt { display: none; }
        .smartpos-receipt.force-show { display: block; }
        .smartpos-receipt h1,
        .smartpos-receipt h2,
        .smartpos-receipt p { margin: 0; padding: 0; }
        .smartpos-receipt .row { display: flex; justify-content: space-between; gap: 6px; }
        .smartpos-receipt .center { text-align: center; }
        .smartpos-receipt .dashed { border-top: 1px dashed #000; margin: 6px 0; }
        .smartpos-receipt .bold { font-weight: 700; }
        .smartpos-receipt .lg { font-size: 14px; }
      `}</style>

      <div className="center">
        <h1 className="lg bold">{storeName}</h1>
        <p>Tax receipt</p>
      </div>

      <div className="dashed" />

      <div className="row"><span>Ref</span><span className="bold">{sale.ref}</span></div>
      <div className="row"><span>Date</span><span>{date.toLocaleString()}</span></div>
      {sale.customerId && (
        <div className="row"><span>Customer</span><span>{sale.customerId.slice(0, 8)}</span></div>
      )}

      <div className="dashed" />

      {sale.lines.map((l) => (
        <div key={l.id}>
          <div className="bold">{l.productName}</div>
          <div className="row">
            <span>{l.qty} × {fmt(l.unitPrice, sale.currency)}</span>
            <span>{fmt(l.lineTotal, sale.currency)}</span>
          </div>
        </div>
      ))}

      <div className="dashed" />

      <div className="row"><span>Subtotal</span><span>{fmt(sale.subtotal, sale.currency)}</span></div>
      <div className="row"><span>Tax</span><span>{fmt(sale.taxTotal, sale.currency)}</span></div>
      {sale.discountTotal > 0 && (
        <div className="row"><span>Discount</span><span>-{fmt(sale.discountTotal, sale.currency)}</span></div>
      )}

      <div className="dashed" />

      <div className="row bold lg">
        <span>TOTAL</span>
        <span>{fmt(sale.grandTotal, sale.currency)}</span>
      </div>
      <div className="row"><span>Paid</span><span>{fmt(sale.paidTotal, sale.currency)}</span></div>
      {sale.dueTotal > 0 && (
        <div className="row bold"><span>DUE</span><span>{fmt(sale.dueTotal, sale.currency)}</span></div>
      )}

      <div className="dashed" />

      <div className="center">
        <p>Thank you for your business.</p>
        <p style={{ marginTop: 4 }}>Powered by Stocky</p>
      </div>
    </div>
  );
}

/**
 * Renders the receipt into a detached container, triggers print, then
 * tears down. Safe to call repeatedly; not reentrant — wait for the print
 * dialog to close before calling again.
 */
export function printReceipt(sale: Sale, storeName = 'Stocky') {
  if (typeof window === 'undefined') return;

  const host = document.createElement('div');
  host.setAttribute('data-smartpos-receipt', 'true');
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<ReceiptBody sale={sale} storeName={storeName} />);

  // Give React a tick to mount before we print.
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 500);
  }, 50);
}

export default ReceiptBody;
