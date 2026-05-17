/**
 * MobileLayout — phone-first POS experience.
 *
 * Design principle: "Breathing Room"
 *   - Only 3 elements always visible: search bar, product grid, cart badge
 *   - Everything else is one tap away — not crammed into the header
 *   - Bottom sheets for cart & payment preserve spatial context
 *   - Generous touch targets (min 44px) for thumb-driven use
 */
import { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconBarcode,
  IconCheck,
  IconChevronRight,
  IconMinus,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconUser,
  IconX,
  IconReceipt,
  IconCash,
  IconCreditCard,
} from '@tabler/icons-react';
import type { PosLayoutProps, LayoutTab } from './PosLayoutProps';
import type { Product } from 'src/api/smartpos/products';
import TotalRow from './TotalRow';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

// ─── Constants ──────────────────────────────────────────────────────────────

const CART_SHEET_HEIGHT = '88dvh';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'featured', label: 'Featured' },
  { key: 'bestsellers', label: 'Best' },
  { key: 'recent', label: 'Recent' },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export default function MobileLayout(props: PosLayoutProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'CREDIT'>('CASH');
  const [tendered, setTendered] = useState('');

  const itemCount = props.lines.reduce((s, l) => s + l.qty, 0);

  // ── Totals ──────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const subtotal = props.totals.subtotal;
    const tax = props.totals.tax;
    const disc = props.totals.discount || 0;
    const grand = Math.max(0, subtotal + tax - disc);
    const tenderedNum = Number(tendered) || 0;
    const change = Math.max(0, tenderedNum - grand);
    return { subtotal, tax, disc, grand, tenderedNum, change };
  }, [props.totals.subtotal, props.totals.tax, props.totals.discount, tendered]);

  // ── Customer ────────────────────────────────────────────────────────────

  const selectedCustomer = props.customers.find(c => c.id === props.customerId) ?? null;
  const creditAvailable = props.creditAvailable && !!selectedCustomer;
  const isCreditSale = creditAvailable && (!tendered || Number(tendered) === 0);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleTab = (tab: string) => {
    setActiveTab(tab);
    props.onTabChange(tab as LayoutTab);
  };

  const handleCheckout = () => {
    if (!props.canCheckout) return;
    if (isCreditSale) {
      props.onPaymentMethodChange('CREDIT');
    } else {
      props.onPaymentMethodChange(paymentMethod === 'CARD' ? 'CARD' : 'CASH');
    }
    props.onTenderedChange(tendered || '0');
    props.onCheckout();
    setPaymentSheetOpen(false);
    setTendered('');
  };

  const openPaymentSheet = () => {
    if (!props.canCheckout) return;
    // Pre-fill tendered with rounded-up amount for cash
    if (!tendered && paymentMethod === 'CASH') {
      setTendered(String(Math.ceil(totals.grand / 1000) * 1000));
    }
    setCartOpen(false);
    setPaymentSheetOpen(true);
  };

  // ── Product Card ────────────────────────────────────────────────────────

  const renderProductCard = (p: Product) => {
    const stock = props.stockMap[p.id];
    const outOfStock = stock && stock.available <= 0;
    const lowStock = stock && stock.available > 0 && stock.available <= 5;

    return (
      <Card
        key={p.id}
        elevation={0}
        onClick={() => { if (!outOfStock) props.onAddProduct(p); }}
        sx={{
          borderRadius: '16px',
          cursor: outOfStock ? 'not-allowed' : 'pointer',
          opacity: outOfStock ? 0.4 : 1,
          bgcolor: '#fff',
          border: '1px solid',
          borderColor: brand.neutral[200],
          overflow: 'hidden',
          transition: 'transform 0.1s ease',
          WebkitTapHighlightColor: 'transparent',
          '&:active': outOfStock ? {} : { transform: 'scale(0.97)', bgcolor: brand.primary[50] },
        }}
      >
        {/* Product image placeholder */}
        <Box
          sx={{
            aspectRatio: '1/1',
            bgcolor: outOfStock ? brand.neutral[100] : brand.primary[50],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Typography
            sx={{
              fontSize: '2rem',
              fontWeight: 800,
              color: outOfStock ? brand.neutral[300] : brand.primary[200],
            }}
          >
            {p.name.charAt(0)}
          </Typography>
          {stock && (
            <Chip
              size="small"
              label={outOfStock ? 'Out' : lowStock ? `${stock.available}` : undefined}
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                height: 20,
                fontSize: '0.625rem',
                fontWeight: 800,
                bgcolor: outOfStock ? brand.error.light : lowStock ? brand.warning.light : brand.success.light,
                color: outOfStock ? brand.error.dark : lowStock ? brand.warning.dark : brand.success.dark,
                borderRadius: '6px',
              }}
            />
          )}
        </Box>
        <Box sx={{ p: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2, mb: 0.5 }} noWrap>
            {p.name}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800] }}>
            {fmt(p.price)}
          </Typography>
        </Box>
      </Card>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: '#F7F8FA', overflow: 'hidden' }}>
      {/* ── Header Strip ────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: '#fff',
          borderBottom: `1px solid ${brand.neutral[100]}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        {/* Customer chip */}
        <Chip
          icon={<IconUser size={14} />}
          label={selectedCustomer?.name ?? 'Walk-in'}
          variant={selectedCustomer ? 'filled' : 'outlined'}
          onClick={() => setCustomerOpen(true)}
          onDelete={selectedCustomer ? undefined : undefined}
          deleteIcon={<IconChevronRight size={14} />}
          sx={{
            fontWeight: 700,
            fontSize: '0.8rem',
            borderRadius: '10px',
            height: 36,
            flex: 1,
            justifyContent: 'flex-start',
            bgcolor: selectedCustomer ? brand.primary[50] : 'transparent',
            color: selectedCustomer ? brand.primary[700] : brand.neutral[500],
            borderColor: brand.neutral[200],
            '& .MuiChip-label': { flex: 1 },
          }}
        />

        {/* Cart badge */}
        <Badge badgeContent={itemCount} color="error" max={99}
          sx={{ '& .MuiBadge-badge': { fontWeight: 800, fontSize: '0.65rem', minWidth: 18, height: 18 } }}>
          <IconButton
            onClick={() => setCartOpen(true)}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: itemCount > 0 ? brand.primary[50] : brand.neutral[50],
              color: itemCount > 0 ? brand.primary[600] : brand.neutral[400],
            }}
          >
            <IconShoppingCart size={20} />
          </IconButton>
        </Badge>
      </Box>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <Box sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search products or scan barcode…"
          value={props.search}
          onChange={e => props.onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} color={brand.neutral[400]} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => props.barcodeRef.current?.focus()}>
                  <IconBarcode size={18} color={brand.primary[600]} />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              borderRadius: '14px',
              bgcolor: '#fff',
              fontSize: '0.9rem',
              '& fieldset': { borderColor: brand.neutral[200] },
              '&:hover fieldset': { borderColor: brand.primary[300] },
            },
          }}
        />
        {/* Hidden barcode input */}
        <Box sx={{ position: 'absolute', left: -9999 }}>
          <input
            ref={props.barcodeRef}
            value={props.barcode}
            onChange={e => props.onBarcodeChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') props.onBarcodeScan(); }}
          />
        </Box>
      </Box>

      {/* ── Tab Chips ───────────────────────────────────────────────────── */}
      <Box sx={{ px: 2, pb: 1, flexShrink: 0, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Stack direction="row" spacing={0.75}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <Chip
                key={tab.key}
                label={tab.label}
                onClick={() => handleTab(tab.key)}
                size="small"
                sx={{
                  height: 32,
                  px: 1.5,
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.78rem',
                  borderRadius: '10px',
                  flexShrink: 0,
                  bgcolor: active ? brand.primary[600] : brand.neutral[100],
                  color: active ? '#fff' : brand.neutral[600],
                  '&:hover': active ? {} : { bgcolor: brand.neutral[200] },
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* ── Product Grid ────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        {props.productsLoading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} elevation={0} sx={{ borderRadius: '16px' }}>
                <Skeleton variant="rectangular" sx={{ aspectRatio: '1/1', borderRadius: '16px 16px 0 0' }} />
                <Box sx={{ p: 1.5 }}>
                  <Skeleton variant="text" sx={{ width: '75%', height: 14 }} />
                  <Skeleton variant="text" sx={{ width: '40%', height: 18, mt: 0.5 }} />
                </Box>
              </Card>
            ))}
          </Box>
        ) : props.products.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontWeight: 700, color: brand.neutral[400] }}>
              No products found
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            {props.products.map(renderProductCard)}
          </Box>
        )}
      </Box>

      {/* ══════════════════════════════════════════════════════════════════════
         CART BOTTOM SHEET
         ══════════════════════════════════════════════════════════════════════ */}
      <Drawer
        anchor="bottom"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        PaperProps={{
          sx: {
            maxHeight: CART_SHEET_HEIGHT,
            height: CART_SHEET_HEIGHT,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* Handle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.neutral[200] }} />
        </Box>

        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, py: 1.5, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Cart</Typography>
            <Chip label={`${itemCount} item${itemCount !== 1 ? 's' : ''}`} size="small"
              sx={{ height: 24, fontWeight: 700, fontSize: '0.7rem', bgcolor: brand.primary[50], color: brand.primary[700], borderRadius: '8px' }} />
          </Stack>
          {props.lines.length > 0 && (
            <Button size="small" onClick={props.onClearCart}
              sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600, color: brand.error.main }}>
              Clear
            </Button>
          )}
        </Stack>

        {/* Line Items */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2 }}>
          {props.lines.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <IconShoppingCart size={40} color={brand.neutral[300]} />
              <Typography sx={{ mt: 2, fontWeight: 700, color: brand.neutral[400] }}>
                Cart is empty
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
                Tap products above to add them
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {props.lines.map((line, i) => (
                <Box
                  key={`${line.productId}-${i}`}
                  sx={{
                    p: 1.5,
                    borderRadius: '14px',
                    border: `1px solid ${brand.neutral[200]}`,
                    bgcolor: '#fff',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ flex: 1, mr: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }} noWrap>
                        {line.productName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                        {fmt(line.unitPrice)} × {line.qty} = {fmt(line.unitPrice * line.qty)}
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <IconButton size="small" onClick={() => props.onDecQty(i)}
                        sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.neutral[50] }}>
                        <IconMinus size={14} />
                      </IconButton>
                      <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                        {line.qty}
                      </Typography>
                      <IconButton size="small" onClick={() => props.onIncQty(i)}
                        sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.primary[50], color: brand.primary[600] }}>
                        <IconPlus size={14} />
                      </IconButton>
                      <IconButton size="small" onClick={() => props.onRemoveLine(i)}
                        sx={{ ml: 0.5, width: 28, height: 28, borderRadius: '8px', color: brand.error.main }}>
                        <IconX size={14} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Totals + Pay */}
        {props.lines.length > 0 && (
          <Box sx={{ borderTop: `1px solid ${brand.neutral[200]}`, px: 2.5, py: 2, flexShrink: 0 }}>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <TotalRow label="Subtotal" value={fmt(totals.subtotal)} size="small" />
              <TotalRow label="Tax" value={fmt(totals.tax)} size="small" />
              {totals.disc > 0 && <TotalRow label="Discount" value={`-${fmt(totals.disc)}`} size="small" />}
              <TotalRow label="Total" value={fmt(totals.grand)} valueWeight={900} size="medium" />
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                onClick={props.onHoldCart}
                disabled={props.lines.length === 0}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '12px',
                  py: 1.4,
                  borderColor: brand.neutral[200],
                  color: brand.neutral[600],
                }}
              >
                Hold
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={openPaymentSheet}
                disabled={!props.canCheckout}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: '12px',
                  py: 1.4,
                  fontSize: '0.95rem',
                  bgcolor: brand.primary[600],
                  '&:hover': { bgcolor: brand.primary[700] },
                  boxShadow: `0 8px 24px -10px ${brand.primary[600]}88`,
                }}
              >
                Pay {fmt(totals.grand)}
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>

      {/* ══════════════════════════════════════════════════════════════════════
         PAYMENT BOTTOM SHEET
         ══════════════════════════════════════════════════════════════════════ */}
      <Drawer
        anchor="bottom"
        open={paymentSheetOpen}
        onClose={() => setPaymentSheetOpen(false)}
        PaperProps={{
          sx: {
            maxHeight: CART_SHEET_HEIGHT,
            height: 'auto',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            pb: 'calc(16px + env(safe-area-inset-bottom, 8px))',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.neutral[200] }} />
        </Box>

        <Box sx={{ px: 2.5, py: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Payment</Typography>
            <IconButton size="small" onClick={() => setPaymentSheetOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>

          {selectedCustomer && creditAvailable && (
            <Chip
              icon={<IconReceipt size={14} />}
              label={`${selectedCustomer.name} · Credit available`}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600, bgcolor: brand.success.light, color: brand.success.dark }}
            />
          )}
        </Box>

        <Stack spacing={2} sx={{ px: 2.5, py: 1.5 }}>
          {/* Payment method pills */}
          <Stack direction="row" spacing={1}>
            {([
              { key: 'CASH' as const, label: 'Cash', icon: <IconCash size={18} /> },
              { key: 'CARD' as const, label: 'Card', icon: <IconCreditCard size={18} /> },
              ...(creditAvailable ? [{ key: 'CREDIT' as const, label: 'Pay Later', icon: <IconReceipt size={18} /> }] : []),
            ]).map(m => {
              const active = paymentMethod === m.key;
              return (
                <Button
                  key={m.key}
                  variant={active ? 'contained' : 'outlined'}
                  startIcon={m.icon}
                  onClick={() => setPaymentMethod(m.key)}
                  sx={{
                    flex: 1,
                    textTransform: 'none',
                    fontWeight: active ? 800 : 600,
                    borderRadius: '12px',
                    py: 1.1,
                    borderColor: brand.neutral[200],
                    bgcolor: active
                      ? m.key === 'CREDIT' ? brand.primary[600] : brand.neutral[800]
                      : 'transparent',
                    color: active ? '#fff' : m.key === 'CREDIT' ? brand.primary[600] : brand.neutral[600],
                    fontSize: '0.85rem',
                  }}
                >
                  {m.label}
                </Button>
              );
            })}
          </Stack>

          {/* Amount (hidden for credit) */}
          {paymentMethod !== 'CREDIT' && (
            <TextField
              label="Amount received"
              type="number"
              value={tendered}
              onChange={e => setTendered(e.target.value)}
              fullWidth
              autoFocus
              InputProps={{
                sx: { fontSize: '1.3rem', fontWeight: 800, borderRadius: '12px' },
              }}
            />
          )}

          {/* Totals summary */}
          <Box sx={{ bgcolor: brand.neutral[50], borderRadius: '12px', p: 2 }}>
            <TotalRow label="Total" value={fmt(totals.grand)} size="medium" valueWeight={900} />
            {paymentMethod !== 'CREDIT' && Number(tendered) > 0 && (
              <TotalRow label="Change" value={fmt(totals.change)} size="small" />
            )}
            {paymentMethod === 'CREDIT' && selectedCustomer && (
              <Typography variant="caption" sx={{ color: brand.primary[600], fontWeight: 700, mt: 0.5, display: 'block' }}>
                Will be added to {selectedCustomer.name}'s tab
              </Typography>
            )}
          </Box>

          {/* Pay button */}
          <Button
            fullWidth
            variant="contained"
            disabled={!props.canCheckout}
            onClick={handleCheckout}
            startIcon={props.submitting ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={20} />}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: '14px',
              py: 1.8,
              fontSize: '1rem',
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
              boxShadow: `0 12px 28px -12px ${brand.primary[600]}88`,
            }}
          >
            {props.submitting
              ? 'Processing…'
              : paymentMethod === 'CREDIT'
                ? `Add to Tab · ${fmt(totals.grand)}`
                : `Pay ${fmt(totals.grand)}`}
          </Button>
        </Stack>
      </Drawer>

      {/* ══════════════════════════════════════════════════════════════════════
         CUSTOMER QUICK-SELECT SHEET
         ══════════════════════════════════════════════════════════════════════ */}
      <Drawer
        anchor="bottom"
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        PaperProps={{
          sx: {
            maxHeight: '60dvh',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.neutral[200] }} />
        </Box>
        <Typography sx={{ px: 2.5, py: 1, fontWeight: 900, fontSize: '1.05rem' }}>
          Select Customer
        </Typography>
        <Box sx={{ px: 2, pb: 2, overflowY: 'auto', maxHeight: '50dvh' }}>
          {/* Walk-in option */}
          <Button
            fullWidth
            variant={!props.customerId ? 'contained' : 'outlined'}
            onClick={() => { props.onCustomerChange(null); setCustomerOpen(false); }}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '12px', py: 1.3, mb: 1,
              justifyContent: 'flex-start',
              borderColor: brand.neutral[200],
              color: !props.customerId ? '#fff' : brand.neutral[600],
              bgcolor: !props.customerId ? brand.neutral[700] : 'transparent',
            }}
          >
            🚶 Walk-in Customer
          </Button>
          {props.customers.slice(0, 30).map(c => (
            <Button
              key={c.id}
              fullWidth
              variant={props.customerId === c.id ? 'contained' : 'outlined'}
              onClick={() => { props.onCustomerChange(c.id); setCustomerOpen(false); }}
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: '12px', py: 1.2, mb: 0.5,
                justifyContent: 'flex-start',
                borderColor: brand.neutral[200],
                color: props.customerId === c.id ? '#fff' : brand.neutral[700],
                bgcolor: props.customerId === c.id ? brand.primary[600] : 'transparent',
              }}
            >
              {c.name}
              {c.creditLimit > 0 && (
                <Chip label={`Limit ${fmt(c.creditLimit)}`} size="small"
                  sx={{ ml: 'auto', height: 22, fontSize: '0.65rem', fontWeight: 700, bgcolor: brand.success.light, color: brand.success.dark }} />
              )}
            </Button>
          ))}
        </Box>
      </Drawer>
    </Box>
  );
}
