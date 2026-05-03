/**
 * Letis POS — Modern checkout layout.
 *
 * Inspired by Shopify POS / modern SaaS dashboards.
 *
 * Anatomy:
 *   ┌───────────────────────────────┬─────────────────────────────┐
 *   │  Checkout panel (380–420 px)  │  Products (flex)            │
 *   │  ─ header + item badge        │  ─ search + filter row      │
 *   │  ─ scrollable cart            │  ─ responsive product grid  │
 *   │  ─ summary (tax/disc/ship)    │                             │
 *   │  ─ totals + grand total       │                             │
 *   ├───────────────────────────────┴─────────────────────────────┤
 *   │  Sticky footer:  status · drafts · hold · Pay Now           │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Design tokens are sourced from `theme/smartpos/brand` so the layout
 * stays in lockstep with the rest of the product.
 *
 * Behaviour:
 *  - Adds (Tax %, Discount, Shipping) UI-only adjusters on top of the
 *    server-side per-line tax already computed by the parent page.
 *  - Edit/Remove on each cart line; +/- quantity steppers.
 *  - Category & Brand filters loaded lazily inside this layout.
 */
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconBarcode,
  IconBell,
  IconBackspace,
  IconBox,
  IconBuildingBank,
  IconCalculator,
  IconCheck,
  IconChevronDown,
  IconCircleFilled,
  IconCoin,
  IconCreditCard,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconEdit,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconArrowLeft,
  IconArrowRight,
  IconHome,
  IconLanguage,
  IconMinus,
  IconPlus,
  IconQrcode,
  IconReceipt,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconShoppingCart,
  IconAdjustmentsHorizontal,
  IconSparkles,
  IconStar,
  IconClock,
  IconTrendingUp,
  IconUser,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Product } from 'src/api/smartpos/products';
import type { Customer } from 'src/api/smartpos/types';
import type { Warehouse, StockLevel } from 'src/api/smartpos/inventory';
import type { PosTerminal } from 'src/api/smartpos/posTerminals';
import { listCategories, listBrands } from 'src/api/smartpos/products';
import type { Brand as BrandRef, Category } from 'src/api/smartpos/types';
import type { Line } from './types';
import type { PosLayoutProps, PaymentChoice, LayoutTab } from './PosLayoutProps';
import { unitPriceForTier, posSurface, premiumFieldSx, softScrollSx, focusVisibleSx, POS_LANG_CYCLE, CHECKOUT_PANEL_MIN_WIDTH, FOOTER_HEIGHT, PRODUCT_PAGE_SIZE } from './shared';
import EditLineModal from 'src/components/smartpos/EditLineModal';
import QuickAddCustomerModal from 'src/components/smartpos/QuickAddCustomerModal';
import CashRegisterIndicator from 'src/components/smartpos/CashRegisterIndicator';
import TotalRow from './TotalRow';
import BrandLogo from 'src/components/smartpos/BrandLogo';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import {
  POS_BEEP_VARIANTS,
  getPosBeepVariant,
  playPosAddBeep,
  setPosBeepVariant,
  type PosBeepVariantId,
} from 'src/utils/smartpos/posBeep';

const fmt = formatMoney;

// ─── Layout dimensions ─────────────────────────────────────────────────────
// (shared constants imported from ./shared)

// ═══════════════════════════════════════════════════════════════════════════
//  Modern Layout
// ═══════════════════════════════════════════════════════════════════════════

export default function ModernLayout(props: PosLayoutProps) {
  const { t } = useTranslation('smartpos');
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandRef[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('CASH');

  useEffect(() => {
    Promise.all([listCategories(), listBrands()])
      .then(([c, b]) => { setCategories(c); setBrands(b); })
      .catch(() => {});
  }, []);

  const computed = useMemo(() => {
    const subtotal = props.totals.subtotal;
    const totalTax = props.totals.tax;
    const disc = props.totals.discount || 0;
    const ship = 0;
    const grand = Math.max(0, subtotal + totalTax - disc + ship);
    return { subtotal, totalTax, disc, ship, grand };
  }, [props.totals.subtotal, props.totals.tax, props.totals.discount]);

  const itemCount = props.lines.reduce((s, l) => s + l.qty, 0);
  const paymentChange = Math.max(0, (Number(props.tendered) || 0) - computed.grand);

  // --- Product tab handler — delegates to parent for server-side filtering ---
  const handleTabChange = (tab: LayoutTab) => {
    if (tab === 'all') {
      props.onCategoryChange('');
      props.onBrandChange('');
    } else if (tab === 'featured' || tab === 'recent') {
      props.onCategoryChange('');
      props.onBrandChange('');
    }
    props.onTabChange(tab);
  };

  const handlePaymentChoice = (choice: PaymentChoice) => {
    setPaymentChoice(choice);
    if (choice === 'CASH') props.onPaymentMethodChange('CASH');
    else if (choice === 'SPLIT') props.onPaymentMethodChange('SPLIT');
    else props.onPaymentMethodChange('CARD');
  };

  const openPayment = () => {
    if (!props.canCheckout) return;
    if (!props.tendered && paymentChoice === 'CASH') {
      props.onTenderedChange(String(Math.ceil(computed.grand / 1000) * 1000));
    }
    setPaymentOpen(true);
  };

  const completePayment = () => {
    props.onCheckout();
    setPaymentOpen(false);
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F7F8FA',
        overflow: 'hidden',
      }}
    >
      <KioskTopBar
        warehouses={props.warehouses}
        warehouseId={props.warehouseId}
        onWarehouseChange={props.onWarehouseChange}
        categories={categories}
        categoryId={props.categoryId}
        onCategoryChange={props.onCategoryChange}
        brands={brands}
        brandId={props.brandId}
        onBrandChange={props.onBrandChange}
        customers={props.customers}
        customerId={props.customerId}
        onCustomerChange={props.onCustomerChange}
        terminals={props.terminals}
        linkedTerminalId={props.linkedTerminalId}
        onLinkedTerminalChange={props.onLinkedTerminalChange}
        online={props.online}
        user={user}
        onHoldCart={props.onHoldCart}
        onScanFocus={() => props.barcodeRef.current?.focus()}
        onCustomerCreated={props.onCustomerCreated}
        onTodaySales={props.onTodaySales}
        registerSession={props.registerSession}
        registerLoading={props.registerLoading}
        onOpenRegister={props.onOpenRegister}
        onCloseRegister={props.onCloseRegister}
      />

      {/* ═══ Banner ═════════════════════════════════════════════════════ */}
      {props.banner && (
        <Alert
          severity={props.banner.kind}
          onClose={props.onBannerClose}
          icon={props.banner.kind === 'success' ? <IconCheck size={17} /> : undefined}
          sx={{
            mx: 1.5,
            mt: 1,
            borderRadius: '12px',
            border: `1px solid ${brand.neutral[200]}`,
            boxShadow: `0 12px 28px -20px ${brand.neutral[900]}44`,
            flexShrink: 0,
          }}
        >
          {props.banner.text}
        </Alert>
      )}

      {/* ═══ Main 2-column grid ═════════════════════════════════════════
       *
       * Layout rules:
       *  - md+ : two near-equal columns, with products slightly wider
       *  - <md : single column stack → products on TOP, checkout BELOW
       *
       * Products is rendered FIRST in source so on small screens users
       * always see the catalog without scrolling past an empty cart.
       * `order` is then used to flip the visual position on md+ so the
       * checkout panel sits on the left as per the spec.
       */}
      {paymentOpen ? (
        <PaymentScreen
          lines={props.lines}
          totalItems={itemCount}
          grand={computed.grand}
          subtotal={computed.subtotal}
          tax={computed.totalTax}
          discount={computed.disc}
          shipping={computed.ship}
          tendered={props.tendered}
          onTenderedChange={props.onTenderedChange}
          change={paymentChange}
          paymentChoice={paymentChoice}
          onPaymentChoiceChange={handlePaymentChoice}
          customerName={props.customers.find((c) => c.id === props.customerId)?.name ?? 'Walk-in Customer'}
          submitting={props.submitting}
          canComplete={props.canCheckout && (paymentChoice !== 'CASH' || (Number(props.tendered) || 0) >= computed.grand)}
          onBack={() => setPaymentOpen(false)}
          onComplete={completePayment}
          taxRate={props.lines.length > 0 ? Math.round(props.lines[0].taxRate) : 0}
        />
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: `minmax(${CHECKOUT_PANEL_MIN_WIDTH}px, 0.92fr) minmax(0, 1.52fr)`,
            },
            gap: 1.5,
            p: 1.5,
            alignItems: 'stretch',
            overflow: 'hidden',
          }}
        >
          {/* ───────────── Products section (right column on md+) ───────── */}
          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              order: { xs: 1, md: 2 },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <TopFilters
              search={props.search}
              onSearchChange={props.onSearchChange}
              barcode={props.barcode}
              onBarcodeChange={props.onBarcodeChange}
              onBarcodeScan={props.onBarcodeScan}
              barcodeRef={props.barcodeRef}
            />

            <ProductTabs activeTab={props.activeTab} onTabChange={handleTabChange} />

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, ...softScrollSx }}>
              <ProductGrid
                products={props.products}
                loading={props.productsLoading}
                stockMap={props.stockMap}
                stockLoading={props.stockLoading}
                onAdd={props.onAddProduct}
              />
            </Box>
          </Box>

          {/* ───────────── Checkout panel (left column on md+) ──────────── */}
          <Box id="letis-pos-checkout" sx={{ order: { xs: 2, md: 1 }, minHeight: 0 }}>
            <CheckoutPanel
              itemCount={itemCount}
              lines={props.lines}
              onInc={props.onIncQty}
              onDec={props.onDecQty}
              onRemove={props.onRemoveLine}
              onClear={props.onClearCart}
              onPatchLine={props.onPatchLine}
              onNotify={props.onNotify}
              subtotal={computed.subtotal}
              tax={computed.totalTax}
              discountVal={computed.disc}
              shippingVal={computed.ship}
              grand={computed.grand}
              taxRate={computed.subtotal > 0 ? Math.round(computed.totalTax / computed.subtotal * 100) : 0}
              discount={props.discount}
              discountType={props.discountType}
              onDiscountChange={props.onDiscountChange}
              onDiscountTypeChange={props.onDiscountTypeChange}
              products={props.products}
              stockMap={props.stockMap}
            />
          </Box>
        </Box>
      )}

      {/* ═══ Sticky footer bar ══════════════════════════════════════════ */}
      {!paymentOpen && (
        <FooterBar
          online={props.online}
          queueSize={props.queueSize}
          onClear={props.onClearCart}
          onHoldCart={props.onHoldCart}
          onOpenHeldCarts={props.onOpenHeldCarts}

          canCheckout={props.canCheckout}
          submitting={props.submitting}
          onCheckout={openPayment}
          grand={computed.grand}
          itemCount={itemCount}
          labelPay={t('pos.charge')}
          labelProcessing={t('pos.processing')}
        />
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  KioskTopBar
// ═══════════════════════════════════════════════════════════════════════════

interface KioskTopBarProps {
  warehouses: Warehouse[]; warehouseId: string; onWarehouseChange: (id: string) => void;
  categories: Category[]; categoryId: string; onCategoryChange: (id: string) => void;
  brands: BrandRef[]; brandId: string; onBrandChange: (id: string) => void;
  customers: Customer[]; customerId: string | null; onCustomerChange: (id: string | null) => void;
  onCustomerCreated?: (customer: Customer) => void;
  terminals: PosTerminal[]; linkedTerminalId: string; onLinkedTerminalChange: (id: string) => void;
  online: boolean;
  user?: { firstName?: string; lastName?: string; email?: string; roles?: string[] } | null;
  onHoldCart?: () => void;
  onScanFocus: () => void;
  onTodaySales?: () => void;
  registerSession?: import('src/api/smartpos/cashRegister').CashRegisterSession | null;
  registerLoading?: boolean;
  onOpenRegister?: () => void;
  onCloseRegister?: () => void;
}

function KioskTopBar(p: KioskTopBarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { i18n } = useTranslation();

  const cycleLanguage = () => {
    const code = (i18n.language || 'en').split('-')[0];
    const idx = POS_LANG_CYCLE.indexOf(code as (typeof POS_LANG_CYCLE)[number]);
    const i = idx >= 0 ? idx : 0;
    const next = POS_LANG_CYCLE[(i + 1) % POS_LANG_CYCLE.length];
    void i18n.changeLanguage(next);
  };

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  };

  const topFieldSx = {
    minWidth: 160,
    '& .MuiOutlinedInput-root': {
      height: 40,
      borderRadius: '10px',
      bgcolor: '#fff',
      fontSize: '0.84rem',
      '& fieldset': { borderColor: brand.neutral[200] },
      '&:hover fieldset': { borderColor: brand.primary[300] },
      '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
    },
    '& .MuiInputLabel-root': { display: 'none' },
  } as const;

  return (
    <Box
      sx={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        bgcolor: '#fff',
        borderBottom: `1px solid ${brand.neutral[200]}`,
        boxShadow: `0 1px 10px ${brand.neutral[900]}08`,
        overflowX: 'auto',
        overflowY: 'hidden',
        ...softScrollSx,
      }}
    >
      <Box component={Link} to="/smartpos/dashboard" sx={{ textDecoration: 'none', flexShrink: 0 }}>
        <BrandLogo size="lg" />
      </Box>

      <Tooltip title={p.online ? 'Online' : 'Offline — sales will queue locally'} arrow>
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', px: 0.5 }}>
          <IconCircleFilled size={11} color={p.online ? brand.primary[600] : brand.warning.main} />
        </Box>
      </Tooltip>

      <CashRegisterIndicator
        session={p.registerSession ?? null}
        loading={p.registerLoading ?? false}
        onOpen={() => p.onOpenRegister?.()}
        onClose={() => p.onCloseRegister?.()}
      />

      <TextField
        select
        size="small"
        value={p.warehouseId}
        onChange={(e) => p.onWarehouseChange(e.target.value)}
        sx={{ ...topFieldSx, minWidth: 170 }}
      >
        {p.warehouses.map((warehouse) => (
          <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        value={p.categoryId}
        onChange={(e) => p.onCategoryChange(e.target.value)}
        slotProps={{ select: { displayEmpty: true } }}
        sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { height: 40, borderRadius: '10px', bgcolor: '#fff', fontSize: '0.84rem', '& fieldset': { borderColor: brand.neutral[200] }, '&:hover fieldset': { borderColor: brand.primary[300] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } } }}
      >
        <MenuItem value="">All Categories</MenuItem>
        {p.categories.map((category) => (
          <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        value={p.brandId}
        onChange={(e) => p.onBrandChange(e.target.value)}
        slotProps={{ select: { displayEmpty: true } }}
        sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { height: 40, borderRadius: '10px', bgcolor: '#fff', fontSize: '0.84rem', '& fieldset': { borderColor: brand.neutral[200] }, '&:hover fieldset': { borderColor: brand.primary[300] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } } }}
      >
        <MenuItem value="">All Brands</MenuItem>
        {p.brands.map((brandRef) => (
          <MenuItem key={brandRef.id} value={brandRef.id}>{brandRef.name}</MenuItem>
        ))}
      </TextField>

      <Autocomplete
        size="small"
        options={p.customers}
        value={p.customers.find((c) => c.id === p.customerId) || null}
        onChange={(_, value) => p.onCustomerChange(value?.id ?? null)}
        getOptionLabel={(customer) => customer.name}
        sx={{ minWidth: 220, flexShrink: 0 }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Walk-in Customer"
            sx={topFieldSx}
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <IconUser size={18} color={brand.primary[600]} />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
      />

      <Tooltip title="Quick add customer" arrow>
        <IconButton
          size="small"
          onClick={() => setQuickAddOpen(true)}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: '10px',
            border: `1px solid ${brand.primary[200]}`,
            color: brand.primary[600],
            bgcolor: brand.primary[50],
            '&:hover': { bgcolor: brand.primary[100], color: brand.primary[700] },
          }}
        >
          <IconUserPlus size={18} />
        </IconButton>
      </Tooltip>

      <Box sx={{ flex: 1, minWidth: 8 }} />

      {/* Right-side icon cluster — order matches POS-master legacy: receipts → settings → lang → display → fullscreen */}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
        <KioskIconButton title="Today's sales" onClick={() => p.onTodaySales?.()}>
          <IconReceipt size={17} />
        </KioskIconButton>
        <KioskIconButton title="Settings" to="/smartpos/settings">
          <IconSettings size={17} />
        </KioskIconButton>
        <KioskIconButton title="Language" onClick={cycleLanguage}>
          <IconLanguage size={17} />
        </KioskIconButton>
        <Select
          size="small"
          value={p.linkedTerminalId}
          onChange={(e) => p.onLinkedTerminalChange(e.target.value)}
          displayEmpty
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: brand.neutral[500] }}>
                  <IconDeviceDesktop size={16} />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>Display</Typography>
                </Stack>
              );
            }
            const terminal = p.terminals.find((t) => t.id === selected);
            return (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: brand.primary[600] }}>
                <IconDeviceDesktop size={16} color={brand.primary[600]} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }} noWrap>
                  {terminal?.name ?? selected.slice(0, 8)}
                </Typography>
              </Stack>
            );
          }}
          sx={{
            minWidth: 130,
            height: 40,
            flexShrink: 0,
            borderRadius: '10px',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.neutral[200] },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brand.primary[300] },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand.primary[500] },
            '& .MuiSelect-select': { display: 'flex', alignItems: 'center', py: 0.75 },
          }}
        >
          <MenuItem value=""><em>Not paired</em></MenuItem>
          {p.terminals.map((terminal) => (
            <MenuItem key={terminal.id} value={terminal.id}>{terminal.name} · {terminal.code}</MenuItem>
          ))}
        </Select>
        <KioskIconButton
          title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <IconArrowsMinimize size={17} /> : <IconArrowsMaximize size={17} />}
        </KioskIconButton>
      </Stack>

      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ pl: 0.5, flexShrink: 0 }}>
      <Avatar
        sx={{
            width: 36,
            height: 36,
            bgcolor: brand.primary[50],
            color: brand.primary[700],
            fontWeight: 900,
            fontSize: '0.9rem',
        }}
      >
          {p.user?.firstName?.charAt(0)?.toUpperCase() || p.user?.email?.charAt(0)?.toUpperCase() || 'U'}
      </Avatar>
        <Box sx={{ display: { xs: 'none', xl: 'block' }, minWidth: 106 }}>
          <Typography sx={{ fontWeight: 800, color: brand.neutral[900], lineHeight: 1.1 }}>
            {p.user ? [p.user.firstName, p.user.lastName].filter(Boolean).join(' ') || p.user.email : 'User'}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: brand.neutral[500], fontWeight: 600 }}>
            {p.user?.roles?.[0] || 'Staff'}
          </Typography>
        </Box>
        <IconChevronDown size={18} color={brand.neutral[600]} />
      </Stack>

      <QuickAddCustomerModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={(customer) => {
          p.onCustomerCreated?.(customer);
          setQuickAddOpen(false);
        }}
      />
    </Box>
  );
}

function KioskIconButton({
  title, children, onClick, to,
}: { title: string; children: React.ReactNode; onClick?: () => void; to?: string }) {
  const sx = {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: '10px',
    border: `1px solid ${brand.neutral[200]}`,
    color: brand.neutral[800],
    bgcolor: '#fff',
    '&:hover': { bgcolor: brand.primary[50], color: brand.primary[700], borderColor: brand.primary[200] },
  } as const;
  return (
    <Tooltip title={title} arrow>
      {to ? (
        <IconButton component={Link} to={to} size="small" sx={sx}>
          {children}
        </IconButton>
      ) : (
        <IconButton size="small" onClick={onClick} sx={sx}>
          {children}
        </IconButton>
      )}
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CheckoutPanel
// ═══════════════════════════════════════════════════════════════════════════

interface CheckoutPanelProps {
  itemCount: number;
  lines: Line[];
  onInc: (i: number) => void; onDec: (i: number) => void; onRemove: (i: number) => void; onClear: () => void;
  onPatchLine?: (index: number, patch: Partial<Line>) => void;
  onNotify?: (message: string) => void;
  subtotal: number; tax: number; discountVal: number; shippingVal: number; grand: number;
  taxRate: number;
  discount: number; discountType: 'FIXED' | 'PERCENT';
  onDiscountChange: (v: number) => void; onDiscountTypeChange: (t: 'FIXED' | 'PERCENT') => void;
  products: Product[];
  stockMap: Record<string, StockLevel>;
}

function CheckoutPanel(p: CheckoutPanelProps) {
  const [editLineIdx, setEditLineIdx] = useState<number | null>(null);
  const [editLine, setEditLine] = useState<Line | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState(String(p.discount || ''));
  const [discountTypeInput, setDiscountTypeInput] = useState<'FIXED' | 'PERCENT'>(p.discountType || 'FIXED');

  return (
    <>
    <Card
      elevation={0}
      sx={{
        ...posSurface,
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 2.5,
          pt: 2,
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${brand.neutral[100]}`,
          background: `linear-gradient(135deg, #fff 0%, ${brand.primary[50]} 100%)`,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[600]} 55%, ${brand.primary[500]} 100%)`,
              color: '#fff',
              boxShadow: `0 8px 18px -8px ${brand.primary[600]}99`,
            }}
          >
            <IconShoppingCart size={18} />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.1, color: brand.neutral[900] }}>
              Checkout
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Fast sale register
            </Typography>
          </Box>
        </Stack>
        <Badge
          badgeContent={p.itemCount}
          showZero
          sx={{
            '& .MuiBadge-badge': {
              position: 'static',
              transform: 'none',
              bgcolor: brand.primary[600],
              color: '#fff',
              fontWeight: 800,
              borderRadius: '8px',
              height: 26,
              minWidth: 56,
              px: 1.25,
              border: `1px solid ${brand.primary[500]}`,
              fontSize: '0.78rem',
              boxShadow: `0 6px 14px -8px ${brand.primary[600]}`,
            },
          }}
        >
          <Box sx={{ pr: 1, fontSize: '0.72rem', fontWeight: 600, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            items
          </Box>
        </Badge>
      </Box>

      {/* ─── Cart items (scrollable) ────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 180,
          overflowY: 'auto',
          px: 2,
          pb: 1,
          ...softScrollSx,
        }}
      >
        {p.lines.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              border: `1.5px dashed ${brand.primary[200]}`,
              borderRadius: '14px',
              bgcolor: brand.primary[50],
            }}
          >
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: brand.primary[50],
                color: brand.primary[500],
                mx: 'auto',
                mb: 1.25,
                borderRadius: '12px',
                border: `1px solid ${brand.primary[100]}`,
              }}
            >
              <IconShoppingCart size={20} />
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[700], mb: 0.5 }}>
              Cart is empty
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Scan or click a product to begin
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {p.lines.map((line, i) => (
              <CartItem
                key={`${line.productId}-${i}`}
                line={line}
                onInc={() => p.onInc(i)}
                onDec={() => p.onDec(i)}
                onRemove={() => p.onRemove(i)}
                onEditClick={() => {
                  setEditLineIdx(i);
                  setEditLine(line);
                }}
                onPatchLine={(patch) => p.onPatchLine?.(i, patch)}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ borderColor: brand.neutral[100] }} />

      <Box sx={{ px: 2.4, pt: 1.5, pb: 2, flexShrink: 0 }}>
        <Button
          startIcon={p.discountVal > 0 ? <IconCheck size={18} /> : <IconPlus size={18} />}
          onClick={() => { setDiscountInput(String(p.discount || '')); setDiscountOpen(true); }}
          sx={{
            justifyContent: 'flex-start',
            color: p.discountVal > 0 ? brand.primary[700] : brand.neutral[600],
            fontWeight: 800,
            textTransform: 'none',
            px: 0,
            mb: 1.2,
            '&:hover': { bgcolor: 'transparent', color: brand.primary[800] },
          }}
        >
          {p.discountVal > 0 ? `Discount - ${fmt(p.discountVal)}` : 'Add Discount'}
        </Button>

        <Dialog open={discountOpen} onClose={() => setDiscountOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Apply Discount</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <ToggleButtonGroup
                value={discountTypeInput}
                exclusive
                onChange={(_, v) => v && setDiscountTypeInput(v)}
                size="small"
                fullWidth
              >
                <ToggleButton value="FIXED" sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Fixed (TZS)
                </ToggleButton>
                <ToggleButton value="PERCENT" sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Percentage (%)
                </ToggleButton>
              </ToggleButtonGroup>
              <TextField
                label={discountTypeInput === 'FIXED' ? 'Discount amount (TZS)' : 'Discount (%)'}
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: discountTypeInput === 'PERCENT' ? 1 : 100 } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { p.onDiscountChange(0); setDiscountOpen(false); }} sx={{ textTransform: 'none' }}>
              Remove
            </Button>
            <Button onClick={() => setDiscountOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                const v = Number(discountInput);
                if (Number.isFinite(v) && v >= 0) {
                  p.onDiscountTypeChange(discountTypeInput);
                  p.onDiscountChange(v);
                  p.onNotify?.(`Discount: ${discountTypeInput === 'FIXED' ? fmt(v) : `${v}%`} applied`);
                }
                setDiscountOpen(false);
              }}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        <Stack spacing={0.7}>
          <TotalRow label="Subtotal" value={fmt(p.subtotal)} />
          <TotalRow label="Discount" value={`- ${fmt(p.discountVal)}`} valueColor={p.discountVal > 0 ? brand.primary[700] : brand.neutral[400]} />
          <TotalRow label={`Tax (${p.taxRate > 0 ? `${p.taxRate}%` : '0%'})`} value={fmt(p.tax)} />
          <TotalRow label="Shipping" value={fmt(p.shippingVal)} />
        </Stack>

        <Box
          sx={{
            mt: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pt: 1.2,
            borderTop: `1px solid ${brand.neutral[200]}`,
          }}
        >
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: brand.neutral[900], textTransform: 'uppercase' }}>
            Total
          </Typography>
          <Typography sx={{ fontSize: '1.55rem', fontWeight: 900, color: brand.primary[700], letterSpacing: 0 }}>
            {fmt(p.grand)}
          </Typography>
        </Box>
      </Box>
    </Card>

    {editLine && (
    <EditLineModal
      open={editLineIdx !== null}
      onClose={() => { setEditLineIdx(null); setEditLine(null); }}
      line={editLine}
      lineIndex={editLineIdx!}
      product={p.products.find((prod) => prod.id === editLine.productId)}
      stockAvailable={p.stockMap[editLine.productId]?.available}
      onSave={(index, patch) => p.onPatchLine?.(index, patch)}
    />
    )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CartItem
// ═══════════════════════════════════════════════════════════════════════════

function CartItem({
  line, onInc, onDec, onRemove, onEditClick, onPatchLine,
}: {
  line: Line;
  onInc: () => void; onDec: () => void; onRemove: () => void;
  onEditClick: () => void;
  onPatchLine: (patch: Partial<Line>) => void;
}) {
  const lineTotal = line.unitPrice * line.qty;

  return (
    <Box
      sx={{
        position: 'relative',
        p: 1.4,
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: '14px',
        bgcolor: '#fff',
        boxShadow: `0 1px 2px ${brand.neutral[900]}06`,
        transition: 'transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: brand.primary[300],
          boxShadow: `0 12px 24px -18px ${brand.primary[700]}66`,
        },
      }}
    >
      {/* Top-right action icons */}
      <Stack
        direction="row"
        spacing={0.25}
        sx={{ position: 'absolute', top: 6, right: 6 }}
      >
        <Tooltip title="Edit line" arrow>
          <IconButton
            size="small"
            onClick={onEditClick}
            sx={{
              width: 24, height: 24, borderRadius: '6px',
              color: brand.neutral[400],
              bgcolor: '#fff',
              '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
            }}
          >
            <IconEdit size={13} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove" arrow>
          <IconButton
            size="small"
            onClick={onRemove}
            sx={{
              width: 24, height: 24, borderRadius: '6px',
              color: brand.neutral[400],
              bgcolor: '#fff',
              '&:hover': { color: brand.error.main, bgcolor: brand.error.light },
            }}
          >
            <IconX size={13} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Name + SKU */}
      <Box sx={{ pr: 6, mb: 1.1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: brand.neutral[900], lineHeight: 1.25, letterSpacing: '-0.01em' }} noWrap>
          {line.productName}
        </Typography>
        {line.productCode && (
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            SKU: {line.productCode}
          </Typography>
        )}
      </Box>

      {/* Qty stepper + Price */}
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={0} alignItems="center" sx={{
          border: `1px solid ${brand.neutral[200]}`,
          borderRadius: '10px',
          overflow: 'hidden',
          bgcolor: '#fff',
          boxShadow: `inset 0 0 0 1px ${brand.neutral[50]}`,
        }}>
          <IconButton
            size="small"
            onClick={onDec}
            sx={{
              width: 26, height: 26, borderRadius: 0,
              color: brand.neutral[600],
              '&:hover': { bgcolor: brand.primary[50], color: brand.primary[700] },
            }}
          >
            <IconMinus size={13} />
          </IconButton>
          <Typography sx={{
            minWidth: 28, textAlign: 'center', fontWeight: 900, fontSize: '0.84rem',
            borderLeft: `1px solid ${brand.neutral[200]}`,
            borderRight: `1px solid ${brand.neutral[200]}`,
            py: '2px',
            color: brand.neutral[900],
          }}>
            {line.qty}
          </Typography>
          <IconButton
            size="small"
            onClick={onInc}
            sx={{
              width: 26, height: 26, borderRadius: 0,
              color: brand.neutral[600],
              '&:hover': { bgcolor: brand.primary[50], color: brand.primary[700] },
            }}
          >
            <IconPlus size={13} />
          </IconButton>
        </Stack>

        <Typography sx={{ fontWeight: 900, fontSize: '0.98rem', color: brand.primary[700], letterSpacing: '-0.01em' }}>
          {fmt(lineTotal)}
        </Typography>
      </Stack>

      {/* Retail price dropdown + unit price */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <Select
          size="small"
          value={line.priceTier ?? 'retail'}
          IconComponent={IconChevronDown}
          onChange={(e) => {
            const tier = e.target.value as NonNullable<Line['priceTier']>;
            const unitPrice = unitPriceForTier(line, tier);
            onPatchLine({ priceTier: tier, unitPrice });
          }}
          sx={{
            flex: 1,
            height: 28,
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '9px',
            bgcolor: brand.neutral[50],
            '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.neutral[200] },
            '& .MuiSelect-icon': { color: brand.neutral[500], right: 6 },
          }}
        >
          <MenuItem value="retail">Retail Price</MenuItem>
          <MenuItem value="wholesale">Wholesale</MenuItem>
          <MenuItem value="member">Member</MenuItem>
        </Select>
        <Typography variant="caption" sx={{ color: brand.neutral[500], whiteSpace: 'nowrap', fontWeight: 700 }}>
          {fmt(line.unitPrice)} × {line.qty}
        </Typography>
      </Stack>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TopFilters
// ═══════════════════════════════════════════════════════════════════════════

interface TopFiltersProps {
  search: string; onSearchChange: (v: string) => void;
  barcode: string; onBarcodeChange: (v: string) => void; onBarcodeScan: () => void;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
}

function TopFilters(p: TopFiltersProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: 0,
        mb: 1.25,
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: 'transparent',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(320px, 1fr) 116px 132px' },
            gap: 1.25,
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search product by name, code or scan barcode"
            value={p.search}
            onChange={(e) => p.onSearchChange(e.target.value)}
            sx={{
              ...premiumFieldSx,
              '& .MuiOutlinedInput-root': {
                ...premiumFieldSx['& .MuiOutlinedInput-root'],
                height: 48,
                borderRadius: '10px',
                bgcolor: '#fff',
                '& input': { fontWeight: 600, fontSize: '0.92rem' },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={16} color={brand.neutral[400]} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconQrcode size={18} color={brand.primary[600]} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            size="small"
            placeholder="Scan barcode"
            value={p.barcode}
            inputRef={p.barcodeRef}
            onChange={(e) => p.onBarcodeChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') p.onBarcodeScan();
              if (e.key === 'Escape') p.onBarcodeChange('');
            }}
            sx={{
              ...premiumFieldSx,
              '& .MuiOutlinedInput-root': {
                ...premiumFieldSx['& .MuiOutlinedInput-root'],
                height: 48,
                borderRadius: '10px',
                bgcolor: '#fff',
                '& fieldset': { borderColor: brand.neutral[200] },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconBarcode size={16} color={brand.primary[600]} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            variant="outlined"
            startIcon={<IconAdjustmentsHorizontal size={17} />}
            sx={{
              height: 48,
              borderRadius: '10px',
              borderColor: brand.neutral[200],
              color: brand.neutral[800],
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
            }}
          >
            Filter
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

function ProductTabs({ activeTab, onTabChange }: { activeTab: LayoutTab; onTabChange: (tab: LayoutTab) => void }) {
  const tabs: { id: LayoutTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Products', icon: <IconShoppingCart size={18} /> },
    { id: 'featured', label: 'Favourites', icon: <IconStar size={18} /> },
    { id: 'recent', label: 'Recently Added', icon: <IconClock size={18} /> },
    { id: 'low', label: 'Low Stock', icon: <IconBoxIcon /> },
    { id: 'bestsellers', label: 'Best Sellers', icon: <IconTrendingUp size={18} /> },
  ];

  return (
    <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Button
            key={tab.id}
            startIcon={tab.icon}
            onClick={() => onTabChange(tab.id)}
            sx={{
              height: 42,
              px: 1.55,
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 800,
              color: isActive ? '#fff' : brand.neutral[700],
              bgcolor: isActive ? brand.primary[600] : 'transparent',
              border: `1px solid ${isActive ? brand.primary[600] : 'transparent'}`,
              '&:hover': {
                bgcolor: isActive ? brand.primary[700] : brand.primary[50],
                color: isActive ? '#fff' : brand.primary[700],
              },
            }}
          >
            {tab.label}
          </Button>
        );
      })}
    </Stack>
  );
}

function IconBoxIcon() {
  return <IconBox size={18} color={brand.warning.main} />;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ProductGrid + ProductCard
// ═══════════════════════════════════════════════════════════════════════════

function ProductGrid({
  products, loading, onAdd, stockMap, stockLoading,
}: { products: Product[]; loading: boolean; onAdd: (p: Product) => void; stockMap: Record<string, StockLevel>; stockLoading: boolean }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [products]);

  const pageCount = Math.max(1, Math.ceil(products.length / PRODUCT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PRODUCT_PAGE_SIZE;
  const paginatedProducts = products.slice(pageStart, pageStart + PRODUCT_PAGE_SIZE);

  // Use auto-fill so cards always fit comfortably regardless of how wide the
  // products area happens to be (the checkout panel takes a fixed slice).
  const gridSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(auto-fill, minmax(150px, 1fr))',
      sm: 'repeat(auto-fill, minmax(172px, 1fr))',
      md: 'repeat(auto-fill, minmax(178px, 1fr))',
      xl: 'repeat(auto-fill, minmax(190px, 1fr))',
    },
    gap: { xs: 1.5, md: 1.75, xl: 2 },
  } as const;

  if (loading || stockLoading) {
    return (
      <Box sx={gridSx}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Card
            key={i}
            elevation={0}
            sx={{ ...posSurface, borderRadius: '8px', overflow: 'hidden' }}
          >
            <Skeleton variant="rectangular" sx={{ aspectRatio: '1/1', width: '100%' }} />
            <Box sx={{ p: 1.5 }}>
              <Skeleton variant="text" sx={{ width: '85%', height: 16 }} />
              <Skeleton variant="text" sx={{ width: '50%', height: 14 }} />
              <Skeleton variant="text" sx={{ width: '40%', height: 18, mt: 0.5 }} />
            </Box>
          </Card>
        ))}
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
        border: `1.5px dashed ${brand.neutral[200]}`,
          borderRadius: '8px',
          bgcolor: '#fff',
          boxShadow: `0 14px 34px -26px ${brand.neutral[900]}44`,
        }}
      >
        <Avatar
          sx={{
            width: 56, height: 56,
            mx: 'auto', mb: 1.5,
            bgcolor: brand.neutral[100],
            color: brand.neutral[500],
            borderRadius: '14px',
          }}
        >
          <IconSearch size={24} />
        </Avatar>
        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[700] }}>
          No products match your filters
        </Typography>
        <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
          Try clearing the search or category filter
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: 1.25 }}>
      <Box sx={gridSx}>
        {paginatedProducts.map((p) => (
          <ProductCard key={p.id} product={p} stock={stockMap[p.id]} onAdd={() => onAdd(p)} />
        ))}
      </Box>

      {products.length > PRODUCT_PAGE_SIZE && (
        <Box
          sx={{
            mt: 'auto',
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            borderTop: `1px solid ${brand.neutral[100]}`,
          }}
        >
          <Typography sx={{ fontSize: '0.72rem', color: brand.neutral[500], fontWeight: 700 }}>
            Page {currentPage} · {products.length} products
          </Typography>
          <Pagination
            count={pageCount}
            page={currentPage}
            onChange={(_, value) => setPage(value)}
            size="small"
            shape="rounded"
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: brand.neutral[600],
              },
              '& .Mui-selected': {
                bgcolor: `${brand.primary[600]} !important`,
                color: '#fff',
                boxShadow: `0 6px 14px -8px ${brand.primary[700]}`,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

function ProductCard({ product, stock, onAdd }: { product: Product; stock?: StockLevel; onAdd: () => void }) {
  const hasStock = stock !== undefined;
  const available = stock ? stock.available : -1;
  const outOfStock = !hasStock || available <= 0;
  const lowStock = hasStock && available > 0 && stock.available <= stock.stockAlertThreshold;

  const stockLabel = !hasStock ? 'No stock' : available <= 0 ? 'Out of stock' : `${available} pc`;
  const stockChipColor = outOfStock
    ? { bg: brand.error.light, color: brand.error.dark, border: `${brand.error.main}33` }
    : lowStock
      ? { bg: brand.warning.light, color: brand.warning.dark, border: `${brand.warning.main}33` }
      : { bg: brand.success.light, color: brand.success.dark, border: `${brand.success.main}33` };

  const handleAction = () => {
    if (outOfStock) return;
    onAdd();
  };

  return (
    <Card
      elevation={0}
      tabIndex={0}
      role="button"
      aria-label={outOfStock ? `${product.name} — out of stock` : `Add ${product.name}`}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        ...posSurface,
        borderRadius: '8px',
        opacity: outOfStock ? 0.55 : 1,
        transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease',
        cursor: outOfStock ? 'not-allowed' : 'pointer',
        ...focusVisibleSx,
        '&:hover': outOfStock ? {} : {
          transform: 'translateY(-3px)',
          borderColor: brand.primary[300],
          boxShadow: `0 20px 36px -24px ${brand.primary[700]}77`,
          '& .product-add-btn': {
            opacity: 1,
            transform: 'scale(1)',
          },
        },
        '&:active': outOfStock ? {} : { transform: 'translateY(-1px)' },
      }}
      onClick={handleAction}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !outOfStock) {
          event.preventDefault();
          onAdd();
        }
      }}
    >
      {/* Image / placeholder */}
      <Box
        sx={{
          aspectRatio: '1/1',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {product.imageUrl ? (
          <Box
            component="img"
            src={product.imageUrl}
            alt={product.name}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', p: 1 }}
          />
        ) : (
          <Typography
            sx={{
              fontSize: '3rem',
              fontWeight: 800,
              color: brand.primary[300],
              letterSpacing: '-0.04em',
            }}
          >
            {product.name.charAt(0).toUpperCase()}
          </Typography>
        )}

        {/* Stock chip */}
        <Chip
          size="small"
          label={stockLabel}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            height: 22,
            fontSize: '0.68rem',
            fontWeight: 700,
            bgcolor: stockChipColor.bg,
            color: stockChipColor.color,
            borderRadius: '8px',
            border: `1px solid ${stockChipColor.border}`,
            backdropFilter: 'blur(6px)',
          }}
        />

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <Typography
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.9rem',
              color: brand.error.dark,
              bgcolor: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(2px)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Out of stock
          </Typography>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 1.45, borderTop: `1px solid ${brand.neutral[100]}` }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.86rem',
            color: brand.neutral[900],
            lineHeight: 1.3,
            mb: 0.25,
          }}
          noWrap
        >
          {product.name}
        </Typography>
        <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block', mb: 0.8, fontWeight: 600 }} noWrap>
          SKU: {product.code}
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 900, fontSize: '0.98rem', color: brand.primary[700], letterSpacing: '-0.01em' }}>
            {fmt(product.price)}
          </Typography>
          <IconButton
            className="product-add-btn"
            disabled={outOfStock}
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            sx={{
              width: 30, height: 30,
              borderRadius: '10px',
              bgcolor: outOfStock ? brand.neutral[300] : brand.primary[600],
              color: outOfStock ? brand.neutral[500] : '#fff',
              opacity: 0.85,
              transform: 'scale(0.95)',
              transition: 'all 0.18s ease',
              boxShadow: outOfStock ? 'none' : `0 4px 10px -2px ${brand.primary[500]}55`,
              ...focusVisibleSx,
              '&:hover': outOfStock ? {} : { bgcolor: brand.primary[700], boxShadow: `0 6px 14px -2px ${brand.primary[500]}77` },
            }}
          >
            <IconPlus size={15} stroke={3} />
          </IconButton>
        </Stack>
      </Box>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  POS item-add beep variant (localStorage)
// ═══════════════════════════════════════════════════════════════════════════

function PosBeepSoundPicker() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [variant, setVariant] = useState<PosBeepVariantId>(() => getPosBeepVariant());

  const open = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const close = () => setAnchorEl(null);

  const choose = (id: PosBeepVariantId) => {
    setPosBeepVariant(id);
    setVariant(id);
    playPosAddBeep(id);
    close();
  };

  const label = POS_BEEP_VARIANTS.find((v) => v.id === variant)?.label ?? 'Sound';

  return (
    <>
      <Tooltip title={`Item sound: ${label}`} arrow>
        <IconButton
          size="small"
          onClick={open}
          aria-haspopup="true"
          aria-expanded={Boolean(anchorEl)}
          aria-label="Choose item add sound"
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: '10px',
            border: `1px solid ${brand.neutral[200]}`,
            color: variant === 'off' ? brand.neutral[400] : brand.primary[600],
            bgcolor: '#fff',
            '&:hover': { bgcolor: brand.primary[50], borderColor: brand.primary[200] },
            ...focusVisibleSx,
          }}
        >
          <IconBell size={17} stroke={1.75} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mb: 0.75,
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: `0 12px 32px -16px ${brand.neutral[900]}55`,
              minWidth: 220,
            },
          },
        }}
      >
        {POS_BEEP_VARIANTS.map((v) => (
          <MenuItem
            key={v.id}
            selected={variant === v.id}
            onClick={() => choose(v.id)}
            sx={{ py: 1, borderRadius: '8px', mx: 0.5, my: 0.25 }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              {variant === v.id ? (
                <IconCheck size={18} color={brand.primary[600]} stroke={2.5} />
              ) : (
                <Box component="span" sx={{ display: 'inline-block', width: 18 }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={v.label}
              primaryTypographyProps={{ fontWeight: 700, fontSize: '0.84rem' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PaymentScreen
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentScreenProps {
  lines: Line[];
  totalItems: number;
  grand: number;
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  tendered: string;
  onTenderedChange: (value: string) => void;
  change: number;
  paymentChoice: PaymentChoice;
  onPaymentChoiceChange: (choice: PaymentChoice) => void;
  customerName: string;
  submitting: boolean;
  canComplete: boolean;
  onBack: () => void;
  onComplete: () => void;
  taxRate: number;
  splitPayments?: { method: PaymentChoice; amount: number }[];
  onSplitPaymentsChange?: (payments: { method: PaymentChoice; amount: number }[]) => void;
}

function PaymentScreen(p: PaymentScreenProps) {
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentChoice; amount: number }[]>([]);
  const tenderedNumber = Number(p.tendered) || 0;

  const splitTotal = splitPayments.reduce((s, sp) => s + sp.amount, 0);
  const splitRemaining = Math.max(0, p.grand - splitTotal);

  const addSplitPayment = () => {
    setSplitPayments((prev) => [...prev, { method: 'CASH', amount: 0 }]);
  };

  const updateSplitPayment = (index: number, patch: Partial<{ method: PaymentChoice; amount: number }>) => {
    setSplitPayments((prev) => prev.map((sp, i) => (i === index ? { ...sp, ...patch } : sp)));
  };

  const removeSplitPayment = (index: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const presetValues = [
    p.grand,
    Math.ceil(p.grand / 100000) * 100000,
    Math.ceil(p.grand / 500000) * 500000,
  ].filter((value, index, arr) => value > 0 && arr.indexOf(value) === index);

  const setDigit = (digit: string) => {
    const next = `${p.tendered || ''}${digit}`.replace(/^0+(?=\d)/, '');
    p.onTenderedChange(next);
  };

  const backspace = () => p.onTenderedChange((p.tendered || '').slice(0, -1));

  const effectiveCanComplete = p.paymentChoice === 'SPLIT'
    ? splitRemaining <= 0 && p.submitting === false
    : p.canComplete;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '450px minmax(0, 1fr)' },
        gap: 1.5,
        p: 1.5,
        overflow: 'hidden',
      }}
    >
      <Card
        elevation={0}
        sx={{
          ...posSurface,
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 2, borderBottom: `1px solid ${brand.neutral[200]}` }}
        >
          <Button
            startIcon={<IconArrowLeft size={18} />}
            onClick={p.onBack}
            sx={{ color: brand.neutral[800], fontWeight: 800, textTransform: 'none' }}
          >
            Back to Cart
          </Button>
          <Chip
            label={`${p.totalItems} Items`}
            sx={{ bgcolor: brand.success.light, color: brand.success.dark, fontWeight: 800, borderRadius: '999px' }}
          />
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 1.5, ...softScrollSx }}>
          <Stack spacing={1.2}>
            {p.lines.map((line, index) => (
              <PaymentCartRow key={`${line.productId}-${index}`} line={line} />
            ))}
          </Stack>
        </Box>

        <Box sx={{ borderTop: `1px solid ${brand.neutral[200]}`, px: 2, py: 1.5 }}>
          <Stack spacing={0.75}>
            <TotalRow label="Subtotal" value={fmt(p.subtotal)} />
            <TotalRow label="Discount" value={`- ${fmt(p.discount)}`} valueColor={brand.primary[700]} />
            <TotalRow label={`Tax (${p.taxRate}%)`} value={fmt(p.tax)} />
            <TotalRow label="Shipping" value={fmt(p.shipping)} />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.4, pt: 1.4, borderTop: `1px solid ${brand.neutral[200]}` }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: brand.neutral[900], textTransform: 'uppercase' }}>
              Total Payable
            </Typography>
            <Typography sx={{ fontSize: '1.45rem', fontWeight: 900, color: brand.primary[700] }}>
              {fmt(p.grand)}
            </Typography>
          </Stack>
        </Box>
      </Card>

      <Card
        elevation={0}
        sx={{
          ...posSurface,
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${brand.neutral[200]}` }}
        >
          <Box>
            <Typography sx={{ fontSize: '1.45rem', fontWeight: 900, color: brand.neutral[900], lineHeight: 1.05 }}>
              Payment
            </Typography>
            <Typography sx={{ mt: 0.4, color: brand.neutral[500], fontWeight: 600 }}>
              Choose payment method and complete the sale
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<IconX size={18} />}
            onClick={p.onBack}
            sx={{ height: 46, borderRadius: '10px', textTransform: 'none', color: brand.neutral[800], borderColor: brand.neutral[200], fontWeight: 800 }}
          >
            Cancel Payment
          </Button>
        </Stack>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.15fr) 420px' },
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 2.5, py: 2.5, overflowY: 'auto', ...softScrollSx }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: brand.neutral[900], mb: 1.5 }}>
              Select Payment Method
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              <PaymentMethodCard choice="CASH" active={p.paymentChoice === 'CASH'} icon={<IconCoin size={30} />} title="Cash" subtitle="Pay with cash" onClick={p.onPaymentChoiceChange} />
              <PaymentMethodCard choice="CARD" active={p.paymentChoice === 'CARD'} icon={<IconCreditCard size={30} />} title="Card" subtitle="Visa, Mastercard, etc." onClick={p.onPaymentChoiceChange} />
              <PaymentMethodCard choice="MOBILE" active={p.paymentChoice === 'MOBILE'} icon={<IconDeviceMobile size={30} />} title="Mobile Money" subtitle="M-Pesa, Tigo Pesa, etc." onClick={p.onPaymentChoiceChange} />
              <PaymentMethodCard choice="BANK" active={p.paymentChoice === 'BANK'} icon={<IconBuildingBank size={30} />} title="Bank Transfer" subtitle="Direct bank transfer" onClick={p.onPaymentChoiceChange} />
              <PaymentMethodCard choice="USSD" active={p.paymentChoice === 'USSD'} icon={<IconCalculator size={30} />} title="USSD" subtitle="Pay via USSD code" onClick={p.onPaymentChoiceChange} />
              <PaymentMethodCard choice="SPLIT" active={p.paymentChoice === 'SPLIT'} icon={<IconSparkles size={30} />} title="Mixed Payment" subtitle="Combine payment" badge="New" onClick={p.onPaymentChoiceChange} />
            </Box>

            {p.paymentChoice === 'SPLIT' ? (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.2 }}>
                  <Typography sx={{ fontWeight: 900, color: brand.neutral[900] }}>
                    Split Payment
                  </Typography>
                  <Chip
                    label={`Remaining: ${fmt(splitRemaining)}`}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      bgcolor: splitRemaining > 0 ? brand.warning.light : brand.success.light,
                      color: splitRemaining > 0 ? brand.warning.dark : brand.success.dark,
                    }}
                  />
                </Stack>
                {splitPayments.map((sp, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1, p: 1.2, borderRadius: '8px', bgcolor: '#fff', border: `1px solid ${brand.neutral[200]}` }}
                  >
                    <TextField
                      select
                      size="small"
                      value={sp.method}
                      onChange={(e) => updateSplitPayment(index, { method: e.target.value as PaymentChoice })}
                      sx={{ minWidth: 140, ...premiumFieldSx }}
                    >
                      <MenuItem value="CASH">Cash</MenuItem>
                      <MenuItem value="CARD">Card</MenuItem>
                      <MenuItem value="MOBILE">Mobile Money</MenuItem>
                      <MenuItem value="BANK">Bank Transfer</MenuItem>
                      <MenuItem value="USSD">USSD</MenuItem>
                    </TextField>
                    <TextField
                      size="small"
                      type="number"
                      value={sp.amount || ''}
                      onChange={(e) => updateSplitPayment(index, { amount: Number(e.target.value) || 0 })}
                      placeholder="Amount"
                      sx={{ flex: 1, ...premiumFieldSx }}
                      InputProps={{ startAdornment: <InputAdornment position="start">TSh</InputAdornment> }}
                    />
                    <IconButton size="small" onClick={() => removeSplitPayment(index)} sx={{ color: brand.error.main }}>
                      <IconX size={16} />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  size="small"
                  startIcon={<IconPlus size={16} />}
                  onClick={addSplitPayment}
                  disabled={splitRemaining <= 0}
                  sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '8px', mt: 0.5 }}
                >
                  Add payment method
                </Button>
                {splitPayments.length > 0 && (
                  <Box sx={{ mt: 1.5, p: 1.3, borderRadius: '8px', bgcolor: '#fff', border: `1px solid ${brand.neutral[200]}` }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ fontWeight: 700, color: brand.neutral[700] }}>Total tendered</Typography>
                      <Typography sx={{ fontWeight: 900, color: brand.primary[700] }}>{fmt(splitTotal)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, color: brand.neutral[700] }}>Change due</Typography>
                      <Typography sx={{ fontWeight: 900, color: brand.success.dark }}>{fmt(Math.max(0, splitTotal - p.grand))}</Typography>
                    </Stack>
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: '8px',
                  border: `1px solid ${brand.primary[100]}`,
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
                }}
              >
                <Typography sx={{ fontWeight: 900, color: brand.neutral[900], mb: 1.2 }}>
                  {p.paymentChoice === 'CASH' ? 'Cash Payment' : p.paymentChoice === 'CARD' ? 'Card Payment' : p.paymentChoice === 'MOBILE' ? 'Mobile Payment' : p.paymentChoice === 'BANK' ? 'Bank Transfer' : 'USSD Payment'}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.25fr' }, gap: 1.2 }}>
                  <Box sx={{ p: 1.3, borderRadius: '8px', bgcolor: '#fff', border: `1px solid ${brand.neutral[200]}` }}>
                    <Typography sx={{ color: brand.neutral[600], fontWeight: 700, mb: 0.7 }}>Amount Due</Typography>
                    <Typography sx={{ fontSize: '1.45rem', color: brand.primary[700], fontWeight: 900 }}>{fmt(p.grand)}</Typography>
                  </Box>
                  <Box sx={{ p: 1.3, borderRadius: '8px', bgcolor: '#fff', border: `1px solid ${brand.neutral[200]}` }}>
                    <Typography sx={{ color: brand.neutral[600], fontWeight: 700, mb: 0.7 }}>Cash Received</Typography>
                    <Typography sx={{ fontSize: '1.65rem', color: brand.neutral[900], fontWeight: 900 }}>{tenderedNumber ? fmt(tenderedNumber) : 'TSh 0'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 1.3 }}>
                  <Typography sx={{ color: brand.neutral[700], fontWeight: 800 }}>Change</Typography>
                  <Typography sx={{ mt: 0.3, fontSize: '1.45rem', color: brand.primary[700], fontWeight: 900 }}>{fmt(p.change)}</Typography>
                </Box>
              </Box>
            )}
          </Box>

          {p.paymentChoice !== 'SPLIT' && (
            <Box sx={{ borderLeft: { lg: `1px solid ${brand.neutral[200]}` }, px: 2.5, py: 2.5, overflowY: 'auto', ...softScrollSx }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: brand.neutral[900], mb: 1.5 }}>
                Enter Cash Received
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25 }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <KeypadButton key={digit} label={digit} hint={keypadHint(digit)} onClick={() => setDigit(digit)} />
                ))}
                <KeypadButton label="C" hint="Clear" danger onClick={() => p.onTenderedChange('')} />
                <KeypadButton label="0" onClick={() => setDigit('0')} />
                <KeypadButton icon={<IconBackspace size={24} />} onClick={backspace} />
              </Box>

              <Box sx={{ mt: 1.8, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                {presetValues.map((value, index) => (
                  <TenderQuickPick
                    key={value}
                    value={value}
                    label={index === 0 ? 'Exact' : `+ ${fmt(Math.max(0, value - p.grand)).replace('TSh ', '')}`}
                    active={tenderedNumber === value}
                    onClick={() => p.onTenderedChange(String(value))}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          alignItems={{ lg: 'center' }}
          sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${brand.neutral[200]}` }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1, flex: 1 }}>
            <PaymentMeta icon={<IconUser size={21} />} label="Customer" value={p.customerName} />
            <PaymentMeta icon={<IconSparkles size={21} />} label="Order Type" value="Retail Sale" />
            <PaymentMeta icon={<IconReceipt size={21} />} label="Sale ID" value="#SL-2505-0001" />
          </Box>
          <Button
            variant="contained"
            size="large"
            disabled={!effectiveCanComplete}
            onClick={p.onComplete}
            endIcon={p.submitting ? <CircularProgress size={18} color="inherit" /> : <IconArrowRight size={22} />}
            sx={{
              minWidth: 300,
              minHeight: 62,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 900,
              background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
              '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
            }}
          >
            {p.submitting ? 'Completing...' : p.paymentChoice === 'SPLIT' ? `Complete Payment · ${fmt(splitTotal)}` : `Complete Payment ${tenderedNumber ? fmt(tenderedNumber) : ''}`}
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}

function PaymentCartRow({ line }: { line: Line }) {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ pb: 1.2, borderBottom: `1px solid ${brand.neutral[100]}` }}>
      <Avatar variant="rounded" sx={{ width: 56, height: 56, borderRadius: '8px', bgcolor: brand.neutral[50], color: brand.primary[700], fontWeight: 900 }}>
        {line.productName.charAt(0)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ color: brand.neutral[900], fontWeight: 800 }} noWrap>{line.productName}</Typography>
        <Typography sx={{ color: brand.neutral[500], fontSize: '0.8rem', fontWeight: 600 }}>SKU: {line.productCode || line.productId.slice(0, 8)}</Typography>
        <Typography sx={{ color: brand.neutral[700], fontSize: '0.86rem', fontWeight: 700 }}>{line.qty} x Retail Price</Typography>
      </Box>
      <Typography sx={{ color: brand.neutral[900], fontWeight: 900 }}>{fmt(line.unitPrice * line.qty)}</Typography>
    </Stack>
  );
}

function PaymentMethodCard({
  choice, active, icon, title, subtitle, badge, onClick,
}: {
  choice: PaymentChoice; active: boolean; icon: React.ReactNode; title: string; subtitle: string; badge?: string; onClick: (choice: PaymentChoice) => void;
}) {
  return (
    <Box
      onClick={() => onClick(choice)}
      role="button"
      tabIndex={0}
      sx={{
        minHeight: 132,
        p: 1.7,
        borderRadius: '8px',
        border: `1.5px solid ${active ? brand.primary[500] : brand.neutral[200]}`,
        bgcolor: active ? brand.primary[50] : '#fff',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.16s ease',
        '&:hover': { borderColor: brand.primary[400], transform: 'translateY(-1px)' },
      }}
    >
      {active && (
        <Avatar sx={{ position: 'absolute', top: 14, right: 14, width: 22, height: 22, bgcolor: brand.primary[600] }}>
          <IconCheck size={14} />
        </Avatar>
      )}
      {badge && (
        <Chip label={badge} size="small" sx={{ position: 'absolute', top: 14, right: 14, bgcolor: brand.primary[600], color: '#fff', fontWeight: 800 }} />
      )}
      <Box sx={{ color: choice === 'CASH' ? brand.primary[700] : brand.info.dark, mb: 2.1 }}>{icon}</Box>
      <Typography sx={{ fontWeight: 900, color: brand.neutral[900] }}>{title}</Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: '0.84rem', fontWeight: 600 }}>{subtitle}</Typography>
    </Box>
  );
}

function keypadHint(value: string) {
  const hints: Record<string, string> = { '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ' };
  return hints[value];
}

function KeypadButton({ label, hint, icon, danger, onClick }: { label?: string; hint?: string; icon?: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      sx={{
        height: 86,
        borderRadius: '8px',
        borderColor: brand.neutral[200],
        color: danger ? brand.error.main : brand.neutral[900],
        textTransform: 'none',
        display: 'flex',
        flexDirection: 'column',
        fontWeight: 900,
        fontSize: label === 'C' ? '1.35rem' : '1.55rem',
        '&:hover': { bgcolor: danger ? brand.error.light : brand.primary[50], borderColor: danger ? brand.error.main : brand.primary[300] },
      }}
    >
      {icon || label}
      {hint && <Typography component="span" sx={{ fontSize: '0.72rem', color: danger ? brand.error.main : brand.neutral[500], fontWeight: 700 }}>{hint}</Typography>}
    </Button>
  );
}

function TenderQuickPick({ value, label, active, onClick }: { value: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      sx={{
        height: 72,
        borderRadius: '8px',
        borderColor: active ? brand.primary[300] : brand.neutral[200],
        bgcolor: active ? brand.primary[50] : '#fff',
        color: active ? brand.primary[700] : brand.neutral[800],
        textTransform: 'none',
        flexDirection: 'column',
        fontWeight: 900,
        '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
      }}
    >
      {fmt(value)}
      <Typography component="span" sx={{ fontSize: '0.75rem', color: active ? brand.primary[700] : brand.neutral[500], fontWeight: 700 }}>{label}</Typography>
    </Button>
  );
}

function PaymentMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ p: 1.2, borderRight: { sm: `1px solid ${brand.neutral[200]}` } }}>
      <Box sx={{ color: brand.info.dark }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.76rem', color: brand.neutral[500], fontWeight: 700 }}>{label}</Typography>
        <Typography sx={{ color: brand.neutral[900], fontWeight: 900 }} noWrap>{value}</Typography>
      </Box>
    </Stack>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  FooterBar
// ═══════════════════════════════════════════════════════════════════════════

interface FooterBarProps {
  online: boolean; queueSize: number;
  onClear: () => void;
  onHoldCart?: () => void;
  onOpenHeldCarts?: () => void;

  canCheckout: boolean; submitting: boolean;
  onCheckout: () => void;
  grand: number; itemCount: number;
  labelPay: string; labelProcessing: string;
}

function FooterBar(p: FooterBarProps) {
  const statusColor = p.online ? brand.success.main : brand.warning.main;
  const statusLabel = p.online ? 'Online' : `Offline · ${p.queueSize} queued`;

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 5,
        height: FOOTER_HEIGHT,
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        bgcolor: '#fff',
        borderTop: `1px solid ${brand.neutral[200]}`,
        boxShadow: `0 -6px 18px -12px ${brand.neutral[900]}44`,
        backdropFilter: 'blur(14px)',
        flexShrink: 0,
      }}
    >
      {/* Left side: status + utility buttons */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            px: 1.25, py: 0.5,
            borderRadius: '999px',
            bgcolor: p.online ? brand.success.light : brand.warning.light,
            border: `1px solid ${statusColor}33`,
            flexShrink: 0,
          }}
        >
          <IconCircleFilled size={9} color={statusColor} />
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: p.online ? brand.success.dark : brand.warning.dark }}>
            {statusLabel}
          </Typography>
        </Stack>

        <FooterAction icon={<IconHome size={15} />} label="Home" to="/smartpos/dashboard" />
        <FooterAction icon={<IconRefresh size={15} />} label="Reset" onClick={p.onClear} />
        <FooterAction icon={<IconReceipt size={15} />} label="Recent Drafts" onClick={p.onOpenHeldCarts} />

        <FooterAction icon={<IconShoppingCart size={15} />} label="Hold" onClick={p.onHoldCart} />
        <PosBeepSoundPicker />
      </Stack>

      {/* Right side: total payable + Pay Now CTA */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            px: 1.5,
            py: 0.8,
            borderRadius: '14px',
            bgcolor: brand.primary[50],
            border: `1px solid ${brand.primary[100]}`,
          }}
        >
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Total Payable
          </Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: brand.primary[700], letterSpacing: '-0.03em' }}>
            {fmt(p.grand)}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          size="large"
          disabled={!p.canCheckout}
          onClick={p.onCheckout}
          startIcon={p.submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={17} />}
          sx={{
            minWidth: 180,
            py: 1.25,
            px: 3,
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '0.95rem',
            letterSpacing: '0.01em',
            textTransform: 'none',
            background: p.canCheckout
              ? `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[500]} 60%, ${brand.accent[500]} 130%)`
              : undefined,
            color: '#fff',
            boxShadow: p.canCheckout ? `0 8px 22px -6px ${brand.primary[500]}77` : 'none',
            ...focusVisibleSx,
            '&:hover': {
              background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[600]} 60%, ${brand.accent[600]} 130%)`,
              transform: 'translateY(-1px)',
              boxShadow: `0 10px 26px -6px ${brand.primary[500]}99`,
            },
            '&:active': { transform: 'translateY(0)' },
            '&.Mui-disabled': {
              background: brand.neutral[200],
              color: brand.neutral[400],
            },
            transition: 'all 0.2s ease',
          }}
        >
          {p.submitting ? p.labelProcessing : `Pay Now · ${p.itemCount} item${p.itemCount === 1 ? '' : 's'}`}
        </Button>
      </Stack>
    </Box>
  );
}

function FooterAction({
  icon, label, onClick, to,
}: { icon: React.ReactNode; label: string; onClick?: () => void; to?: string }) {
  return (
    <Button
      component={to ? Link : 'button'}
      {...(to ? { to } : {})}
      onClick={onClick}
      startIcon={icon}
      sx={{
        textTransform: 'none',
        fontSize: '0.78rem',
        fontWeight: 800,
        color: brand.neutral[700],
        borderRadius: '12px',
        px: 1.35,
        py: 0.65,
        minWidth: 'auto',
        border: `1px solid transparent`,
        ...focusVisibleSx,
        '&:hover': {
          bgcolor: brand.primary[50],
          color: brand.primary[700],
          borderColor: brand.primary[100],
        },
      }}
    >
      {label}
    </Button>
  );
}
