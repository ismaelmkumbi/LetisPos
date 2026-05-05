/**
 * ProductsImportDialog — AI-assisted bulk import of products.
 *
 * Four-step wizard supporting three input methods:
 *   - Spreadsheet (.xlsx, .xls, .csv) → SheetJS parse → AI import-map
 *   - PDF (.pdf) → pdfjs extract text → heuristic parse → AI import-map
 *   - Photos (.jpg, .png, camera) → resize → AI import-from-images (vision)
 *
 * Steps:
 *   1. Upload   — drop a file or capture photos based on selected input mode
 *   2. Mapping  — AI returns structured product rows with confidence scores
 *   3. Review   — editable preview table; user fixes AI mistakes
 *   4. Result   — bulk-create products and show per-row outcome
 */
import { useCallback, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, LinearProgress, MenuItem, Stack, Step,
  StepLabel, Stepper, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  IconAlertCircle, IconCamera, IconCheck, IconCloudUpload,
  IconFile, IconFileSpreadsheet, IconFileTypePdf, IconPhoto,
  IconRefresh, IconSparkles, IconTrash, IconX,
} from '@tabler/icons-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

import {
  bulkCreateProducts, listBrands, listCategories, listUnits,
  type BulkCreateProductsResponse, type CreateProductBody,
} from 'src/api/smartpos/products';
import {
  aiImportMap, aiImportFromImages,
  type MappedRow, type ImportRow,
} from 'src/api/smartpos/aiProducts';
import type { Brand, Category, Unit } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { extractPdfText, parsePdfRows } from 'src/utils/smartpos/pdfExtract';

// ── constants ────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 5 * 1024 * 1024;   // 5 MB
const MAX_ROWS       = 500;
const MAX_IMAGES     = 5;
const MAX_IMAGE_BYTES = 1_200_000;        // 1.2 MB per image

type InputMode = 'spreadsheet' | 'pdf' | 'photos';

const STEPS = ['Upload file', 'AI mapping', 'Review & edit', 'Save & finish'] as const;

export interface ProductsImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (response: BulkCreateProductsResponse) => void;
}

// ── editable row state (a copy of MappedRow with form-strings for numbers) ──
interface DraftRow extends Omit<MappedRow, 'cost' | 'price' | 'wholesalePrice' | 'minPrice' | 'taxRate'> {
  cost: string;
  price: string;
  wholesalePrice: string;
  minPrice: string;
  taxRate: string;
  include: boolean;
}

const toDraft = (m: MappedRow): DraftRow => ({
  ...m,
  cost:           m.cost           != null ? String(m.cost)           : '',
  price:          m.price          != null ? String(m.price)          : '',
  wholesalePrice: m.wholesalePrice != null ? String(m.wholesalePrice) : '',
  minPrice:       m.minPrice       != null ? String(m.minPrice)       : '',
  taxRate:        m.taxRate        != null ? String(m.taxRate)        : '',
  include: true,
});

// ────────────────────────────────────────────────────────────────────────────

export default function ProductsImportDialog({ open, onClose, onImported }: ProductsImportDialogProps) {
  const [step, setStep]               = useState(0);
  const [error, setError]             = useState<string | null>(null);
  const [busy, setBusy]               = useState(false);

  // input mode
  const [inputMode, setInputMode]     = useState<InputMode>('spreadsheet');

  // step 1 — upload
  const [file, setFile]               = useState<File | null>(null);
  const [headers, setHeaders]         = useState<string[]>([]);
  const [parsedRows, setParsedRows]   = useState<ImportRow[]>([]);

  // photos mode
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);

  // step 2-3 — AI mapping + review
  const [drafts, setDrafts]           = useState<DraftRow[]>([]);
  const [warnings, setWarnings]       = useState<string[]>([]);
  const [aiProvider, setAiProvider]   = useState<string>('');
  const [aiModel, setAiModel]         = useState<string>('');

  // step 4 — bulk save result
  const [result, setResult]           = useState<BulkCreateProductsResponse | null>(null);

  // lookup data
  const [categories, setCategories]   = useState<Category[]>([]);
  const [brands, setBrands]           = useState<Brand[]>([]);
  const [units, setUnits]             = useState<Unit[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(0); setError(null); setBusy(false); setInputMode('spreadsheet');
    setFile(null); setHeaders([]); setParsedRows([]);
    setImagePreviews([]); setImageDataUrls([]);
    setDrafts([]); setWarnings([]); setAiProvider(''); setAiModel('');
    setResult(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  // ── load lookups lazily on first open ──────────────────────────────────
  const ensureLookups = useCallback(async () => {
    if (categories.length === 0) listCategories().then(setCategories).catch(() => {});
    if (brands.length === 0)     listBrands()    .then(setBrands)    .catch(() => {});
    if (units.length === 0)      listUnits()     .then(setUnits)     .catch(() => {});
  }, [categories.length, brands.length, units.length]);

  // ── Image resize helper ─────────────────────────────────────────────────
  const resizeImage = useCallback((dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 2048;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = maxDim / Math.max(width, height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        // Start with jpeg quality 0.8 and reduce until under MAX_IMAGE_BYTES.
        // Don't go below 0.6 — below that JPEG artifacts make text illegible.
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > MAX_IMAGE_BYTES && quality > 0.6) {
          quality -= 0.05;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.src = dataUrl;
    });
  }, []);

  // ── Step 1 · spreadsheet parse ────────────────────────────────────────
  const parseSpreadsheet = useCallback(async (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      setError(`File too large — max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`);
      return;
    }
    setFile(f);
    try {
      const buf = await f.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
      if (json.length === 0) { setError('The file is empty.'); return; }
      if (json.length > MAX_ROWS) {
        setError(`Too many rows — please split the file (max ${MAX_ROWS} rows).`);
        return;
      }
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setParsedRows(json.map((row, i) => ({
        row: i,
        values: Object.fromEntries(hdrs.map((h) => [h, String(row[h] ?? '').trim()])),
      })));
      ensureLookups();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(`Could not read file: ${e.message ?? 'unknown error'}`);
    }
  }, [ensureLookups]);

  // ── Step 1 · PDF parse ─────────────────────────────────────────────────
  const parsePdf = useCallback(async (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      setError(`File too large — max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`);
      return;
    }
    setFile(f);
    setBusy(true);
    setError(null);
    try {
      const extracted = await extractPdfText(f);
      if (!extracted || !extracted.text) {
        setError('Could not extract text from this PDF. It may be image-only — try the Photos mode instead.');
        setBusy(false);
        return;
      }
      const parsed = parsePdfRows(extracted.text);
      if (parsed.rows.length === 0) {
        setError('No data rows could be detected in the PDF text. Check the file content.');
        setBusy(false);
        return;
      }
      if (parsed.rows.length > MAX_ROWS) {
        setError(`Too many rows — please split the file (max ${MAX_ROWS} rows).`);
        setBusy(false);
        return;
      }
      setHeaders(parsed.headers);
      setParsedRows(parsed.rows);
      ensureLookups();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to read PDF');
    } finally {
      setBusy(false);
    }
  }, [ensureLookups]);

  // ── Step 1 · photos process ────────────────────────────────────────────
  const processPhotos = useCallback(async (files: File[]) => {
    if (files.length + imagePreviews.length > MAX_IMAGES) {
      setError(`Max ${MAX_IMAGES} images allowed.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const previews: string[] = [];
      const dataUrls: string[] = [];
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) {
          setError(`Image "${f.name}" is too large (max 10 MB).`);
          continue;
        }
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        });
        const resized = await resizeImage(dataUrl);
        previews.push(resized);
        dataUrls.push(resized);
      }
      setImagePreviews((prev) => [...prev, ...previews]);
      setImageDataUrls((prev) => [...prev, ...dataUrls]);
      ensureLookups();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to process image');
    } finally {
      setBusy(false);
    }
  }, [imagePreviews.length, ensureLookups, resizeImage]);

  const removeImage = (idx: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    setImageDataUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Dropzones ──────────────────────────────────────────────────────────

  const spreadsheetDropzone = useDropzone({
    onDrop: (accepted) => { if (accepted[0]) parseSpreadsheet(accepted[0]); },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1, multiple: false,
  });

  const pdfDropzone = useDropzone({
    onDrop: (accepted) => { if (accepted[0]) parsePdf(accepted[0]); },
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1, multiple: false,
  });

  const photoDropzone = useDropzone({
    onDrop: (accepted) => { if (accepted.length > 0) processPhotos(accepted); },
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxFiles: MAX_IMAGES, multiple: true, maxSize: 10 * 1024 * 1024,
  });

  // ── Step 2 · AI mapping ────────────────────────────────────────────────
  const runAiMap = async () => {
    setBusy(true); setError(null);
    try {
      const resp = await aiImportMap({
        headers,
        rows: parsedRows,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands:     brands.map((b) => ({ id: b.id, name: b.name })),
          units:      units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
          defaultTaxRate: 18,
        },
      });
      const mapped: MappedRow[] = resp.rows.length > 0
        ? resp.rows
        : parsedRows.map((r) => ({
            row: r.row,
            name: pickFirst(r.values, ['name', 'product', 'item', 'text']) ?? '',
            description: pickFirst(r.values, ['description', 'desc']) ?? null,
            categoryId: null, brandId: null, unitId: null,
            code: pickFirst(r.values, ['sku', 'code', 'barcode']) ?? null,
            barcodeSymbology: 'CODE128',
            cost:  toNumber(pickFirst(r.values, ['cost', 'buy', 'purchase'])),
            price: toNumber(pickFirst(r.values, ['price', 'retail', 'sell'])),
            wholesalePrice: toNumber(pickFirst(r.values, ['wholesale'])),
            minPrice: toNumber(pickFirst(r.values, ['min', 'minimum', 'floor'])),
            taxRate: toNumber(pickFirst(r.values, ['tax', 'vat'])),
            confidence: 0.0,
            warnings: ['AI returned no mapping — fields filled from header heuristics.'],
          }));
      setDrafts(mapped.map(toDraft));
      setWarnings(resp.warnings ?? []);
      setAiProvider(resp.provider);
      setAiModel(resp.model);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'AI mapping failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2 · AI mapping from images ────────────────────────────────────
  const runAiImportFromImages = async () => {
    if (imageDataUrls.length === 0) { setError('Please add at least one image.'); return; }
    setBusy(true); setError(null);
    try {
      const resp = await aiImportFromImages({
        imageDataUrls,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands:     brands.map((b) => ({ id: b.id, name: b.name })),
          units:      units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
          defaultTaxRate: 18,
        },
      });
      const mapped: MappedRow[] = resp.rows.length > 0
        ? resp.rows
        : [{ row: 0, name: '', description: null, categoryId: null, brandId: null,
             unitId: null, code: null, barcodeSymbology: 'CODE128',
             cost: undefined, price: undefined, wholesalePrice: undefined,
             minPrice: undefined, taxRate: undefined, confidence: 0,
             warnings: ['AI could not identify any products in the images.'] }];
      setDrafts(mapped.map(toDraft));
      setWarnings(resp.warnings ?? []);
      setAiProvider(resp.provider);
      setAiModel(resp.model);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'AI image import failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Step 3 · review helpers ────────────────────────────────────────────
  const patchDraft = <K extends keyof DraftRow>(idx: number, key: K, value: DraftRow[K]) =>
    setDrafts((d) => d.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const removeDraft = (idx: number) =>
    setDrafts((d) => d.filter((_, i) => i !== idx));

  // ── Step 4 · bulk save ─────────────────────────────────────────────────
  const runBulkSave = async () => {
    setBusy(true); setError(null);
    const payload: CreateProductBody[] = drafts
      .filter((d) => d.include && d.name.trim())
      .map((d) => ({
        code: d.code?.trim() || generateCode(),
        name: d.name.trim(),
        description: d.description ?? undefined,
        categoryId: d.categoryId ?? undefined,
        brandId:    d.brandId    ?? undefined,
        unitId:     d.unitId     ?? undefined,
        barcodeSymbology: (d.barcodeSymbology ?? 'CODE128') as CreateProductBody['barcodeSymbology'],
        cost:  toNumber(d.cost)  ?? 0,
        price: toNumber(d.price) ?? 0,
        wholesalePrice: toNumber(d.wholesalePrice) ?? undefined,
        minPrice:       toNumber(d.minPrice)       ?? undefined,
        taxRate:        toNumber(d.taxRate)        ?? 0,
        taxMethod: 'EXCLUSIVE',
        type: 'STANDARD',
        status: true,
        sellable: true,
      }));

    if (payload.length === 0) {
      setError('Nothing to save — every row is unchecked or has no name.');
      setBusy(false);
      return;
    }

    try {
      const resp = await bulkCreateProducts(payload);
      setResult(resp);
      setStep(3);
      onImported(resp);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Bulk save failed');
    } finally {
      setBusy(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────
  const showUploadStep = step === 0;
  const hasUploadData = inputMode === 'photos'
    ? imageDataUrls.length > 0
    : parsedRows.length > 0;
  const dropzone = inputMode === 'spreadsheet' ? spreadsheetDropzone
    : inputMode === 'pdf' ? pdfDropzone : photoDropzone;

  const modeLabel = inputMode === 'spreadsheet' ? 'Spreadsheet'
    : inputMode === 'pdf' ? 'PDF' : 'Photos';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          minHeight: '70vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${brand.primary[100]} 0%, ${brand.primary[50]} 100%)`,
            color: brand.primary[700],
          }}>
            <IconSparkles size={18} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Smart import
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Upload {modeLabel} — AI maps the fields, you review, we save
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={busy}>
            <IconX size={16} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ '& .MuiStepIcon-root.Mui-active': { color: brand.primary[600] } }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
      </Box>

      {busy && <LinearProgress sx={{ mx: 3 }} />}

      <DialogContent dividers sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── Step 1 · upload ───────────────────────────────── */}
        {step === 0 && (
          <Stack spacing={2}>
            {/* Input mode tabs */}
            <Tabs
              value={inputMode}
              onChange={(_, v) => {
                setInputMode(v);
                setFile(null); setHeaders([]); setParsedRows([]);
                setImagePreviews([]); setImageDataUrls([]); setError(null);
              }}
              sx={{ borderBottom: `1px solid ${brand.neutral[200]}` }}
            >
              <Tab
                value="spreadsheet"
                icon={<IconFileSpreadsheet size={16} />}
                iconPosition="start"
                label="Spreadsheet"
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', minHeight: 42 }}
              />
              <Tab
                value="pdf"
                icon={<IconFileTypePdf size={16} />}
                iconPosition="start"
                label="PDF"
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', minHeight: 42 }}
              />
              <Tab
                value="photos"
                icon={<IconPhoto size={16} />}
                iconPosition="start"
                label="Photos"
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', minHeight: 42 }}
              />
            </Tabs>

            {/* ── Drop zone ── */}
            <Box
              {...(showUploadStep ? dropzone.getRootProps() : {})}
              sx={{
                p: 4, borderRadius: '14px',
                border: `2px dashed ${dropzone.isDragActive ? brand.primary[400] : brand.neutral[300]}`,
                bgcolor: dropzone.isDragActive ? brand.primary[50] : brand.neutral[50],
                textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: brand.primary[50], borderColor: brand.primary[300] },
              }}
            >
              {showUploadStep && <input {...dropzone.getInputProps()} />}
              <Box sx={{
                width: 56, height: 56, borderRadius: '14px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${brand.primary[100]} 0%, ${brand.primary[50]} 100%)`,
                color: brand.primary[700], mb: 1.5,
              }}>
                {inputMode === 'photos' ? <IconCamera size={26} />
                  : inputMode === 'pdf' ? <IconFileTypePdf size={26} />
                  : <IconCloudUpload size={26} />}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {file ? file.name
                  : dropzone.isDragActive ? 'Drop the file here'
                  : inputMode === 'photos' ? 'Drop photos or click to browse'
                  : inputMode === 'pdf' ? 'Drop PDF here'
                  : 'Drop Excel or CSV here'}
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block' }}>
                {inputMode === 'spreadsheet' && `.xlsx, .xls, .csv · max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB · max ${MAX_ROWS} rows`}
                {inputMode === 'pdf' && `.pdf · max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB · text-based PDFs only`}
                {inputMode === 'photos' && `.jpg, .png, .webp · max ${MAX_IMAGES} images · resized to <1.2 MB each`}
              </Typography>

              {inputMode === 'photos' && (
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<IconCamera size={14} />}
                    size="small"
                    sx={{ borderRadius: '8px', textTransform: 'none' }}
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  >
                    Take photo
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<IconFile size={14} />}
                    size="small"
                    sx={{ borderRadius: '8px', textTransform: 'none' }}
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    Browse files
                  </Button>
                </Stack>
              )}
              {/* Hidden camera input */}
              {inputMode === 'photos' && (
                <Box
                  component="input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  sx={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from((e.target as HTMLInputElement).files ?? []);
                    if (files.length > 0) processPhotos(files);
                  }}
                />
              )}
            </Box>

            {/* ── Spreadsheet success indicator ── */}
            {inputMode === 'spreadsheet' && file && parsedRows.length > 0 && (
              <Box sx={{
                p: 1.5, borderRadius: '10px',
                border: `1px solid ${brand.success.main}`,
                bgcolor: brand.success.light,
              }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconFileSpreadsheet size={20} color={brand.success.dark} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.success.dark }}>
                      Parsed {parsedRows.length} rows · {headers.length} columns
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[600] }} noWrap>
                      Headers: {headers.join(', ')}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => { setFile(null); setHeaders([]); setParsedRows([]); }}>
                    <IconTrash size={14} />
                  </IconButton>
                </Stack>
              </Box>
            )}

            {/* ── PDF success indicator ── */}
            {inputMode === 'pdf' && file && parsedRows.length > 0 && (
              <Box sx={{
                p: 1.5, borderRadius: '10px',
                border: `1px solid ${brand.success.main}`,
                bgcolor: brand.success.light,
              }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconFileTypePdf size={20} color={brand.success.dark} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: brand.success.dark }}>
                      Extracted {parsedRows.length} rows · {headers.length} columns
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[600] }} noWrap>
                      Columns: {headers.join(', ')}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => { setFile(null); setHeaders([]); setParsedRows([]); }}>
                    <IconTrash size={14} />
                  </IconButton>
                </Stack>
              </Box>
            )}

            {/* ── Image previews ── */}
            {inputMode === 'photos' && imagePreviews.length > 0 && (
              <Box sx={{
                p: 1.5, borderRadius: '10px',
                border: `1px solid ${brand.neutral[200]}`,
                bgcolor: '#fff',
              }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                  {imagePreviews.map((src, i) => (
                    <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
                      <Box
                        component="img"
                        src={src}
                        alt={`Photo ${i + 1}`}
                        sx={{
                          width: 80, height: 80, objectFit: 'cover',
                          borderRadius: '8px', border: `1px solid ${brand.neutral[200]}`,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeImage(i)}
                        sx={{
                          position: 'absolute', top: -6, right: -6,
                          bgcolor: brand.error.main, color: '#fff',
                          width: 20, height: 20,
                          '&:hover': { bgcolor: brand.error.dark },
                        }}
                      >
                        <IconX size={10} />
                      </IconButton>
                    </Box>
                  ))}
                  <Stack justifyContent="center" sx={{ ml: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[600] }}>
                      {imagePreviews.length} image{imagePreviews.length !== 1 ? 's' : ''} ready
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
                      Add more or proceed to AI mapping
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            )}

            {inputMode === 'spreadsheet' && (
              <Alert severity="info" icon={<IconAlertCircle size={18} />} sx={{ borderRadius: '10px' }}>
                Recommended columns: <strong>name, code, category, brand, unit, cost, price, wholesale, tax</strong>.
                Don't worry about exact spelling — the AI figures it out.
              </Alert>
            )}
            {inputMode === 'pdf' && (
              <Alert severity="info" icon={<IconAlertCircle size={18} />} sx={{ borderRadius: '10px' }}>
                Text-based PDFs work best. If your PDF is image-only (scanned), use the <strong>Photos</strong> tab
                instead — screenshot or photograph each page.
              </Alert>
            )}
            {inputMode === 'photos' && (
              <Alert severity="info" icon={<IconAlertCircle size={18} />} sx={{ borderRadius: '10px' }}>
                Take clear photos of product lists, supplier price sheets, or inventory records.
                The AI will read all visible items. Good lighting and straight angles help.
              </Alert>
            )}
          </Stack>
        )}

        {/* ── Step 2 · AI mapping (button only — work happens on click) ── */}
        {step === 1 && (
          <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <Box sx={{
              width: 80, height: 80, borderRadius: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${brand.primary[200]} 0%, ${brand.primary[50]} 100%)`,
              color: brand.primary[700],
              animation: busy ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%':      { transform: 'scale(1.05)' },
              },
            }}>
              <IconSparkles size={36} />
            </Box>
            <Box sx={{ textAlign: 'center', maxWidth: 480 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {busy ? 'AI is mapping your data…' : 'Ready to ask the AI'}
              </Typography>
              <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                {inputMode === 'photos'
                  ? `We'll send your ${imageDataUrls.length} image(s) to the AI vision model along with your existing categories, brands, and units. The AI will read every product visible and return structured rows.`
                  : `We'll send your ${parsedRows.length} rows and column headers to the AI service along with your existing categories, brands, and units. The AI will return a structured product per row plus warnings for anything it couldn't match.`}
              </Typography>
            </Box>
            <Button
              size="large" variant="contained"
              startIcon={<IconSparkles size={18} />}
              disabled={busy}
              onClick={inputMode === 'photos' ? runAiImportFromImages : runAiMap}
              sx={{
                bgcolor: brand.primary[600], color: '#fff',
                textTransform: 'none', fontWeight: 700,
                borderRadius: '10px', px: 3, py: 1,
                '&:hover': { bgcolor: brand.primary[700] },
              }}
            >
              {busy ? 'Mapping…' : 'Run AI mapping'}
            </Button>
          </Stack>
        )}

        {/* ── Step 3 · review ─────────────────────────────────── */}
        {step === 2 && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                icon={<IconSparkles size={12} />}
                label={`AI: ${aiProvider}/${aiModel}`}
                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600, bgcolor: brand.primary[50], color: brand.primary[700] }}
              />
              <Chip
                size="small"
                label={`${drafts.filter((d) => d.include).length} of ${drafts.length} selected`}
                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600 }}
              />
              <Chip
                size="small"
                label={`${drafts.filter((d) => d.confidence >= 0.7).length} high-confidence`}
                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600, bgcolor: brand.success.light, color: brand.success.dark }}
              />
              <Chip
                size="small"
                label={`${drafts.filter((d) => d.confidence < 0.7 && d.confidence >= 0.4).length} need review`}
                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600, bgcolor: '#fff4e0', color: '#a36400' }}
              />
            </Stack>

            {warnings.length > 0 && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                <Stack spacing={0.25}>
                  {warnings.slice(0, 3).map((w, i) => (
                    <Typography key={i} variant="caption">{w}</Typography>
                  ))}
                </Stack>
              </Alert>
            )}

            <Box sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              overflow: 'auto',
              maxHeight: 'calc(100vh - 380px)',
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      { k: 'include',  l: '', w: 36 },
                      { k: 'conf',     l: 'AI', w: 70 },
                      { k: 'name',     l: 'Name *', w: 220 },
                      { k: 'code',     l: 'Code', w: 120 },
                      { k: 'category', l: 'Category', w: 140 },
                      { k: 'brand',    l: 'Brand', w: 120 },
                      { k: 'unit',     l: 'Unit', w: 100 },
                      { k: 'cost',     l: 'Cost', w: 90 },
                      { k: 'price',    l: 'Price *', w: 90 },
                      { k: 'whole',    l: 'Wholesale', w: 90 },
                      { k: 'tax',      l: 'Tax %', w: 70 },
                      { k: 'rm',       l: '', w: 36 },
                    ].map((c) => (
                      <TableCell key={c.k} sx={{
                        width: c.w, py: 0.75, px: 1, fontSize: '0.6875rem',
                        fontWeight: 700, color: brand.neutral[600], bgcolor: brand.neutral[50],
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>{c.l}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drafts.map((d, i) => (
                    <DraftTableRow
                      key={`${d.row}-${i}`}
                      draft={d}
                      categories={categories}
                      brands={brands}
                      units={units}
                      onPatch={(k, v) => patchDraft(i, k, v)}
                      onRemove={() => removeDraft(i)}
                    />
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        )}

        {/* ── Step 4 · result ─────────────────────────────────── */}
        {step === 3 && result && (
          <Stack spacing={2.5} alignItems="center" sx={{ py: 3 }}>
            <Box sx={{
              width: 80, height: 80, borderRadius: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: result.failedCount === 0 ? brand.success.light : '#fff4e0',
              color:    result.failedCount === 0 ? brand.success.dark  : '#a36400',
            }}>
              {result.failedCount === 0 ? <IconCheck size={36} /> : <IconAlertCircle size={36} />}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {result.createdCount} of {result.total} products imported
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <ResultStat label="Created" value={result.createdCount} tone="success" />
              <ResultStat label="Skipped" value={result.failedCount} tone={result.failedCount === 0 ? 'neutral' : 'warning'} />
              <ResultStat label="Total"   value={result.total} tone="neutral" />
            </Stack>
            {result.failed.length > 0 && (
              <Box sx={{ width: '100%', maxHeight: 200, overflow: 'auto', borderRadius: '10px', border: `1px solid ${brand.neutral[200]}` }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700 }}>Row</TableCell>
                      <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700 }}>Code</TableCell>
                      <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 700 }}>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.failed.map((r) => (
                      <TableRow key={r.index}>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.index + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'ui-monospace' }}>{r.code}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: brand.error.main }}>{r.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        {step > 0 && step < 3 && !busy && (
          <Button
            variant="text" onClick={() => setStep((s) => Math.max(0, s - 1))}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {step === 0 && (
          <>
            <Button onClick={handleClose} disabled={busy} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
            <Button
              variant="contained"
              disabled={busy || !hasUploadData}
              onClick={() => setStep(1)}
              sx={{
                bgcolor: brand.primary[600], color: '#fff',
                textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 2.5,
                '&:hover': { bgcolor: brand.primary[700] },
              }}
            >
              Next
            </Button>
          </>
        )}
        {step === 1 && (
          <Button onClick={handleClose} disabled={busy} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
        )}
        {step === 2 && (
          <>
            <Button
              variant="text" startIcon={<IconRefresh size={14} />}
              onClick={() => setStep(1)}
              disabled={busy}
              sx={{ textTransform: 'none', fontWeight: 600, color: brand.neutral[600] }}
            >
              Re-run AI
            </Button>
            <Button
              variant="contained"
              disabled={busy || drafts.filter((d) => d.include).length === 0}
              onClick={runBulkSave}
              sx={{
                bgcolor: brand.primary[600], color: '#fff',
                textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 2.5,
                '&:hover': { bgcolor: brand.primary[700] },
              }}
            >
              Save {drafts.filter((d) => d.include).length} products
            </Button>
          </>
        )}
        {step === 3 && (
          <Button
            variant="contained" onClick={handleClose}
            sx={{
              bgcolor: brand.primary[600], color: '#fff',
              textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 2.5,
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DraftTableRow({
  draft, categories, brands, units, onPatch, onRemove,
}: {
  draft: DraftRow;
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  onPatch: <K extends keyof DraftRow>(k: K, v: DraftRow[K]) => void;
  onRemove: () => void;
}) {
  const tone = draft.confidence >= 0.7 ? 'success'
             : draft.confidence >= 0.4 ? 'warning' : 'error';
  const toneStyles = {
    success: { bg: brand.success.light, fg: brand.success.dark, dot: brand.success.main },
    warning: { bg: '#fff4e0', fg: '#a36400', dot: '#e8a13a' },
    error:   { bg: '#fde8e8', fg: '#9b1c1c', dot: brand.error.main },
  }[tone];
  const baseInput = {
    '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.75rem' },
    '& .MuiOutlinedInput-input': { py: 0.5 },
  };

  return (
    <TableRow
      hover
      sx={{
        opacity: draft.include ? 1 : 0.5,
        bgcolor: draft.include ? '#fff' : brand.neutral[50],
      }}
    >
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <Tooltip title={draft.include ? 'Skip this row' : 'Include this row'}>
          <Box
            component="input"
            type="checkbox"
            aria-label={`Include row ${draft.row + 1}`}
            checked={draft.include}
            onChange={(e) => onPatch('include', (e.target as HTMLInputElement).checked)}
            sx={{ width: 16, height: 16, cursor: 'pointer', accentColor: brand.primary[600] }}
          />
        </Tooltip>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <Tooltip title={draft.warnings?.join('\n') || `Confidence ${Math.round(draft.confidence * 100)}%`}>
          <Chip
            size="small"
            label={`${Math.round(draft.confidence * 100)}%`}
            sx={{
              height: 18, fontSize: '0.625rem', fontWeight: 700,
              bgcolor: toneStyles.bg, color: toneStyles.fg,
              borderRadius: '4px',
              '& .MuiChip-label': { px: 0.625 },
            }}
          />
        </Tooltip>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          size="small" value={draft.name}
          onChange={(e) => onPatch('name', e.target.value)}
          fullWidth sx={baseInput}
          error={!draft.name.trim()}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          size="small" value={draft.code ?? ''}
          onChange={(e) => onPatch('code', e.target.value)}
          fullWidth sx={baseInput}
          placeholder="auto"
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          select size="small" value={draft.categoryId ?? ''}
          onChange={(e) => onPatch('categoryId', e.target.value || null)}
          fullWidth sx={baseInput}
        >
          <MenuItem value=""><em>—</em></MenuItem>
          {categories.filter((c) => !c.parentId).map((c) => (
            <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.75rem' }}>{c.name}</MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          select size="small" value={draft.brandId ?? ''}
          onChange={(e) => onPatch('brandId', e.target.value || null)}
          fullWidth sx={baseInput}
        >
          <MenuItem value=""><em>—</em></MenuItem>
          {brands.map((b) => (
            <MenuItem key={b.id} value={b.id} sx={{ fontSize: '0.75rem' }}>{b.name}</MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          select size="small" value={draft.unitId ?? ''}
          onChange={(e) => onPatch('unitId', e.target.value || null)}
          fullWidth sx={baseInput}
        >
          <MenuItem value=""><em>—</em></MenuItem>
          {units.map((u) => (
            <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.75rem' }}>{u.name}</MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField size="small" type="number" value={draft.cost} onChange={(e) => onPatch('cost', e.target.value)} fullWidth sx={baseInput} />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField size="small" type="number" value={draft.price} onChange={(e) => onPatch('price', e.target.value)} fullWidth sx={baseInput} error={!draft.price} />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField size="small" type="number" value={draft.wholesalePrice} onChange={(e) => onPatch('wholesalePrice', e.target.value)} fullWidth sx={baseInput} />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField size="small" type="number" value={draft.taxRate} onChange={(e) => onPatch('taxRate', e.target.value)} fullWidth sx={baseInput} />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, textAlign: 'right' }}>
        <Tooltip title="Remove row">
          <IconButton size="small" onClick={onRemove} sx={{ color: brand.error.main, p: 0.5 }}>
            <IconTrash size={13} />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'neutral' }) {
  const map = {
    success: { bg: brand.success.light, fg: brand.success.dark },
    warning: { bg: '#fff4e0',           fg: '#a36400'           },
    neutral: { bg: brand.neutral[100],  fg: brand.neutral[700]  },
  }[tone];
  return (
    <Box sx={{
      px: 2.5, py: 1.5, borderRadius: '10px',
      bgcolor: map.bg, textAlign: 'center', minWidth: 100,
    }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: map.fg, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: map.fg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function pickFirst(values: Record<string, string>, candidates: string[]): string | null {
  const keys = Object.keys(values);
  for (const c of candidates) {
    const k = keys.find((kk) => kk.toLowerCase().includes(c));
    if (k && values[k] && values[k].trim()) return values[k].trim();
  }
  return null;
}

function toNumber(v: string | null | undefined): number | undefined {
  if (v == null) return undefined;
  const s = String(v).replace(/[^\d.-]/g, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function generateCode(): string {
  return String(Math.floor(1e12 + Math.random() * 9e12));
}
