import { type ElementType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Zoom,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBarcode,
  IconBox,
  IconBoxMultiple,
  IconBuildingStore,
  IconClipboard,
  IconClock,
  IconCoin,
  IconDeviceFloppy,
  IconEdit,
  IconFileDescription,
  IconInfoCircle,
  IconPackage,
  IconPlus,
  IconPhoto,
  IconReceipt,
  IconShield,
  IconSparkles,
  IconTag,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  createProduct,
  getProduct,
  listBrands,
  listCategories,
  listUnits,
  nextSku,
  updateProduct,
  type CreateProductBody,
  type Product,
  type VariantInput,
} from 'src/api/smartpos/products';
import { aiSuggestProduct } from 'src/api/smartpos/aiProducts';
import type { Brand, Category, Unit, UUID } from 'src/api/smartpos/types';
import { brand, brandGradients } from 'src/theme/smartpos/brand';
import { PageHeader, type PageHeaderAction } from 'src/components/smartpos/PageHeader';
import { AiProductAgent } from './AiProductAgent';
import { formatMoney } from 'src/utils/smartpos/currency';

// ── Card design system ──────────────────────────────────────────────────────

const cardSxBase = {
  borderRadius: '12px',
  bgcolor: '#fff',
  border: `1px solid ${brand.neutral[200]}`,
} as const;

const cardSx = {
  ...cardSxBase,
  boxShadow: `
    0 1px 2px ${brand.neutral[900]}06,
    0 4px 12px ${brand.neutral[900]}05,
    0 12px 40px -16px ${brand.neutral[900]}0A
  `,
  transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
  '&:hover': {
    boxShadow: `
      0 1px 2px ${brand.neutral[900]}08,
      0 8px 20px ${brand.neutral[900]}08,
      0 24px 56px -20px ${brand.neutral[900]}14
    `,
    borderColor: brand.neutral[300],
  },
} as const;

const cardSxStatic = {
  ...cardSxBase,
  boxShadow: `
    0 1px 2px ${brand.neutral[900]}06,
    0 4px 12px ${brand.neutral[900]}05,
    0 12px 40px -16px ${brand.neutral[900]}0A
  `,
} as const;

// Border-glow keyframe applied to a section card right after the user clicks
// its entry in the sidebar nav. Pulses the primary border + soft halo, then
// fades out — purely a click-feedback layer, independent of the scroll-tracker.
const sectionFlashKeyframes = {
  '@keyframes letisSectionFlash': {
    '0%':   { boxShadow: `0 0 0 0 ${brand.primary[500]}00, 0 0 0 0 ${brand.primary[500]}00`, borderColor: brand.neutral[200] },
    '20%':  { boxShadow: `0 0 0 4px ${brand.primary[500]}33, 0 12px 36px -8px ${brand.primary[500]}55`, borderColor: brand.primary[400] },
    '70%':  { boxShadow: `0 0 0 3px ${brand.primary[500]}22, 0 10px 28px -10px ${brand.primary[500]}33`, borderColor: brand.primary[300] },
    '100%': { boxShadow: `0 0 0 0 ${brand.primary[500]}00, 0 0 0 0 ${brand.primary[500]}00`, borderColor: brand.neutral[200] },
  },
} as const;
const flashAnimation = {
  ...sectionFlashKeyframes,
  animation: 'letisSectionFlash 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ── Form types & helpers ────────────────────────────────────────────────────

type ProductForm = Omit<CreateProductBody, 'code'> & { code: string; barcode: string };

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
    code: form.code.trim() || undefined,
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

// ── Section nav configuration ───────────────────────────────────────────────

interface SectionItem {
  label: string;
  icon: React.ReactNode;
}

const sectionItems: SectionItem[] = [
  { label: 'Pricing',      icon: <IconCoin size={18} /> },
  { label: 'Inventory',    icon: <IconBox size={18} /> },
  { label: 'Additional Info', icon: <IconClipboard size={18} /> },
  { label: 'Description',  icon: <IconFileDescription size={18} /> },
  { label: 'Identity',     icon: <IconShield size={18} /> },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProductDetailPage() {
  const { id } = useParams<{ id: UUID }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isCreate = pathname.endsWith('/new');
  const isEdit = pathname.endsWith('/edit') || isCreate;
  const isView = !isEdit;

  // ── floating save button ──────────────────────────────────────────────────
  const [showFloatingSave, setShowFloatingSave] = useState(false);
  useEffect(() => {
    if (!isEdit) return;
    const onScroll = () => setShowFloatingSave(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isEdit]);

  // ── dirty-state tracking ──────────────────────────────────────────────────
  const isDirty = useMemo(() => {
    if (!product || !isEdit) return false;
    const original = toForm(product);
    return JSON.stringify(original) !== JSON.stringify(form);
  }, [product, form, isEdit]);

  // Warn on tab close / refresh when there are unsaved edits
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [appliedAiFields, setAppliedAiFields] = useState<Set<string>>(new Set());

  // ── AI assistant on/off toggle ────────────────────────────────────────────
  // Persisted per browser so a user who prefers a clean form keeps it that way.
  // Defaults to ON only on the create page (where the agent is most useful).
  const AI_PREF_KEY = 'letis:ai-agent-enabled';
  const [aiAgentEnabled, setAiAgentEnabled] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(AI_PREF_KEY);
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch { /* ignore */ }
    return isCreate;
  });
  useEffect(() => {
    try { window.localStorage.setItem(AI_PREF_KEY, aiAgentEnabled ? '1' : '0'); } catch { /* ignore */ }
  }, [aiAgentEnabled]);

  // ── interactive section navigation ────────────────────────────────────────
  const [activeSection, setActiveSection] = useState(0);
  const activeSectionRef = useRef(0);
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
          if (idx >= 0 && idx !== activeSectionRef.current) {
            activeSectionRef.current = idx;
            setActiveSection(idx);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    sectionRefs.current.forEach((ref) => { if (ref) sectionObserver.current?.observe(ref); });
    return () => sectionObserver.current?.disconnect();
  }, []);

  // Brief border-glow flash on the target section after a sidebar click,
  // so the eye lands clearly even on long forms.
  const [flashedSection, setFlashedSection] = useState<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scrollToSection = useCallback((idx: number) => {
    setActiveSection(idx);
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFlashedSection(idx);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashedSection(null), 900);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

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

  // Per-field AI regeneration. Calls /suggest with the current product name as
  // the seed and writes back ONLY the requested key — keeps the rest of the
  // form intact, unlike the full-form auto-fill above. Disabled while in flight
  // and surfaces failures inline through the page's existing `error` slot.
  // SKU generator — fetches PROD-000NNN from the backend sequence on demand.
  // We don't pre-fetch on form mount because each call consumes a sequence
  // value; lazy-on-click means a user who types their own SKU never burns one.
  const [skuGenerating, setSkuGenerating] = useState(false);
  const handleGenerateSku = useCallback(async () => {
    setSkuGenerating(true);
    setError(null);
    try {
      const code = await nextSku();
      setForm((prev) => ({ ...prev, code }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate SKU');
    } finally {
      setSkuGenerating(false);
    }
  }, []);

  const [regenField, setRegenField] = useState<keyof CreateProductBody | null>(null);
  const regenerateField = useCallback(async (key: keyof CreateProductBody) => {
    const seed = form.name?.trim();
    if (!seed) {
      setError('Add a product name first so suggestions have something to work with.');
      return;
    }
    setRegenField(key);
    setError(null);
    try {
      const res = await aiSuggestProduct({
        name: seed,
        hint: form.description?.trim() || undefined,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands: brands.map((b) => ({ id: b.id, name: b.name })),
          units: units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
        },
      });
      const next = (res as unknown as Record<string, unknown>)[key as string];
      if (next === null || next === undefined) {
        setError(`No suggestion was returned for ${String(key)}.`);
        return;
      }
      setForm((prev) => ({ ...prev, [key]: next } as ProductForm));
      setAppliedAiFields((prev) => new Set(prev).add(String(key)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed');
    } finally {
      setRegenField(null);
    }
  }, [form.name, form.description, categories, brands, units]);

  const handleApplyAiSuggestion = useCallback((partial: Partial<CreateProductBody>) => {
    setForm((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(partial)) {
        if (v !== null && v !== undefined) {
          (next as Record<string, unknown>)[k] = v;
        }
      }
      return next;
    });
    setAppliedAiFields(new Set(Object.keys(partial)));
  }, []);

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if ((form.price ?? 0) < 0) {
      setError('Price cannot be negative.');
      return;
    }
    if ((form.cost ?? 0) < 0) {
      setError('Cost cannot be negative.');
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

  // ── loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    const skelSx = {
      bgcolor: brand.neutral[100],
      '&::after': {
        background: `linear-gradient(90deg, transparent, ${brand.primary[100]}, transparent) !important`,
      },
    } as const;
    return (
      <Box sx={{ animation: 'fadeInUp 0.35s ease', maxWidth: 1680, mx: 'auto', pb: 3 }}>
        <Skeleton variant="rounded" width={140} height={32} sx={{ borderRadius: '8px', mb: 2, ...skelSx }} />

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Skeleton variant="text" width="50%" height={42} sx={{ ...skelSx }} />
          <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: '8px', ...skelSx }} />
        </Stack>
        <Skeleton variant="text" width="30%" height={20} sx={{ ...skelSx, mb: 2.5 }} />

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Skeleton variant="rounded" height={260} sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0, borderRadius: '12px', ...skelSx }} />
          <Skeleton variant="rounded" height={260} sx={{ flex: 1, borderRadius: '12px', ...skelSx }} />
          <Skeleton variant="rounded" height={260} sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0, borderRadius: '12px', ...skelSx }} />
        </Stack>

        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
          <Skeleton variant="rounded" height={280} sx={{ width: { xs: '100%', xl: 220 }, flexShrink: 0, borderRadius: '12px', ...skelSx }} />
          <Box sx={{ flex: 1, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Skeleton variant="rounded" height={200} sx={{ flex: 1, borderRadius: '12px', ...skelSx }} />
            <Skeleton variant="rounded" height={200} sx={{ flex: 1, borderRadius: '12px', ...skelSx }} />
            <Skeleton variant="rounded" height={200} sx={{ flex: 1, borderRadius: '12px', ...skelSx }} />
          </Box>
        </Stack>
      </Box>
    );
  }

  // ── header config ─────────────────────────────────────────────────────────
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
      onClick: () => {
        if (isDirty) {
          setShowCancelConfirm(true);
        } else {
          navigate(isCreate ? '/smartpos/products' : `/smartpos/products/${id}`);
        }
      },
      variant: 'ghost',
    },
    {
      label: saving ? 'Saving…' : 'Save Changes',
      icon: <IconDeviceFloppy size={17} />,
      onClick: submit,
      variant: 'primary',
    },
  ];

  const priceValue = Number(form.price) || 0;
  const hasLowStock = Number(form.stockAlert) > 0;
  const lastUpdated = product?.updatedAt
    ? new Date(product.updatedAt).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <Box sx={{ animation: 'fadeInUp 0.35s ease', key: pathname, maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <Button
        component={RouterLink as ElementType}
        to="/smartpos/products"
        variant="text"
        startIcon={<IconArrowLeft size={15} />}
        sx={{
          color: brand.neutral[500],
          fontWeight: 600,
          fontSize: '0.8125rem',
          mb: 1,
          textTransform: 'none',
          borderRadius: '8px',
          px: 1.5,
          py: 0.5,
          '&:hover': { color: brand.primary[600], bgcolor: brand.neutral[50] },
        }}
      >
        Back to Products
      </Button>

      <PageHeader
        title={isCreate ? 'New Product' : form.name || 'Product'}
        subtitle={isCreate ? 'Create a new inventory item' : `SKU: ${form.code || '—'}`}
        badge={modeBadge}
        actions={headerActions}
      />

      {isEdit && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: aiAgentEnabled ? 1.25 : 2 }}>
          <Tooltip title={aiAgentEnabled ? 'Hide Product Assistant' : 'Show Product Assistant'}>
            <Button
              size="small"
              onClick={() => setAiAgentEnabled((v) => !v)}
              startIcon={<IconSparkles size={15} />}
              sx={{
                textTransform: 'none',
                borderRadius: '999px',
                px: 1.6,
                py: 0.4,
                fontWeight: 700,
                fontSize: '0.78rem',
                border: `1px solid ${aiAgentEnabled ? brand.primary[200] : brand.neutral[200]}`,
                bgcolor: aiAgentEnabled ? brand.primary[50] : '#fff',
                color: aiAgentEnabled ? brand.primary[700] : brand.neutral[600],
                '&:hover': {
                  bgcolor: aiAgentEnabled ? brand.primary[100] : brand.neutral[50],
                  borderColor: aiAgentEnabled ? brand.primary[300] : brand.neutral[300],
                },
              }}
            >
              Assistant: {aiAgentEnabled ? 'On' : 'Off'}
            </Button>
          </Tooltip>
        </Stack>
      )}
      {isEdit && aiAgentEnabled && (
        <AiProductAgent
          categories={categories}
          brands={brands}
          units={units}
          currentValues={form}
          onApply={handleApplyAiSuggestion}
          onClear={() => setAppliedAiFields(new Set())}
        />
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 2 }}>

        <Card sx={{ ...cardSxStatic, width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box
              sx={{
                height: 260,
                borderRadius: '12px',
                border: isEdit && !form.imageUrl ? `2px dashed ${brand.primary[300]}` : `1px solid ${brand.neutral[200]}`,
                display: 'grid',
                placeItems: 'center',
                bgcolor: '#fff',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                ...(isEdit && !form.imageUrl ? {
                  bgcolor: brand.primary[50],
                  '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[100] },
                } : {}),
              }}
            >
              {form.imageUrl ? (
                <Box
                  component="img"
                  src={form.imageUrl}
                  alt={form.name || 'Product image'}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <Stack alignItems="center" spacing={1.5}>
                  <IconPhoto size={32} color={isEdit ? brand.primary[400] : brand.neutral[400]} />
                  <Typography sx={{ color: isEdit ? brand.primary[500] : brand.neutral[500], fontSize: 13, fontWeight: isEdit ? 600 : 400 }}>
                    {isEdit ? 'Click to paste image URL below' : 'No product image'}
                  </Typography>
                </Stack>
              )}
            </Box>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5, overflowX: 'auto' }}>
              {imageGallery.length ? imageGallery.slice(0, 5).map((src, idx) => (
                <Box
                  key={`${src}-${idx}`}
                  component="img"
                  src={src}
                  alt={`Product thumbnail ${idx + 1}`}
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '8px',
                    border: `1px solid ${brand.neutral[200]}`,
                    objectFit: 'contain',
                    bgcolor: brand.neutral[50],
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      boxShadow: `0 0 0 2px ${brand.primary[300]}`,
                      transform: 'translateY(-1px)',
                    },
                  }}
                />
              )) : (
                <Box sx={{ width: 60, height: 60, borderRadius: '8px', border: `1px dashed ${brand.neutral[300]}`, display: 'grid', placeItems: 'center' }}>
                  <IconPhoto size={18} color={brand.neutral[400]} />
                </Box>
              )}
            </Stack>

            {isEdit && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[500], flex: 1 }}>
                    Image URL
                  </Typography>
                  <Typography variant="caption" sx={{ color: brand.neutral[400] }}>or</Typography>
                  <Button
                    component="label"
                    size="small"
                    variant="outlined"
                    disabled={imageUploading}
                    startIcon={<IconPhoto size={14} />}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}
                  >
                    {imageUploading ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setImageUploadError(null);
                        setImageUploading(true);
                        try {
                          const { uploadProductImage } = await import('src/api/smartpos/products');
                          const result = await uploadProductImage(file);
                          setField('imageUrl', result.url);
                        } catch {
                          setImageUploadError('Upload failed — check your connection and retry.');
                        } finally {
                          setImageUploading(false);
                        }
                      }}
                    />
                  </Button>
                </Stack>
                {imageUploadError && (
                  <Typography variant="caption" sx={{ color: brand.error.main, fontWeight: 500 }}>
                    {imageUploadError}
                  </Typography>
                )}
                <TextField
                  size="small"
                  value={form.imageUrl ?? ''}
                  onChange={(e) => setField('imageUrl', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  fullWidth
                />
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ ...cardSx, flex: 1 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                {isEdit ? (
                  <TextField
                    size="small"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    label="Product Name"
                    fullWidth
                  />
                ) : (
                  <Typography sx={{ fontSize: { xs: 32, md: 40 }, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, color: brand.neutral[900] }}>
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
                    fontSize: '0.72rem',
                    borderRadius: '8px',
                    height: 24,
                  }}
                />
              </Stack>

              <Typography sx={{ color: brand.neutral[500], fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
                {form.description || 'No description provided. Add one to help customers understand this product.'}
              </Typography>

              <Divider sx={{ borderColor: brand.neutral[100] }} />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' },
                  gap: 1.5,
                }}
              >
                <EnhancedMeta icon={<IconBarcode size={14} />} label="SKU" value={form.code || '—'} />
                <EnhancedMeta icon={<IconBarcode size={14} />} label="Barcode" value={form.barcode || '—'} />
                <EnhancedMeta icon={<IconTag size={14} />} label="Category" value={nameMap.category} />
                <EnhancedMeta icon={<IconBuildingStore size={14} />} label="Brand" value={nameMap.brand} />
                <EnhancedMeta icon={<IconBox size={14} />} label="Unit" value={nameMap.unit} />
                <EnhancedMeta icon={<IconReceipt size={14} />} label="Tax Rate" value={`${form.taxRate || 0}%`} />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ ...cardSx, width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <IconPackage size={16} color={brand.neutral[500]} />
              <Typography sx={{ color: brand.neutral[500], fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Stock Summary
              </Typography>
            </Stack>
            <Stack spacing={0}>
              <EnhancedMetric label="Retail Price" value={formatMoney(priceValue)} accent />
              <EnhancedMetric label="Wholesale Price" value={formatMoney(Number(form.wholesalePrice) || 0)} />
              <EnhancedMetric
                label="Low Stock Threshold"
                value={`${form.stockAlert || 0} pcs`}
                warning={hasLowStock}
              />
              <EnhancedMetric label="Status" value={form.status ? 'In Stock' : 'Inactive'} />
            </Stack>
            {lastUpdated && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${brand.neutral[100]}` }}>
                <IconClock size={13} color={brand.neutral[400]} />
                <Typography sx={{ color: brand.neutral[400], fontSize: 11, fontWeight: 500 }}>
                  Last updated {lastUpdated}
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
        <Card sx={{ ...cardSxStatic, width: { xs: '100%', xl: 220 }, flexShrink: 0 }}>
          <CardContent sx={{ p: 1.5 }}>
            {sectionItems.map((item, idx) => (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={idx === activeSection}
                onClick={() => scrollToSection(idx)}
              />
            ))}
            {!isCreate && product && (
              <>
                <Box sx={{ my: 1, borderTop: `1px solid ${brand.neutral[200]}` }} />
                <NavItem
                  icon={<IconBoxMultiple size={18} />}
                  label="Variants"
                  active={false}
                  onClick={() => navigate(`/smartpos/products/${id}/variants`)}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Card ref={(el) => { sectionRefs.current[0] = el; }} sx={{ ...cardSx, flex: 1, ...(flashedSection === 0 ? flashAnimation : {}) }}>
              <CardContent sx={{ p: 2.5 }}>
                <SectionTitle
                  icon={<IconCoin size={20} />}
                  title="Pricing"
                  action={isEdit && form.name ? (
                    <Tooltip title="Suggest pricing">
                      <span>
                        <IconButton
                          size="small"
                          disabled={regenField !== null}
                          onClick={() => regenerateField('price')}
                          sx={{
                            color: brand.primary[600],
                            bgcolor: brand.primary[50],
                            '&:hover': { bgcolor: brand.primary[100] },
                            '&.Mui-disabled': { opacity: 0.5 },
                          }}
                        >
                          <IconSparkles size={14} className={regenField === 'price' ? 'spin' : undefined} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                />
                <FieldGrid edit={isEdit}>
                  <Box sx={isView ? { bgcolor: brand.primary[50], borderRadius: '10px', p: 1.5 } : undefined}>
                    <LabeledField label="Retail Price">
                      <ValueOrInput edit={isEdit} value={String(form.price ?? '')} onChange={(v) => setField('price', Number(v) || 0)} prefix="TSh" accent />
                    </LabeledField>
                    {isView && (
                      <Typography sx={{ color: brand.primary[600], fontSize: 11, fontWeight: 600, mt: 0.5 }}>
                        Primary selling price
                      </Typography>
                    )}
                  </Box>
                  <LabeledField label="Wholesale Price">
                    <ValueOrInput edit={isEdit} value={String(form.wholesalePrice ?? '')} onChange={(v) => setField('wholesalePrice', Number(v) || 0)} prefix="TSh" />
                  </LabeledField>
                  <LabeledField label="Cost Price">
                    <ValueOrInput edit={isEdit} value={String(form.cost ?? '')} onChange={(v) => setField('cost', Number(v) || 0)} prefix="TSh" />
                  </LabeledField>
                  {isEdit && (form.cost ?? 0) > 0 && (form.price ?? 0) > 0 && (form.cost ?? 0) > (form.price ?? 0) && (
                    <Typography variant="caption" sx={{ color: brand.warning.dark, fontWeight: 600, mt: -0.5 }}>
                      Cost exceeds retail price — you may be selling at a loss
                    </Typography>
                  )}
                  <LabeledField label="Minimum Sell Price">
                    <ValueOrInput edit={isEdit} value={String(form.minPrice ?? '')} onChange={(v) => setField('minPrice', Number(v) || 0)} prefix="TSh" />
                  </LabeledField>
                </FieldGrid>
              </CardContent>
            </Card>

            <Card ref={(el) => { sectionRefs.current[1] = el; }} sx={{ ...cardSx, flex: 1, ...(flashedSection === 1 ? flashAnimation : {}) }}>
              <CardContent sx={{ p: 2.5 }}>
                <SectionTitle icon={<IconBox size={20} />} title="Inventory" />
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

            <Card ref={(el) => { sectionRefs.current[2] = el; }} sx={{ ...cardSx, flex: 1, ...(flashedSection === 2 ? flashAnimation : {}) }}>
              <CardContent sx={{ p: 2.5 }}>
                <SectionTitle icon={<IconClipboard size={20} />} title="Additional Info" />
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
                <Divider sx={{ my: 1.5, borderColor: brand.neutral[100] }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <LabeledField label="Serial Tracking">
                    <Chip
                      label={form.trackSerial ? 'Enabled' : 'Disabled'}
                      size="small"
                      sx={{
                        bgcolor: form.trackSerial ? brand.success.light : brand.neutral[100],
                        color: form.trackSerial ? brand.success.dark : brand.neutral[600],
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        borderRadius: '8px',
                      }}
                    />
                  </LabeledField>
                  <LabeledField label="IMEI Tracking">
                    <Chip
                      label={form.trackImei ? 'Enabled' : 'Disabled'}
                      size="small"
                      sx={{
                        bgcolor: form.trackImei ? brand.success.light : brand.neutral[100],
                        color: form.trackImei ? brand.success.dark : brand.neutral[600],
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        borderRadius: '8px',
                      }}
                    />
                  </LabeledField>
                </Box>
              </CardContent>
            </Card>
          </Stack>

          {isEdit && form.type !== 'COMBO' && (
            <Card sx={{ ...cardSx, mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <VariantMatrixBuilder
                  variants={form.variants ?? []}
                  onChange={(variants) => setField('variants', variants)}
                />
              </CardContent>
            </Card>
          )}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card ref={(el) => { sectionRefs.current[3] = el; }} sx={{ ...cardSx, flex: 1.3, ...(flashedSection === 3 ? flashAnimation : {}) }}>
              <CardContent sx={{ p: 2.5 }}>
                <SectionTitle
                  icon={<IconFileDescription size={20} />}
                  title="Description"
                  action={isEdit && form.name ? (
                    <Tooltip title="Regenerate description">
                      <span>
                        <IconButton
                          size="small"
                          disabled={regenField !== null}
                          onClick={() => regenerateField('description')}
                          sx={{
                            color: brand.primary[600],
                            bgcolor: brand.primary[50],
                            '&:hover': { bgcolor: brand.primary[100] },
                            '&.Mui-disabled': { opacity: 0.5 },
                          }}
                        >
                          <IconSparkles size={14} className={regenField === 'description' ? 'spin' : undefined} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                />
                {isEdit ? (
                  <TextField
                    value={form.description ?? ''}
                    onChange={(e) => setField('description', e.target.value)}
                    multiline
                    minRows={8}
                    fullWidth
                    placeholder="Write a compelling product description. Highlight key features, materials, and use cases to help your team and customers."
                  />
                ) : (
                  <Box
                    sx={{
                      borderLeft: `3px solid ${brand.neutral[200]}`,
                      pl: 2.5,
                      py: 0.5,
                    }}
                  >
                    <Typography sx={{ color: brand.neutral[600], lineHeight: 1.8, fontSize: 15 }}>
                      {form.description || 'No product description provided.'}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card ref={(el) => { sectionRefs.current[4] = el; }} sx={{ ...cardSx, flex: 1, ...(flashedSection === 4 ? flashAnimation : {}) }}>
              <CardContent sx={{ p: 2.5 }}>
                <SectionTitle icon={<IconShield size={20} />} title="Identity & Classification" />
                <FieldGrid edit={isEdit}>
                  <LabeledField label="SKU Code">
                    {isEdit ? (
                      <Stack direction="row" spacing={0.75} alignItems="stretch">
                        <Box sx={{ flex: 1 }}>
                          <ValueOrInput edit value={form.code} onChange={(v) => setField('code', v)} />
                        </Box>
                        <Tooltip title={form.code ? 'Replace with auto-generated SKU' : 'Auto-generate a SKU'}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleGenerateSku}
                              disabled={skuGenerating}
                              sx={{
                                minWidth: 0,
                                borderRadius: '10px',
                                px: 1.4,
                                borderColor: brand.neutral[200],
                                color: brand.primary[700],
                                bgcolor: brand.primary[50],
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                textTransform: 'none',
                                '&:hover': { bgcolor: brand.primary[100], borderColor: brand.primary[300] },
                                '&.Mui-disabled': { opacity: 0.6 },
                              }}
                            >
                              {skuGenerating ? '…' : 'Generate'}
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <ValueOrInput edit={false} value={form.code} onChange={(v) => setField('code', v)} />
                    )}
                  </LabeledField>
                  <LabeledField label="Category">
                    {isEdit ? (
                      <TextField select size="small" value={form.categoryId ?? ''} onChange={(e) => setField('categoryId', e.target.value || undefined)} fullWidth>
                        <MenuItem value="">Select category</MenuItem>
                        {categories.map((c) => (
                          <MenuItem
                            key={c.id}
                            value={c.id}
                            sx={{ pl: c.parentId ? 3 : 2, fontWeight: c.parentId ? 400 : 600 }}
                          >
                            {c.parentId ? '— ' : ''}{c.name}
                          </MenuItem>
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

                <Box
                  sx={{
                    mt: 2,
                    bgcolor: brand.info.light,
                    borderRadius: '10px',
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <IconInfoCircle size={16} color={brand.info.dark} style={{ marginTop: 1, flexShrink: 0 }} />
                    <Typography sx={{ color: brand.info.dark, fontSize: 12, fontWeight: 500, lineHeight: 1.5 }}>
                      SKU, Category, Brand, and Unit are used for inventory tracking, reports, and online store listings.
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>

      {/* ── Floating save button ────────────────────────────────────────────── */}
      {(isEdit || (isCreate && appliedAiFields.size > 0)) && (
        <Zoom in={(isEdit && (showFloatingSave || isDirty)) || (isCreate && appliedAiFields.size > 0)}>
          <Box
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1200,
              backdropFilter: 'blur(12px)',
              bgcolor: 'rgba(255,255,255,0.85)',
              borderRadius: '16px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: `0 8px 32px ${brand.neutral[900]}12`,
              p: 0.75,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pl: 0.75 }}>
              {isEdit && isDirty && (
                <>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: brand.warning.main, flexShrink: 0 }} />
                  <Typography sx={{ color: brand.neutral[600], fontSize: 12, fontWeight: 600, mr: 0.5 }}>
                    Unsaved changes
                  </Typography>
                </>
              )}
              {isCreate && appliedAiFields.size > 0 && (
                <Chip
                  icon={<IconSparkles size={14} />}
                  label={`${appliedAiFields.size} suggested fields`}
                  size="small"
                  sx={{
                    height: 28,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    borderRadius: '8px',
                    bgcolor: brand.primary[50],
                    color: brand.primary[700],
                    '& .MuiChip-icon': { color: brand.primary[600] },
                  }}
                />
              )}
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
                  background: brandGradients.cta,
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
                {saving ? 'Saving…' : 'Save Product'}
              </Button>
            </Stack>
          </Box>
        </Zoom>
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal Sub-Components
// ═══════════════════════════════════════════════════════════════════════════════

function SectionTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${brand.neutral[100]}` }}>
      <Box sx={{ color: brand.primary[600], display: 'flex' }}>{icon}</Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[800], flex: 1 }}>{title}</Typography>
      {action && (
        <Box
          sx={{
            display: 'flex',
            '@keyframes letisSpin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
            '& .spin': { animation: 'letisSpin 0.9s linear infinite' },
          }}
        >
          {action}
        </Box>
      )}
    </Stack>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      onClick={onClick}
      sx={{
        py: 1.25,
        px: 1.5,
        borderRadius: '10px',
        cursor: 'pointer',
        color: active ? brand.primary[700] : brand.neutral[600],
        bgcolor: active ? brand.primary[50] : 'transparent',
        fontWeight: active ? 700 : 600,
        fontSize: 13,
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          color: brand.primary[700],
          bgcolor: active ? brand.primary[50] : brand.neutral[50],
          transform: 'translateX(2px)',
        },
      }}
    >
      {active && (
        <Box
          sx={{
            position: 'absolute',
            left: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 4,
            height: 20,
            borderRadius: 2,
            bgcolor: brand.primary[500],
          }}
        />
      )}
      <Box sx={{ display: 'flex', opacity: active ? 1 : 0.5 }}>{icon}</Box>
      <Typography sx={{ fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 1 }}>{label}</Typography>
    </Stack>
  );
}

function EnhancedMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ bgcolor: brand.neutral[50], borderRadius: '10px', p: 1.5 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ color: brand.neutral[400], display: 'flex' }}>{icon}</Box>
        <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
      </Stack>
      <Typography sx={{ color: brand.neutral[800], fontWeight: 700, fontSize: 14 }}>{value || '—'}</Typography>
    </Box>
  );
}

function EnhancedMetric({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <Box sx={{ pb: 1.5, borderBottom: `1px solid ${brand.neutral[100]}`, '&:last-of-type': { borderBottom: 0, pb: 0 } }}>
      <Typography sx={{ color: brand.neutral[500], fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="baseline">
        <Typography sx={{
          color: accent ? brand.primary[700] : brand.neutral[900],
          fontWeight: 900,
          fontSize: 28,
          letterSpacing: '-0.5px',
          lineHeight: 1.2,
        }}>
          {value}
        </Typography>
        {warning && <IconAlertTriangle size={14} color={brand.warning.main} />}
      </Stack>
    </Box>
  );
}

function FieldGrid({ children }: { edit: boolean; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ color: brand.neutral[500], fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.75 }}>{label}</Typography>
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
  accent,
}: {
  edit: boolean;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  accent?: boolean;
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
    <Typography sx={{ color: accent ? brand.primary[700] : brand.neutral[800], fontWeight: accent ? 800 : 700, fontSize: 15 }}>
      {[prefix, value || '—', suffix].filter(Boolean).join(' ')}
    </Typography>
  );
}

// ── Variant Matrix Builder ──────────────────────────────────────────────

interface VariantAxis {
  name: string;   // e.g. "Size", "Color"
  values: string; // comma-separated: "S,M,L"
}

function VariantMatrixBuilder({
  variants,
  onChange,
}: {
  variants: VariantInput[];
  onChange: (variants: VariantInput[]) => void;
}) {
  const [axes, setAxes] = useState<VariantAxis[]>([]);
  const [expanded, setExpanded] = useState(variants.length > 0);

  const generateCombinations = () => {
    const lists = axes
      .filter((a) => a.name.trim() && a.values.trim())
      .map((a) => a.values.split(',').map((v) => v.trim()).filter(Boolean));
    if (lists.length === 0) return;

    const combos: string[][] = lists.reduce(
      (acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])),
      [[]] as string[][],
    );

    const axisNames = axes.map((a) => a.name.trim());

    const newVariants: VariantInput[] = combos.map((combo) => {
      const name = combo.map((v, i) => `${axisNames[i]}:${v}`).join(' / ');
      const existing = variants.find((v) => v.name === name);
      return (
        existing ?? {
          name,
          code: undefined,
          cost: undefined,
          price: undefined,
          wholesalePrice: undefined,
          minPrice: undefined,
          imageUrl: undefined,
        }
      );
    });

    onChange(newVariants);
  };

  const updateVariant = (idx: number, patch: Partial<VariantInput>) => {
    const next = [...variants];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const removeVariant = (idx: number) => {
    onChange(variants.filter((_, i) => i !== idx));
  };

  const applyBulk = (field: 'cost' | 'price' | 'wholesalePrice' | 'minPrice', value: number) => {
    onChange(variants.map((v) => ({ ...v, [field]: value || undefined })));
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.neutral[800], flex: 1 }}>
          Variants
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setExpanded((v) => !v)}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            borderColor: brand.neutral[200],
            color: brand.neutral[600],
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </Stack>

      {expanded && (
        <Stack spacing={2}>
          {/* Axes builder */}
          <Box
            sx={{
              p: 2,
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              bgcolor: brand.neutral[50],
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: brand.neutral[700], mb: 1 }}>
              Variant Attributes
            </Typography>
            <Stack spacing={1}>
              {axes.map((axis, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Name (e.g. Size)"
                    value={axis.name}
                    onChange={(e) => {
                      const next = [...axes];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setAxes(next);
                    }}
                    sx={{ width: 160 }}
                  />
                  <TextField
                    size="small"
                    placeholder="Values (e.g. S,M,L)"
                    value={axis.values}
                    onChange={(e) => {
                      const next = [...axes];
                      next[idx] = { ...next[idx], values: e.target.value };
                      setAxes(next);
                    }}
                    fullWidth
                  />
                  <IconButton
                    size="small"
                    onClick={() => setAxes(axes.filter((_, i) => i !== idx))}
                  >
                    <IconX size={16} />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<IconPlus size={14} />}
                onClick={() => setAxes([...axes, { name: '', values: '' }])}
                sx={{ textTransform: 'none', fontWeight: 600, alignSelf: 'flex-start' }}
              >
                Add attribute
              </Button>
            </Stack>
            <Button
              variant="contained"
              size="small"
              onClick={generateCombinations}
              disabled={axes.length === 0}
              sx={{
                mt: 1.5,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Generate Combinations
            </Button>
          </Box>

          {/* Variant grid */}
          {variants.length > 0 && (
            <Box>
              {/* Bulk apply toolbar */}
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                {(['cost', 'price', 'wholesalePrice', 'minPrice'] as const).map((field) => (
                  <TextField
                    key={field}
                    size="small"
                    type="number"
                    label={`Bulk ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                    placeholder="Apply to all"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) applyBulk(field, v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = Number((e.target as HTMLInputElement).value);
                        if (v > 0) applyBulk(field, v);
                      }
                    }}
                    sx={{ width: 150 }}
                    InputProps={{ sx: { borderRadius: '10px' } }}
                  />
                ))}
              </Stack>

              {/* Variant rows */}
              <Stack spacing={1}>
                {variants.map((v, idx) => (
                  <Stack
                    key={`${v.name}-${idx}`}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: `1px solid ${brand.neutral[200]}`,
                      bgcolor: '#fff',
                      flexWrap: 'wrap',
                    }}
                    useFlexGap
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 13,
                        minWidth: 140,
                        flex: { xs: '1 1 100%', sm: '0 0 auto' },
                      }}
                    >
                      {v.name}
                    </Typography>
                    <TextField
                      size="small"
                      label="Code"
                      value={v.code ?? ''}
                      onChange={(e) => updateVariant(idx, { code: e.target.value || undefined })}
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Cost"
                      type="number"
                      value={v.cost ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { cost: Number(e.target.value) || undefined })
                      }
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Price"
                      type="number"
                      value={v.price ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { price: Number(e.target.value) || undefined })
                      }
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Wholesale"
                      type="number"
                      value={v.wholesalePrice ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { wholesalePrice: Number(e.target.value) || undefined })
                      }
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Min Price"
                      type="number"
                      value={v.minPrice ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { minPrice: Number(e.target.value) || undefined })
                      }
                      sx={{ width: 100 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small"
                      label="Image URL"
                      value={v.imageUrl ?? ''}
                      onChange={(e) =>
                        updateVariant(idx, { imageUrl: e.target.value || undefined })
                      }
                      sx={{ minWidth: 180, flex: 1 }}
                      InputProps={{ sx: { borderRadius: '10px' } }}
                    />
                    <IconButton size="small" onClick={() => removeVariant(idx)}>
                      <IconTrash size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Leaving this page will discard them.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setShowCancelConfirm(false)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Keep Editing
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setShowCancelConfirm(false);
              navigate(isCreate ? '/smartpos/products' : `/smartpos/products/${id}`);
            }}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800 }}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
