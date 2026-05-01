import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Zoom,
} from '@mui/material';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconEdit,
  IconPhoto,
  IconX,
} from '@tabler/icons-react';
import {
  createProduct,
  getProduct,
  listBrands,
  listCategories,
  listUnits,
  updateProduct,
  type CreateProductBody,
  type Product,
} from 'src/api/smartpos/products';
import type { Brand, Category, Unit, UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { PageHeader, type PageHeaderAction } from 'src/components/smartpos/PageHeader';
import { formatMoney } from 'src/utils/smartpos/currency';

const cardSx = {
  border: `1px solid ${brand.neutral[200]}`,
  borderRadius: '8px',
  bgcolor: '#fff',
  boxShadow: `0 1px 2px ${brand.neutral[900]}08, 0 24px 60px -44px ${brand.neutral[900]}55`,
} as const;

type ProductForm = CreateProductBody & { barcode: string };

const emptyForm: ProductForm = {
  code: '',
  name: '',
  description: '',
  categoryId: undefined,
  subCategoryId: undefined,
  brandId: undefined,
  unitId: undefined,
  cost: 0,
  price: 0,
  wholesalePrice: 0,
  minPrice: 0,
  points: 0,
  taxMethod: 'EXCLUSIVE',
  taxRate: 0,
  stockAlert: 0,
  type: 'STANDARD',
  status: true,
  sellable: true,
  featured: false,
  hideOnline: false,
  imageUrl: '',
  barcodeSymbology: 'CODE128',
  warrantyMonths: 12,
  guaranteeMonths: 0,
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
  weightGrams: 0,
  trackSerial: false,
  trackImei: false,
  variants: [],
  barcodes: [],
  comboItems: [],
  barcode: '',
};

function toForm(product: Product): ProductForm {
  return {
    code: product.code,
    name: product.name,
    description: product.description ?? '',
    categoryId: product.categoryId ?? undefined,
    subCategoryId: product.subCategoryId ?? undefined,
    brandId: product.brandId ?? undefined,
    unitId: product.unitId ?? undefined,
    cost: product.cost,
    price: product.price,
    wholesalePrice: product.wholesalePrice ?? 0,
    minPrice: product.minPrice ?? 0,
    points: product.points ?? 0,
    taxMethod: product.taxMethod,
    taxRate: product.taxRate,
    stockAlert: product.stockAlert,
    type: product.type,
    status: product.status,
    sellable: product.sellable ?? true,
    featured: product.featured ?? false,
    hideOnline: product.hideOnline ?? false,
    imageUrl: product.imageUrl ?? '',
    barcodeSymbology: product.barcodeSymbology ?? 'CODE128',
    warrantyMonths: product.warrantyMonths ?? 12,
    guaranteeMonths: product.guaranteeMonths ?? 0,
    lengthCm: product.lengthCm ?? 0,
    widthCm: product.widthCm ?? 0,
    heightCm: product.heightCm ?? 0,
    weightGrams: product.weightGrams ?? 0,
    trackSerial: product.trackSerial ?? false,
    trackImei: product.trackImei ?? false,
    variants: product.variants.map((v) => ({
      name: v.name,
      code: v.code ?? '',
      cost: v.cost ?? undefined,
      price: v.price ?? undefined,
      wholesalePrice: v.wholesalePrice ?? undefined,
      minPrice: v.minPrice ?? undefined,
      imageUrl: v.imageUrl ?? '',
    })),
    barcodes: product.barcodes.map((b) => ({
      barcode: b.barcode,
      barcodeType: b.barcodeType,
      primary: b.primary,
      variantId: b.variantId ?? undefined,
    })),
    comboItems: (product.comboItems ?? []).map((c) => ({
      componentProductId: c.componentProductId,
      qty: c.qty,
      unitCost: c.unitCost ?? undefined,
      unitPrice: c.unitPrice ?? undefined,
      position: c.position,
    })),
    barcode: product.barcodes.find((b) => b.primary)?.barcode ?? product.barcodes[0]?.barcode ?? '',
  };
}

function toPayload(form: ProductForm): CreateProductBody {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description?.trim() || undefined,
    categoryId: form.categoryId || undefined,
    subCategoryId: form.subCategoryId || undefined,
    brandId: form.brandId || undefined,
    unitId: form.unitId || undefined,
    cost: Number(form.cost) || 0,
    price: Number(form.price) || 0,
    wholesalePrice: Number(form.wholesalePrice) || undefined,
    minPrice: Number(form.minPrice) || undefined,
    points: Number(form.points) || undefined,
    taxMethod: form.taxMethod ?? 'EXCLUSIVE',
    taxRate: Number(form.taxRate) || 0,
    stockAlert: Number(form.stockAlert) || 0,
    type: form.type ?? 'STANDARD',
    status: form.status ?? true,
    sellable: form.sellable ?? true,
    featured: form.featured ?? false,
    hideOnline: form.hideOnline ?? false,
    imageUrl: form.imageUrl?.trim() || undefined,
    barcodeSymbology: form.barcodeSymbology ?? 'CODE128',
    warrantyMonths: Number(form.warrantyMonths) || undefined,
    guaranteeMonths: Number(form.guaranteeMonths) || undefined,
    lengthCm: Number(form.lengthCm) || undefined,
    widthCm: Number(form.widthCm) || undefined,
    heightCm: Number(form.heightCm) || undefined,
    weightGrams: Number(form.weightGrams) || undefined,
    trackSerial: form.trackSerial ?? false,
    trackImei: form.trackImei ?? false,
    variants: form.variants?.length ? form.variants : undefined,
    comboItems: form.comboItems?.length ? form.comboItems : undefined,
    barcodes: form.barcode?.trim()
      ? [{ barcode: form.barcode.trim(), barcodeType: form.barcodeSymbology, primary: true }]
      : undefined,
  };
}

const sectionItems = ['Pricing', 'Inventory', 'Additional Info', 'Description', 'Identity'];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: UUID }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isCreate = pathname.endsWith('/new');
  const isEdit = pathname.endsWith('/edit') || isCreate;
  const isView = !isEdit;

  // ── Floating save button ────────────────────────────────────────────────────
  const [showFloatingSave, setShowFloatingSave] = useState(false);
  useEffect(() => {
    if (!isEdit) return;
    const onScroll = () => setShowFloatingSave(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isEdit]);

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // ── Interactive section navigation ──────────────────────────────────────────
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sectionObserver = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    sectionObserver.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const idx = sectionRefs.current.findIndex((ref) => ref === visible[0].target);
          if (idx >= 0) setActiveSection(idx);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    sectionRefs.current.forEach((ref) => { if (ref) sectionObserver.current?.observe(ref); });
    return () => sectionObserver.current?.disconnect();
  }, []);

  const scrollToSection = useCallback((idx: number) => {
    setActiveSection(idx);
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
    listBrands().then(setBrands).catch(() => {});
    listUnits().then(setUnits).catch(() => {});
  }, []);

  useEffect(() => {
    if (isCreate || !id) {
      setProduct(null);
      setForm(emptyForm);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(id)
      .then((row) => {
        if (cancelled) return;
        setProduct(row);
        setForm(toForm(row));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load product');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isCreate]);

  const nameMap = useMemo(() => {
    return {
      category: categories.find((x) => x.id === form.categoryId)?.name ?? '—',
      brand: brands.find((x) => x.id === form.brandId)?.name ?? '—',
      unit: units.find((x) => x.id === form.unitId)?.name ?? '—',
    };
  }, [brands, categories, form.brandId, form.categoryId, form.unitId, units]);

  const imageGallery = useMemo(() => {
    const variants = (product?.variants ?? [])
      .map((v) => v.imageUrl)
      .filter((x): x is string => Boolean(x));
    return [form.imageUrl, ...variants].filter((x): x is string => Boolean(x));
  }, [form.imageUrl, product?.variants]);

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and SKU are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (isCreate) {
        const created = await createProduct(payload);
        navigate(`/smartpos/products/${created.id}`, { replace: true });
        return;
      }
      if (!id) return;
      const updated = await updateProduct(id, payload);
      setProduct(updated);
      setForm(toForm(updated));
      navigate(`/smartpos/products/${updated.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    const skeletonSx = {
      bgcolor: brand.neutral[100],
      '&::after': {
        background: `linear-gradient(90deg, transparent, ${brand.primary[100]}, transparent) !important`,
      },
    } as const;
    return (
      <Box sx={{ animation: 'fadeInUp 0.35s ease' }}>
        {/* Skeleton top section — 3-column preview */}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: '14px', ...skeletonSx }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={32} sx={{ ...skeletonSx }} />
            <Skeleton variant="text" width="40%" height={20} sx={{ ...skeletonSx, mt: 0.5 }} />
            <Skeleton variant="text" width="90%" height={18} sx={{ ...skeletonSx, mt: 0.5 }} />
          </Box>
          <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: '14px', ...skeletonSx }} />
          </Box>
        </Stack>
        {/* Skeleton bottom section — 3 content cards */}
        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
          <Skeleton variant="rounded" height={240} sx={{ width: { xs: '100%', xl: 210 }, flexShrink: 0, borderRadius: '14px', ...skeletonSx }} />
          <Box sx={{ flex: 1, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Skeleton variant="rounded" height={200} sx={{ flex: 1, borderRadius: '14px', ...skeletonSx }} />
            <Skeleton variant="rounded" height={200} sx={{ flex: 1, borderRadius: '14px', ...skeletonSx }} />
            <Skeleton variant="rounded" height={200} sx={{ flex: 1, borderRadius: '14px', ...skeletonSx }} />
          </Box>
        </Stack>
      </Box>
    );
  }

  const modeBadge = isCreate ? { label: 'Draft', tone: 'primary' as const }
    : isView ? { label: 'Active', tone: 'success' as const }
    : { label: 'Editing', tone: 'warning' as const };

  const headerActions: PageHeaderAction[] = isView ? [
    {
      label: 'Edit',
      icon: <IconEdit size={17} />,
      onClick: () => navigate(`/smartpos/products/${id}/edit`),
      variant: 'primary',
    },
  ] : [
    {
      label: 'Cancel',
      icon: <IconX size={17} />,
      onClick: () => navigate(isCreate ? '/smartpos/products' : `/smartpos/products/${id}`),
      variant: 'ghost',
    },
    {
      label: saving ? 'Saving…' : 'Save Changes',
      icon: <IconDeviceFloppy size={17} />,
      onClick: submit,
      variant: 'primary',
    },
  ];

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease', key: pathname, maxWidth: 1680, mx: 'auto', pb: 3 }}>
      {/* Back link */}
      <Button
        component={RouterLink as any}
        to="/smartpos/products"
        variant="text"
        startIcon={<IconArrowLeft size={15} />}
        sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: '0.82rem', mb: 0.5, textTransform: 'none', '&:hover': { color: brand.primary[700], bgcolor: 'transparent' } }}
      >
        Back to Products
      </Button>

      <PageHeader
        title={isCreate ? 'New Product' : form.name || 'Product'}
        subtitle={isCreate ? 'Create a new inventory item' : `SKU: ${form.code || '—'}`}
        badge={modeBadge}
        actions={headerActions}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
        <Card sx={{ ...cardSx, width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
          <CardContent sx={{ p: 2 }}>
            <Box
              sx={{
                height: 220,
                borderRadius: '8px',
                border: isEdit && !form.imageUrl ? `2px dashed ${brand.neutral[300]}` : `1px solid ${brand.neutral[200]}`,
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#fff',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                ...(isEdit && !form.imageUrl ? {
                  '&:hover': { borderColor: brand.primary[300], bgcolor: brand.primary[50], cursor: 'pointer' },
                } : {}),
              }}
            >
              {form.imageUrl ? (
                <Box component="img" src={form.imageUrl} alt={form.name || 'Product image'} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Stack alignItems="center" spacing={1}>
                  <IconPhoto size={26} color={isEdit ? brand.primary[400] : brand.neutral[400]} />
                  <Typography sx={{ color: isEdit ? brand.primary[500] : brand.neutral[500], fontSize: 13, fontWeight: isEdit ? 600 : 400 }}>
                    {isEdit ? 'Click to paste image URL below' : 'No product image'}
                  </Typography>
                </Stack>
              )}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.25, overflowX: 'auto' }}>
              {imageGallery.length ? imageGallery.slice(0, 5).map((src, idx) => (
                <Box
                  key={`${src}-${idx}`}
                  component="img"
                  src={src}
                  alt={`Product thumbnail ${idx + 1}`}
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: '8px',
                    border: `1px solid ${brand.neutral[200]}`,
                    objectFit: 'contain',
                    bgcolor: brand.neutral[50],
                  }}
                />
              )) : (
                <Box sx={{ width: 54, height: 54, borderRadius: '8px', border: `1px dashed ${brand.neutral[300]}`, display: 'grid', placeItems: 'center' }}>
                  <IconPhoto size={16} color={brand.neutral[400]} />
                </Box>
              )}
            </Stack>
            {isEdit && (
              <TextField
                label="Image URL"
                size="small"
                value={form.imageUrl ?? ''}
                onChange={(e) => setField('imageUrl', e.target.value)}
                fullWidth
                sx={{ mt: 1.5 }}
              />
            )}
          </CardContent>
        </Card>

        <Card sx={{ ...cardSx, flex: 1 }}>
          <CardContent sx={{ p: 2.4 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center">
                {isEdit ? (
                  <TextField
                    size="small"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    label="Product Name"
                    fullWidth
                  />
                ) : (
                  <Typography sx={{ fontSize: { xs: 28, md: 34 }, fontWeight: 900, letterSpacing: 0, color: brand.neutral[900] }}>
                    {form.name || 'Untitled product'}
                  </Typography>
                )}
                <Chip
                  label={form.status ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    bgcolor: form.status ? brand.success.light : brand.neutral[100],
                    color: form.status ? brand.success.dark : brand.neutral[600],
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                />
              </Stack>
              <Typography sx={{ color: brand.neutral[500], fontSize: 15 }}>
                {form.description || 'High performance product configuration and pricing profile.'}
              </Typography>
              <Divider sx={{ my: 0.5, borderColor: brand.neutral[100] }} />
              <Stack direction="row" spacing={0} flexWrap="wrap" useFlexGap sx={{ mx: -1 }}>
                <Meta label="SKU" value={form.code || '—'} />
                <Meta label="Barcode" value={form.barcode || '—'} />
                <Meta label="Category" value={nameMap.category} />
                <Meta label="Brand" value={nameMap.brand} />
                <Meta label="Unit" value={nameMap.unit} />
                <Meta label="Tax Rate" value={`${form.taxRate || 0}%`} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ ...cardSx, width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
          <CardContent sx={{ p: 2.4 }}>
            <Typography sx={{ color: brand.neutral[500], fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Stock Summary
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Metric label="Retail Price" value={formatMoney(Number(form.price) || 0)} />
              <Metric label="Wholesale Price" value={formatMoney(Number(form.wholesalePrice) || 0)} />
              <Metric label="Low Stock Threshold" value={`${form.stockAlert || 0} pcs`} />
              <Metric label="Status" value={form.status ? 'In Stock' : 'Inactive'} />
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1.5}>
        <Card sx={{ ...cardSx, width: { xs: '100%', xl: 210 }, flexShrink: 0 }}>
          <CardContent sx={{ p: 1.25 }}>
            {sectionItems.map((item, idx) => (
              <Box
                key={item}
                onClick={() => scrollToSection(idx)}
                sx={{
                  py: 1,
                  px: 1.25,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: idx === activeSection ? brand.primary[700] : brand.neutral[600],
                  bgcolor: idx === activeSection ? brand.primary[50] : 'transparent',
                  fontWeight: idx === activeSection ? 800 : 600,
                  fontSize: 14,
                  transition: 'all 0.15s ease',
                  '&:hover': { color: brand.primary[700], bgcolor: brand.primary[50] },
                }}
              >
                {item}
              </Box>
            ))}
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
            <Card ref={(el) => { sectionRefs.current[0] = el; }} sx={{ ...cardSx, flex: 1 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, color: brand.neutral[800], mb: 1.25 }}>Pricing</Typography>
                <FieldGrid edit={isEdit}>
                  <LabeledField label="Retail Price">
                    <ValueOrInput edit={isEdit} value={String(form.price ?? '')} onChange={(v) => setField('price', Number(v) || 0)} prefix="TSh" />
                  </LabeledField>
                  <LabeledField label="Wholesale Price">
                    <ValueOrInput edit={isEdit} value={String(form.wholesalePrice ?? '')} onChange={(v) => setField('wholesalePrice', Number(v) || 0)} prefix="TSh" />
                  </LabeledField>
                  <LabeledField label="Cost Price">
                    <ValueOrInput edit={isEdit} value={String(form.cost ?? '')} onChange={(v) => setField('cost', Number(v) || 0)} prefix="TSh" />
                  </LabeledField>
                  <LabeledField label="Minimum Sell Price">
                    <ValueOrInput edit={isEdit} value={String(form.minPrice ?? '')} onChange={(v) => setField('minPrice', Number(v) || 0)} prefix="TSh" />
                  </LabeledField>
                </FieldGrid>
              </CardContent>
            </Card>

            <Card ref={(el) => { sectionRefs.current[1] = el; }} sx={{ ...cardSx, flex: 1 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, color: brand.neutral[800], mb: 1.25 }}>Inventory</Typography>
                <FieldGrid edit={isEdit}>
                  <LabeledField label="Low Stock Threshold">
                    <ValueOrInput edit={isEdit} value={String(form.stockAlert ?? '')} onChange={(v) => setField('stockAlert', Number(v) || 0)} suffix="pcs" />
                  </LabeledField>
                  <LabeledField label="Barcode Symbology">
                    {isEdit ? (
                      <TextField
                        select
                        size="small"
                        value={form.barcodeSymbology ?? 'CODE128'}
                        onChange={(e) => setField('barcodeSymbology', e.target.value as ProductForm['barcodeSymbology'])}
                        fullWidth
                      >
                        <MenuItem value="CODE128">CODE128</MenuItem>
                        <MenuItem value="CODE39">CODE39</MenuItem>
                        <MenuItem value="EAN13">EAN13</MenuItem>
                        <MenuItem value="EAN8">EAN8</MenuItem>
                        <MenuItem value="UPC">UPC</MenuItem>
                      </TextField>
                    ) : (
                      <Typography sx={{ fontWeight: 700, color: brand.neutral[800] }}>{form.barcodeSymbology || '—'}</Typography>
                    )}
                  </LabeledField>
                  <LabeledField label="Product Barcode">
                    <ValueOrInput edit={isEdit} value={form.barcode ?? ''} onChange={(v) => setField('barcode', v)} />
                  </LabeledField>
                  <LabeledField label="Type">
                    {isEdit ? (
                      <TextField select size="small" value={form.type ?? 'STANDARD'} onChange={(e) => setField('type', e.target.value as ProductForm['type'])} fullWidth>
                        <MenuItem value="STANDARD">Standard</MenuItem>
                        <MenuItem value="SERVICE">Service</MenuItem>
                        <MenuItem value="COMBO">Combo</MenuItem>
                      </TextField>
                    ) : (
                      <Typography sx={{ fontWeight: 700, color: brand.neutral[800] }}>{form.type}</Typography>
                    )}
                  </LabeledField>
                </FieldGrid>
              </CardContent>
            </Card>

            <Card ref={(el) => { sectionRefs.current[2] = el; }} sx={{ ...cardSx, flex: 1 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, color: brand.neutral[800], mb: 1.25 }}>Additional Information</Typography>
                <FieldGrid edit={isEdit}>
                  <LabeledField label="Warranty (months)">
                    <ValueOrInput edit={isEdit} value={String(form.warrantyMonths ?? '')} onChange={(v) => setField('warrantyMonths', Number(v) || 0)} />
                  </LabeledField>
                  <LabeledField label="Weight (grams)">
                    <ValueOrInput edit={isEdit} value={String(form.weightGrams ?? '')} onChange={(v) => setField('weightGrams', Number(v) || 0)} />
                  </LabeledField>
                  <LabeledField label="Tax Rate">
                    <ValueOrInput edit={isEdit} value={String(form.taxRate ?? '')} onChange={(v) => setField('taxRate', Number(v) || 0)} suffix="%" />
                  </LabeledField>
                  <LabeledField label="Points">
                    <ValueOrInput edit={isEdit} value={String(form.points ?? '')} onChange={(v) => setField('points', Number(v) || 0)} />
                  </LabeledField>
                </FieldGrid>
              </CardContent>
            </Card>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Card ref={(el) => { sectionRefs.current[3] = el; }} sx={{ ...cardSx, flex: 1.3 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, color: brand.neutral[800], mb: 1.25 }}>Description</Typography>
                {isEdit ? (
                  <TextField
                    value={form.description ?? ''}
                    onChange={(e) => setField('description', e.target.value)}
                    multiline
                    minRows={6}
                    fullWidth
                    placeholder="Write product details, selling points, and support notes."
                  />
                ) : (
                  <Typography sx={{ color: brand.neutral[700], lineHeight: 1.7 }}>
                    {form.description || 'No product description provided.'}
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card ref={(el) => { sectionRefs.current[4] = el; }} sx={{ ...cardSx, flex: 1 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 800, color: brand.neutral[800], mb: 1.25 }}>Identity & Classification</Typography>
                <FieldGrid edit={isEdit}>
                  <LabeledField label="SKU Code">
                    <ValueOrInput edit={isEdit} value={form.code} onChange={(v) => setField('code', v)} />
                  </LabeledField>
                  <LabeledField label="Category">
                    {isEdit ? (
                      <TextField select size="small" value={form.categoryId ?? ''} onChange={(e) => setField('categoryId', e.target.value || undefined)} fullWidth>
                        <MenuItem value="">Select category</MenuItem>
                        {categories.filter((c) => !c.parentId).map((c) => (
                          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Typography sx={{ fontWeight: 700, color: brand.neutral[800] }}>{nameMap.category}</Typography>
                    )}
                  </LabeledField>
                  <LabeledField label="Brand">
                    {isEdit ? (
                      <TextField select size="small" value={form.brandId ?? ''} onChange={(e) => setField('brandId', e.target.value || undefined)} fullWidth>
                        <MenuItem value="">Select brand</MenuItem>
                        {brands.map((b) => (
                          <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Typography sx={{ fontWeight: 700, color: brand.neutral[800] }}>{nameMap.brand}</Typography>
                    )}
                  </LabeledField>
                  <LabeledField label="Unit">
                    {isEdit ? (
                      <TextField select size="small" value={form.unitId ?? ''} onChange={(e) => setField('unitId', e.target.value || undefined)} fullWidth>
                        <MenuItem value="">Select unit</MenuItem>
                        {units.map((u) => (
                          <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Typography sx={{ fontWeight: 700, color: brand.neutral[800] }}>{nameMap.unit}</Typography>
                    )}
                  </LabeledField>
                </FieldGrid>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>
      {/* Floating save button — appears on scroll in edit mode */}
      {isEdit && (
        <Zoom in={showFloatingSave}>
          <Box
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
          >
            <Button
              variant="contained"
              onClick={submit}
              disabled={saving}
              startIcon={<IconDeviceFloppy size={16} />}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                px: 2.5,
                py: 1,
                minHeight: 44,
                background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`,
                boxShadow: `0 8px 24px ${brand.primary[500]}40`,
                '&:hover': {
                  background: brand.primary[700],
                  boxShadow: `0 12px 32px ${brand.primary[500]}60`,
                  transform: 'translateY(-2px)',
                },
                '&:active': { transform: 'translateY(0)' },
                transition: 'all 0.2s ease',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </Zoom>
      )}
    </Box>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 150, px: 1, py: 0.85, borderRight: `1px solid ${brand.neutral[100]}` }}>
      <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ color: brand.neutral[800], fontWeight: 800, fontSize: 14 }}>{value || '—'}</Typography>
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ pb: 1, borderBottom: `1px solid ${brand.neutral[100]}`, '&:last-of-type': { borderBottom: 0, pb: 0 } }}>
      <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ color: brand.neutral[900], fontWeight: 900, fontSize: 22, letterSpacing: 0 }}>{value}</Typography>
    </Box>
  );
}

function FieldGrid({ edit, children }: { edit: boolean; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: edit ? '1fr 1fr' : '1fr 1fr' },
        gap: 1.25,
      }}
    >
      {children}
    </Box>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: 12, mb: 0.5 }}>{label}</Typography>
      {children}
    </Box>
  );
}

function ValueOrInput({
  edit,
  value,
  onChange,
  prefix,
  suffix,
}: {
  edit: boolean;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  if (edit) {
    return (
      <TextField
        size="small"
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputProps={{
          startAdornment: prefix ? <Typography sx={{ color: brand.neutral[500], mr: 0.5, fontSize: 13 }}>{prefix}</Typography> : undefined,
          endAdornment: suffix ? <Typography sx={{ color: brand.neutral[500], ml: 0.5, fontSize: 13 }}>{suffix}</Typography> : undefined,
          sx: { transition: 'all 0.2s ease' },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            transition: 'all 0.15s ease',
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: brand.primary[400],
                borderWidth: 2,
              },
            },
          },
        }}
      />
    );
  }
  return (
    <Typography sx={{ color: brand.neutral[800], fontWeight: 700, transition: 'all 0.2s ease' }}>
      {[prefix, value || '—', suffix].filter(Boolean).join(' ')}
    </Typography>
  );
}
