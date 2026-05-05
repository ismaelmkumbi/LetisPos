/**
 * ProductEditDrawer — full Stocky parity (Vue Add_product.vue → React).
 *
 * Sections (collapsible accordion):
 *   1. Basic information   — name, type, code (with auto-generate), barcode symbology,
 *                            category + sub-category, brand, unit (each with quick-add +),
 *                            description, image
 *   2. Price levels        — Cost / Retail / Wholesale / Min selling (4-tile grid)
 *                          + Tax method, Tax rate, Loyalty points
 *   3. Inventory           — Stock alert, Weight, Dimensions
 *   4. Variants            — table-style editor with all 4 prices
 *   5. Combo composition   — appears when type=COMBO
 *   6. Warranty & tracking — months + serial/IMEI flags
 *   7. Visibility          — Active / Sellable / Featured / Hide-online
 *
 * Quick-add: each of Category / Brand / Unit has a `+` button that opens a tiny
 * inline dialog so the user never has to leave this drawer.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary,
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, InputAdornment,
  MenuItem, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  IconBarcode, IconBox, IconChevronDown, IconCoin, IconCopy, IconEye, IconPackage,
  IconPlus, IconPrinter, IconRefresh, IconShield, IconSparkles, IconStar,
  IconTag, IconTrash, IconX,
} from '@tabler/icons-react';

import {
  createProduct, updateProduct,
  listCategories, createCategory,
  listBrands, createBrand,
  listUnits, createUnit,
  type CreateProductBody, type Product,
} from 'src/api/smartpos/products';
import { aiSuggestProduct, aiDescribeProduct, type ProductSuggestion, type ProductDescribeResponse } from 'src/api/smartpos/aiProducts';
import type { BarcodeSymbology, Brand, Category, Unit } from 'src/api/smartpos/types';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import ComboItemsEditor from './ComboItemsEditor';
import ProductImageDropzone from './ProductImageDropzone';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

/** Minimal HTML-entity escape — safe for injecting into a print document. */
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── types ─────────────────────────────────────────────────────────────────────

export interface ProductEditDrawerProps {
  open: boolean;
  initial?: Product | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
  /** When set, shows a "Duplicate" button that fires this callback. */
  onDuplicate?: () => void;
  /** Pre-fill a new-product form from an existing product (duplicate flow).
   *  Applies only when `initial` is null/undefined. */
  prefill?: Product | null;
}

interface VariantDraft {
  id?: string;
  name: string;
  code: string;
  cost: string;
  price: string;
  wholesalePrice: string;
  minPrice: string;
  imageUrl: string;
}

const emptyVariant = (): VariantDraft => ({
  name: '', code: '', cost: '', price: '',
  wholesalePrice: '', minPrice: '', imageUrl: '',
});

type ProductDrawerForm = Omit<CreateProductBody, 'code'> & { code: string };

const emptyForm: ProductDrawerForm = {
  code: '', name: '', description: '',
  cost: 0, price: 0,
  taxMethod: 'EXCLUSIVE',
  taxRate: 0,
  stockAlert: 0,
  type: 'STANDARD',
  status: true,
  sellable: true,
  featured: false,
  hideOnline: false,
  trackSerial: false,
  trackImei: false,
  barcodeSymbology: 'CODE128',
  points: 0,
};

// Generate an EAN-style 13-digit code (mirrors Vue `generateNumber`)
const generateCode = () => {
  const min = 10 ** 12;
  const max = 10 ** 13 - 1;
  return String(Math.floor(min + Math.random() * (max - min)));
};

// Reusable: section header used inside accordion summary
function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{
        width: 32, height: 32, borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${brand.primary[50]} 0%, ${brand.primary[100]} 100%)`,
        color: brand.primary[700],
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.neutral[800] }}>
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block', lineHeight: 1.2 }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

// Price tile used in the 4-up Price Levels grid
function PriceTile({
  icon, label, helper, value, onChange, accent, required, prefix = 'TZS',
}: {
  icon: React.ReactNode;
  label: string;
  helper?: string;
  value: number | string;
  onChange: (v: number) => void;
  accent: { bg: string; fg: string; border: string };
  required?: boolean;
  prefix?: string;
}) {
  return (
    <Box
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        p: 1.75,
        borderRadius: '12px',
        border: `1px solid ${accent.border}`,
        background: accent.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ color: accent.fg, display: 'flex' }}>{icon}</Box>
        <Typography variant="caption" sx={{
          color: accent.fg, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', fontSize: '0.6875rem',
        }}>
          {label}{required ? ' *' : ''}
        </Typography>
      </Stack>
      <TextField
        type="number"
        size="small"
        fullWidth
        value={value === 0 || value === '' ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        placeholder="0.00"
        InputProps={{
          startAdornment: <InputAdornment position="start">{prefix}</InputAdornment>,
          sx: {
            bgcolor: '#fff',
            borderRadius: '10px',
            fontWeight: 600,
            '& input': { fontSize: '0.95rem' },
          },
        }}
      />
      {helper && (
        <Typography variant="caption" sx={{ color: brand.neutral[500], lineHeight: 1.3 }}>
          {helper}
        </Typography>
      )}
    </Box>
  );
}

// ─── Quick-Add Dialog (Category | Brand | Unit) ────────────────────────────────

type QuickAddKind = 'category' | 'brand' | 'unit' | null;

interface QuickAddState {
  kind: QuickAddKind;
  name: string;
  code: string;
  shortName: string;
  description: string;
}

const emptyQuickAdd: QuickAddState = {
  kind: null, name: '', code: '', shortName: '', description: '',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProductEditDrawer({ open, initial, onClose, onSaved, onDuplicate, prefill }: ProductEditDrawerProps) {
  const [form, setForm]                   = useState<ProductDrawerForm>(emptyForm);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // lookup data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands]         = useState<Brand[]>([]);
  const [units, setUnits]           = useState<Unit[]>([]);

  // quick-add modal
  const [quickAdd, setQuickAdd]               = useState<QuickAddState>(emptyQuickAdd);
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);
  const [quickAddError, setQuickAddError]     = useState<string | null>(null);

  // ── AI Smart-Fill ──────────────────────────────────────────────────────
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);
  /** Last suggestion the AI returned. The drawer shows a "Review suggestion"
   *  card with per-field accept buttons until the user clears it. */
  const [aiSuggestion, setAiSuggestion] = useState<ProductSuggestion | null>(null);
  const [describeMode, setDescribeMode] = useState(false);
  const [aiDescribeResult, setAiDescribeResult] = useState<ProductDescribeResponse | null>(null);

  // section open state — Basic info & Pricing open by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    pricing: true,
    inventory: false,
    variants: false,
    combo: false,
    warranty: false,
    visibility: false,
  });
  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  // ── Barcode label print ─────────────────────────────────────────────────
  const handlePrintLabel = () => {
    const barcode = initial?.barcodes?.[0]?.barcode ?? initial?.code;
    if (!barcode) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Barcode Label</title>
<style>
  @page { margin: 0; size: 100mm 60mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; }
  .label { text-align: center; padding: 12px; }
  .label .barcode { font-family: 'Libre Barcode 39', 'Code 128', monospace; font-size: 48px; letter-spacing: 2px; color: #000; margin: 8px 0; }
  .label .product { font-size: 11px; font-weight: 600; color: #333; margin-bottom: 2px; }
  .label .price { font-size: 14px; font-weight: 800; color: #111; }
</style></head><body>
<div class="label">
  <div class="product">${escapeHtml(initial?.name ?? '')}</div>
  <div class="barcode">${escapeHtml(barcode)}</div>
  <div class="price">${formatMoney(initial?.price ?? 0)}</div>
</div>
<script>window.onload=function(){window.print();window.close()};</script>
</body></html>`);
    w.document.close();
  };

  // ── load lookup data once ────────────────────────────────────────────────────
  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
    listBrands().then(setBrands).catch(() => {});
    listUnits().then(setUnits).catch(() => {});
  }, []);

  // ── populate form when drawer opens ──────────────────────────────────────────
  useEffect(() => {
    const src = initial ?? prefill;
    if (src) {
      setForm({
        code:             !initial && prefill ? '' : src.code,  // clear code on duplicate
        name:             src.name,
        description:      src.description ?? '',
        cost:             src.cost,
        price:            src.price,
        wholesalePrice:   src.wholesalePrice ?? undefined,
        minPrice:         src.minPrice ?? undefined,
        points:           src.points ?? 0,
        taxMethod:        src.taxMethod,
        taxRate:          src.taxRate,
        stockAlert:       src.stockAlert,
        type:             src.type,
        status:           src.status,
        sellable:         src.sellable !== false,
        featured:         src.featured ?? false,
        hideOnline:       src.hideOnline ?? false,
        categoryId:       src.categoryId ?? undefined,
        subCategoryId:    src.subCategoryId ?? undefined,
        brandId:          src.brandId ?? undefined,
        unitId:           src.unitId ?? undefined,
        imageUrl:         src.imageUrl ?? undefined,
        barcodeSymbology: (src.barcodeSymbology as BarcodeSymbology) ?? 'CODE128',
        warrantyMonths:   src.warrantyMonths ?? undefined,
        guaranteeMonths:  src.guaranteeMonths ?? undefined,
        lengthCm:         src.lengthCm ?? undefined,
        widthCm:          src.widthCm ?? undefined,
        heightCm:         src.heightCm ?? undefined,
        weightGrams:      src.weightGrams ?? undefined,
        trackSerial:      src.trackSerial ?? false,
        trackImei:        src.trackImei ?? false,
      });
      setVariantDrafts(
        (src.variants ?? []).map((v) => ({
          id:             v.id,
          name:           v.name,
          code:           v.code ?? '',
          cost:           String(v.cost ?? ''),
          price:          String(v.price ?? ''),
          wholesalePrice: String(v.wholesalePrice ?? ''),
          minPrice:       String(v.minPrice ?? ''),
          imageUrl:       v.imageUrl ?? '',
        })),
      );
    } else {
      setForm(emptyForm);
      setVariantDrafts([]);
    }
    setError(null);
  }, [initial, prefill, open]);

  // ── derived: sub-categories (children of selected categoryId) ────────────────
  const subCategories = useMemo(
    () => categories.filter((c) => c.parentId === form.categoryId),
    [categories, form.categoryId],
  );

  // ── patch helpers ────────────────────────────────────────────────────────────
  const patch = <K extends keyof ProductDrawerForm>(k: K, v: ProductDrawerForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const patchVariant = (idx: number, field: keyof VariantDraft, value: string) =>
    setVariantDrafts((d) => d.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));

  // ── AI suggest handlers ─────────────────────────────────────────────────────
  const askAi = async () => {
    if (!form.name.trim()) {
      setAiError('Type a product name first');
      return;
    }
    setAiSuggesting(true);
    setAiError(null);
    try {
      const sug = await aiSuggestProduct({
        name: form.name.trim(),
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands:     brands.map((b) => ({ id: b.id, name: b.name })),
          units:      units.map((u) => ({ id: u.id, name: u.name })),
          currency:   'TZS',
          defaultTaxRate: 18,
        },
      });
      setAiSuggestion(sug);
      // Auto-expand pricing accordion so the suggested numbers are visible.
      setOpenSections((s) => ({ ...s, pricing: true, basic: true }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setAiError(e.response?.data?.message ?? e.message ?? 'AI request failed');
    } finally {
      setAiSuggesting(false);
    }
  };

  const askAiDescribe = async () => {
    const text = (describeMode ? form.description?.trim() : form.name.trim()) || form.name.trim();
    if (!text || text.length < 3) {
      setAiError('Provide more detail for the AI to work with');
      return;
    }
    setAiSuggesting(true);
    setAiError(null);
    try {
      const sug = await aiDescribeProduct({
        description: text,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands:     brands.map((b) => ({ id: b.id, name: b.name })),
          units:      units.map((u) => ({ id: u.id, name: u.name })),
          currency:   'TZS',
          defaultTaxRate: 18,
        },
      });
      setAiDescribeResult(sug);
      setOpenSections((s) => ({ ...s, pricing: true, basic: true, inventory: true, warranty: true }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setAiError(e.response?.data?.message ?? e.message ?? 'AI request failed');
    } finally {
      setAiSuggesting(false);
    }
  };

  /** Fields that the AI can fill in. We list them explicitly so future schema
   *  changes don't accidentally overwrite the user's manual edits. */
  const SUGGESTABLE_FIELDS: (keyof CreateProductBody)[] = [
    'name', 'description', 'categoryId', 'brandId', 'unitId',
    'barcodeSymbology', 'code', 'cost', 'price', 'wholesalePrice',
    'minPrice', 'taxRate', 'taxMethod', 'stockAlert', 'type',
    'warrantyMonths', 'guaranteeMonths',
    'lengthCm', 'widthCm', 'heightCm', 'weightGrams',
    'trackSerial', 'trackImei', 'featured', 'hideOnline', 'points',
  ];

  /** Pull a single field from the suggestion onto the form, or all of them. */
  const acceptSuggestion = (only?: keyof CreateProductBody) => {
    const src = (aiDescribeResult ?? aiSuggestion) as Record<string, unknown> | null;
    if (!src) return;
    setForm((f) => {
      const next = { ...f };
      const fields = only ? [only] : SUGGESTABLE_FIELDS;
      for (const k of fields) {
        const v = src[k as string];
        if (v !== null && v !== undefined && v !== '') {
          (next as unknown as Record<string, unknown>)[k as string] = v;
        }
      }
      return next;
    });
    if (only) {
      // After applying the field, clear it from the suggestion card so it disappears.
      if (aiDescribeResult) {
        setAiDescribeResult((s) => {
          if (!s) return s;
          if (!only) return null;
          const cleared = { ...s } as ProductDescribeResponse & Record<string, unknown>;
          cleared[only as string] = null;
          return cleared as ProductDescribeResponse;
        });
      } else {
        setAiSuggestion((s) => {
          if (!s) return s;
          const cleared = { ...s } as ProductSuggestion & Record<string, unknown>;
          cleared[only as string] = null;
          return cleared as ProductSuggestion;
        });
      }
    } else {
      setAiSuggestion(null);
      setAiDescribeResult(null);
    }
  };

  // ── quick-add handlers ───────────────────────────────────────────────────────
  const openQuickAdd = (kind: QuickAddKind) => {
    setQuickAdd({ ...emptyQuickAdd, kind });
    setQuickAddError(null);
  };

  const submitQuickAdd = async () => {
    if (!quickAdd.kind) return;
    if (!quickAdd.name.trim()) {
      setQuickAddError('Name is required');
      return;
    }
    setQuickAddSubmitting(true);
    setQuickAddError(null);
    try {
      if (quickAdd.kind === 'category') {
        const created = await createCategory({
          name: quickAdd.name.trim(),
          code: quickAdd.code.trim() || null,
          parentId: null,
          imageUrl: null,
          description: quickAdd.description.trim() || null,
        });
        setCategories((cs) => [...cs, created]);
        patch('categoryId', created.id);
      } else if (quickAdd.kind === 'brand') {
        const created = await createBrand({
          name: quickAdd.name.trim(),
          imageUrl: null,
          description: quickAdd.description.trim() || null,
        });
        setBrands((bs) => [...bs, created]);
        patch('brandId', created.id);
      } else if (quickAdd.kind === 'unit') {
        if (!quickAdd.shortName.trim()) {
          setQuickAddError('Short name is required');
          setQuickAddSubmitting(false);
          return;
        }
        const created = await createUnit({
          name: quickAdd.name.trim(),
          shortName: quickAdd.shortName.trim(),
          baseUnitId: null,
          conversionFactor: 1,
        });
        setUnits((us) => [...us, created]);
        patch('unitId', created.id);
      }
      setQuickAdd(emptyQuickAdd);
    } catch (e) {
      setQuickAddError(e instanceof Error ? e.message : 'Quick-add failed');
    } finally {
      setQuickAddSubmitting(false);
    }
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const variants = variantDrafts
      .filter((v) => v.name.trim())
      .map((v) => ({
        name:           v.name.trim(),
        code:           v.code.trim() || undefined,
        cost:           v.cost  !== '' ? Number(v.cost)  : undefined,
        price:          v.price !== '' ? Number(v.price) : undefined,
        wholesalePrice: v.wholesalePrice !== '' ? Number(v.wholesalePrice) : undefined,
        minPrice:       v.minPrice !== '' ? Number(v.minPrice) : undefined,
        imageUrl:       v.imageUrl.trim() || undefined,
      }));

    const body: CreateProductBody = {
      ...form,
      code: form.code.trim() || undefined,
      variants: variants.length > 0 ? variants : undefined,
    };

    try {
      const saved = initial
        ? await updateProduct(initial.id, body)
        : await createProduct(body);
      onSaved(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────

  const isService = form.type === 'SERVICE';
  const isCombo   = form.type === 'COMBO';

  // Tone palettes for the 4 Price Levels tiles
  const priceTiles = {
    cost:      { bg: brand.neutral[50],   fg: brand.neutral[700], border: brand.neutral[200] },
    retail:    { bg: brand.primary[50],   fg: brand.primary[700], border: brand.primary[200] },
    wholesale: { bg: brand.info.light,    fg: brand.info.dark,    border: '#BFDBFE' },
    min:       { bg: brand.warning.light, fg: brand.warning.dark, border: '#FCD34D' },
  };

  return (
    <>
      <EditDrawer
        open={open}
        onClose={onClose}
        onSubmit={handleSubmit}
        submitting={submitting}
        title={initial ? 'Edit product' : 'New product'}
        subtitle={initial ? initial.code : 'Add an SKU to the catalog'}
        width={620}
        extraActions={initial ? (
          <Stack direction="row" spacing={0.75}>
            {initial.barcodes && initial.barcodes.length > 0 && (
              <Tooltip title="Print a barcode label for this product">
                <Button
                  size="small"
                  variant="text"
                  onClick={handlePrintLabel}
                  sx={{ fontWeight: 600, fontSize: '0.75rem', color: brand.neutral[600], minWidth: 0 }}
                >
                  <IconPrinter size={14} style={{ marginRight: 4 }} />
                  Print label
                </Button>
              </Tooltip>
            )}
            {onDuplicate && (
              <Button
                size="small"
                variant="text"
                onClick={onDuplicate}
                sx={{ fontWeight: 600, fontSize: '0.75rem', color: brand.primary[600], minWidth: 0 }}
              >
                <IconCopy size={14} style={{ marginRight: 4 }} />
                Duplicate
              </Button>
            )}
          </Stack>
        ) : undefined}
      >
        {error && <Alert severity="error">{error}</Alert>}

        {/* ───── Section 1 · Basic information ────────────────────────────── */}
        <Accordion
          expanded={openSections.basic}
          onChange={() => toggle('basic')}
          disableGutters elevation={0}
          sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
            <SectionTitle
              icon={<IconBox size={16} />}
              title="Basic information"
              hint="Identity, classification, and image"
            />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            <Stack spacing={2}>
              <TextField
                label="Product name *" value={form.name}
                onChange={(e) => patch('name', e.target.value)}
                size="small" fullWidth
                placeholder="e.g. Classic White T-Shirt"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    describeMode ? askAiDescribe() : askAi();
                  }
                }}
                helperText={aiError ?? (describeMode ? 'Describe the product freely — AI extracts all attributes' : 'Tip: type the name then ⌘/Ctrl + Enter — AI fills the rest')}
                FormHelperTextProps={{ sx: { color: aiError ? brand.error.main : brand.neutral[400] } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={aiSuggesting ? 'Asking AI…' : (describeMode ? 'Generate full profile (⌘+Enter)' : 'Suggest with AI (⌘+Enter)')}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={describeMode ? askAiDescribe : askAi}
                            disabled={aiSuggesting || !form.name.trim()}
                            sx={{
                              bgcolor: aiSuggesting ? brand.neutral[100] : brand.primary[50],
                              color: brand.primary[700],
                              borderRadius: '8px',
                              border: `1px solid ${brand.primary[200]}`,
                              transition: 'all 0.2s',
                              '&:hover': { bgcolor: brand.primary[100] },
                              '&.Mui-disabled': { bgcolor: brand.neutral[50], color: brand.neutral[300] },
                            }}
                          >
                            <IconSparkles size={16} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography
                variant="caption"
                onClick={() => { setDescribeMode(!describeMode); setAiDescribeResult(null); }}
                sx={{
                  color: describeMode ? brand.primary[600] : brand.neutral[500],
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  mt: 0.25,
                  display: 'block',
                  '&:hover': { color: brand.primary[700] },
                }}
              >
                {describeMode ? 'Simple name mode (quick fill)' : 'Describe product in detail →'}
              </Typography>

              {/* AI suggestion card */}
              {(aiSuggestion || aiDescribeResult) && (() => {
                const src = (aiDescribeResult ?? aiSuggestion)!;
                const srcRec = src as unknown as Record<string, unknown>;
                const isDescribe = !!aiDescribeResult;
                return (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    border: `1px solid ${brand.primary[200]}`,
                    background: `linear-gradient(135deg, ${brand.primary[50]} 0%, #fff 100%)`,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ color: brand.primary[700], display: 'flex' }}>
                      <IconSparkles size={16} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: brand.primary[800], flex: 1 }}>
                      {isDescribe ? 'AI full profile' : 'AI suggestion'}
                    </Typography>
                    <Chip
                      label={`${Math.round((src.confidence ?? 0) * 100)}% confident`}
                      size="small"
                      sx={{
                        height: 20, fontSize: '0.6875rem', fontWeight: 700,
                        bgcolor: '#fff',
                        color: (src.confidence ?? 0) >= 0.7 ? brand.success.main
                              : (src.confidence ?? 0) >= 0.4 ? brand.warning.main
                              : brand.neutral[500],
                        border: `1px solid ${brand.neutral[200]}`,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                      via {src.provider}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => { setAiSuggestion(null); setAiDescribeResult(null); }}
                      sx={{ color: brand.neutral[400] }}
                    >
                      <IconX size={14} />
                    </IconButton>
                  </Stack>

                  {src.rationale && (
                    <Typography variant="caption" sx={{
                      display: 'block', mb: 1.25, color: brand.neutral[600],
                      fontStyle: 'italic', lineHeight: 1.4,
                    }}>
                      "{src.rationale}"
                    </Typography>
                  )}

                  {/* Per-field accept chips */}
                  <Stack direction="row" spacing={0.625} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {SUGGESTABLE_FIELDS.map((k) => {
                      const v = srcRec[k as string];
                      if (v === null || v === undefined || v === '') return null;
                      let display = String(v);
                      if (k === 'categoryId') display = `Category: ${categories.find((c) => c.id === v)?.name ?? '—'}`;
                      else if (k === 'brandId') display = `Brand: ${brands.find((b) => b.id === v)?.name ?? '—'}`;
                      else if (k === 'unitId') display = `Unit: ${units.find((u) => u.id === v)?.name ?? '—'}`;
                      else if (k === 'cost' || k === 'price' || k === 'wholesalePrice' || k === 'minPrice') display = `${k}: TZS ${v}`;
                      else if (k === 'taxRate') display = `Tax: ${v}%`;
                      else display = `${k}: ${display.length > 28 ? display.slice(0, 28) + '…' : display}`;
                      return (
                        <Chip
                          key={k as string}
                          label={display}
                          size="small"
                          onClick={() => acceptSuggestion(k)}
                          sx={{
                            height: 24,
                            bgcolor: '#fff',
                            color: brand.primary[700],
                            border: `1px solid ${brand.primary[200]}`,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: brand.primary[100] },
                          }}
                          icon={<IconPlus size={11} style={{ marginLeft: 6 }} />}
                        />
                      );
                    })}
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<IconSparkles size={14} />}
                      onClick={() => acceptSuggestion()}
                      sx={{
                        bgcolor: brand.primary[600], color: '#fff',
                        textTransform: 'none', fontWeight: 700, fontSize: '0.75rem',
                        borderRadius: '8px', px: 1.5,
                        '&:hover': { bgcolor: brand.primary[700] },
                      }}
                    >
                      Accept all
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => { setAiSuggestion(null); setAiDescribeResult(null); }}
                      sx={{
                        color: brand.neutral[600], textTransform: 'none',
                        fontWeight: 600, fontSize: '0.75rem',
                      }}
                    >
                      Dismiss
                    </Button>
                  </Stack>
                </Box>
                );
              })()}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Type" select size="small" sx={{ minWidth: 160 }}
                  value={form.type ?? 'STANDARD'}
                  onChange={(e) => patch('type', e.target.value as CreateProductBody['type'])}
                >
                  <MenuItem value="STANDARD">Standard product</MenuItem>
                  <MenuItem value="SERVICE">Service</MenuItem>
                  <MenuItem value="COMBO">Combo / bundle</MenuItem>
                </TextField>

                <TextField
                  label="Code / SKU *" value={form.code}
                  onChange={(e) => patch('code', e.target.value)}
                  size="small" fullWidth
                  placeholder="Scan or auto-generate"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Auto-generate barcode-friendly code">
                          <IconButton
                            size="small" onClick={() => patch('code', generateCode())}
                            sx={{ color: brand.primary[600] }}
                          >
                            <IconRefresh size={16} />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>

              <TextField
                label="Barcode symbology" select size="small" fullWidth
                value={form.barcodeSymbology ?? 'CODE128'}
                onChange={(e) => patch('barcodeSymbology', e.target.value as BarcodeSymbology)}
                helperText="Used as default when printing labels"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconBarcode size={16} color={brand.neutral[400]} />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="CODE128">Code 128</MenuItem>
                <MenuItem value="CODE39">Code 39</MenuItem>
                <MenuItem value="EAN8">EAN 8</MenuItem>
                <MenuItem value="EAN13">EAN 13</MenuItem>
                <MenuItem value="UPC">UPC</MenuItem>
              </TextField>

              {/* Category + quick-add */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Stack direction="row" spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    label="Category" select fullWidth size="small"
                    value={form.categoryId ?? ''}
                    onChange={(e) => {
                      patch('categoryId', e.target.value || undefined);
                      patch('subCategoryId', undefined);
                    }}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    {categories
                      .filter((c) => !c.parentId)
                      .map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                  </TextField>
                  <Tooltip title="Quick-add a new category">
                    <IconButton
                      onClick={() => openQuickAdd('category')}
                      sx={{
                        bgcolor: brand.primary[50], color: brand.primary[700],
                        borderRadius: '10px',
                        '&:hover': { bgcolor: brand.primary[100] },
                      }}
                    >
                      <IconPlus size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <TextField
                  label="Sub-category" select fullWidth size="small"
                  value={form.subCategoryId ?? ''}
                  onChange={(e) => patch('subCategoryId', e.target.value || undefined)}
                  disabled={!form.categoryId || subCategories.length === 0}
                  helperText={
                    !form.categoryId ? 'Select a category first'
                    : subCategories.length === 0 ? 'No sub-categories' : undefined
                  }
                >
                  <MenuItem value="">— None —</MenuItem>
                  {subCategories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
              </Stack>

              {/* Brand + quick-add */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Stack direction="row" spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    label="Brand" select fullWidth size="small"
                    value={form.brandId ?? ''}
                    onChange={(e) => patch('brandId', e.target.value || undefined)}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    {brands.map((b) => (
                      <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                    ))}
                  </TextField>
                  <Tooltip title="Quick-add a new brand">
                    <IconButton
                      onClick={() => openQuickAdd('brand')}
                      sx={{
                        bgcolor: brand.primary[50], color: brand.primary[700],
                        borderRadius: '10px',
                        '&:hover': { bgcolor: brand.primary[100] },
                      }}
                    >
                      <IconPlus size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Unit + quick-add */}
                <Stack direction="row" spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    label="Unit of measure" select fullWidth size="small"
                    value={form.unitId ?? ''}
                    onChange={(e) => patch('unitId', e.target.value || undefined)}
                    disabled={isService}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    {units.map((u) => (
                      <MenuItem key={u.id} value={u.id}>{u.name} ({u.shortName})</MenuItem>
                    ))}
                  </TextField>
                  <Tooltip title="Quick-add a new unit">
                    <span>
                      <IconButton
                        disabled={isService}
                        onClick={() => openQuickAdd('unit')}
                        sx={{
                          bgcolor: brand.primary[50], color: brand.primary[700],
                          borderRadius: '10px',
                          '&:hover': { bgcolor: brand.primary[100] },
                          '&.Mui-disabled': { bgcolor: brand.neutral[100], color: brand.neutral[400] },
                        }}
                      >
                        <IconPlus size={18} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>

              <TextField
                label="Description" value={form.description ?? ''}
                onChange={(e) => patch('description', e.target.value)}
                size="small" multiline minRows={2} fullWidth
                placeholder="A few words about the product…"
              />

              <Box>
                <ProductImageDropzone
                  imageUrl={form.imageUrl}
                  onImageChange={(url) => patch('imageUrl', url)}
                  disabled={submitting}
                />

                <TextField
                  label="Image URL"
                  value={form.imageUrl ?? ''}
                  onChange={(e) => patch('imageUrl', e.target.value || undefined)}
                  size="small"
                  fullWidth
                  sx={{ mt: 1.5 }}
                  placeholder="https://..."
                  helperText="Paste a public image URL — or use the upload area above"
                />
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* ───── Section 2 · Price levels ─────────────────────────────────── */}
        <Accordion
          expanded={openSections.pricing}
          onChange={() => toggle('pricing')}
          disableGutters elevation={0}
          sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
            <SectionTitle
              icon={<IconCoin size={16} />}
              title="Price levels & tax"
              hint="Cost, retail, wholesale, and the discount-floor price"
            />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            <Stack spacing={2}>
              {/* 4-tile price grid — 2x2 on mobile, 4 across on desktop */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                }}
              >
                <PriceTile
                  icon={<IconCoin size={14} />}
                  label="Cost"
                  helper="Your buying price"
                  value={form.cost}
                  onChange={(v) => patch('cost', v)}
                  accent={priceTiles.cost}
                />
                <PriceTile
                  icon={<IconTag size={14} />}
                  label="Retail price"
                  helper="Default selling price"
                  value={form.price}
                  onChange={(v) => patch('price', v)}
                  accent={priceTiles.retail}
                  required
                />
                <PriceTile
                  icon={<IconBox size={14} />}
                  label="Wholesale"
                  helper="B2B / bulk tier"
                  value={form.wholesalePrice ?? ''}
                  onChange={(v) => patch('wholesalePrice', v || undefined)}
                  accent={priceTiles.wholesale}
                />
                <PriceTile
                  icon={<IconShield size={14} />}
                  label="Min selling"
                  helper="Discount floor"
                  value={form.minPrice ?? ''}
                  onChange={(v) => patch('minPrice', v || undefined)}
                  accent={priceTiles.min}
                />
              </Box>

              <Divider sx={{ my: 0.5 }} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Tax method" select value={form.taxMethod ?? 'EXCLUSIVE'}
                  onChange={(e) => patch('taxMethod', e.target.value as CreateProductBody['taxMethod'])}
                  size="small" fullWidth
                >
                  <MenuItem value="EXCLUSIVE">Exclusive (added at checkout)</MenuItem>
                  <MenuItem value="INCLUSIVE">Inclusive (price contains tax)</MenuItem>
                </TextField>
                <TextField
                  label="Tax rate" type="number" value={form.taxRate ?? 0}
                  onChange={(e) => patch('taxRate', Number(e.target.value))}
                  size="small" fullWidth
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                />
                <TextField
                  label="Loyalty points" type="number" value={form.points ?? 0}
                  onChange={(e) => patch('points', Number(e.target.value))}
                  size="small" fullWidth
                  helperText="Awarded per unit sold"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconStar size={14} color={brand.accent[500]} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* ───── Section 3 · Inventory ─────────────────────────────────────── */}
        {!isService && (
          <Accordion
            expanded={openSections.inventory}
            onChange={() => toggle('inventory')}
            disableGutters elevation={0}
            sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
              <SectionTitle
                icon={<IconPackage size={16} />}
                title="Inventory"
                hint="Stock alert, weight, and dimensions"
              />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Low-stock alert threshold" type="number"
                    value={form.stockAlert ?? 0}
                    onChange={(e) => patch('stockAlert', Number(e.target.value))}
                    size="small" fullWidth
                  />
                  <TextField
                    label="Weight" type="number" value={form.weightGrams ?? ''}
                    onChange={(e) => patch('weightGrams', e.target.value === '' ? undefined : Number(e.target.value))}
                    size="small" fullWidth
                    InputProps={{ endAdornment: <InputAdornment position="end">g</InputAdornment> }}
                  />
                </Stack>

                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Dimensions
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Length" type="number" value={form.lengthCm ?? ''}
                    onChange={(e) => patch('lengthCm', e.target.value === '' ? undefined : Number(e.target.value))}
                    size="small" fullWidth
                    InputProps={{ endAdornment: <InputAdornment position="end">cm</InputAdornment> }}
                  />
                  <TextField
                    label="Width" type="number" value={form.widthCm ?? ''}
                    onChange={(e) => patch('widthCm', e.target.value === '' ? undefined : Number(e.target.value))}
                    size="small" fullWidth
                    InputProps={{ endAdornment: <InputAdornment position="end">cm</InputAdornment> }}
                  />
                  <TextField
                    label="Height" type="number" value={form.heightCm ?? ''}
                    onChange={(e) => patch('heightCm', e.target.value === '' ? undefined : Number(e.target.value))}
                    size="small" fullWidth
                    InputProps={{ endAdornment: <InputAdornment position="end">cm</InputAdornment> }}
                  />
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* ───── Section 4 · Variants ──────────────────────────────────────── */}
        <Accordion
          expanded={openSections.variants}
          onChange={() => toggle('variants')}
          disableGutters elevation={0}
          sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
              <SectionTitle
                icon={<IconTag size={16} />}
                title="Variants"
                hint="Per-SKU price tiers (e.g. sizes, colors)"
              />
              {variantDrafts.length > 0 && (
                <Chip
                  label={variantDrafts.length}
                  size="small"
                  sx={{
                    height: 20, fontWeight: 700, fontSize: '0.6875rem',
                    bgcolor: brand.primary[50], color: brand.primary[700],
                  }}
                />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={<IconPlus size={14} />}
                  onClick={() => setVariantDrafts((d) => [...d, emptyVariant()])}
                  sx={{
                    fontWeight: 700, fontSize: '0.75rem',
                    color: brand.primary[700],
                    bgcolor: brand.primary[50],
                    '&:hover': { bgcolor: brand.primary[100] },
                    borderRadius: '8px',
                  }}
                >
                  Add variant
                </Button>
              </Box>

              {variantDrafts.length === 0 ? (
                <Box sx={{
                  py: 2, px: 2, borderRadius: '10px',
                  bgcolor: brand.neutral[50], border: `1px dashed ${brand.neutral[200]}`,
                  textAlign: 'center',
                }}>
                  <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                    No variants — product is sold as a single SKU.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {variantDrafts.map((v, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 1.5, borderRadius: '12px',
                        border: `1px solid ${brand.neutral[200]}`,
                        bgcolor: brand.neutral[50],
                        position: 'relative',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{
                          fontWeight: 700, color: brand.neutral[600],
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          Variant #{i + 1}
                        </Typography>
                        <Tooltip title="Remove variant">
                          <IconButton
                            size="small"
                            onClick={() => setVariantDrafts((d) => d.filter((_, j) => j !== i))}
                          >
                            <IconTrash size={14} color={brand.error.main} />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            label="Variant name" required size="small" fullWidth
                            value={v.name}
                            onChange={(e) => patchVariant(i, 'name', e.target.value)}
                            placeholder='e.g. "Red / XL"'
                          />
                          <TextField
                            label="Code" size="small" sx={{ minWidth: 130 }}
                            value={v.code}
                            onChange={(e) => patchVariant(i, 'code', e.target.value)}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            label="Cost" size="small" type="number" fullWidth
                            value={v.cost}
                            onChange={(e) => patchVariant(i, 'cost', e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start">TZS</InputAdornment> }}
                          />
                          <TextField
                            label="Retail" size="small" type="number" fullWidth
                            value={v.price}
                            onChange={(e) => patchVariant(i, 'price', e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start">TZS</InputAdornment> }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            label="Wholesale" size="small" type="number" fullWidth
                            value={v.wholesalePrice}
                            onChange={(e) => patchVariant(i, 'wholesalePrice', e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start">TZS</InputAdornment> }}
                          />
                          <TextField
                            label="Min selling" size="small" type="number" fullWidth
                            value={v.minPrice}
                            onChange={(e) => patchVariant(i, 'minPrice', e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start">TZS</InputAdornment> }}
                          />
                        </Stack>
                        <TextField
                          label="Image URL" size="small" fullWidth
                          value={v.imageUrl}
                          onChange={(e) => patchVariant(i, 'imageUrl', e.target.value)}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* ───── Section 5 · Combo composition (only for COMBO + editing) ─── */}
        {isCombo && initial && (
          <Accordion
            expanded={openSections.combo}
            onChange={() => toggle('combo')}
            disableGutters elevation={0}
            sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
              <SectionTitle
                icon={<IconBox size={16} />}
                title="Combo composition"
                hint="Component products that make up this bundle"
              />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
              <ComboItemsEditor productId={initial.id} />
            </AccordionDetails>
          </Accordion>
        )}

        {/* ───── Section 6 · Warranty & tracking ───────────────────────────── */}
        <Accordion
          expanded={openSections.warranty}
          onChange={() => toggle('warranty')}
          disableGutters elevation={0}
          sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
            <SectionTitle
              icon={<IconShield size={16} />}
              title="Warranty & tracking"
              hint="Cover period and per-unit serial tracking"
            />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Warranty (months)" type="number"
                  value={form.warrantyMonths ?? ''}
                  onChange={(e) => patch('warrantyMonths', e.target.value === '' ? undefined : Number(e.target.value))}
                  size="small" fullWidth
                />
                <TextField
                  label="Guarantee (months)" type="number"
                  value={form.guaranteeMonths ?? ''}
                  onChange={(e) => patch('guaranteeMonths', e.target.value === '' ? undefined : Number(e.target.value))}
                  size="small" fullWidth
                />
              </Stack>

              <Stack direction="row" spacing={3} flexWrap="wrap">
                <FormControlLabel
                  control={<Switch checked={!!form.trackSerial} onChange={(e) => patch('trackSerial', e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Track serial numbers</Typography>}
                />
                <FormControlLabel
                  control={<Switch checked={!!form.trackImei} onChange={(e) => patch('trackImei', e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Track IMEI</Typography>}
                />
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* ───── Section 7 · Visibility & options ──────────────────────────── */}
        <Accordion
          expanded={openSections.visibility}
          onChange={() => toggle('visibility')}
          disableGutters elevation={0}
          sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '14px !important', '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<IconChevronDown size={18} />} sx={{ px: 2, py: 0.5 }}>
            <SectionTitle
              icon={<IconEye size={16} />}
              title="Visibility & options"
              hint="Active, sellable, featured, online store"
            />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            <Box sx={{
              display: 'grid', gap: 1,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}>
              <ToggleRow
                label="Active"
                description="Inactive products are hidden everywhere"
                checked={form.status !== false}
                onChange={(v) => patch('status', v)}
              />
              <ToggleRow
                label="Sellable in POS"
                description="Uncheck to hide from cashier search"
                checked={form.sellable !== false}
                onChange={(v) => patch('sellable', v)}
              />
              <ToggleRow
                label="Featured product"
                description="Surface on the storefront's featured rail"
                checked={!!form.featured}
                onChange={(v) => patch('featured', v)}
              />
              <ToggleRow
                label="Hide from online store"
                description="Sell at the POS only, not on the web"
                checked={!!form.hideOnline}
                onChange={(v) => patch('hideOnline', v)}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      </EditDrawer>

      {/* ── Quick-Add dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!quickAdd.kind}
        onClose={() => setQuickAdd(emptyQuickAdd)}
        maxWidth="xs" fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {quickAdd.kind === 'category' && 'Add category'}
          {quickAdd.kind === 'brand' && 'Add brand'}
          {quickAdd.kind === 'unit' && 'Add unit'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {quickAddError && <Alert severity="error">{quickAddError}</Alert>}
            <TextField
              label="Name *" autoFocus size="small" fullWidth
              value={quickAdd.name}
              onChange={(e) => setQuickAdd((q) => ({ ...q, name: e.target.value }))}
            />
            {quickAdd.kind === 'category' && (
              <TextField
                label="Code" size="small" fullWidth
                value={quickAdd.code}
                onChange={(e) => setQuickAdd((q) => ({ ...q, code: e.target.value }))}
                helperText="Optional short code"
              />
            )}
            {quickAdd.kind === 'unit' && (
              <TextField
                label="Short name *" size="small" fullWidth
                value={quickAdd.shortName}
                onChange={(e) => setQuickAdd((q) => ({ ...q, shortName: e.target.value }))}
                helperText="e.g. kg, pcs, L"
              />
            )}
            {(quickAdd.kind === 'category' || quickAdd.kind === 'brand') && (
              <TextField
                label="Description" size="small" fullWidth multiline minRows={2}
                value={quickAdd.description}
                onChange={(e) => setQuickAdd((q) => ({ ...q, description: e.target.value }))}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setQuickAdd(emptyQuickAdd)} disabled={quickAddSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitQuickAdd}
            disabled={quickAddSubmitting}
            sx={{ fontWeight: 700, bgcolor: brand.primary[600], '&:hover': { bgcolor: brand.primary[700] } }}
          >
            {quickAddSubmitting ? 'Saving…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// Reusable toggle row for the visibility section
function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Box
      sx={{
        p: 1.5, borderRadius: '12px',
        border: `1px solid ${brand.neutral[200]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 1.5,
        bgcolor: checked ? brand.primary[50] : '#fff',
        transition: 'background 0.15s ease',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800] }} noWrap>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block', lineHeight: 1.3 }}>
          {description}
        </Typography>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </Box>
  );
}
