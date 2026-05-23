import { useContext } from 'react';
/**
 * Sidebar POS layout — always-visible cart panel on the left, products on the right.
 *
 * Anatomy:
 *  ┌──────────────┬──────────────────────────────────────┐
 *  │  Cart panel  │  Products (flex grid)                │
 *  │  (300px)     │  ─ search + barcode bar              │
 *  │  ─ items     │  ─ responsive product grid           │
 *  │  ─ totals    │                                      │
 *  │  ─ pay now   │                                      │
 *  └──────────────┴──────────────────────────────────────┘
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconBarcode,
  IconCheck,
  IconMinus,
  IconPlus,
  IconSearch,
  IconClock,
  IconShoppingCart,
  IconX,
} from '@tabler/icons-react';
import type { PosLayoutProps } from './PosLayoutProps';
import type { Line } from './types';
import EditLineModal from 'src/components/smartpos/EditLineModal';
import CashRegisterIndicator from 'src/components/smartpos/CashRegisterIndicator';
import TotalRow from './TotalRow';
import { listCategories, listBrands } from 'src/api/smartpos/products';
import type { Brand as BrandRef, Category } from 'src/api/smartpos/types';
import { posSurface, premiumFieldSx, softScrollSx, focusVisibleSx } from './shared';
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

export default function SidebarLayout(props: PosLayoutProps) {
  const { activeMode: _pos } = useContext(CustomizerContext);
  const isDark = _pos === 'dark';
  const [editLineIdx, setEditLineIdx] = useState<number | null>(null);
  const [editLine, setEditLine] = useState<Line | null>(null);
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
    <Box sx={{ height: '100%', display: 'flex', bgcolor: isDark ? brand.neutral[900] : '#F7F8FA', overflow: 'hidden' }}>
      {/* ── Left cart panel ────────────────────────────────── */}
      <Box sx={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDark ? brand.neutral[800] : '#fff',
        borderRight: `1px solid ${brand.neutral[200]}`,
        overflow: 'hidden',
      }}>
        {/* Cart header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${brand.neutral[100]}`, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.primary[600] }}>
            <IconShoppingCart size={16} color="#fff" />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.1 }}>Order</Typography>
            <Typography variant="caption" sx={{ color: isDark ? brand.neutral[400] : brand.neutral[500] }}>{itemCount} items</Typography>
          </Box>
          <CashRegisterIndicator
            session={props.registerSession ?? null}
            loading={props.registerLoading ?? false}
            onOpen={() => props.onOpenRegister?.()}
            onClose={() => props.onCloseRegister?.()}
          />
        </Box>

        {/* Cart items */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, ...softScrollSx }}>
          {props.lines.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5, border: `1.5px dashed ${brand.neutral[200]}`, borderRadius: '12px', bgcolor: brand.primary[50] }}>
              <IconShoppingCart size={28} color={brand.neutral[300]} />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: isDark ? brand.neutral[400] : brand.neutral[500], fontWeight: 600 }}>Empty cart</Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {props.lines.map((line, i) => (
                <Box
                  key={`${line.productId}-${i}`}
                  onClick={() => { setEditLineIdx(i); setEditLine(line); }}
                  sx={{
                    p: 1,
                    border: `1px solid ${brand.neutral[200]}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }} noWrap>{line.productName}</Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Stack direction="row" alignItems="center" spacing={0.25}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); props.onDecQty(i); }} sx={{ width: 22, height: 22 }}><IconMinus size={10} /></IconButton>
                      <Typography sx={{ minWidth: 16, textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{line.qty}</Typography>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); props.onIncQty(i); }} sx={{ width: 22, height: 22 }}><IconPlus size={10} /></IconButton>
                    </Stack>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: brand.primary[700] }}>{fmt(line.unitPrice * line.qty)}</Typography>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); props.onRemoveLine(i); }} sx={{ width: 22, height: 22, color: brand.error.main }}><IconX size={10} /></IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Cart footer: totals + pay */}
        <Box sx={{ borderTop: `1px solid ${brand.neutral[200]}`, p: 1.5 }}>
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            <TotalRow label="Subtotal" value={fmt(totals.subtotal)} size="small" />
            <TotalRow label="Total" value={fmt(totals.grand)} valueWeight={900} size="small" />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              disabled={props.lines.length === 0}
              onClick={props.onSuspendCart}
              startIcon={<IconClock size={14} />}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', py: 0.75, fontSize: '0.8rem' }}
            >
              Suspend
            </Button>
          </Stack>
          <Button
            fullWidth
            variant="contained"
            disabled={!props.canCheckout}
            onClick={props.onCheckout}
            startIcon={props.submitting ? <CircularProgress size={15} color="inherit" /> : <IconCheck size={16} />}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '8px', py: 1 }}
          >
            {props.submitting ? 'Processing…' : `Pay Now · ${fmt(totals.grand)}`}
          </Button>
        </Box>
      </Box>

      {/* ── Right products area ────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Search + barcode + filters bar */}
        <Box sx={{ px: 1.5, py: 1, bgcolor: isDark ? brand.neutral[800] : '#fff', borderBottom: `1px solid ${brand.neutral[200]}`, display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
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
            sx={{ flex: 1, minWidth: 140, ...premiumFieldSx(isDark) }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconSearch size={16} color={brand.neutral[400]} /></InputAdornment> } }}
          />
          <TextField
            size="small"
            placeholder="Barcode"
            value={props.barcode}
            inputRef={props.barcodeRef}
            onChange={(e) => props.onBarcodeChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') props.onBarcodeScan(); if (e.key === 'Escape') props.onBarcodeChange(''); }}
            sx={{ width: 140, flexShrink: 0, ...premiumFieldSx(isDark) }}
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
        </Box>

        {/* Product grid */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, ...softScrollSx }}>
          {props.productsLoading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} elevation={0} sx={posSurface(isDark)}>
                  <Skeleton variant="rectangular" sx={{ aspectRatio: '1/1', width: '100%' }} />
                  <Box sx={{ p: 1 }}><Skeleton variant="text" sx={{ width: '80%', height: 14 }} /></Box>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 1.5 }}>
              {props.products.map((p) => {
                const stock = props.stockMap[p.id];
                const cartQty = props.lines
                  .filter(l => l.productId === p.id)
                  .reduce((sum, l) => sum + l.qty, 0);
                const effectiveStock = stock ? stock.available - cartQty : 0;
                const outOfStock = stock && effectiveStock <= 0;
                return (
                  <Card
                    key={p.id}
                    elevation={0}
                    onClick={() => { if (!outOfStock) props.onAddProduct(p); }}
                    sx={{
                      ...posSurface(isDark),
                      cursor: outOfStock ? 'not-allowed' : 'pointer',
                      opacity: outOfStock ? 0.5 : 1,
                      transition: 'transform 0.15s ease',
                      '&:hover': outOfStock ? {} : { transform: 'translateY(-2px)' },
                      ...focusVisibleSx,
                    }}
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
      </Box>

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
