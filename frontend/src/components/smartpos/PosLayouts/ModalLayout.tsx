import { useContext } from 'react';
/**
 * Modal POS layout — full products grid, checkout in a fullScreen Dialog.
 *
 * Anatomy:
 *  - Top search + barcode bar with register indicator
 *  - Full-width product grid
 *  - Sticky footer bar showing "Review Order" button with item count + total
 *  - Checkout opens in a fullScreen Dialog with cart and payment inline
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconBarcode,
  IconCheck,
  IconCoin,
  IconCreditCard,
  IconDeviceMobile,
  IconMinus,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconX,
} from '@tabler/icons-react';
import type { PosLayoutProps, PaymentChoice } from './PosLayoutProps';
import type { Line } from './types';
import EditLineModal from 'src/components/smartpos/EditLineModal';
import CashRegisterIndicator from 'src/components/smartpos/CashRegisterIndicator';
import TotalRow from './TotalRow';
import { listCategories, listBrands } from 'src/api/smartpos/products';
import type { Brand as BrandRef, Category } from 'src/api/smartpos/types';
import { posSurface, premiumFieldSx, softScrollSx, focusVisibleSx, FOOTER_HEIGHT } from './shared';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const filterFieldSx = {
  minWidth: 140,
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '8px',
    bgcolor: brand.neutral[800],
    fontSize: '0.82rem',
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.primary[300] },
    '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
  },
} as const;

export default function ModalLayout(props: PosLayoutProps) {
  const { activeMode: _pos } = useContext(CustomizerContext);
  const isDark = _pos === 'dark';
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [editLineIdx, setEditLineIdx] = useState<number | null>(null);
  const [editLine, setEditLine] = useState<Line | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('CASH');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandRef[]>([]);

  useEffect(() => {
    Promise.all([listCategories(), listBrands()])
      .then(([c, b]) => { setCategories(c); setBrands(b); })
      .catch(() => {});
  }, []);

  const itemCount = props.lines.reduce((s, l) => s + l.qty, 0);

  const totals = useMemo(() => {
    const subtotal = props.totals.subtotal;
    const tax = props.totals.tax;
    const disc = props.totals.discount;
    const grand = Math.max(0, subtotal + tax - disc);
    return { subtotal, tax, disc, grand };
  }, [props.totals.subtotal, props.totals.tax, props.totals.discount]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: isDark ? brand.neutral[900] : '#F7F8FA', overflow: 'hidden' }}>
      {/* Top bar */}
      <Box sx={{ px: 1.5, py: 1, bgcolor: isDark ? brand.neutral[800] : '#fff', borderBottom: `1px solid ${brand.neutral[200]}`, display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          value={props.warehouseId}
          onChange={(e) => props.onWarehouseChange(e.target.value)}
          sx={{ ...filterFieldSx, minWidth: 150 }}
        >
          {props.warehouses.map((w) => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
        </TextField>
        <TextField
          size="small"
          placeholder="Search products…"
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          sx={(theme) => ({ flex: 1, minWidth: 140, ...premiumFieldSx(theme) })}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconSearch size={16} color={brand.neutral[400]} /></InputAdornment> } }}
        />
        <TextField
          size="small"
          placeholder="Barcode"
          value={props.barcode}
          inputRef={props.barcodeRef}
          onChange={(e) => props.onBarcodeChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') props.onBarcodeScan(); if (e.key === 'Escape') props.onBarcodeChange(''); }}
          sx={(theme) => ({ width: 140, flexShrink: 0, ...premiumFieldSx(theme) })}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconBarcode size={16} color={brand.primary[600]} /></InputAdornment> } }}
        />
        <TextField select size="small" value={props.categoryId} onChange={(e) => props.onCategoryChange(e.target.value)} slotProps={{ select: { displayEmpty: true } }} sx={filterFieldSx}>
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
        </TextField>
        <TextField select size="small" value={props.brandId} onChange={(e) => props.onBrandChange(e.target.value)} slotProps={{ select: { displayEmpty: true } }} sx={filterFieldSx}>
          <MenuItem value="">All Brands</MenuItem>
          {brands.map((b) => (<MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>))}
        </TextField>
        <CashRegisterIndicator
          session={props.registerSession ?? null}
          loading={props.registerLoading ?? false}
          onOpen={() => props.onOpenRegister?.()}
          onClose={() => props.onCloseRegister?.()}
        />
      </Box>

      {/* Product grid */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, ...softScrollSx }}>
        {props.productsLoading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 1.5 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} elevation={0} sx={posSurface}>
                <Skeleton variant="rectangular" sx={{ aspectRatio: '1/1', width: '100%' }} />
                <Box sx={{ p: 1 }}><Skeleton variant="text" sx={{ width: '80%', height: 14 }} /></Box>
              </Card>
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5, pb: `${FOOTER_HEIGHT + 16}px` }}>
            {props.products.map((p) => {
              const stock = props.stockMap[p.id];
              const outOfStock = stock && stock.available <= 0;
              return (
                <Card
                  key={p.id}
                  elevation={0}
                  onClick={() => { if (!outOfStock) props.onAddProduct(p); }}
                  sx={(theme) => ({
                    ...posSurface(theme),
                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                    opacity: outOfStock ? 0.5 : 1,
                    transition: 'transform 0.15s ease',
                    '&:hover': outOfStock ? {} : { transform: 'translateY(-2px)' },
                    ...focusVisibleSx,
                  })}
                >
                  <Box sx={{ aspectRatio: '1/1', bgcolor: brand.primary[50], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: brand.primary[200] }}>{p.name.charAt(0).toUpperCase()}</Typography>
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem' }} noWrap>{p.name}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.86rem', color: brand.primary[700], mt: 0.25 }}>{fmt(p.price)}</Typography>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Footer bar: Review Order */}
      <Box sx={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: FOOTER_HEIGHT,
        px: 2, py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: isDark ? brand.neutral[800] : '#fff',
        borderTop: `1px solid ${brand.neutral[200]}`,
        boxShadow: `0 -6px 18px -12px ${brand.neutral[900]}44`,
        zIndex: 1100,
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Badge badgeContent={itemCount} color="primary" sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
            <IconShoppingCart size={22} color={brand.primary[600]} />
          </Badge>
          <Typography sx={{ fontWeight: 800, color: isDark ? brand.neutral[300] : brand.neutral[700] }}>{itemCount} items</Typography>
        </Stack>
        <Button
          variant="contained"
          disabled={props.lines.length === 0}
          onClick={() => setCheckoutOpen(true)}
          startIcon={<IconCheck size={17} />}
          sx={{
            minWidth: 200,
            py: 1.25,
            px: 3,
            borderRadius: '14px',
            fontWeight: 800,
            textTransform: 'none',
            background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[500]} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[600]} 100%)` },
          }}
        >
          Review Order · {fmt(totals.grand)}
        </Button>
      </Box>

      {/* FullScreen Checkout Dialog */}
      <Dialog
        fullScreen
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        TransitionProps={{ timeout: 300 }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: isDark ? brand.neutral[900] : '#F7F8FA' }}>
          {/* Header */}
          <Box sx={{ px: 2, py: 1.5, bgcolor: isDark ? brand.neutral[800] : '#fff', borderBottom: `1px solid ${brand.neutral[200]}`, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <IconButton onClick={() => setCheckoutOpen(false)}><IconArrowLeft size={20} /></IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, fontSize: '1.05rem' }}>Checkout</Typography>
              <Typography variant="caption" sx={{ color: isDark ? brand.neutral[400] : brand.neutral[500], fontWeight: 600 }}>{itemCount} items</Typography>
            </Box>
            <Chip label={`Total: ${fmt(totals.grand)}`} sx={{ fontWeight: 800, bgcolor: brand.primary[50], color: brand.primary[700], borderRadius: '999px' }} />
          </Box>

          {/* Cart items */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, ...softScrollSx }}>
            {props.lines.length === 0 ? (
              <Typography sx={{ textAlign: 'center', py: 4, color: isDark ? brand.neutral[400] : brand.neutral[500] }}>No items in cart</Typography>
            ) : (
              <Stack spacing={1.5}>
                {props.lines.map((line, i) => (
                  <Box
                    key={`${line.productId}-${i}`}
                    sx={{
                      p: 1.5,
                      bgcolor: isDark ? brand.neutral[800] : '#fff',
                      borderRadius: '10px',
                      border: `1px solid ${brand.neutral[200]}`,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.86rem' }} noWrap>{line.productName}</Typography>
                        <Typography variant="caption" sx={{ color: isDark ? brand.neutral[400] : brand.neutral[500] }}>{fmt(line.unitPrice)} × {line.qty}</Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.25}>
                        <IconButton size="small" onClick={() => props.onDecQty(i)} sx={{ width: 26, height: 26 }}><IconMinus size={12} /></IconButton>
                        <Typography sx={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{line.qty}</Typography>
                        <IconButton size="small" onClick={() => props.onIncQty(i)} sx={{ width: 26, height: 26 }}><IconPlus size={12} /></IconButton>
                        <IconButton size="small" onClick={() => props.onRemoveLine(i)} sx={{ width: 26, height: 26, color: brand.error.main }}><IconX size={12} /></IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Totals + Payment */}
          <Box sx={{ bgcolor: isDark ? brand.neutral[800] : '#fff', borderTop: `1px solid ${brand.neutral[200]}`, p: 2, flexShrink: 0 }}>
            <Stack spacing={0.75} sx={{ mb: 2 }}>
              <TotalRow label="Subtotal" value={fmt(totals.subtotal)} />
              <TotalRow label={`Tax (${Math.round(totals.tax / Math.max(1, totals.subtotal) * 100)}%)`} value={fmt(totals.tax)} />
              <TotalRow label="Total" value={fmt(totals.grand)} valueWeight={900} />
            </Stack>

            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? brand.neutral[400] : brand.neutral[500] }}>Payment Method</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
                {(['CASH', 'CARD', 'MOBILE'] as PaymentChoice[]).map((m) => (
                  <Chip
                    key={m}
                    label={m === 'CASH' ? 'Cash' : m === 'CARD' ? 'Card' : 'Mobile'}
                    icon={m === 'CASH' ? <IconCoin size={14} /> : m === 'CARD' ? <IconCreditCard size={14} /> : <IconDeviceMobile size={14} />}
                    onClick={() => setPaymentChoice(m)}
                    sx={{
                      fontWeight: 700,
                      borderRadius: '8px',
                      bgcolor: paymentChoice === m ? brand.primary[600] : brand.neutral[100],
                      color: paymentChoice === m ? '#fff' : brand.neutral[700],
                      '&:hover': { bgcolor: paymentChoice === m ? brand.primary[700] : brand.neutral[200] },
                    }}
                  />
                ))}
              </Box>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!props.canCheckout}
              onClick={() => { props.onCheckout(); setCheckoutOpen(false); }}
              startIcon={props.submitting ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
              sx={{
                py: 1.5,
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                fontSize: '1rem',
                background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[500]} 100%)`,
                '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[600]} 100%)` },
              }}
            >
              {props.submitting ? 'Processing…' : `Complete Payment · ${fmt(totals.grand)}`}
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Edit line modal */}
      {editLine && (
        <EditLineModal
          open={editLineIdx !== null}
          onClose={() => { setEditLineIdx(null); setEditLine(null); }}
          line={editLine}
          lineIndex={editLineIdx!}
          product={props.products.find((p) => p.id === editLine.productId)}
          stockAvailable={props.stockMap[editLine.productId]?.available}
          onSave={(index, patch) => { props.onPatchLine?.(index, patch); setEditLineIdx(null); setEditLine(null); }}
        />
      )}
    </Box>
  );
}
