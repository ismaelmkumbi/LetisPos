/**
 * Letis POS — Cashier terminal.
 *
 * Supports 4 layout variations: classic, compact, sidebar, modal
 * - Layout preference persists to localStorage
 * - All layouts share same business logic & checkout flow
 * - Responsive: adapts intelligently on mobile
 */
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';
import { CustomizerContext } from 'src/context/CustomizerContext';
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
import { IconPrinter } from '@tabler/icons-react';
import { listProducts, getProduct, getProductByBarcode, type Product, type ProductSearchParams } from 'src/api/smartpos/products';
import { listCustomers, createCustomer } from 'src/api/smartpos/customers';
import type { Customer } from 'src/api/smartpos/types';
import { listWarehouses, lowStockAlerts, batchStockLevels, type StockLevel, type Warehouse } from 'src/api/smartpos/inventory';
import { posCheckout, getTopProducts, suspendCart, listSales, type CreateSaleBody, type Sale } from 'src/api/smartpos/sales';
import {
  listTerminals,
  publishDisplayEvent,
  type PosTerminal,
} from 'src/api/smartpos/posTerminals';
import {
  listPrinters,
  printThermal,
  type PrinterInfo,
} from 'src/api/smartpos/documents';
import { useOfflineSyncQueue } from 'src/hooks/useOfflineSyncQueue';
import { useOnlineStatus } from 'src/components/smartpos/OfflineBanner';
import { parseApiError } from 'src/utils/smartpos/apiErrors';
import { printReceipt, ReceiptPreviewModal } from 'src/components/smartpos/Receipt';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import {
  getCurrentRegister,
  type CashRegisterSession,
} from 'src/api/smartpos/cashRegister';
import OpenRegisterModal from 'src/components/smartpos/OpenRegisterModal';
import CloseRegisterModal from 'src/components/smartpos/CloseRegisterModal';

import PaymentSuccessOverlay from 'src/components/smartpos/PaymentSuccessOverlay';
import TodaySalesModal from 'src/components/smartpos/TodaySalesModal';
import { getReceiptConfig } from 'src/components/smartpos/Receipt';
import { getPosSettings, type PosSettings } from 'src/api/smartpos/posSettings';
import ModernLayout from 'src/components/smartpos/PosLayouts/ModernLayout';
import ClassicLayout from 'src/components/smartpos/PosLayouts/ClassicLayout';
import CompactLayout from 'src/components/smartpos/PosLayouts/CompactLayout';
import SidebarLayout from 'src/components/smartpos/PosLayouts/SidebarLayout';
import ModalLayout from 'src/components/smartpos/PosLayouts/ModalLayout';
import SplitLayout from 'src/components/smartpos/PosLayouts/SplitLayout';

import { usePosLayout } from 'src/context/smartpos/PosLayoutContext';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { recordPayment } from 'src/api/smartpos/payments';
import type { Line } from 'src/components/smartpos/PosLayouts/types';
import type { PosLayoutProps } from 'src/components/smartpos/PosLayouts/PosLayoutProps';
import { playPosAddBeep, playPosErrorSound, playPosSuccessSound } from 'src/utils/smartpos/posBeep';
import { usePosKeyboardShortcuts } from 'src/hooks/usePosKeyboardShortcuts';

const LINKED_TERMINAL_KEY = 'smartpos.linkedTerminalId';
const POS_HOLDS_KEY = 'smartpos.pos.cartHolds';

type CartHold = {
  id: string;
  savedAt: string;
  lines: Line[];
  warehouseId: string;
  customerId: string | null;
};
export default function PosTerminalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
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
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const [categoryId, setCategoryId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [stockMap, setStockMap] = useState<Record<string, StockLevel>>({});
  const [stockLoading, setStockLoading] = useState(false);

  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [linkedTerminalId, setLinkedTerminalId] = useState<string>(
    () => localStorage.getItem(LINKED_TERMINAL_KEY) ?? '',
  );

  const online = useOnlineStatus();
  const { queueSize, enqueue, flush } = useOfflineSyncQueue(linkedTerminalId);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [holdsTick, setHoldsTick] = useState(0);

  // ── Cash register ───────────────────────────────────────────────────────
  const [registerSession, setRegisterSession] = useState<CashRegisterSession | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [openRegisterOpen, setOpenRegisterOpen] = useState(false);
  const [closeRegisterOpen, setCloseRegisterOpen] = useState(false);

  const [successOverlay, setSuccessOverlay] = useState(false);
  const [todaySalesOpen, setTodaySalesOpen] = useState(false);
  const [posSettings, setPosSettings] = useState<PosSettings | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<{ sale: Sale; paymentMethod: string } | null>(null);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);

  // ── Credit sales state ─────────────────────────────────────────────────────
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [creditAvailable, setCreditAvailable] = useState(false);
  const [saleType, setSaleType] = useState<'CASH' | 'CREDIT' | 'SPLIT'>('CASH');
  const [newCreditBalance, setNewCreditBalance] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!customerId || customerId === '__walkin__') {
      setCustomerBalance(null);
      setCreditAvailable(false);
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || customer.creditLimit <= 0) {
      setCustomerBalance(null);
      setCreditAvailable(false);
      return;
    }
    listSales({ customerId, paymentStatus: 'UNPAID', size: 200 })
      .then((unpaid) =>
        listSales({ customerId, paymentStatus: 'PARTIAL', size: 200 })
          .then((partial) => {
            const all = [...unpaid.content, ...partial.content];
            const bal = all.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
            setCustomerBalance(bal);
            setCreditAvailable(bal < customer.creditLimit);
          })
      )
      .catch(() => {
        setCustomerBalance(null);
        setCreditAvailable(false);
      });
  }, [customerId, customers]);

  // draftsOpen / holdsTick are intentional cache-bust triggers — they force a
  // re-read from sessionStorage whenever the drafts panel or hold-tick changes.
  const heldCarts = useMemo((): CartHold[] => {
    try {
      const raw = sessionStorage.getItem(POS_HOLDS_KEY);
      return raw ? (JSON.parse(raw) as CartHold[]) : [];
    } catch {
      return [];
    }
  }, [draftsOpen, holdsTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bootstrap ────────────────────────────────────────────────────────────

  useEffect(() => {
    setProductsLoading(true);
    Promise.all([
      listWarehouses(),
      listCustomers({ size: 50 }),
      listProducts({ size: 48 }),
      listTerminals(),
    ])
      .then(async ([w, c, p, tm]) => {
        setWarehouses(w);
        if (w[0]) setWarehouseId(w[0].id);
        setCustomers(c.content);
        setProducts(p.content);
        setTerminals(tm);
        // Auto-select walk-in customer
        let walkIn = c.content.find((cu) => cu.name === 'Walk-in Customer');
        if (!walkIn) {
          try {
            walkIn = await createCustomer({ name: 'Walk-in Customer' });
            setCustomers((prev) => [walkIn!, ...prev]);
          } catch { /* silent */ }
        }
        if (walkIn) setCustomerId(walkIn.id);
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  // Resume cart from suspended sale
  useEffect(() => {
    const resumeJson = localStorage.getItem('smartpos.pos.resumeCart');
    if (resumeJson) {
      try {
        const cartLines = JSON.parse(resumeJson);
        setLines(cartLines);
        localStorage.removeItem('smartpos.pos.resumeCart');
      } catch { /* ignore malformed data */ }
    }
  }, []);

  useEffect(() => {
    if (linkedTerminalId) localStorage.setItem(LINKED_TERMINAL_KEY, linkedTerminalId);
    else localStorage.removeItem(LINKED_TERMINAL_KEY);
  }, [linkedTerminalId]);

  // Load configured thermal printers for direct printing
  useEffect(() => {
    listPrinters().then(setPrinters).catch(() => {});
  }, []);

  // Refresh cash register session when warehouse changes or after checkout
  useEffect(() => {
    if (!warehouseId) return;
    setRegisterLoading(true);
    getCurrentRegister(warehouseId)
      .then((s) => setRegisterSession(s))
      .catch(() => {})
      .finally(() => setRegisterLoading(false));
  }, [warehouseId]);

  // Fetch POS settings (tax rate, currency, etc.) on warehouse change
  useEffect(() => {
    if (!warehouseId) return;
    getPosSettings(warehouseId)
      .then((s) => setPosSettings(s))
      .catch(() => setPosSettings(null));
  }, [warehouseId]);

  useEffect(() => {
    if (online && linkedTerminalId) flush().catch(() => {});
  }, [online, linkedTerminalId, flush]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length === 0 || search.length >= 2) {
        setProductsLoading(true);
        try {
          if (activeTab === 'low' && warehouseId) {
            const alerts = await lowStockAlerts(warehouseId, 0, 48);
            const ids = alerts.content.map((a) => a.productId);
            if (ids.length > 0) {
              const prods = await Promise.all(ids.map((id) => getProduct(id).catch(() => null)));
              setProducts(prods.filter((p): p is Product => p !== null));
            } else {
              setProducts([]);
            }
          } else if (activeTab === 'bestsellers') {
            const top = await getTopProducts({ limit: 48 });
            const ids = top.map((t) => t.productId);
            if (ids.length > 0) {
              const prods = await Promise.all(ids.map((id) => getProduct(id).catch(() => null)));
              setProducts(prods.filter((p): p is Product => p !== null));
            } else {
              setProducts([]);
            }
          } else {
            const baseParams: ProductSearchParams = {
              search: search || undefined,
              categoryId: activeTab === 'all' ? (categoryId || undefined) : undefined,
              brandId: activeTab === 'all' ? (brandId || undefined) : undefined,
              size: 48,
            };
            if (activeTab === 'featured') {
              baseParams.featured = true;
            } else if (activeTab === 'recent') {
              baseParams.sort = 'createdAt,desc';
            }
            const p = await listProducts(baseParams);
            setProducts(p.content);
          }
        } catch {
          // silent
        } finally {
          setProductsLoading(false);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, categoryId, brandId, activeTab, warehouseId]);

  // Fetch real-time stock for visible products
  useEffect(() => {
    if (!warehouseId || products.length === 0) return;
    const ids = products.map((p) => p.id);
    setStockLoading(true);
    batchStockLevels(warehouseId, ids)
      .then((m) => setStockMap(m))
      .catch(() => {})
      .finally(() => setStockLoading(false));
  }, [warehouseId, products]);

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
    const stock = stockMap[p.id];
    if (stock && stock.available <= 0) {
      setBanner({ kind: 'error', text: `${p.name} is out of stock. Receive stock first.` });
      return;
    }
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
          taxRate: p.taxRate > 0 ? p.taxRate : (posSettings?.defaultTaxRate ?? p.taxRate),
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

  const handleSuspend = async () => {
    if (lines.length === 0) return;
    try {
      await suspendCart({
        tenantId: user!.tenantId,
        terminalId: localStorage.getItem(LINKED_TERMINAL_KEY)?.slice(0, 36) || undefined,
        customerId: customerId || undefined,
        warehouseId,
        lines: JSON.stringify(lines),
        discountType: discountType || undefined,
        discountValue: discount || undefined,
        taxMethod: posSettings?.defaultTaxMethod || undefined,
        grandTotal: totals.grand,
        totalItems: lines.reduce((sum: number, l: { qty: number }) => sum + (l.qty || 0), 0),
      });
      setLines([]);
      setCustomerId(null);
      setBanner({ kind: 'success', text: 'Cart suspended. You can resume it later from the POS terminal.' });
    } catch (e: unknown) {
      const { message } = parseApiError(e);
      setBanner({ kind: 'error', text: message });
    }
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

  // ── Receipt name lookups ───────────────────────────────────────────────
  // The Sale payload only carries IDs. Resolve human names from local state
  // so receipts show "John Doe" instead of "769ef700".
  const buildReceiptLookups = (sale: Sale) => {
    const productNames: Record<string, string> = {};
    for (const p of products) productNames[p.id] = p.name;
    for (const l of sale.lines) {
      if (l.productName && !/^[0-9a-f-]{36}$/i.test(l.productName)) {
        productNames[l.productId] = l.productName;
      }
    }
    return {
      sellerName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : undefined,
      customerName: customers.find((c) => c.id === sale.customerId)?.name,
      warehouseName: warehouses.find((w) => w.id === sale.warehouseId)?.name,
      productNames,
      previousBalance: sale.paymentStatus === 'UNPAID' || sale.paymentStatus === 'PARTIAL'
        ? (customerBalance ?? undefined)
        : undefined,
      newBalance: sale.paymentStatus === 'UNPAID' || sale.paymentStatus === 'PARTIAL'
        ? ((customerBalance || 0) + (sale.dueTotal || sale.grandTotal))
        : undefined,
    };
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  usePosKeyboardShortcuts({
    focusBarcode: () => barcodeRef.current?.focus(),
    onQuickAddCustomer: () => {},
    onHoldCart: holdCart,
    onRegisterToggle: () => {
      if (registerSession && registerSession.status === 'OPEN') {
        setCloseRegisterOpen(true);
      } else {
        setOpenRegisterOpen(true);
      }
    },
    onCompleteSale: () => {
      if (canCheckout) checkout();
    },
    onReprint: () => {
      if (lastSale) printReceipt(lastSale, { paymentMethod, lookups: buildReceiptLookups(lastSale) });
    },
  });

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const tax = lines.reduce((s, l) => s + l.unitPrice * l.qty * (l.taxRate / 100), 0);
    const discountAmount = discountType === 'PERCENT' ? subtotal * (discount / 100) : discount;
    const grand = subtotal + tax - discountAmount;
    const tenderedNum = Number(tendered) || 0;
    const change = Math.max(0, tenderedNum - grand);
    return { subtotal, tax, discount: discountAmount, grand, tenderedNum, change };
  }, [lines, tendered, discount, discountType]);

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

  const canCheckout = useMemo(() => {
    if (lines.length === 0 || !warehouseId || submitting) return false;
    // Block checkout if any line item has zero or negative available stock
    const hasOutOfStock = lines.some((l) => {
      const s = stockMap[l.productId];
      return s && s.available <= 0;
    });
    return !hasOutOfStock;
  }, [lines, warehouseId, submitting, stockMap]);

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
        discount: discount > 0 ? discount : undefined,
        taxMethod: posSettings?.defaultTaxMethod || undefined,
        currency: posSettings?.currencyCode || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          productCode: l.productCode,
          variantId: l.variantId,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
          taxMethod: posSettings?.defaultTaxMethod || undefined,
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

      // Auto-print now opens the receipt preview first, matching the legacy POS flow.
      const rc = getReceiptConfig();
      if (rc.autoPrint) {
        setReceiptPreview({ sale, paymentMethod });
        clear();
      } else {
        setSuccessOverlay(true);
      }
    } catch (e: unknown) {
      const { message } = parseApiError(e);
      setBanner({ kind: 'error', text: message });
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutWithMethod = async (
    method: 'CASH' | 'CARD' | 'CREDIT' | 'SPLIT',
    split?: { cashAmount: number; cardAmount: number; creditAmount: number },
  ) => {
    if (!canCheckout) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const body: CreateSaleBody = {
        warehouseId,
        customerId: customerId || undefined,
        isPos: true,
        discount: discount > 0 ? discount : undefined,
        taxMethod: posSettings?.defaultTaxMethod || undefined,
        currency: posSettings?.currencyCode || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          unitPrice: l.unitPrice,
          qty: l.qty,
          taxRate: l.taxRate,
          taxMethod: posSettings?.defaultTaxMethod || undefined,
        })),
      };

      if (!online) {
        throw new Error("Credit sales require an internet connection to verify customer balances.");
      }

      const sale = await posCheckout(body);

      // Record cash/card payments
      if (method === 'CASH' || method === 'CARD') {
        try {
          await recordPayment({
            referenceType: 'SALE',
            referenceId: sale.id,
            accountId: '',
            amount: sale.grandTotal,
            method,
          });
        } catch { /* non-blocking */ }
      }

      // Record split payments
      if (method === 'SPLIT' && split) {
        const paymentPromises: Promise<unknown>[] = [];
        if (split.cashAmount > 0) {
          paymentPromises.push(
            recordPayment({ referenceType: 'SALE', referenceId: sale.id, accountId: '', amount: split.cashAmount, method: 'CASH' }).catch(() => {})
          );
        }
        if (split.cardAmount > 0) {
          paymentPromises.push(
            recordPayment({ referenceType: 'SALE', referenceId: sale.id, accountId: '', amount: split.cardAmount, method: 'CARD' }).catch(() => {})
          );
        }
        await Promise.all(paymentPromises);
      }

      setLastSale(sale);
      playPosSuccessSound();

      // Set sale type for the success overlay
      setSaleType(method === 'CREDIT' ? 'CREDIT' : method === 'SPLIT' && split && split.creditAmount > 0 ? 'CREDIT' : 'CASH');

      // Compute new balance for credit sales
      if (method === 'CREDIT' || (method === 'SPLIT' && split && split.creditAmount > 0)) {
        const prevBalance = customerBalance || 0;
        const added = method === 'CREDIT' ? sale.grandTotal : (split?.creditAmount || 0);
        setNewCreditBalance(prevBalance + added);
      } else {
        setNewCreditBalance(undefined);
      }

      const rc = getReceiptConfig();
      if (rc.autoPrint) {
        setReceiptPreview({ sale, paymentMethod: method });
        clear();
      } else {
        setSuccessOverlay(true);
      }
    } catch (e: unknown) {
      const { message } = parseApiError(e);
      setBanner({ kind: 'error', text: message });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Inline customer creation callback ──────────────────────────────────────

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers((prev) => [customer, ...prev]);
    setCustomerId(customer.id);
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
    stockMap,
    stockLoading,
    onAddProduct: addProduct,
    onPatchLine: patchLine,

    terminals,
    linkedTerminalId,
    onLinkedTerminalChange: setLinkedTerminalId,

    customers,
    customerId,
    onCustomerChange: setCustomerId,
    onCustomerCreated: handleCustomerCreated,

    lines,
    onIncQty: inc,
    onDecQty: dec,
    onRemoveLine: rm,
    onClearCart: clear,

    paymentMethod,
    onPaymentMethodChange: setPaymentMethod,

    tendered,
    onTenderedChange: setTendered,
    discount,
    discountType,
    onDiscountChange: (v: number) => setDiscount(v),
    onDiscountTypeChange: (t: 'FIXED' | 'PERCENT') => setDiscountType(t),

    totals,

    categoryId,
    brandId,
    onCategoryChange: setCategoryId,
    onBrandChange: setBrandId,

    activeTab,
    onTabChange: setActiveTab,

    banner,
    onBannerClose: () => setBanner(null),

    lastSale,
    onReprint: (sale: Sale) => printReceipt(sale, { paymentMethod, lookups: buildReceiptLookups(sale) }),

    onCheckout: checkout,
    submitting,
    canCheckout,

    online,
    queueSize,

    onHoldCart: holdCart,
    onSuspendCart: handleSuspend,
    onOpenHeldCarts: () => setDraftsOpen(true),

    onNotify: (text: string) => setBanner({ kind: 'success', text }),

    registerSession,
    registerLoading,
    onOpenRegister: () => setOpenRegisterOpen(true),
    onCloseRegister: () => setCloseRegisterOpen(true),
    onTodaySales: () => setTodaySalesOpen(true),

    // Credit sales
    customerBalance,
    creditAvailable,
    onViewCreditAccount: (id: string) => navigate(`/pos/credit/${id}`),
    onCheckoutWithMethod: checkoutWithMethod,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const { layout } = usePosLayout();
  const LayoutComponent: Record<string, React.ComponentType<PosLayoutProps>> = {
    split: SplitLayout as React.ComponentType<PosLayoutProps>,
    modern: ModernLayout as React.ComponentType<PosLayoutProps>,
    classic: ClassicLayout as React.ComponentType<PosLayoutProps>,
    compact: CompactLayout as React.ComponentType<PosLayoutProps>,
    sidebar: SidebarLayout as React.ComponentType<PosLayoutProps>,
    modal: ModalLayout as React.ComponentType<PosLayoutProps>,
  };
  const ChosenLayout = LayoutComponent[layout] || SplitLayout;

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', bgcolor: isDark ? brand.neutral[900] : '#F7F8FA' }}>
      <ChosenLayout {...(layoutProps as PosLayoutProps)} />

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

      <OpenRegisterModal
        open={openRegisterOpen}
        warehouseId={warehouseId}
        onClose={() => setOpenRegisterOpen(false)}
        onOpened={(session) => setRegisterSession(session)}
      />

      <CloseRegisterModal
        open={closeRegisterOpen}
        warehouseId={warehouseId}
        session={registerSession}
        onClose={() => setCloseRegisterOpen(false)}
        onClosed={() => setRegisterSession(null)}
      />

      <PaymentSuccessOverlay
        open={successOverlay}
        sale={lastSale}
        paymentMethod={paymentMethod}
        change={totals.change}
        saleType={saleType}
        newBalance={newCreditBalance}
        onNewSale={() => {
          setSuccessOverlay(false);
          clear();
        }}
        onPrint={(sale) => {
          try { printReceipt(sale, { paymentMethod, lookups: buildReceiptLookups(sale) }); } catch { /* non-blocking */ }
        }}
        onPreview={(sale) => {
          if (sale) setReceiptPreview({ sale, paymentMethod });
        }}
        onClose={() => setSuccessOverlay(false)}
      />

      {receiptPreview && (
        <ReceiptPreviewModal
          open={!!receiptPreview}
          onClose={() => setReceiptPreview(null)}
          sale={receiptPreview.sale}
          paymentMethod={receiptPreview.paymentMethod}
          lookups={buildReceiptLookups(receiptPreview.sale)}
        />
      )}

      {lastSale && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1300 }}>
          <DocumentActionsBar documentType="payment-receipt" referenceType="payment" referenceId={lastSale.id} />
        </Box>
      )}

      {lastSale && printers.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1300 }}>
          <Stack spacing={0.5}>
            {printers.map(p => (
              <Button key={p.id} size="small" variant="outlined" startIcon={<IconPrinter size={14} />}
                onClick={() => printThermal(p.id, { ...lastSale, paymentMethod: 'Cash' })}>
                Print ({p.name})
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      <TodaySalesModal
        open={todaySalesOpen}
        onClose={() => setTodaySalesOpen(false)}
        warehouseId={warehouseId}
      />
    </Box>
  );
}
