import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, IconButton, InputAdornment, MenuItem, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { IconSearch, IconBarcode, IconTrash, IconPlus, IconMinus, IconX, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { PosLayoutProps } from './PosLayoutProps';
import CashRegisterIndicator from 'src/components/smartpos/CashRegisterIndicator';
import { listCategories, listBrands } from 'src/api/smartpos/products';
import type { Brand as BrandRef, Category } from 'src/api/smartpos/types';
import { brand, brandGradients } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function ClassicLayout(props: PosLayoutProps) {
  const { t } = useTranslation('smartpos');

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandRef[]>([]);

  useEffect(() => {
    Promise.all([listCategories(), listBrands()])
      .then(([c, b]) => { setCategories(c); setBrands(b); })
      .catch(() => {});
  }, []);

  const fieldSx = {
    minWidth: 160,
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontSize: '0.85rem',
      bgcolor: '#fff',
      '& fieldset': { borderColor: brand.neutral[200] },
      '&:hover fieldset': { borderColor: brand.primary[300] },
      '&.Mui-focused fieldset': { borderColor: brand.primary[500] },
    },
    '& .MuiInputLabel-root': { fontSize: '0.85rem' },
  } as const;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 420px' }, gap: 2.5, alignItems: 'start' }}>
      <Box>
        <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px', mb: 2 }}>
          <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <TextField select size="small" label={t('pos.warehouse')} value={props.warehouseId} onChange={(e) => props.onWarehouseChange(e.target.value)} sx={fieldSx}>
                {props.warehouses.map((w) => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
              </TextField>
              <TextField size="small" placeholder="Search products…" value={props.search} onChange={(e) => props.onSearchChange(e.target.value)} sx={{ ...fieldSx, flex: 1, minWidth: 160 }} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><IconSearch size={16} color={brand.neutral[400]} /></InputAdornment>) } }} />
              <TextField size="small" placeholder={t('pos.scan_barcode')} value={props.barcode} inputRef={props.barcodeRef} onChange={(e) => props.onBarcodeChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') props.onBarcodeScan(); if (e.key === 'Escape') props.onBarcodeChange(''); }} sx={{ minWidth: 180 }} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><IconBarcode size={16} color={brand.primary[500]} /></InputAdornment>) } }} />
              <TextField select size="small" value={props.categoryId} onChange={(e) => props.onCategoryChange(e.target.value)} slotProps={{ select: { displayEmpty: true } }} sx={{ ...fieldSx, minWidth: 180 }}>
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
              </TextField>
              <TextField select size="small" value={props.brandId} onChange={(e) => props.onBrandChange(e.target.value)} slotProps={{ select: { displayEmpty: true } }} sx={{ ...fieldSx, minWidth: 170 }}>
                <MenuItem value="">All Brands</MenuItem>
                {brands.map((b) => (<MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>))}
              </TextField>
              <CashRegisterIndicator session={props.registerSession ?? null} loading={props.registerLoading ?? false} onOpen={() => props.onOpenRegister?.()} onClose={() => props.onCloseRegister?.()} />
              <Tooltip title="Pair to customer-facing display"><TextField select size="small" label="Display" value={props.linkedTerminalId} onChange={(e) => props.onLinkedTerminalChange(e.target.value)} sx={{ minWidth: 150 }} helperText={!props.online ? `Offline · ${props.queueSize} queued` : props.queueSize > 0 ? `${props.queueSize} pending sync` : undefined} slotProps={{ input: { startAdornment: (<InputAdornment position="start"><IconSearch size={15} color={brand.neutral[400]} /></InputAdornment>) } }}><MenuItem value=""><em>Not paired</em></MenuItem>{props.terminals.map((tm) => (<MenuItem key={tm.id} value={tm.id}>{tm.name} · {tm.code}</MenuItem>))}</TextField></Tooltip>
            </Stack>
          </CardContent>
        </Card>
        {props.banner && (<Alert severity={props.banner.kind} onClose={props.onBannerClose} sx={{ mb: 2, borderRadius: '12px' }} icon={props.banner.kind === 'success' ? <IconCheck size={17} /> : undefined}>{props.banner.text}</Alert>)}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {props.productsLoading ? Array.from({ length: 12 }).map((_, i) => (<Card key={i} elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px' }}><Skeleton variant="rectangular" sx={{ aspectRatio: '1/1', width: '100%' }} /><Box sx={{ p: 1.5 }}><Skeleton variant="text" sx={{ width: '80%', height: 16 }} /></Box></Card>)) : props.products.map((p) => (<Card key={p.id} onClick={() => props.onAddProduct(p)} elevation={0} sx={{ cursor: 'pointer', border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', transition: 'all 0.2s ease', userSelect: 'none', '&:hover': { borderColor: brand.primary[400], transform: 'translateY(-4px)', boxShadow: `0 12px 24px -8px ${brand.primary[500]}44` }, '&:active': { transform: 'scale(0.97)' } }}><Box sx={{ aspectRatio: '1/1', background: brand.primary[50], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '11px 11px 0 0' }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Typography variant="h4" sx={{ color: brand.primary[200], fontWeight: 800 }}>{p.name.charAt(0).toUpperCase()}</Typography>}</Box><Box sx={{ p: 1.25 }}><Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, mb: 0.25 }} noWrap>{p.name}</Typography><Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700], mt: 0.5 }}>{fmt(p.price)}</Typography></Box></Card>))}
        </Box>
      </Box>

      <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px', position: { lg: 'sticky' }, top: { lg: 16 }, alignSelf: { lg: 'flex-start' }, maxHeight: { lg: 'calc(100vh - 80px)' }, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, background: brandGradients.hero, color: '#fff', flexShrink: 0 }}><Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: '0.18em', color: '#fff', display: 'block' }}>{t('pos.current_sale')}</Typography><Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.1, color: '#fff', letterSpacing: '-0.03em' }}>{fmt(props.totals.grand)}</Typography></Box>
        <Box sx={{ px: 2, pt: 1.75, pb: 0, flexShrink: 0 }}><Autocomplete size="small" options={props.customers} value={props.customers.find((c) => c.id === props.customerId) || null} onChange={(_, v) => props.onCustomerChange(v?.id ?? null)} getOptionLabel={(c) => c.name} renderInput={(params) => (<TextField {...params} label={t('pos.customer_optional')} placeholder="Walk-in customer" />)} /></Box>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>{props.lines.length === 0 ? <Box sx={{ textAlign: 'center', py: 6, border: `1.5px dashed ${brand.neutral[200]}`, borderRadius: '12px' }}><Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[600] }}>{t('pos.empty_hint')}</Typography></Box> : <Stack spacing={1}>{props.lines.map((l, i) => (<Box key={`${l.productId}-${i}`} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, p: 1.25, border: `1px solid ${brand.neutral[200]}`, borderRadius: '10px' }}><Box><Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>{l.productName}</Typography><Typography variant="caption" sx={{ color: brand.neutral[500] }}>{fmt(l.unitPrice)} × {l.qty} = <strong style={{ color: brand.primary[700] }}>{fmt(l.unitPrice * l.qty)}</strong></Typography></Box><Stack direction="row" alignItems="center" spacing={0.25}><IconButton size="small" onClick={() => props.onDecQty(i)} sx={{ width: 26, height: 26, borderRadius: '7px', color: brand.neutral[600], '&:hover': { bgcolor: brand.neutral[100] } }}><IconMinus size={13} /></IconButton><Typography sx={{ minWidth: 22, textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>{l.qty}</Typography><IconButton size="small" onClick={() => props.onIncQty(i)} sx={{ width: 26, height: 26, borderRadius: '7px', color: brand.neutral[600], '&:hover': { bgcolor: brand.neutral[100] } }}><IconPlus size={13} /></IconButton><IconButton size="small" onClick={() => props.onRemoveLine(i)} sx={{ width: 26, height: 26, borderRadius: '7px', color: brand.error.main, '&:hover': { bgcolor: brand.error.light } }}><IconX size={13} /></IconButton></Stack></Box>))}</Stack>}</Box>
        <Divider sx={{ borderColor: brand.neutral[200] }} />
        <Box sx={{ p: 2, flexShrink: 0 }}><Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }}>{(['CASH', 'CARD'] as const).map((m) => (<Chip key={m} label={m === 'CASH' ? 'Cash' : 'Card'} onClick={() => props.onPaymentMethodChange(m)} sx={{ flex: 1, fontWeight: 600, height: 32, borderRadius: '8px', cursor: 'pointer', bgcolor: props.paymentMethod === m ? brand.primary[600] : brand.neutral[100], color: props.paymentMethod === m ? '#fff' : brand.neutral[600], transition: 'all 0.15s ease' }} />))}</Stack>
          {props.paymentMethod === 'CASH' && (<TextField size="small" fullWidth type="number" label={t('pos.cash_tendered')} value={props.tendered} onChange={(e) => props.onTenderedChange(e.target.value)} sx={{ mb: 1.5 }} helperText={props.totals.change > 0 ? `Change: ${fmt(props.totals.change)}` : ' '} />)}
          <Stack direction="row" spacing={1}><Button variant="outlined" onClick={props.onClearCart} disabled={props.lines.length === 0} startIcon={<IconTrash size={15} />} sx={{ minWidth: 48, px: 1.5, borderColor: brand.neutral[300], color: brand.neutral[600], borderRadius: '10px', '&:hover': { borderColor: brand.error.main, color: brand.error.main, bgcolor: brand.error.light } }}>Clear</Button><Button fullWidth variant="contained" size="large" onClick={props.onCheckout} disabled={!props.canCheckout} startIcon={props.submitting ? <CircularProgress size={17} color="inherit" /> : <IconCheck size={17} />} sx={{ background: props.canCheckout ? `linear-gradient(135deg, ${brand.accent[400]} 0%, ${brand.accent[600]} 100%)` : undefined, color: '#fff', fontWeight: 800, fontSize: '1rem', py: 1.5, borderRadius: '10px', letterSpacing: '0.01em', boxShadow: props.canCheckout ? `0 4px 16px -4px ${brand.accent[500]}66` : 'none', '&:hover': { background: `linear-gradient(135deg, ${brand.accent[500]} 0%, ${brand.accent[700]} 100%)`, transform: 'translateY(-1px)', boxShadow: `0 6px 20px -4px ${brand.accent[500]}88` }, '&:active': { transform: 'translateY(0)' }, '&.Mui-disabled': { background: brand.neutral[200], color: brand.neutral[400] }, transition: 'all 0.2s ease' }}>{props.submitting ? t('pos.processing') : t('pos.charge')}</Button></Stack></Box>
      </Card>
    </Box>
  );
}
