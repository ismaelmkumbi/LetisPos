/**
 * Letis POS — Cashier terminal.
 *
 * Supports 4 layout variations: classic, compact, sidebar, modal
 * - Layout preference persists to localStorage
 * - All layouts share same business logic & checkout flow
 * - Responsive: adapts intelligently on mobile
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { listProducts, getProductByBarcode, type Product } from 'src/api/smartpos/products';
import { listCustomers } from 'src/api/smartpos/customers';
import type { Customer } from 'src/api/smartpos/types';
import { listWarehouses, type Warehouse } from 'src/api/smartpos/inventory';
import { posCheckout, type CreateSaleBody, type Sale } from 'src/api/smartpos/sales';
import {
  listTerminals,
  publishDisplayEvent,
  type PosTerminal,
} from 'src/api/smartpos/posTerminals';
import { useOfflineSyncQueue } from 'src/hooks/useOfflineSyncQueue';
import { useOnlineStatus } from 'src/components/smartpos/OfflineBanner';
import { printReceipt } from 'src/components/smartpos/Receipt';
import { formatMoney } from 'src/utils/smartpos/currency';
import ModernLayout from 'src/components/smartpos/PosLayouts/ModernLayout';
import type { Line } from 'src/components/smartpos/PosLayouts/types';
import { playPosAddBeep, playPosErrorSound, playPosSuccessSound } from 'src/utils/smartpos/posBeep';

const LINKED_TERMINAL_KEY = 'smartpos.linkedTerminalId';
const POS_HOLDS_KEY = 'smartpos.pos.cartHolds';

type CartHold = {
  id: string;
  savedAt: string;
  lines: Line[];
  warehouseId: string;
  customerId: string | null;
};
const fmt = formatMoney;

export default function PosTerminalPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [lines, setLines] = useState<Line[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [tendered, setTendered] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [linkedTerminalId, setLinkedTerminalId] = useState<string>(
    () => localStorage.getItem(LINKED_TERMINAL_KEY) ?? '',
  );

  const online = useOnlineStatus();
  const { queueSize, enqueue, flush } = useOfflineSyncQueue(linkedTerminalId);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [holdsTick, setHoldsTick] = useState(0);

  const heldCarts = useMemo((): CartHold[] => {
    try {
      const raw = sessionStorage.getItem(POS_HOLDS_KEY);
      return raw ? (JSON.parse(raw) as CartHold[]) : [];
    } catch {
      return [];
    }
  }, [draftsOpen, holdsTick]);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    setProductsLoading(true);
    Promise.all([
      listWarehouses(),
      listCustomers({ size: 50 }),
      listProducts({ size: 48 }),
      listTerminals(),
    ])
      .then(([w, c, p, tm]) => {
        setWarehouses(w);
        if (w[0]) setWarehouseId(w[0].id);
        setCustomers(c.content);
        setProducts(p.content);
        setTerminals(tm);
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  useEffect(() => {
    if (linkedTerminalId) localStorage.setItem(LINKED_TERMINAL_KEY, linkedTerminalId);
    else localStorage.removeItem(LINKED_TERMINAL_KEY);
  }, [linkedTerminalId]);

  useEffect(() => {
    if (online && linkedTerminalId) flush().catch(() => {});
  }, [online, linkedTerminalId, flush]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length === 0 || search.length >= 2) {
        setProductsLoading(true);
        listProducts({ search, size: 48 })
          .then((p) => setProducts(p.content))
          .catch(() => {})
          .finally(() => setProductsLoading(false));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Cart ops ─────────────────────────────────────────────────────────────

  const scanBarcode = async () => {
    const code = barcode.trim();
    if (!code) return;
    try {
      const p = await getProductByBarcode(code);
      addProduct(p);
      setBarcode('');
      barcodeRef.current?.focus();
    } catch {
      playPosErrorSound();
      setBanner({ kind: 'error', text: `No product matches barcode "${code}"` });
      setBarcode('');
    }
  };

  const addProduct = (p: Product) => {
    playPosAddBeep();
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id && !l.variantId);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          productCode: p.code,
          unitPrice: p.price,
          basePrice: p.price,
          unitCost: p.cost,
          priceTier: 'retail',
          qty: 1,
          taxRate: p.taxRate,
        },
      ];
    });
  };

  const patchLine = (index: number, patch: Partial<Line>) => {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const persistHolds = (next: CartHold[]) => {
    sessionStorage.setItem(POS_HOLDS_KEY, JSON.stringify(next.slice(-25)));
    setHoldsTick((t) => t + 1);
  };

  const holdCart = () => {
    if (lines.length === 0) {
      setBanner({ kind: 'error', text: 'Add items to the cart before holding a sale.' });
      return;
    }
    const prev: CartHold[] = (() => {
      try {
        const r = sessionStorage.getItem(POS_HOLDS_KEY);
        return r ? (JSON.parse(r) as CartHold[]) : [];
      } catch {
        return [];
      }
    })();
    prev.push({
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      lines: lines.map((l) => ({ ...l })),
      warehouseId,
      customerId,
    });
    persistHolds(prev);
    clear();
    setBanner({ kind: 'success', text: `Sale held. You have ${prev.length} saved draft(s).` });
  };

  const restoreHold = (hold: CartHold) => {
    setLines(hold.lines.map((l) => ({ ...l })));
    setWarehouseId(hold.warehouseId);
    setCustomerId(hold.customerId);
    setDraftsOpen(false);
    setBanner({ kind: 'success', text: 'Held sale restored to cart.' });
  };

  const discardHold = (id: string) => {
    const prev: CartHold[] = (() => {
      try {
        const r = sessionStorage.getItem(POS_HOLDS_KEY);
        return r ? (JSON.parse(r) as CartHold[]) : [];
      } catch {
        return [];
      }
    })();
    persistHolds(prev.filter((h) => h.id !== id));
  };

  const inc = (i: number) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, qty: l.qty + 1 } : l)));
  const dec = (i: number) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, qty: Math.max(1, l.qty - 1) } : l)));
  const rm = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const clear = () => {
    setLines([]);
    setTendered('');
    setBanner(null);
  };

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const tax = lines.reduce((s, l) => s + l.unitPrice * l.qty * (l.taxRate / 100), 0);
    const grand = subtotal + tax;
    const tenderedNum = Number(tendered) || 0;
    const change = Math.max(0, tenderedNum - grand);
    return { subtotal, tax, grand, tenderedNum, change };
  }, [lines, tendered]);

  // Mirror cart to customer display (debounced)
  useEffect(() => {
    if (!linkedTerminalId) return;
    const timer = setTimeout(() => {
      publishDisplayEvent(linkedTerminalId, 'CART_UPDATE', {
        lines: lines.map((l) => ({
          name: l.productName,
          qty: l.qty,
          price: l.unitPrice,
          total: l.unitPrice * l.qty,
        })),
        totals: {
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: 0,
          grandTotal: totals.grand,
        },
      }).catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [linkedTerminalId, lines, totals.subtotal, totals.tax, totals.grand]);

  const canCheckout = lines.length > 0 && !!warehouseId && !submitting;

  // ── Checkout ──────────────────────────────────────────────────────────────

  const checkout = async () => {
    if (!canCheckout) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const body: CreateSaleBody = {
        warehouseId,
        customerId: customerId || undefined,
        isPos: true,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
        })),
      };

      if (!online) {
        if (!linkedTerminalId) {
          throw new Error("You're offline — pair a terminal first to queue this sale.");
        }
        await enqueue(body);
        setBanner({
          kind: 'success',
          text: `Queued offline — will sync when back online (${queueSize + 1} pending).`,
        });
        clear();
        return;
      }

      const sale = await posCheckout(body);
      setLastSale(sale);
      playPosSuccessSound();
      setBanner({ kind: 'success', text: `Sale ${sale.ref} confirmed — ${fmt(sale.grandTotal)}` });

      if (linkedTerminalId) {
        publishDisplayEvent(linkedTerminalId, 'PAYMENT', {
          amount: sale.grandTotal,
          method: paymentMethod,
          change: totals.change,
        }).catch(() => {});
        setTimeout(() => {
          publishDisplayEvent(linkedTerminalId, 'CLEAR', null).catch(() => {});
        }, 4000);
      }

      clear();
      try {
        printReceipt(sale);
      } catch {
        /* non-blocking */
      }
    } catch (e: unknown) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : 'Checkout failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared layout props ────────────────────────────────────────────────────

  const layoutProps = {
    warehouses,
    warehouseId,
    onWarehouseChange: setWarehouseId,

    search,
    onSearchChange: setSearch,

    barcode,
    onBarcodeChange: setBarcode,
    onBarcodeScan: scanBarcode,
    barcodeRef,

    products,
    productsLoading,
    onAddProduct: addProduct,
    onPatchLine: patchLine,

    terminals,
    linkedTerminalId,
    onLinkedTerminalChange: setLinkedTerminalId,

    customers,
    customerId,
    onCustomerChange: setCustomerId,

    lines,
    onIncQty: inc,
    onDecQty: dec,
    onRemoveLine: rm,
    onClearCart: clear,

    paymentMethod,
    onPaymentMethodChange: setPaymentMethod,

    tendered,
    onTenderedChange: setTendered,

    totals,

    banner,
    onBannerClose: () => setBanner(null),

    lastSale,
    onReprint: printReceipt,

    onCheckout: checkout,
    submitting,
    canCheckout,

    online,
    queueSize,

    onHoldCart: holdCart,
    onOpenHeldCarts: () => setDraftsOpen(true),
    onNotify: (text: string) => setBanner({ kind: 'success', text }),
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', bgcolor: '#F7F8FA' }}>
      <ModernLayout {...layoutProps} />

      <Dialog open={draftsOpen} onClose={() => setDraftsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Recent drafts (held carts)</DialogTitle>
        <DialogContent dividers>
          {heldCarts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No held sales yet. Use &quot;Hold&quot; in the footer to park the current cart.
            </Typography>
          ) : (
            <List disablePadding>
              {heldCarts.map((hold) => (
                <ListItem
                  key={hold.id}
                  disablePadding
                  sx={{ mb: 1.25 }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                    sx={{
                      width: '100%',
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemText
                      primary={`${hold.lines.length} line(s) · ${hold.lines.reduce((s, l) => s + l.qty, 0)} items`}
                      secondary={new Date(hold.savedAt).toLocaleString()}
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" sx={{ textTransform: 'none' }} onClick={() => restoreHold(hold)}>
                        Restore
                      </Button>
                      <Button size="small" color="error" sx={{ textTransform: 'none' }} onClick={() => discardHold(hold.id)}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraftsOpen(false)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
