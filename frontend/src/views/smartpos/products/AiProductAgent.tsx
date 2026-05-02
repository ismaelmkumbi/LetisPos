import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Zoom,
} from '@mui/material';
import {
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconSparkles,
  IconWand,
  IconX,
} from '@tabler/icons-react';
import {
  aiDescribeProduct,
  aiProductCandidates,
  aiProductFromImage,
  type ProductDescribeResponse,
  type ProductSuggestion,
} from 'src/api/smartpos/aiProducts';
import type { Category, Brand, Unit } from 'src/api/smartpos/types';
import type { CreateProductBody } from 'src/api/smartpos/products';
import { brand, brandGradients } from 'src/theme/smartpos/brand';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AiProductAgentProps {
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  currentValues?: Partial<CreateProductBody>;
  onApply: (suggestion: Partial<CreateProductBody>) => void;
  onClear: () => void;
}

interface FieldChip {
  key: keyof CreateProductBody;
  label: string;
  value: unknown;
  displayValue: string;
  confidence: number;
  accepted: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (v === 0) return '0';
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return String(v);
}

function mapResponseToFields(
  res: ProductDescribeResponse,
  categories: Category[],
  brands: Brand[],
  units: Unit[],
): FieldChip[] {
  const fields: FieldChip[] = [];
  const fc = res.fieldConfidence ?? {};

  const add = (key: keyof CreateProductBody, label: string, value: unknown, displayOverride?: string) => {
    if (value === null || value === undefined) return;
    const confidence = fc[key] ?? res.confidence ?? 0.5;
    fields.push({
      key,
      label,
      value,
      displayValue: displayOverride ?? formatValue(value),
      confidence,
      accepted: true,
    });
  };

  // Resolve UUIDs to display names
  const cat = categories.find((c) => c.id === res.categoryId);
  const brd = brands.find((b) => b.id === res.brandId);
  const unt = units.find((u) => u.id === res.unitId);

  add('name', 'Name', res.name);
  if (res.description) add('description', 'Description', res.description);
  if (res.code) add('code', 'SKU', res.code);
  if (res.categoryId) add('categoryId', 'Category', res.categoryId, cat?.name ?? res.categoryId);
  if (res.brandId) add('brandId', 'Brand', res.brandId, brd?.name ?? res.brandId);
  if (res.unitId) add('unitId', 'Unit', res.unitId, unt?.name ?? res.unitId);
  if (res.barcodeSymbology) add('barcodeSymbology', 'Barcode type', res.barcodeSymbology);
  if (res.cost !== null && res.cost !== undefined) add('cost', 'Cost', res.cost);
  if (res.price !== null && res.price !== undefined) add('price', 'Retail Price', res.price);
  if (res.wholesalePrice !== null && res.wholesalePrice !== undefined) add('wholesalePrice', 'Wholesale Price', res.wholesalePrice);
  if (res.minPrice !== null && res.minPrice !== undefined) add('minPrice', 'Min Price', res.minPrice);
  if (res.taxRate !== null && res.taxRate !== undefined) add('taxRate', 'Tax Rate', `${res.taxRate}%`);
  if (res.taxMethod) add('taxMethod', 'Tax Method', res.taxMethod);
  if (res.stockAlert !== null && res.stockAlert !== undefined) add('stockAlert', 'Stock Alert', res.stockAlert);
  if (res.type) add('type', 'Product Type', res.type);
  if (res.warrantyMonths !== null && res.warrantyMonths !== undefined) add('warrantyMonths', 'Warranty', `${res.warrantyMonths} months`);
  if (res.guaranteeMonths !== null && res.guaranteeMonths !== undefined) add('guaranteeMonths', 'Guarantee', `${res.guaranteeMonths} months`);
  if (res.lengthCm !== null && res.lengthCm !== undefined) add('lengthCm', 'Length', `${res.lengthCm} cm`);
  if (res.widthCm !== null && res.widthCm !== undefined) add('widthCm', 'Width', `${res.widthCm} cm`);
  if (res.heightCm !== null && res.heightCm !== undefined) add('heightCm', 'Height', `${res.heightCm} cm`);
  if (res.weightGrams !== null && res.weightGrams !== undefined) add('weightGrams', 'Weight', `${res.weightGrams} g`);
  if (res.trackSerial !== null && res.trackSerial !== undefined) add('trackSerial', 'Track Serial', res.trackSerial);
  if (res.trackImei !== null && res.trackImei !== undefined) add('trackImei', 'Track IMEI', res.trackImei);
  if (res.featured !== null && res.featured !== undefined) add('featured', 'Featured', res.featured);
  if (res.hideOnline !== null && res.hideOnline !== undefined) add('hideOnline', 'Hide Online', res.hideOnline);
  if (res.points !== null && res.points !== undefined) add('points', 'Loyalty Points', res.points);

  return fields;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return brand.success.main;
  if (confidence >= 0.4) return brand.warning.main;
  return brand.neutral[400];
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.7) return brand.success.light;
  if (confidence >= 0.4) return brand.warning.light;
  return brand.neutral[100];
}

function currentDisplayValue(
  key: keyof CreateProductBody,
  value: unknown,
  categories: Category[],
  brands: Brand[],
  units: Unit[],
): string {
  if (key === 'categoryId') return categories.find((c) => c.id === value)?.name ?? formatValue(value);
  if (key === 'brandId') return brands.find((b) => b.id === value)?.name ?? formatValue(value);
  if (key === 'unitId') return units.find((u) => u.id === value)?.name ?? formatValue(value);
  if (key === 'taxRate' && value !== null && value !== undefined && value !== '') return `${formatValue(value)}%`;
  if (key === 'warrantyMonths' && value !== null && value !== undefined && value !== '') return `${formatValue(value)} months`;
  if (key === 'guaranteeMonths' && value !== null && value !== undefined && value !== '') return `${formatValue(value)} months`;
  if (key === 'lengthCm' && value !== null && value !== undefined && value !== '') return `${formatValue(value)} cm`;
  if (key === 'widthCm' && value !== null && value !== undefined && value !== '') return `${formatValue(value)} cm`;
  if (key === 'heightCm' && value !== null && value !== undefined && value !== '') return `${formatValue(value)} cm`;
  if (key === 'weightGrams' && value !== null && value !== undefined && value !== '') return `${formatValue(value)} g`;
  return formatValue(value);
}

// ── Component ──────────────────────────────────────────────────────────────────

// Compress + base64 a File so we don't ship a 4 MB camera shot to OpenAI.
// 1280px on the long edge keeps small text readable while staying under
// ~250 KB JPEG for typical product photos.
async function fileToCompressedDataUrl(file: File, maxEdge = 1280, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export function AiProductAgent({ categories, brands, units, currentValues = {}, onApply, onClear }: AiProductAgentProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ProductDescribeResponse | null>(null);
  const [fields, setFields] = useState<FieldChip[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [applied, setApplied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Vision (Slice B) ─────────────────────────────────────────────────────
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // ── Disambiguation candidates (Slice C) ──────────────────────────────────
  const [candidates, setCandidates] = useState<ProductSuggestion[]>([]);
  const [clarification, setClarification] = useState<string | null>(null);

  // ── Confirmation modal before applying suggestion to the form (Slice C) ──
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleGenerate = useCallback(async () => {
    const desc = description.trim();
    if (!desc || desc.length < 3) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setApplied(false);

    try {
      const res = await aiDescribeProduct({
        description: desc,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands: brands.map((b) => ({ id: b.id, name: b.name })),
          units: units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
        },
      });

      if (!res.name && !res.code) {
        setError('AI could not extract enough detail. Try adding more specifics about pricing, category, or product type.');
        setLoading(false);
        return;
      }

      setResponse(res);
      setFields(mapResponseToFields(res, categories, brands, units));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate product suggestion';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [description, categories, brands, units]);

  const handleToggleField = useCallback((key: keyof CreateProductBody) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, accepted: !f.accepted } : f)),
    );
  }, []);

  // Show the confirmation modal first; the actual write to the form happens
  // when the user clicks Apply inside the modal.
  const handleRequestApply = useCallback(() => {
    if (fields.filter((f) => f.accepted).length === 0) return;
    setConfirmOpen(true);
  }, [fields]);

  const handleAcceptAll = useCallback(() => {
    const accepted = fields.filter((f) => f.accepted);
    const partial: Partial<CreateProductBody> = {};
    for (const f of accepted) {
      (partial as Record<string, unknown>)[f.key] = f.value;
    }
    onApply(partial);
    setApplied(true);
    setConfirmOpen(false);
  }, [fields, onApply]);

  // Keyboard shortcut: Cmd+Enter to generate.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  // Keyboard shortcut: Cmd+Shift+Enter to apply selected fields.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleAcceptAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAcceptAll]);

  // ── Vision: camera / file → describe response ──────────────────────────
  const handleImagePicked = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file twice in a row
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Please pick an image under 8 MB.');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);
    setApplied(false);
    setCandidates([]);
    setClarification(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setImagePreview(dataUrl);
      const res = await aiProductFromImage({
        imageDataUrls: [dataUrl],
        hint: description.trim() || undefined,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands: brands.map((b) => ({ id: b.id, name: b.name })),
          units: units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
        },
      });
      if (!res.name) {
        setError('AI could not identify the product. Try a clearer photo or add a hint in the text box.');
        return;
      }
      setResponse(res);
      setFields(mapResponseToFields(res, categories, brands, units));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vision lookup failed');
    } finally {
      setLoading(false);
    }
  }, [description, categories, brands, units]);

  // ── Disambiguation: vague seed → candidate list ────────────────────────
  const handleFindVariants = useCallback(async () => {
    const seed = description.trim();
    if (!seed) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setApplied(false);
    setFields([]);
    try {
      const res = await aiProductCandidates({
        name: seed,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands: brands.map((b) => ({ id: b.id, name: b.name })),
          units: units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
        },
      });
      setCandidates(res.candidates ?? []);
      setClarification(res.clarification ?? null);
      if (!res.candidates || res.candidates.length === 0) {
        setError('No matching variants. Try a more specific name.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Variant lookup failed');
    } finally {
      setLoading(false);
    }
  }, [description, categories, brands, units]);

  // Pick one candidate variant — fold it into the regular field-chip flow.
  const handlePickCandidate = useCallback((c: ProductSuggestion) => {
    // Map ProductSuggestion → ProductDescribeResponse-shaped object so we
    // can reuse mapResponseToFields without duplicating column definitions.
    const synth = { ...c, taxMethod: null, stockAlert: null, type: 'STANDARD',
      warrantyMonths: null, guaranteeMonths: null, lengthCm: null, widthCm: null,
      heightCm: null, weightGrams: null, trackSerial: false, trackImei: false,
      featured: false, hideOnline: false, points: null, fieldConfidence: null,
      subCategoryId: null,
    } as unknown as ProductDescribeResponse;
    setResponse(synth);
    setFields(mapResponseToFields(synth, categories, brands, units));
    setCandidates([]);
    setClarification(null);
  }, [categories, brands, units]);

  const handleDismiss = useCallback(() => {
    setResponse(null);
    setFields([]);
    setDescription('');
    setImagePreview(null);
    setCandidates([]);
    setClarification(null);
    onClear();
    setApplied(false);
    setExpanded(true);
  }, [onClear]);

  const acceptedCount = fields.filter((f) => f.accepted).length;
  const hasFields = fields.length > 0;

  return (
    <Zoom in>
      <Card
        sx={{
          mb: 2.5,
          borderRadius: '12px',
          border: `1px solid ${loading ? brand.primary[300] : brand.neutral[200]}`,
          boxShadow: `0 1px 2px ${brand.neutral[900]}06, 0 4px 12px ${brand.neutral[900]}05`,
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          ...(loading && {
            borderColor: brand.primary[300],
            boxShadow: `0 0 0 2px ${brand.primary[200]}, 0 4px 12px ${brand.primary[300]}30`,
          }),
        }}
      >
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <IconSparkles size={20} style={{ color: brand.primary[600] }} />
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: brand.neutral[800], flex: 1 }}>
              AI Product Registration
            </Typography>
            {hasFields && (
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </IconButton>
            )}
          </Stack>

          {/* ── Input area ──────────────────────────────────────────────── */}
          {!applied && (
            <>
              <TextField
                inputRef={textareaRef}
                multiline
                minRows={2}
                maxRows={6}
                fullWidth
                value={description}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder={`Describe your product naturally — name, category, pricing, features, dimensions…

e.g. "Samsung Galaxy S25 Ultra 512GB, titanium gray, premium smartphone. Cost 2400000 TZS, retail 3200000 TZS. 218g, 162.8x77.6x8.2mm. 24-month warranty, IMEI tracking."`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    bgcolor: brand.neutral[50],
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                  },
                  '& .MuiOutlinedInput-input': {
                    '&::placeholder': { color: brand.neutral[400], opacity: 1 },
                  },
                }}
              />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={handleImagePicked}
                />
                <Tooltip title="Take or upload a product photo — AI will identify it">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={loading}
                      onClick={() => fileInputRef.current?.click()}
                      startIcon={<IconCamera size={15} />}
                      sx={{
                        textTransform: 'none', borderRadius: '999px', fontWeight: 700,
                        fontSize: '0.74rem', px: 1.4, py: 0.4,
                        borderColor: brand.primary[200], color: brand.primary[700], bgcolor: brand.primary[50],
                        '&:hover': { bgcolor: brand.primary[100], borderColor: brand.primary[300] },
                      }}
                    >
                      Photo
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Show variant candidates — useful when the name is ambiguous (e.g. 'Samsung phone')">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={loading || description.trim().length < 2}
                      onClick={handleFindVariants}
                      startIcon={<IconWand size={15} />}
                      sx={{
                        textTransform: 'none', borderRadius: '999px', fontWeight: 700,
                        fontSize: '0.74rem', px: 1.4, py: 0.4,
                        borderColor: brand.neutral[200], color: brand.neutral[700],
                        '&:hover': { bgcolor: brand.neutral[50], borderColor: brand.neutral[300] },
                      }}
                    >
                      Find variants
                    </Button>
                  </span>
                </Tooltip>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
                  {description.length}/2000 · Cmd+Enter
                </Typography>
              </Stack>

              {imagePreview && (
                <Box sx={{ mt: 1.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar
                      src={imagePreview}
                      variant="rounded"
                      sx={{ width: 56, height: 56, border: `1px solid ${brand.neutral[200]}`, borderRadius: '8px' }}
                    />
                    <Typography sx={{ fontSize: '0.78rem', color: brand.neutral[600], flex: 1 }}>
                      Photo attached — AI is using this image
                    </Typography>
                    <IconButton size="small" onClick={() => setImagePreview(null)}>
                      <IconX size={14} />
                    </IconButton>
                  </Stack>
                </Box>
              )}

              {candidates.length > 0 && (
                <Box sx={{
                  mt: 1.5, p: 1.25, borderRadius: '10px',
                  bgcolor: brand.neutral[50], border: `1px solid ${brand.neutral[200]}`,
                }}>
                  {clarification && (
                    <Typography sx={{ fontSize: '0.78rem', color: brand.neutral[600], mb: 0.75, fontWeight: 600 }}>
                      {clarification}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {candidates.map((c, idx) => (
                      <Chip
                        key={`cand-${idx}`}
                        size="small"
                        clickable
                        onClick={() => handlePickCandidate(c)}
                        label={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.76rem' }}>
                              {c.name}
                            </Typography>
                            {c.price != null && (
                              <Typography component="span" sx={{ fontSize: '0.7rem', color: brand.primary[700], fontWeight: 600 }}>
                                · TSh {Number(c.price).toLocaleString('en-TZ')}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{
                          height: 30, borderRadius: '8px', bgcolor: '#fff',
                          border: `1px solid ${brand.primary[200]}`, color: brand.neutral[800],
                          '&:hover': { bgcolor: brand.primary[50], borderColor: brand.primary[300] },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {loading && (
            <Box
              sx={{
                mt: 2,
                p: 3,
                borderRadius: '10px',
                bgcolor: brand.primary[50],
                border: `1px dashed ${brand.primary[200]}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: `3px solid ${brand.primary[100]}`,
                  borderTopColor: brand.primary[500],
                  animation: 'spin 0.8s linear infinite',
                  '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                }}
              />
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: brand.primary[700] }}>
                AI is analyzing your description…
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: brand.neutral[500] }}>
                Extracting product details, pricing, and attributes
              </Typography>
            </Box>
          )}

          {/* ── Error ────────────────────────────────────────────────────── */}
          {error && !loading && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: '10px',
                bgcolor: brand.error.light,
                border: `1px solid ${brand.error.main}40`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Typography sx={{ fontSize: '0.8rem', color: brand.error.dark, flex: 1, fontWeight: 600 }}>
                  {error}
                </Typography>
                <IconButton size="small" onClick={() => setError(null)}>
                  <IconX size={14} />
                </IconButton>
              </Stack>
              <Button
                size="small"
                variant="text"
                onClick={handleGenerate}
                sx={{ mt: 0.5, fontWeight: 700, color: brand.error.dark, fontSize: '0.75rem' }}
              >
                Try again
              </Button>
            </Box>
          )}

          {/* ── Suggestion results ───────────────────────────────────────── */}
          <Collapse in={expanded && hasFields}>
            <Box sx={{ mt: 2 }}>
              {/* Rationale + meta */}
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: '10px',
                  bgcolor: brand.primary[50],
                  border: `1px solid ${brand.primary[100]}`,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: response?.rationale ? 0.5 : 0 }}>
                  <IconSparkles size={14} style={{ color: brand.primary[600] }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: brand.primary[700] }}>
                    AI suggestion · via {response?.provider ?? 'AI'} · {Math.round((response?.confidence ?? 0) * 100)}% confidence
                  </Typography>
                </Stack>
                {response?.rationale && (
                  <Typography sx={{ fontSize: '0.78rem', color: brand.neutral[600], lineHeight: 1.5 }}>
                    {response.rationale}
                  </Typography>
                )}
              </Box>

              {/* Field chips */}
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {fields.map((f) => (
                  <Chip
                    key={f.key}
                    label={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.7rem', color: brand.neutral[500], textTransform: 'uppercase' }}>
                          {f.label}
                        </Typography>
                        <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                          {f.displayValue}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{ fontWeight: 600, fontSize: '0.65rem', color: confidenceColor(f.confidence) }}
                        >
                          {Math.round(f.confidence * 100)}%
                        </Typography>
                      </Box>
                    }
                    size="small"
                    onClick={() => handleToggleField(f.key)}
                    onDelete={f.accepted ? undefined : undefined}
                    variant={f.accepted ? 'filled' : 'outlined'}
                    sx={{
                      height: 30,
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      bgcolor: f.accepted ? confidenceBg(f.confidence) : 'transparent',
                      borderColor: f.accepted ? 'transparent' : brand.neutral[300],
                      color: f.accepted ? brand.neutral[800] : brand.neutral[500],
                      opacity: f.accepted ? 1 : 0.5,
                      textDecoration: f.accepted ? 'none' : 'line-through',
                      '& .MuiChip-label': { px: 0.75 },
                      '&:hover': {
                        bgcolor: f.accepted ? confidenceBg(f.confidence) : brand.neutral[100],
                      },
                    }}
                  />
                ))}
              </Stack>

              {/* Bottom actions */}
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleDismiss}
                  sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.8rem', textTransform: 'none' }}
                >
                  Dismiss
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleRequestApply}
                  disabled={acceptedCount === 0}
                  startIcon={<IconSparkles size={15} />}
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    borderRadius: '10px',
                    px: 2,
                    background: brandGradients.cta,
                    boxShadow: `0 4px 16px ${brand.primary[500]}30`,
                    '&:hover': {
                      boxShadow: `0 6px 24px ${brand.primary[500]}50`,
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      background: brand.neutral[200],
                      color: brand.neutral[400],
                      boxShadow: 'none',
                    },
                  }}
                >
                  Accept {acceptedCount} {acceptedCount === 1 ? 'field' : 'fields'}
                </Button>
              </Stack>
            </Box>
          </Collapse>

          {/* ── Confirmation modal ──────────────────────────────────────── */}
          <Dialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: '14px' } }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box sx={{
                  width: 36, height: 36, borderRadius: '10px',
                  bgcolor: brand.primary[50], color: brand.primary[700],
                  display: 'grid', placeItems: 'center',
                }}>
                  <IconSparkles size={18} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: brand.neutral[900] }}>
                    Apply AI suggestions?
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: brand.neutral[500] }}>
                    Review and uncheck anything you want to keep your own
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              <Stack divider={<Box sx={{ height: 1, bgcolor: brand.neutral[100] }} />}>
                {fields.map((f) => (
                  <Stack
                    key={f.key}
                    direction="row"
                    alignItems="center"
                    spacing={1.25}
                    onClick={() => handleToggleField(f.key)}
                    sx={{ px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: brand.neutral[50] } }}
                  >
                    <Checkbox
                      size="small"
                      checked={f.accepted}
                      sx={{ p: 0.5, color: brand.neutral[400], '&.Mui-checked': { color: brand.primary[600] } }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        color: brand.neutral[500], fontSize: '0.7rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {f.label}
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 1.25 }} sx={{ mt: 0.25 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ color: brand.neutral[400], fontSize: '0.66rem', fontWeight: 700 }}>
                            Current
                          </Typography>
                          <Typography sx={{ color: brand.neutral[600], fontSize: '0.8rem', fontWeight: 600 }} noWrap>
                            {currentDisplayValue(f.key, currentValues[f.key], categories, brands, units)}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ color: brand.primary[600], fontSize: '0.66rem', fontWeight: 800 }}>
                            AI suggestion
                          </Typography>
                          <Typography sx={{ color: brand.neutral[900], fontSize: '0.88rem', fontWeight: 800 }} noWrap>
                            {f.displayValue}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                    <Chip
                      size="small"
                      label={`${Math.round(f.confidence * 100)}%`}
                      sx={{
                        height: 22, borderRadius: '6px', fontWeight: 700, fontSize: '0.68rem',
                        bgcolor: confidenceBg(f.confidence), color: confidenceColor(f.confidence),
                      }}
                    />
                  </Stack>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
              <Button
                onClick={() => setConfirmOpen(false)}
                sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[600] }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAcceptAll}
                disabled={acceptedCount === 0}
                variant="contained"
                startIcon={<IconCheck size={16} />}
                sx={{
                  textTransform: 'none', fontWeight: 800, borderRadius: '10px', px: 2,
                  background: brandGradients.cta,
                  '&:hover': { transform: 'translateY(-1px)' },
                }}
              >
                Apply {acceptedCount} {acceptedCount === 1 ? 'field' : 'fields'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Applied confirmation */}
          {applied && hasFields && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: '10px',
                bgcolor: brand.success.light,
                border: `1px solid ${brand.success.main}40`,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: brand.success.dark }}>
                {acceptedCount} fields applied to form — scroll down to review and adjust
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={handleDismiss}
                sx={{ mt: 0.5, fontWeight: 600, color: brand.success.dark, fontSize: '0.75rem', textTransform: 'none' }}
              >
                Register another product
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Zoom>
  );
}

export default AiProductAgent;
