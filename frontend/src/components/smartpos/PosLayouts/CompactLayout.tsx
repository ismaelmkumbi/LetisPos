import { useContext } from 'react';
/**
 * Compact POS layout — product grid + floating cart FAB → bottom Drawer.
 *
 * Designed mobile-first: thumb-friendly product cards, horizontally scrollable
 * top bar, and a bottom-sheet cart drawer that feels native.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Button, Card, Chip, CircularProgress,
  Drawer, Fab, IconButton, InputAdornment, MenuItem,
  Skeleton, Stack, TextField, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  IconBarcode, IconCheck, IconMinus, IconPlus,
  IconSearch, IconShoppingCart, IconX, IconSparkles,
  IconStar, IconTrendingUp, IconAlertTriangle, IconClock,
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

const TABS = [
  { key: 'all', label: 'All', icon: <IconSparkles size={13} /> },
  { key: 'featured', label: 'Featured', icon: <IconStar size={13} /> },
  { key: 'bestsellers', label: 'Best', icon: <IconTrendingUp size={13} /> },
  { key: 'low', label: 'Low Stock', icon: <IconAlertTriangle size={13} /> },
  { key: 'recent', label: 'Recent', icon: <IconClock size={13} /> },
] as const;

const selectFieldSx = {
  minWidth: 130,
  '& .MuiOutlinedInput-root': {
    height: 36, borderRadius: '8px', bgcolor: brand.neutral[800], fontSize: '0.78rem', fontWeight: 600,
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.primary[300] },
    '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
  },
} as const;

export default function CompactLayout(props: PosLayoutProps) {
  const { activeMode: _pos } = useContext(CustomizerContext);
  const isDark = _pos === 'dark';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Auto-open cart when item is added
  const prevCount = useState(0)[0];
  useEffect(() => {
    if (itemCount > 0 && itemCount > prevCount) setDrawerOpen(true);
  }, [itemCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: isDark ? brand.neutral[900] : '#F7F8FA', overflow: 'hidden' }}>
      {/* ═══ Top bar — horizontally scrollable on mobile ═══ */}
      <Box
        sx={{
          px: 1.5, py: 1, bgcolor: isDark ? brand.neutral[800] : '#fff',
          borderBottom: `1px solid ${brand.neutral[200]}`,
          display: 'flex', gap: 1, alignItems: 'center',
          flexShrink: 0, overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {/* Warehouse */}
        <TextField select size="small" value={props.warehouseId}
          onChange={(e) => props.onWarehouseChange(e.target.value)}
          sx={selectFieldSx}
        >
          {props.warehouses.map((w) => (<MenuItem key={w.id} value={w.id} dense>{w.name}</MenuItem>))}
        </TextField>

        {/* Search */}
        <TextField size="small" placeholder="Search products…" value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          sx={(theme) => ({ minWidth: 160, flex: { xs: '0 0 auto', sm: 1 }, maxWidth: { xs: 220, sm: 'none' }, ...premiumFieldSx(theme) })}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><IconSearch size={15} color={brand.neutral[400]} /></InputAdornment> },
          }}
        />

        {/* Barcode */}
        <TextField size="small" placeholder="Barcode" value={props.barcode}
          inputRef={props.barcodeRef}
          onChange={(e) => props.onBarcodeChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') props.onBarcodeScan(); if (e.key === 'Escape') props.onBarcodeChange(''); }}
          sx={(theme) => ({ width: 120, flexShrink: 0, ...premiumFieldSx(theme) })}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconBarcode size={15} color={brand.primary[600]} /></InputAdornment> } }}
        />

        {/* Category */}
        <TextField select size="small" value={props.categoryId}
          onChange={(e) => props.onCategoryChange(e.target.value)}
          slotProps={{ select: { displayEmpty: true } }}
          sx={selectFieldSx}
        >
          <MenuItem value="" dense>All Categories</MenuItem>
          {categories.map((c) => (<MenuItem key={c.id} value={c.id} dense>{c.name}</MenuItem>))}
        </TextField>

        {/* Brand */}
        <TextField select size="small" value={props.brandId}
          onChange={(e) => props.onBrandChange(e.target.value)}
          slotProps={{ select: { displayEmpty: true } }}
          sx={selectFieldSx}
        >
          <MenuItem value="" dense>All Brands</MenuItem>
          {brands.map((b) => (<MenuItem key={b.id} value={b.id} dense>{b.name}</MenuItem>))}
        </TextField>

        {/* Cash Register */}
        <Box sx={{ flexShrink: 0 }}>
          <CashRegisterIndicator
            session={props.registerSession ?? null}
            loading={props.registerLoading ?? false}
            onOpen={() => props.onOpenRegister?.()}
            onClose={() => props.onCloseRegister?.()}
          />
        </Box>
      </Box>

      {/* ═══ Product filter tabs ═══ */}
      <Box
        sx={{
          px: 1.5, py: 1, bgcolor: isDark ? brand.neutral[800] : '#fff',
          borderBottom: `1px solid ${brand.neutral[100]}`,
          overflowX: 'auto', flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <Stack direction="row" spacing={0.5}>
          {TABS.map((tab) => {
            const active = props.activeTab === tab.key || (tab.key === 'all' && !props.activeTab);
            return (
              <Chip
                key={tab.key}
                label={tab.label}
                icon={active ? tab.icon : undefined}
                onClick={() => props.onTabChange(tab.key === 'all' ? 'all' : tab.key)}
                size="small"
                sx={{
                  height: 32, px: 1, fontWeight: active ? 700 : 500, fontSize: '0.75rem',
                  borderRadius: '8px', flexShrink: 0,
                  ...(active
                    ? { bgcolor: brand.primary[600], color: '#fff', '&:hover': { bgcolor: brand.primary[700] } }
                    : { bgcolor: isDark ? brand.neutral[900] : brand.neutral[50], color: isDark ? brand.neutral[300] : brand.neutral[600], border: `1px solid ${brand.neutral[200]}`, '&:hover': { bgcolor: isDark ? brand.neutral[800] : brand.neutral[100] } }
                  ),
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* ═══ Product grid ═══ */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, pb: 10, ...softScrollSx }}>
        {props.productsLoading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(155px, 1fr))' }, gap: 1.25 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} elevation={0} sx={(theme) => ({ ...posSurface(theme), borderRadius: '14px' })}>
                <Skeleton variant="rectangular" sx={{ aspectRatio: '1/1', width: '100%', borderRadius: '14px 14px 0 0' }} />
                <Box sx={{ p: 1.25 }}><Skeleton variant="text" sx={{ width: '75%', height: 14 }} /><Skeleton variant="text" sx={{ width: '40%', height: 16, mt: 0.5 }} /></Box>
              </Card>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(155px, 1fr))' },
              gap: 1.25,
            }}
          >
            {props.products.map((p) => {
              const stock = props.stockMap[p.id];
              const outOfStock = stock && stock.available <= 0;
              const lowStock = stock && stock.available > 0 && stock.available <= 5;
              return (
                <Card
                  key={p.id}
                  elevation={0}
                  onClick={() => { if (!outOfStock) props.onAddProduct(p); }}
                  sx={(theme) => ({
                    ...posSurface(theme),
                    borderRadius: '14px',
                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                    opacity: outOfStock ? 0.45 : 1,
                    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                    overflow: 'hidden',
                    '&:hover': outOfStock ? {} : { transform: { xs: 'none', sm: 'translateY(-2px)' } },
                    '&:active': outOfStock ? {} : { transform: 'scale(0.97)', bgcolor: brand.primary[50] },
                    WebkitTapHighlightColor: 'transparent',
                    ...focusVisibleSx,
                  })}
                >
                  {/* Product image placeholder / initial */}
                  <Box
                    sx={{
                      aspectRatio: '1/1', bgcolor: outOfStock ? brand.neutral[100] : brand.primary[50],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: outOfStock ? brand.neutral[300] : brand.primary[200] }}>
                      {p.name.charAt(0).toUpperCase()}
                    </Typography>

                    {/* Stock badge */}
                    {stock && (
                      <Chip
                        size="small"
                        label={outOfStock ? 'Out of stock' : lowStock ? `${stock.available} left` : `${stock.available}`}
                        sx={{
                          position: 'absolute', top: 6, left: 6, height: 20, fontSize: '0.625rem', fontWeight: 800,
                          bgcolor: outOfStock ? brand.error.light : lowStock ? brand.warning.light : brand.success.light,
                          color: outOfStock ? brand.error.dark : lowStock ? brand.warning.dark : brand.success.dark,
                          borderRadius: '6px', letterSpacing: '0.02em',
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ p: 1.25 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2, mb: 0.25 }} noWrap>
                      {p.name}
                    </Typography>
                    <Stack direction="row" alignItems="baseline" spacing={0.5}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: brand.primary[700] }}>
                        {fmt(p.price)}
                      </Typography>
                      {p.code && (
                        <Typography sx={{ fontSize: '0.625rem', color: brand.neutral[400], fontWeight: 500 }} noWrap>
                          {p.code}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* ═══ Floating cart FAB ═══ */}
      <Fab
        color="primary"
        onClick={() => setDrawerOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 84, sm: 24 },
          right: { xs: 16, sm: 24 },
          zIndex: 1200,
          width: { xs: 56, sm: 56 },
          height: { xs: 56, sm: 56 },
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: itemCount > 0 ? 'scale(1)' : 'scale(0.9)',
        }}
      >
        <Badge
          badgeContent={itemCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontWeight: 800, fontSize: '0.7rem',
              minWidth: 20, height: 20,
            },
          }}
        >
          <IconShoppingCart size={22} />
        </Badge>
      </Fab>

      {/* ═══ Cart Drawer — bottom on mobile, right on desktop ═══ */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 420,
            maxHeight: isMobile ? '85dvh' : '100%',
            borderTopLeftRadius: isMobile ? 20 : 0,
            borderTopRightRadius: isMobile ? 20 : 0,
            borderLeft: isMobile ? 'none' : `1px solid ${brand.neutral[200]}`,
            display: 'flex', flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${brand.neutral[100]}`, flexShrink: 0 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Cart</Typography>
            <Chip label={`${itemCount} items`} size="small"
              sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', bgcolor: brand.primary[50], color: brand.primary[700], borderRadius: '8px' }}
            />
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {props.lines.length > 0 && (
              <Button size="small" onClick={() => { props.onClearCart(); }} sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: brand.error.main }}>
                Clear
              </Button>
            )}
            <IconButton onClick={() => setDrawerOpen(false)} size="small"><IconX size={18} /></IconButton>
          </Stack>
        </Stack>

        {/* Line items */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, ...softScrollSx }}>
          {props.lines.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '16px', bgcolor: isDark ? brand.neutral[800] : brand.neutral[100], display: 'grid', placeItems: 'center', mx: 'auto', mb: 2 }}>
                <IconShoppingCart size={24} color={brand.neutral[400]} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: isDark ? brand.neutral[300] : brand.neutral[700], mb: 0.5 }}>Cart is empty</Typography>
              <Typography variant="caption" sx={{ color: isDark ? brand.neutral[400] : brand.neutral[500] }}>
                Tap products from the grid to add them
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0.75} sx={{ py: 2 }}>
              {props.lines.map((line, i) => (
                <Box
                  key={`${line.productId}-${i}`}
                  onClick={() => { setEditLineIdx(i); setEditLine(line); }}
                  sx={{
                    p: 1.5, border: `1px solid ${brand.neutral[200]}`,
                    borderRadius: '12px', cursor: 'pointer', bgcolor: isDark ? brand.neutral[800] : '#fff',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50] },
                    '&:active': { transform: 'scale(0.99)' },


                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', mb: 0.25 }} noWrap>
                        {line.productName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: isDark ? brand.neutral[400] : brand.neutral[500], fontWeight: 600 }}>
                        {fmt(line.unitPrice)} × {line.qty} = {fmt(line.unitPrice * line.qty)}
                      </Typography>
                    </Box>

                    {/* Quantity controls */}
                    <Stack direction="row" alignItems="center" spacing={0} sx={{ flexShrink: 0 }}>
                      <IconButton size="small"
                        onClick={(e) => { e.stopPropagation(); props.onDecQty(i); }}
                        sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: isDark ? brand.neutral[900] : brand.neutral[50], '&:hover': { bgcolor: isDark ? brand.neutral[800] : brand.neutral[100] } }}
                      >
                        <IconMinus size={14} />
                      </IconButton>
                      <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                        {line.qty}
                      </Typography>
                      <IconButton size="small"
                        onClick={(e) => { e.stopPropagation(); props.onIncQty(i); }}
                        sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: brand.primary[50], color: brand.primary[600], '&:hover': { bgcolor: brand.primary[100] } }}
                      >
                        <IconPlus size={14} />
                      </IconButton>
                      <IconButton size="small"
                        onClick={(e) => { e.stopPropagation(); props.onRemoveLine(i); }}
                        sx={{ ml: 0.5, width: 28, height: 28, borderRadius: '8px', color: brand.error.main, '&:hover': { bgcolor: brand.error.light } }}
                      >
                        <IconX size={14} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Footer — totals + pay button */}
        {props.lines.length > 0 && (
          <Box sx={{ borderTop: `1px solid ${brand.neutral[200]}`, px: 2, pt: 1.5, pb: 2, flexShrink: 0 }}>
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              <TotalRow label="Subtotal" value={fmt(totals.subtotal)} size="small" />
              <TotalRow label="Tax" value={fmt(totals.tax)} size="small" />
              {totals.disc > 0 && <TotalRow label="Discount" value={`-${fmt(totals.disc)}`} size="small" />}
              <TotalRow label="Total" value={fmt(totals.grand)} valueWeight={900} size="medium" />
            </Stack>
            <Button
              fullWidth variant="contained"
              disabled={!props.canCheckout}
              onClick={() => { props.onCheckout(); setDrawerOpen(false); }}
              startIcon={props.submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={18} />}
              sx={{
                textTransform: 'none', fontWeight: 800, borderRadius: '12px', py: 1.5, fontSize: '0.95rem',
                bgcolor: brand.primary[600], '&:hover': { bgcolor: brand.primary[700] },
                boxShadow: `0 12px 28px -14px ${brand.primary[600]}bb`,
              }}
            >
              {props.submitting ? 'Processing…' : `Pay ${fmt(totals.grand)}`}
            </Button>
          </Box>
        )}
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
