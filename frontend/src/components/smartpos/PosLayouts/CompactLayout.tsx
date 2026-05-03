/**
 * Compact POS layout — maximized product grid with cart in a floating Drawer.
 *
 * Anatomy:
 *  - Full-width product grid with search + barcode bar on top
 *  - Floating FAB (bottom-right) with animated cart item count badge
 *  - Cart slides in as right Drawer (desktop) / bottom Drawer (mobile)
 *  - Checkout in Drawer with inline payment
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Drawer,
  Fab,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  IconBarcode,
  IconCheck,
  IconMinus,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconX,
} from '@tabler/icons-react';
import type { PosLayoutProps } from './PosLayoutProps';
import EditLineModal from 'src/components/smartpos/EditLineModal';
import CashRegisterIndicator from 'src/components/smartpos/CashRegisterIndicator';
import TotalRow from './TotalRow';
import { listCategories, listBrands } from 'src/api/smartpos/products';
import type { Brand as BrandRef, Category } from 'src/api/smartpos/types';
import { posSurface, premiumFieldSx, softScrollSx, focusVisibleSx } from './shared';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const filterFieldSx = {
  minWidth: 150,
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '8px',
    bgcolor: '#fff',
    fontSize: '0.82rem',
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.primary[300] },
    '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
  },
} as const;

export default function CompactLayout(props: PosLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editLineIdx, setEditLineIdx] = useState<number | null>(null);
  const [editLine, setEditLine] = useState<any>(null);
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#F7F8FA', overflow: 'hidden' }}>
      {/* Top bar: layout switcher + warehouse + search + barcode + filters + register */}
      <Box sx={{ px: 1.5, py: 1, bgcolor: '#fff', borderBottom: `1px solid ${brand.neutral[200]}`, display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          value={props.warehouseId}
          onChange={(e) => props.onWarehouseChange(e.target.value)}
          sx={{ ...filterFieldSx, minWidth: 160 }}
        >
          {props.warehouses.map((w) => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
        </TextField>
        <TextField
          size="small"
          placeholder="Search or scan…"
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          sx={{ flex: 1, minWidth: 140, ...premiumFieldSx }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><IconSearch size={16} color={brand.neutral[400]} /></InputAdornment>,
            },
          }}
        />
        <TextField
          size="small"
          placeholder="Barcode"
          value={props.barcode}
          inputRef={props.barcodeRef}
          onChange={(e) => props.onBarcodeChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') props.onBarcodeScan(); if (e.key === 'Escape') props.onBarcodeChange(''); }}
          sx={{ width: 140, flexShrink: 0, ...premiumFieldSx }}
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
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} elevation={0} sx={posSurface}>
                <Skeleton variant="rectangular" sx={{ aspectRatio: '1/1', width: '100%' }} />
                <Box sx={{ p: 1 }}><Skeleton variant="text" sx={{ width: '80%', height: 14 }} /></Box>
              </Card>
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(160px, 1fr))' }, gap: 1.5 }}>
            {props.products.map((p) => {
              const stock = props.stockMap[p.id];
              const outOfStock = stock && stock.available <= 0;
              return (
                <Card
                  key={p.id}
                  elevation={0}
                  onClick={() => { if (!outOfStock) props.onAddProduct(p); }}
                  sx={{
                    ...posSurface,
                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                    opacity: outOfStock ? 0.5 : 1,
                    transition: 'transform 0.15s ease',
                    '&:hover': outOfStock ? {} : { transform: 'translateY(-2px)' },
                    ...focusVisibleSx,
                  }}
                >
                  <Box sx={{ aspectRatio: '1/1', bgcolor: brand.primary[50], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: brand.primary[200] }}>
                      {p.name.charAt(0).toUpperCase()}
                    </Typography>
                    {stock && (
                      <Chip
                        size="small"
                        label={stock.available <= 0 ? 'OOS' : `${stock.available}`}
                        sx={{
                          position: 'absolute', top: 6, left: 6, height: 20, fontSize: '0.65rem', fontWeight: 700,
                          bgcolor: stock.available <= 0 ? brand.error.light : brand.success.light,
                          color: stock.available <= 0 ? brand.error.dark : brand.success.dark,
                          borderRadius: '6px',
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2 }} noWrap>{p.name}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: brand.primary[700], mt: 0.25 }}>{fmt(p.price)}</Typography>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Floating cart FAB */}
      <Fab
        color="primary"
        onClick={() => setDrawerOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
          animation: itemCount > 0 ? 'compact-fab-pulse 2s ease-in-out infinite' : 'none',
          '@keyframes compact-fab-pulse': {
            '0%, 100%': { boxShadow: '0 4px 20px -4px rgba(0,0,0,0.3)' },
            '50%': { boxShadow: '0 4px 32px 0px rgba(0,0,0,0.45)' },
          },
        }}
      >
        <Badge
          badgeContent={itemCount}
          color="error"
          sx={{ '& .MuiBadge-badge': { fontWeight: 800, fontSize: '0.75rem' } }}
        >
          <IconShoppingCart size={22} />
        </Badge>
      </Fab>

      {/* Cart Drawer */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 400,
            maxHeight: isMobile ? '75vh' : '100%',
            borderTopLeftRadius: isMobile ? '20px' : 0,
            borderTopRightRadius: isMobile ? '20px' : 0,
            borderLeft: isMobile ? 'none' : `1px solid ${brand.neutral[200]}`,
            p: 2,
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Order ({itemCount})</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}><IconX size={20} /></IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', ...softScrollSx, mb: 2 }}>
          {props.lines.length === 0 ? (
            <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: brand.neutral[500] }}>
              Cart is empty — tap products to add
            </Typography>
          ) : (
            <Stack spacing={1}>
              {props.lines.map((line, i) => (
                <Box
                  key={`${line.productId}-${i}`}
                  onClick={() => { setEditLineIdx(i); setEditLine(line); }}
                  sx={{
                    p: 1.25,
                    border: `1px solid ${brand.neutral[200]}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    '&:hover': { borderColor: brand.primary[300] },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.84rem' }} noWrap>{line.productName}</Typography>
                      <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{fmt(line.unitPrice)} × {line.qty}</Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.25}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); props.onDecQty(i); }} sx={{ width: 24, height: 24 }}><IconMinus size={12} /></IconButton>
                      <Typography sx={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{line.qty}</Typography>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); props.onIncQty(i); }} sx={{ width: 24, height: 24 }}><IconPlus size={12} /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); props.onRemoveLine(i); }} sx={{ width: 24, height: 24, color: brand.error.main }}><IconX size={12} /></IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ borderTop: `1px solid ${brand.neutral[200]}`, pt: 1.5 }}>
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <TotalRow label="Subtotal" value={fmt(totals.subtotal)} size="small" />
            <TotalRow label={`Tax (${Math.round(props.totals.tax / Math.max(1, props.totals.subtotal) * 100)}%)`} value={fmt(totals.tax)} size="small" />
            <TotalRow label="Total" value={fmt(totals.grand)} valueWeight={900} size="small" />
          </Stack>
          <Button
            fullWidth
            variant="contained"
            disabled={!props.canCheckout}
            onClick={() => { props.onCheckout(); setDrawerOpen(false); }}
            startIcon={props.submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={17} />}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '10px', py: 1.2 }}
          >
            {props.submitting ? 'Processing…' : `Pay ${fmt(totals.grand)}`}
          </Button>
        </Box>
      </Drawer>

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
