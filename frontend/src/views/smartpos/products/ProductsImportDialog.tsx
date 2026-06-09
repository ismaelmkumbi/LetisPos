import { useContext } from 'react';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconAlertCircle,
  IconArrowMerge,
  IconCamera,
  IconCheck,
  IconCloudUpload,
  IconDeviceMobile,
  IconDownload,
  IconFile,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconPhoto,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

import {
  bulkCreateProducts,
  createBrand,
  createCategory,
  createUnit,
  listBrands,
  listCategories,
  listProducts,
  listUnits,
  type BulkCreateProductsResponse,
  type CreateProductBody,
} from 'src/api/smartpos/products';
import {
  aiImportMap,
  aiImportFromImages,
  type MappedRow,
  type ImportRow,
} from 'src/api/smartpos/aiProducts';
import type { Brand, Category, Unit, UUID } from 'src/api/smartpos/types';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { tokenStore } from 'src/api/smartpos/client';
import { extractPdfText, parsePdfRows } from 'src/utils/smartpos/pdfExtract';
import { renderPdfToImages, isScannedPdf } from 'src/utils/smartpos/pdfRender';
import { preprocessImages } from 'src/utils/smartpos/imagePreprocess';
import {
  matchColumns,
  checkDuplicate,
  listTemplates,
  saveTemplate,
  applyTemplate,
  type ImportTemplate,
} from 'src/utils/smartpos/smartMapping';
import QrOverlay from './QrOverlay';

// ── constants ────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 500;
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 1_200_000; // 1.2 MB per image

type InputMode = 'spreadsheet' | 'pdf' | 'photos' | 'phone-camera';

const STEPS = ['Upload file', 'Smart mapping', 'Review & edit', 'Save & finish'] as const;

export interface ProductsImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (response: BulkCreateProductsResponse) => void;
}

// ── editable row state (a copy of MappedRow with form-strings for numbers) ──
interface DraftRow extends Omit<
  MappedRow,
  'cost' | 'price' | 'wholesalePrice' | 'minPrice' | 'taxRate'
> {
  cost: string;
  price: string;
  wholesalePrice: string;
  minPrice: string;
  taxRate: string;
  include: boolean;
  /** User-resolved mapping: maps suggested names to newly-created IDs */
  resolvedCategoryId?: UUID | null;
  resolvedBrandId?: UUID | null;
  resolvedUnitId?: UUID | null;
}

const toDraft = (m: MappedRow): DraftRow => ({
  ...m,
  cost: m.cost != null ? String(m.cost) : '',
  price: m.price != null ? String(m.price) : '',
  wholesalePrice: m.wholesalePrice != null ? String(m.wholesalePrice) : '',
  minPrice: m.minPrice != null ? String(m.minPrice) : '',
  taxRate: m.taxRate != null ? String(m.taxRate) : '',
  include: true,
});

// ────────────────────────────────────────────────────────────────────────────

export default function ProductsImportDialog({
  open,
  onClose,
  onImported,
}: ProductsImportDialogProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // input mode
  const [inputMode, setInputMode] = useState<InputMode>('spreadsheet');

  // step 1 — upload
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);

  // photos mode
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);

  // step 2-3 — AI mapping + review
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // step 4 — bulk save result
  const [result, setResult] = useState<BulkCreateProductsResponse | null>(null);

  // lookup data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // existing products for duplicate detection
  const [existingProducts, setExistingProducts] = useState<
    { id: string; name: string; code?: string | null; barcode?: string | null }[]
  >([]);

  // saved column-mapping templates
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const autoImportRef = useRef(false);
  const imageDataUrlsRef = useRef<string[]>([]);
  // Keep ref in sync so timeouts never read a stale empty array
  imageDataUrlsRef.current = imageDataUrls;

  // Auto-trigger AI import when phone camera photos arrive
  useEffect(() => {
    if (autoImportRef.current && imageDataUrls.length > 0 && !busy) {
      autoImportRef.current = false;
      setStep(1);
      // Capture the URLs in a local const so the timeout closure is stable
      const urls = imageDataUrls;
      setTimeout(() => {
        if (urls.length === 0) {
          setError('Please add at least one image.');
          return;
        }
        // Read latest URLs from ref in case more were added during the defer
        const latestUrls = imageDataUrlsRef.current;
        runAiImportFromImagesWith(latestUrls.length > 0 ? latestUrls : urls);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUrls, busy]);

  const reset = () => {
    setStep(0);
    setError(null);
    setBusy(false);
    setStatus(null);
    setInputMode('spreadsheet');
    autoImportRef.current = false;
    setFile(null);
    setHeaders([]);
    setParsedRows([]);
    setImagePreviews([]);
    setImageDataUrls([]);
    setDrafts([]);
    setWarnings([]);
    setResult(null);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  // ── load lookups lazily on first open ──────────────────────────────────
  const ensureLookups = useCallback(async () => {
    if (categories.length === 0)
      listCategories()
        .then(setCategories)
        .catch(() => {});
    if (brands.length === 0)
      listBrands()
        .then(setBrands)
        .catch(() => {});
    if (units.length === 0)
      listUnits()
        .then(setUnits)
        .catch(() => {});
    if (existingProducts.length === 0)
      listProducts({ page: 0, size: 500 })
        .then((page) =>
          setExistingProducts(
            page.content.map((p) => ({
              id: p.id,
              name: p.name,
              code: p.code,
              barcode: p.barcodes?.[0]?.barcode ?? null,
            })),
          ),
        )
        .catch(() => {});
    const tenantId = tokenStore.getTenantId();
    if (tenantId && templates.length === 0) {
      setTemplates(listTemplates(tenantId));
    }
  }, [categories.length, brands.length, units.length, existingProducts.length, templates.length]);

  // ── Step 1 · spreadsheet parse ────────────────────────────────────────
  const parseSpreadsheet = useCallback(
    async (f: File) => {
      if (f.size > MAX_FILE_BYTES) {
        setError(`File too large — max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`);
        return;
      }
      setFile(f);
      try {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
          raw: false,
        });
        if (json.length === 0) {
          setError('The file is empty.');
          return;
        }
        if (json.length > MAX_ROWS) {
          setError(`Too many rows — please split the file (max ${MAX_ROWS} rows).`);
          return;
        }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setParsedRows(
          json.map((row, i) => ({
            row: i,
            values: Object.fromEntries(hdrs.map((h) => [h, String(row[h] ?? '').trim()])),
          })),
        );
        ensureLookups();
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(`Could not read file: ${e.message ?? 'unknown error'}`);
      }
    },
    [ensureLookups],
  );

  // ── Step 1 · PDF parse ─────────────────────────────────────────────────
  const parsePdf = useCallback(
    async (f: File) => {
      if (f.size > MAX_FILE_BYTES) {
        setError(`File too large — max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB`);
        return;
      }
      setFile(f);
      setBusy(true);
      setError(null);
      try {
        // Try text extraction first
        const extracted = await extractPdfText(f);

        // Detect scanned/image-only PDF → route to AI vision
        const scanned = extracted && !extracted.text ? true : await isScannedPdf(f);
        if (scanned) {
          setStatus('Rendering PDF pages for smart reading…');
          const pageImages = await renderPdfToImages(f, { scale: 2.0, jpegQuality: 0.92 });
          if (pageImages.length === 0) {
            setError('Could not render any pages from this PDF.');
            setBusy(false);
            return;
          }
          setStatus('Enhancing scanned pages for better reading…');
          const enhanced = await preprocessImages(pageImages.map((p) => p.dataUrl));
          setImageDataUrls(enhanced);
          setImagePreviews(enhanced);
          setInputMode('photos');
          ensureLookups();
          setBusy(false);
          setStatus(null);
          return;
        }

        if (!extracted || !extracted.text) {
          setError(
            'Could not extract text from this PDF. It may be image-only — try the Photos mode instead.',
          );
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
        setStatus(null);
      }
    },
    [ensureLookups],
  );

  // ── Step 1 · photos process ────────────────────────────────────────────
  const processPhotos = useCallback(
    async (files: File[]) => {
      if (files.length + imagePreviews.length > MAX_IMAGES) {
        setError(`Max ${MAX_IMAGES} images allowed.`);
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const rawUrls: string[] = [];
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
          rawUrls.push(dataUrl);
        }
        // Preprocess: contrast, sharpen, adaptive JPEG quality
        const processed = await preprocessImages(rawUrls, {
          maxDim: 2048,
          maxOutputBytes: MAX_IMAGE_BYTES,
        });
        setImagePreviews((prev) => [...prev, ...processed]);
        setImageDataUrls((prev) => [...prev, ...processed]);
        ensureLookups();
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e.message ?? 'Failed to process image');
      } finally {
        setBusy(false);
      }
    },
    [imagePreviews.length, ensureLookups],
  );

  const removeImage = (idx: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    setImageDataUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Dropzones ──────────────────────────────────────────────────────────

  const spreadsheetDropzone = useDropzone({
    onDrop: (accepted) => {
      if (accepted[0]) parseSpreadsheet(accepted[0]);
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const pdfDropzone = useDropzone({
    onDrop: (accepted) => {
      if (accepted[0]) parsePdf(accepted[0]);
    },
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
  });

  const photoDropzone = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length > 0) processPhotos(accepted);
    },
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxFiles: MAX_IMAGES,
    multiple: true,
    maxSize: 10 * 1024 * 1024,
  });

  // ── Step 2 · AI mapping ────────────────────────────────────────────────
  const runAiMap = async () => {
    setBusy(true);
    setError(null);
    try {
      const resp = await aiImportMap({
        headers,
        rows: parsedRows,
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands: brands.map((b) => ({ id: b.id, name: b.name })),
          units: units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
          defaultTaxRate: 18,
        },
      });
      let mapped: MappedRow[];
      if (resp.rows.length > 0) {
        mapped = resp.rows;
      } else {
        // Smart fuzzy column matching fallback
        const matches = matchColumns(headers);
        mapped = parsedRows.map((r) => {
          const v = (idx: number) => (idx >= 0 ? r.values[headers[idx]] : undefined);
          const findMatch = (key: string) => {
            const m = matches.find((x) => x.fieldKey === key);
            return m ? v(m.headerIndex) : undefined;
          };
          const nameVal = findMatch('name');
          const descVal = findMatch('description');
          const catVal = findMatch('category');
          const brandVal = findMatch('brand');
          const unitVal = findMatch('unit');
          const name = bestEffortName(nameVal, descVal, r.values, matches, r.row);
          return {
            row: r.row,
            name,
            description: findMatch('description') ?? null,
            categoryId: null,
            brandId: null,
            unitId: null,
            suggestedCategoryName: catVal && String(catVal).trim() ? String(catVal).trim() : null,
            suggestedBrandName: brandVal && String(brandVal).trim() ? String(brandVal).trim() : null,
            suggestedUnitName: unitVal && String(unitVal).trim() ? String(unitVal).trim() : null,
            code: findMatch('code') ?? null,
            barcodeSymbology: 'CODE128',
            cost: toNumber(findMatch('cost')),
            price: toNumber(findMatch('price')),
            wholesalePrice: toNumber(findMatch('wholesale')),
            minPrice: toNumber(findMatch('min')),
            taxRate: toNumber(findMatch('tax')),
            confidence: 0.3,
            warnings: ['No mapping was returned — used smart fuzzy column matching.'],
          };
        });
      }
      setDrafts(mapped.map(toDraft));
      setWarnings(resp.warnings ?? []);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Smart mapping failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2 · AI mapping from images ────────────────────────────────────
  // Accepts URLs as param so timeouts never read a stale empty closure.
  const runAiImportFromImagesWith = async (urls: string[]) => {
    if (urls.length === 0) {
      setError('Please add at least one image.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await aiImportFromImages({
        imageDataUrls: urls,
        hint:
          'The image may contain a handwritten or printed list of products. ' +
          'IMPORTANT: Each physical line usually represents ONE product — a full product name may consist of multiple words on the same line (e.g. "Remote Azam" is one product, not two). ' +
          'Do NOT split a single handwritten line into multiple products. ' +
          'Only treat it as separate products if they are clearly on separate lines or separated by a delimiter. ' +
          'If a price or quantity appears next to a name, associate it with that product.',
        context: {
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          brands: brands.map((b) => ({ id: b.id, name: b.name })),
          units: units.map((u) => ({ id: u.id, name: u.name })),
          currency: 'TZS',
          defaultTaxRate: 18,
        },
      });
      const mapped: MappedRow[] =
        resp.rows.length > 0
          ? resp.rows
          : [
              {
                row: 0,
                name: '',
                description: null,
                categoryId: null,
                brandId: null,
                unitId: null,
                code: null,
                barcodeSymbology: 'CODE128',
                cost: undefined,
                price: undefined,
                wholesalePrice: undefined,
                minPrice: undefined,
                taxRate: undefined,
                confidence: 0,
                warnings: ['Smart import could not identify any products in the images.'],
              },
            ];
      setDrafts(mapped.map(toDraft));
      setWarnings(resp.warnings ?? []);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Image import failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Step 3 · review helpers ────────────────────────────────────────────
  const patchDraft = <K extends keyof DraftRow>(idx: number, key: K, value: DraftRow[K]) =>
    setDrafts((d) => d.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const removeDraft = (idx: number) => setDrafts((d) => d.filter((_, i) => i !== idx));

  /** Merge row[idx] with row[idx+1] — combines names, keeps higher confidence, prefers non-empty fields */
  const mergeDraftDown = (idx: number) =>
    setDrafts((prev) => {
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const a = prev[idx];
      const b = prev[idx + 1];
      const merged: DraftRow = {
        ...a,
        name: `${a.name.trim()} ${b.name.trim()}`.trim(),
        description: a.description || b.description,
        categoryId: a.categoryId || b.categoryId,
        brandId: a.brandId || b.brandId,
        unitId: a.unitId || b.unitId,
        code: a.code || b.code,
        cost: a.cost || b.cost,
        price: a.price || b.price,
        wholesalePrice: a.wholesalePrice || b.wholesalePrice,
        minPrice: a.minPrice || b.minPrice,
        taxRate: a.taxRate || b.taxRate,
        confidence: Math.max(a.confidence, b.confidence),
        warnings: [...(a.warnings ?? []), ...(b.warnings ?? [])],
      };
      return prev.filter((_, i) => i !== idx + 1).map((r, i) => (i === idx ? merged : r));
    });

  /** Insert a blank row after idx so the user can split a line that has two products */
  const addDraftAfter = (idx: number) =>
    setDrafts((prev) => {
      const blank: DraftRow = {
        row: prev.length,
        name: '',
        description: null,
        categoryId: null,
        brandId: null,
        unitId: null,
        code: null,
        barcodeSymbology: 'CODE128',
        cost: '',
        price: '',
        wholesalePrice: '',
        minPrice: '',
        taxRate: '',
        confidence: 0,
        warnings: [],
        include: true,
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, blank);
      return copy;
    });

  // ── Step 4 · bulk save ─────────────────────────────────────────────────
  const runBulkSave = async () => {
    setBusy(true);
    setError(null);
    setStatus('Creating categories, brands & units…');

    // Auto-create user-approved categories, brands, and units
    const createdCategoryIds = new Map<string, UUID>();
    const createdBrandIds = new Map<string, UUID>();
    const createdUnitIds = new Map<string, UUID>();

    // Collect unique unmatched items from drafts with resolved IDs
    const catsToCreate = new Set<string>();
    const brandsToCreate = new Set<string>();
    const unitsToCreate = new Set<string>();

    for (const d of drafts) {
      if (!d.include) continue;
      if (!d.categoryId && !d.resolvedCategoryId && d.suggestedCategoryName?.trim()) {
        catsToCreate.add(d.suggestedCategoryName.trim());
      }
      if (!d.brandId && !d.resolvedBrandId && d.suggestedBrandName?.trim()) {
        brandsToCreate.add(d.suggestedBrandName.trim());
      }
      if (!d.unitId && !d.resolvedUnitId && d.suggestedUnitName?.trim()) {
        unitsToCreate.add(d.suggestedUnitName.trim());
      }
    }

    // Create categories
    for (const name of catsToCreate) {
      try {
        const created = await createCategory({ name });
        createdCategoryIds.set(name, created.id);
        setCategories((prev) => [...prev, created]);
      } catch {
        // Category might already exist — try finding it
        try {
          const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (existing) createdCategoryIds.set(name, existing.id);
        } catch {
          // silently continue — category will be null
        }
      }
    }

    // Create brands
    for (const name of brandsToCreate) {
      try {
        const created = await createBrand({ name });
        createdBrandIds.set(name, created.id);
        setBrands((prev) => [...prev, created]);
      } catch {
        try {
          const existing = brands.find((b) => b.name.toLowerCase() === name.toLowerCase());
          if (existing) createdBrandIds.set(name, existing.id);
        } catch {
          // silently continue
        }
      }
    }

    // Create units
    for (const name of unitsToCreate) {
      try {
        const created = await createUnit({ name, shortName: name.slice(0, 10), conversionFactor: 1 });
        createdUnitIds.set(name, created.id);
        setUnits((prev) => [...prev, created]);
      } catch {
        try {
          const existing = units.find((u) => u.name.toLowerCase() === name.toLowerCase());
          if (existing) createdUnitIds.set(name, existing.id);
        } catch {
          // silently continue
        }
      }
    }

    setStatus('Saving products…');

    const payload: CreateProductBody[] = drafts
      .filter((d) => d.include && d.name.trim())
      .map((d) => {
        // Resolve category: explicit ID → user-mapped ID → auto-created ID → null
        const catId =
          d.categoryId ??
          d.resolvedCategoryId ??
          (d.suggestedCategoryName ? createdCategoryIds.get(d.suggestedCategoryName.trim()) : null);
        const brdId =
          d.brandId ??
          d.resolvedBrandId ??
          (d.suggestedBrandName ? createdBrandIds.get(d.suggestedBrandName.trim()) : null);
        const untId =
          d.unitId ??
          d.resolvedUnitId ??
          (d.suggestedUnitName ? createdUnitIds.get(d.suggestedUnitName.trim()) : null);

        return {
          code: d.code?.trim() || generateCode(),
          name: d.name.trim(),
          description: d.description ?? undefined,
          categoryId: catId ?? undefined,
          brandId: brdId ?? undefined,
          unitId: untId ?? undefined,
          barcodeSymbology: (d.barcodeSymbology ??
            'CODE128') as CreateProductBody['barcodeSymbology'],
          cost: toNumber(d.cost) ?? 0,
          price: toNumber(d.price) ?? 0,
          wholesalePrice: toNumber(d.wholesalePrice) ?? undefined,
          minPrice: toNumber(d.minPrice) ?? undefined,
          taxRate: toNumber(d.taxRate) ?? 0,
          taxMethod: 'EXCLUSIVE',
          type: 'STANDARD',
          status: true,
          sellable: true,
        };
      });

    if (payload.length === 0) {
      setError('Nothing to save — every row is unchecked or has no name.');
      setBusy(false);
      setStatus(null);
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
      setStatus(null);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────
  const showUploadStep = step === 0;
  const hasUploadData = inputMode === 'photos' ? imageDataUrls.length > 0 : parsedRows.length > 0;
  const dropzone =
    inputMode === 'spreadsheet'
      ? spreadsheetDropzone
      : inputMode === 'pdf'
        ? pdfDropzone
        : photoDropzone;

  const modeLabel =
    inputMode === 'spreadsheet' ? 'Spreadsheet' : inputMode === 'pdf' ? 'PDF' : 'Photos';

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
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${brand.primary[100]} 0%, ${brand.primary[50]} 100%)`,
              color: brand.primary[700],
            }}
          >
            <IconSparkles size={18} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Smart import
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Upload {modeLabel} — smart mapping prepares the fields, you review, we save
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} disabled={busy}>
            <IconX size={16} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper
          activeStep={step}
          alternativeLabel
          sx={{ '& .MuiStepIcon-root.Mui-active': { color: brand.primary[600] } }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {busy && <LinearProgress sx={{ mx: 3 }} />}
      {status && (
        <Typography variant="caption" sx={{ px: 3, pt: 0.5, color: 'text.secondary' }}>
          {status}
        </Typography>
      )}

      <DialogContent dividers sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ── Step 1 · upload ───────────────────────────────── */}
        {step === 0 && (
          <Stack spacing={2}>
            {/* Input mode tabs */}
            <Tabs
              value={inputMode}
              onChange={(_, v) => {
                setInputMode(v);
                setFile(null);
                setHeaders([]);
                setParsedRows([]);
                setImagePreviews([]);
                setImageDataUrls([]);
                setError(null);
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
              <Tab
                value="phone-camera"
                icon={<IconDeviceMobile size={16} />}
                iconPosition="start"
                label="Phone Camera"
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', minHeight: 42 }}
              />
            </Tabs>

            {/* ── Phone Camera (QR overlay) ── */}
            {inputMode === 'phone-camera' && (
              <Box
                sx={{
                  borderRadius: '14px',
                  border: `1px solid ${brand.neutral[200]}`,
                  bgcolor: isDark ? brand.neutral[800] : '#fff',
                }}
              >
                <QrOverlay
                  onPhotosReceived={(dataUrls) => {
                    if (dataUrls.length === 0) {
                      setError('No photos were received from the phone. Please try again.');
                      return;
                    }
                    setImageDataUrls(dataUrls);
                    setImagePreviews(dataUrls);
                    setInputMode('photos');
                    ensureLookups();
                    autoImportRef.current = true;
                  }}
                  onUseWebcam={() => setInputMode('photos')}
                  onClose={() => {
                    setInputMode('spreadsheet');
                    setFile(null);
                    setHeaders([]);
                    setParsedRows([]);
                    setImagePreviews([]);
                    setImageDataUrls([]);
                    setError(null);
                  }}
                />
              </Box>
            )}

            {/* ── Drop zone ── */}
            {inputMode !== 'phone-camera' && <>
            <Box
              {...(showUploadStep ? dropzone.getRootProps() : {})}
              sx={{
                p: 4,
                borderRadius: '14px',
                border: `2px dashed ${dropzone.isDragActive ? brand.primary[400] : brand.neutral[300]}`,
                bgcolor: dropzone.isDragActive ? brand.primary[50] : brand.neutral[50],
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: brand.primary[50], borderColor: brand.primary[300] },
              }}
            >
              {showUploadStep && <input {...dropzone.getInputProps()} />}
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${brand.primary[100]} 0%, ${brand.primary[50]} 100%)`,
                  color: brand.primary[700],
                  mb: 1.5,
                }}
              >
                {inputMode === 'photos' ? (
                  <IconCamera size={26} />
                ) : inputMode === 'pdf' ? (
                  <IconFileTypePdf size={26} />
                ) : (
                  <IconCloudUpload size={26} />
                )}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {file
                  ? file.name
                  : dropzone.isDragActive
                    ? 'Drop the file here'
                    : inputMode === 'photos'
                      ? 'Drop photos or click to browse'
                      : inputMode === 'pdf'
                        ? 'Drop PDF here'
                        : 'Drop Excel or CSV here'}
              </Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[500], display: 'block' }}>
                {inputMode === 'spreadsheet' &&
                  `.xlsx, .xls, .csv · max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB · max ${MAX_ROWS} rows`}
                {inputMode === 'pdf' &&
                  `.pdf · max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB · text-based PDFs only`}
                {inputMode === 'photos' &&
                  `.jpg, .png, .webp · max ${MAX_IMAGES} images · resized to <1.2 MB each`}
              </Typography>

              {inputMode === 'photos' && (
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<IconCamera size={14} />}
                    size="small"
                    sx={{ borderRadius: '8px', textTransform: 'none' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                  >
                    Take photo
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<IconFile size={14} />}
                    size="small"
                    sx={{ borderRadius: '8px', textTransform: 'none' }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
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
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  border: `1px solid ${brand.success.main}`,
                  bgcolor: brand.success.light,
                }}
              >
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
                  <IconButton
                    size="small"
                    onClick={() => {
                      setFile(null);
                      setHeaders([]);
                      setParsedRows([]);
                    }}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </Stack>
              </Box>
            )}

            {/* ── PDF success indicator ── */}
            {inputMode === 'pdf' && file && parsedRows.length > 0 && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  border: `1px solid ${brand.success.main}`,
                  bgcolor: brand.success.light,
                }}
              >
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
                  <IconButton
                    size="small"
                    onClick={() => {
                      setFile(null);
                      setHeaders([]);
                      setParsedRows([]);
                    }}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </Stack>
              </Box>
            )}

            {/* ── Image previews ── */}
            {inputMode === 'photos' && imagePreviews.length > 0 && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  border: `1px solid ${brand.neutral[200]}`,
                  bgcolor: isDark ? brand.neutral[800] : '#fff',
                }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                  {imagePreviews.map((src, i) => (
                    <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
                      <Box
                        component="img"
                        src={src}
                        alt={`Photo ${i + 1}`}
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: `1px solid ${brand.neutral[200]}`,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeImage(i)}
                        sx={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          bgcolor: brand.error.main,
                          color: '#fff',
                          width: 20,
                          height: 20,
                          '&:hover': { bgcolor: brand.error.dark },
                        }}
                      >
                        <IconX size={10} />
                      </IconButton>
                    </Box>
                  ))}
                  <Stack justifyContent="center" sx={{ ml: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: brand.neutral[600] }}
                    >
                      {imagePreviews.length} image{imagePreviews.length !== 1 ? 's' : ''} ready
                    </Typography>
                    <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
                      Add more or proceed to smart mapping
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            )}

            {inputMode === 'spreadsheet' && (
              <Alert
                severity="info"
                icon={<IconAlertCircle size={18} />}
                sx={{ borderRadius: '10px' }}
              >
                Recommended columns:{' '}
                <strong>name, code, category, brand, unit, cost, price, wholesale, tax</strong>.
                Don't worry about exact spelling — smart mapping figures it out.
              </Alert>
            )}
            {inputMode === 'spreadsheet' && (
              <Button
                variant="text"
                size="small"
                startIcon={<IconDownload size={14} />}
                onClick={downloadTemplate}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                  color: brand.primary[600],
                  alignSelf: 'flex-start',
                }}
              >
                Download template (.xlsx)
              </Button>
            )}
            {inputMode === 'pdf' && (
              <Alert
                severity="info"
                icon={<IconAlertCircle size={18} />}
                sx={{ borderRadius: '10px' }}
              >
                Text-based PDFs work best. If your PDF is image-only (scanned), use the{' '}
                <strong>Photos</strong> tab instead — screenshot or photograph each page.
              </Alert>
            )}
            {inputMode === 'photos' && (
              <Alert
                severity="info"
                icon={<IconAlertCircle size={18} />}
                sx={{ borderRadius: '10px' }}
              >
                Take clear photos of product lists, supplier price sheets, or inventory records. The
                Smart import will read all visible items. Good lighting and straight angles help.
              </Alert>
            )}
            </>} {/* end inputMode !== 'phone-camera' */}
          </Stack>
        )}

        {/* ── Step 2 · AI mapping (button only — work happens on click) ── */}
        {step === 1 && (
          <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${brand.primary[200]} 0%, ${brand.primary[50]} 100%)`,
                color: brand.primary[700],
                animation: busy ? 'pulse 1.5s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.05)' },
                },
              }}
            >
              <IconSparkles size={36} />
            </Box>
            <Box sx={{ textAlign: 'center', maxWidth: 480 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {busy ? 'Mapping your data…' : 'Ready to map'}
              </Typography>
              <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
                {inputMode === 'photos'
                  ? `We'll process your ${imageDataUrls.length} image(s) along with your existing categories, brands, and units. Smart import will read every product visible and return structured rows.`
                  : `We'll process your ${parsedRows.length} rows and column headers along with your existing categories, brands, and units. Smart mapping will return a structured product per row plus warnings for anything it couldn't match.`}
              </Typography>
            </Box>
            {inputMode !== 'photos' && templates.length > 0 && (
              <TextField
                select
                size="small"
                value=""
                onChange={(e) => {
                  const t = templates.find((tm) => tm.name === e.target.value);
                  if (!t) return;
                  const preview = applyTemplate(headers, t);
                  if (preview.length > 0) {
                    setStatus(`Template "${t.name}" maps ${preview.length} columns`);
                  } else {
                    setStatus(`Template "${t.name}" does not match current headers`);
                  }
                }}
                sx={{
                  minWidth: 180,
                  '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.75rem' },
                }}
                label="Load saved template"
              >
                <MenuItem value="">
                  <em>Load saved template…</em>
                </MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.name} value={t.name}>
                    {t.name} ({t.sampleHeaders.slice(0, 3).join(', ')}…)
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Button
              size="large"
              variant="contained"
              startIcon={<IconSparkles size={18} />}
              disabled={busy}
              onClick={inputMode === 'photos' ? () => runAiImportFromImagesWith(imageDataUrls) : runAiMap}
              sx={{
                bgcolor: brand.primary[600],
                color: '#fff',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '10px',
                px: 3,
                py: 1,
                '&:hover': { bgcolor: brand.primary[700] },
              }}
            >
              {busy ? 'Mapping…' : 'Run smart mapping'}
            </Button>
          </Stack>
        )}

        {/* ── Step 3 · review ─────────────────────────────────── */}
        {step === 2 && (
          <Stack spacing={2}>

            {/* Batch actions */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDrafts((d) => d.map((r) => ({ ...r, include: true })))}
                sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.75rem' }}
              >
                Select all
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDrafts((d) => d.map((r) => ({ ...r, include: false })))}
                sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.75rem' }}
              >
                Deselect all
              </Button>
              <TextField
                select
                size="small"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setDrafts((d) => d.map((r) => (r.include ? { ...r, categoryId: val } : r)));
                }}
                placeholder="Set category…"
                sx={{
                  minWidth: 130,
                  '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.75rem' },
                }}
              >
                <MenuItem value="">
                  <em>Set category…</em>
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setDrafts((d) => d.map((r) => (r.include ? { ...r, brandId: val } : r)));
                }}
                placeholder="Set brand…"
                sx={{
                  minWidth: 120,
                  '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.75rem' },
                }}
              >
                <MenuItem value="">
                  <em>Set brand…</em>
                </MenuItem>
                {brands.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setDrafts((d) => d.map((r) => (r.include ? { ...r, unitId: val } : r)));
                }}
                placeholder="Set unit…"
                sx={{
                  minWidth: 110,
                  '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.75rem' },
                }}
              >
                <MenuItem value="">
                  <em>Set unit…</em>
                </MenuItem>
                {units.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name}
                  </MenuItem>
                ))}
              </TextField>
              {headers.length > 0 && inputMode !== 'photos' && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    const tenantId = tokenStore.getTenantId();
                    if (!tenantId) return;
                    const name = window.prompt('Template name (e.g. "Supplier X catalog")')?.trim();
                    if (!name) return;
                    const mappings: Record<string, string> = {};
                    const matches = matchColumns(headers);
                    matches.forEach((m) => {
                      mappings[headers[m.headerIndex]] = m.fieldKey;
                    });
                    saveTemplate(tenantId, {
                      name,
                      createdAt: new Date().toISOString(),
                      mappings,
                      sampleHeaders: headers,
                    });
                    setTemplates(listTemplates(tenantId));
                    setStatus(`Saved template "${name}"`);
                  }}
                  sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.75rem' }}
                >
                  Save mapping as template
                </Button>
              )}
            </Stack>

            {warnings.length > 0 && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                <Stack spacing={0.25}>
                  {warnings.slice(0, 3).map((w, i) => (
                    <Typography key={i} variant="caption">
                      {w}
                    </Typography>
                  ))}
                  {warnings.length > 3 && (
                    <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                      +{warnings.length - 3} more
                    </Typography>
                  )}
                </Stack>
              </Alert>
            )}

            {/* ── Unmatched items resolution ── */}
            <UnmatchedItems
              drafts={drafts}
              categories={categories}
              brands={brands}
              units={units}
              onCreateCategory={async (name) => {
                try {
                  const created = await createCategory({ name });
                  setCategories((prev) => [...prev, created]);
                  setDrafts((d) =>
                    d.map((r) =>
                      r.suggestedCategoryName === name && !r.categoryId
                        ? { ...r, resolvedCategoryId: created.id }
                        : r,
                    ),
                  );
                } catch {
                  setError(`Failed to create category "${name}"`);
                }
              }}
              onMapCategory={(suggestedName, existingId) => {
                setDrafts((d) =>
                  d.map((r) =>
                    r.suggestedCategoryName === suggestedName && !r.categoryId
                      ? { ...r, resolvedCategoryId: existingId }
                      : r,
                  ),
                );
              }}
              onCreateBrand={async (name) => {
                try {
                  const created = await createBrand({ name });
                  setBrands((prev) => [...prev, created]);
                  setDrafts((d) =>
                    d.map((r) =>
                      r.suggestedBrandName === name && !r.brandId
                        ? { ...r, resolvedBrandId: created.id }
                        : r,
                    ),
                  );
                } catch {
                  setError(`Failed to create brand "${name}"`);
                }
              }}
              onMapBrand={(suggestedName, existingId) => {
                setDrafts((d) =>
                  d.map((r) =>
                    r.suggestedBrandName === suggestedName && !r.brandId
                      ? { ...r, resolvedBrandId: existingId }
                      : r,
                  ),
                );
              }}
              onCreateUnit={async (name) => {
                try {
                  const created = await createUnit({ name, shortName: name.slice(0, 10), conversionFactor: 1 });
                  setUnits((prev) => [...prev, created]);
                  setDrafts((d) =>
                    d.map((r) =>
                      r.suggestedUnitName === name && !r.unitId
                        ? { ...r, resolvedUnitId: created.id }
                        : r,
                    ),
                  );
                } catch {
                  setError(`Failed to create unit "${name}"`);
                }
              }}
              onMapUnit={(suggestedName, existingId) => {
                setDrafts((d) =>
                  d.map((r) =>
                    r.suggestedUnitName === suggestedName && !r.unitId
                      ? { ...r, resolvedUnitId: existingId }
                      : r,
                  ),
                );
              }}
            />

            <Box
              sx={{
                borderRadius: '12px',
                border: `1px solid ${brand.neutral[200]}`,
                overflow: 'auto',
                maxHeight: 'calc(100vh - 380px)',
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      { k: 'include', l: '', w: 36 },
                      { k: 'conf', l: 'Score', w: 70 },
                      { k: 'name', l: 'Name *', w: 220 },
                      { k: 'code', l: 'Code', w: 120 },
                      { k: 'category', l: 'Category', w: 140 },
                      { k: 'brand', l: 'Brand', w: 120 },
                      { k: 'unit', l: 'Unit', w: 100 },
                      { k: 'cost', l: 'Cost', w: 90 },
                      { k: 'price', l: 'Price *', w: 90 },
                      { k: 'whole', l: 'Wholesale', w: 90 },
                      { k: 'tax', l: 'Tax %', w: 70 },
                      { k: 'actions', l: '', w: 80 },
                    ].map((c) => (
                      <TableCell
                        key={c.k}
                        sx={{
                          width: c.w,
                          py: 0.75,
                          px: 1,
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: brand.neutral[600],
                          bgcolor: isDark ? brand.neutral[900] : brand.neutral[50],
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {c.l}
                      </TableCell>
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
                      existingProducts={existingProducts}
                      isLast={i === drafts.length - 1}
                      onPatch={(k, v) => patchDraft(i, k, v)}
                      onRemove={() => removeDraft(i)}
                      onMergeDown={() => mergeDraftDown(i)}
                      onAddAfter={() => addDraftAfter(i)}
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
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: result.failedCount === 0 ? brand.success.light : '#fff4e0',
                color: result.failedCount === 0 ? brand.success.dark : '#a36400',
              }}
            >
              {result.failedCount === 0 ? <IconCheck size={36} /> : <IconAlertCircle size={36} />}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {result.createdCount} of {result.total} products imported
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <ResultStat label="Created" value={result.createdCount} tone="success" />
              <ResultStat
                label="Skipped"
                value={result.failedCount}
                tone={result.failedCount === 0 ? 'neutral' : 'warning'}
              />
              <ResultStat label="Total" value={result.total} tone="neutral" />
            </Stack>
            {result.failed.length > 0 && (
              <Box
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  overflow: 'auto',
                  borderRadius: '10px',
                  border: `1px solid ${brand.neutral[200]}`,
                }}
              >
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
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'ui-monospace' }}>
                          {r.code}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: brand.error.main }}>
                          {r.error}
                        </TableCell>
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
            variant="text"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {step === 0 && (
          <>
            <Button
              onClick={handleClose}
              disabled={busy}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={busy || !hasUploadData}
              onClick={() => setStep(1)}
              sx={{
                bgcolor: brand.primary[600],
                color: '#fff',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                px: 2.5,
                '&:hover': { bgcolor: brand.primary[700] },
              }}
            >
              Next
            </Button>
          </>
        )}
        {step === 1 && (
          <Button
            onClick={handleClose}
            disabled={busy}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
        )}
        {step === 2 && (
          <>
            <Button
              variant="text"
              startIcon={<IconRefresh size={14} />}
              onClick={() => setStep(1)}
              disabled={busy}
              sx={{ textTransform: 'none', fontWeight: 600, color: brand.neutral[600] }}
            >
              Re-run mapping
            </Button>
            <Button
              variant="contained"
              disabled={busy || drafts.filter((d) => d.include).length === 0}
              onClick={runBulkSave}
              sx={{
                bgcolor: brand.primary[600],
                color: '#fff',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                px: 2.5,
                '&:hover': { bgcolor: brand.primary[700] },
              }}
            >
              Save {drafts.filter((d) => d.include).length} products
            </Button>
          </>
        )}
        {step === 3 && (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              bgcolor: brand.primary[600],
              color: '#fff',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              px: 2.5,
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

/** Shows unique unmatched categories/brands/units across all drafts with Create and Map actions. */
function UnmatchedItems({
  drafts,
  categories,
  brands,
  units,
  onCreateCategory,
  onMapCategory,
  onCreateBrand,
  onMapBrand,
  onCreateUnit,
  onMapUnit,
}: {
  drafts: DraftRow[];
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  onCreateCategory: (name: string) => Promise<void>;
  onMapCategory: (suggestedName: string, existingId: UUID) => void;
  onCreateBrand: (name: string) => Promise<void>;
  onMapBrand: (suggestedName: string, existingId: UUID) => void;
  onCreateUnit: (name: string) => Promise<void>;
  onMapUnit: (suggestedName: string, existingId: UUID) => void;
}) {
  // Collect unique unmatched items
  const unmatchedCats = new Map<string, number>(); // name → count
  const unmatchedBrands = new Map<string, number>();
  const unmatchedUnits = new Map<string, number>();

  for (const d of drafts) {
    if (d.include && !d.categoryId && !d.resolvedCategoryId && d.suggestedCategoryName?.trim()) {
      const name = d.suggestedCategoryName.trim();
      unmatchedCats.set(name, (unmatchedCats.get(name) ?? 0) + 1);
    }
    if (d.include && !d.brandId && !d.resolvedBrandId && d.suggestedBrandName?.trim()) {
      const name = d.suggestedBrandName.trim();
      unmatchedBrands.set(name, (unmatchedBrands.get(name) ?? 0) + 1);
    }
    if (d.include && !d.unitId && !d.resolvedUnitId && d.suggestedUnitName?.trim()) {
      const name = d.suggestedUnitName.trim();
      unmatchedUnits.set(name, (unmatchedUnits.get(name) ?? 0) + 1);
    }
  }

  if (unmatchedCats.size === 0 && unmatchedBrands.size === 0 && unmatchedUnits.size === 0) return null;

  return (
    <Alert
      severity="info"
      icon={<IconAlertCircle size={18} />}
      sx={{ borderRadius: '10px', '& .MuiAlert-message': { flex: 1 } }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
        Unmatched items found in your data — resolve before saving:
      </Typography>
      <Stack spacing={1}>
        {[...unmatchedCats.entries()].map(([name, count]) => (
          <UnmatchedRow
            key={`cat-${name}`}
            label="Category"
            name={name}
            count={count}
            existingItems={categories}
            onCreate={() => onCreateCategory(name)}
            onMap={(id) => onMapCategory(name, id)}
          />
        ))}
        {[...unmatchedBrands.entries()].map(([name, count]) => (
          <UnmatchedRow
            key={`brd-${name}`}
            label="Brand"
            name={name}
            count={count}
            existingItems={brands}
            onCreate={() => onCreateBrand(name)}
            onMap={(id) => onMapBrand(name, id)}
          />
        ))}
        {[...unmatchedUnits.entries()].map(([name, count]) => (
          <UnmatchedRow
            key={`unt-${name}`}
            label="Unit"
            name={name}
            count={count}
            existingItems={units}
            onCreate={() => onCreateUnit(name)}
            onMap={(id) => onMapUnit(name, id)}
          />
        ))}
      </Stack>
    </Alert>
  );
}

function UnmatchedRow({
  label,
  name,
  count,
  existingItems,
  onCreate,
  onMap,
}: {
  label: string;
  name: string;
  count: number;
  existingItems: { id: UUID; name: string }[];
  onCreate: () => void;
  onMap: (id: UUID) => void;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        size="small"
        label={label}
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 700,
          bgcolor: brand.neutral[200],
          color: brand.neutral[700],
          borderRadius: '4px',
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
      <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800], minWidth: 120 }}>
        "{name}"
      </Typography>
      <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
        ({count} row{count !== 1 ? 's' : ''})
      </Typography>
      <Button
        size="small"
        variant="contained"
        onClick={onCreate}
        sx={{
          textTransform: 'none',
          fontSize: '0.7rem',
          fontWeight: 600,
          borderRadius: '6px',
          py: 0.25,
          px: 1,
          minWidth: 'auto',
          bgcolor: brand.primary[600],
          '&:hover': { bgcolor: brand.primary[700] },
        }}
      >
        Create
      </Button>
      <TextField
        select
        size="small"
        value=""
        onChange={(e) => {
          if (e.target.value) onMap(e.target.value as UUID);
        }}
        sx={{
          minWidth: 140,
          '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.7rem' },
          '& .MuiOutlinedInput-input': { py: 0.5 },
        }}
      >
        <MenuItem value="">
          <em>Map to existing…</em>
        </MenuItem>
        {existingItems.map((item) => (
          <MenuItem key={item.id} value={item.id} sx={{ fontSize: '0.72rem' }}>
            {item.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

function DraftTableRow({
  draft,
  categories,
  brands,
  units,
  existingProducts,
  isLast,
  onPatch,
  onRemove,
  onMergeDown,
  onAddAfter,
}: {
  draft: DraftRow;
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  existingProducts: { id: string; name: string; code?: string | null; barcode?: string | null }[];
  isLast: boolean;
  onPatch: <K extends keyof DraftRow>(k: K, v: DraftRow[K]) => void;
  onRemove: () => void;
  onMergeDown: () => void;
  onAddAfter: () => void;
}) {
  const dup =
    draft.name.trim() && existingProducts.length > 0
      ? checkDuplicate(
          { name: draft.name.trim(), code: draft.code, barcode: null },
          existingProducts,
        )
      : null;
  const tone = draft.confidence >= 0.7 ? 'success' : draft.confidence >= 0.4 ? 'warning' : 'error';
  const toneStyles = {
    success: { bg: brand.success.light, fg: brand.success.dark, dot: brand.success.main },
    warning: { bg: '#fff4e0', fg: '#a36400', dot: '#e8a13a' },
    error: { bg: '#fde8e8', fg: '#9b1c1c', dot: brand.error.main },
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
        <Tooltip
          title={draft.warnings?.join('\n') || `Confidence ${Math.round(draft.confidence * 100)}%`}
        >
          <Chip
            size="small"
            label={`${Math.round(draft.confidence * 100)}%`}
            sx={{
              height: 18,
              fontSize: '0.625rem',
              fontWeight: 700,
              bgcolor: toneStyles.bg,
              color: toneStyles.fg,
              borderRadius: '4px',
              '& .MuiChip-label': { px: 0.625 },
            }}
          />
        </Tooltip>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TextField
            size="small"
            value={draft.name}
            onChange={(e) => onPatch('name', e.target.value)}
            fullWidth
            sx={baseInput}
            error={!draft.name.trim() || dup?.isDuplicate}
          />
          {dup?.isDuplicate && (
            <Tooltip title={`Possible duplicate: "${dup.existingName}" (${dup.matchedBy})`}>
              <Chip
                size="small"
                label="DUP"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  bgcolor: brand.error.light,
                  color: brand.error.dark,
                  borderRadius: '4px',
                  '& .MuiChip-label': { px: 0.5 },
                  flexShrink: 0,
                }}
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          size="small"
          value={draft.code ?? ''}
          onChange={(e) => onPatch('code', e.target.value)}
          fullWidth
          sx={baseInput}
          placeholder="auto"
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TextField
            select
            size="small"
            value={draft.categoryId ?? draft.resolvedCategoryId ?? ''}
            onChange={(e) => onPatch('categoryId', e.target.value || null)}
            fullWidth
            sx={baseInput}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {categories
              .filter((c) => !c.parentId)
              .map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.75rem' }}>
                  {c.name}
                </MenuItem>
              ))}
          </TextField>
          {!draft.categoryId && !draft.resolvedCategoryId && draft.suggestedCategoryName && (
            <Tooltip title={`Suggested: "${draft.suggestedCategoryName}" — not found in system`}>
              <Chip
                size="small"
                label={draft.suggestedCategoryName.length > 14
                  ? draft.suggestedCategoryName.slice(0, 14) + '…'
                  : draft.suggestedCategoryName}
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: '#fff4e0',
                  color: '#a36400',
                  borderRadius: '4px',
                  '& .MuiChip-label': { px: 0.5 },
                  flexShrink: 0,
                  maxWidth: 120,
                }}
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TextField
            select
            size="small"
            value={draft.brandId ?? draft.resolvedBrandId ?? ''}
            onChange={(e) => onPatch('brandId', e.target.value || null)}
            fullWidth
            sx={baseInput}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {brands.map((b) => (
              <MenuItem key={b.id} value={b.id} sx={{ fontSize: '0.75rem' }}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>
          {!draft.brandId && !draft.resolvedBrandId && draft.suggestedBrandName && (
            <Tooltip title={`Suggested: "${draft.suggestedBrandName}" — not found in system`}>
              <Chip
                size="small"
                label={draft.suggestedBrandName.length > 14
                  ? draft.suggestedBrandName.slice(0, 14) + '…'
                  : draft.suggestedBrandName}
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: '#fff4e0',
                  color: '#a36400',
                  borderRadius: '4px',
                  '& .MuiChip-label': { px: 0.5 },
                  flexShrink: 0,
                  maxWidth: 120,
                }}
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <TextField
            select
            size="small"
            value={draft.unitId ?? draft.resolvedUnitId ?? ''}
            onChange={(e) => onPatch('unitId', e.target.value || null)}
            fullWidth
            sx={baseInput}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {units.map((u) => (
              <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.75rem' }}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>
          {!draft.unitId && !draft.resolvedUnitId && draft.suggestedUnitName && (
            <Tooltip title={`Suggested: "${draft.suggestedUnitName}" — not found in system`}>
              <Chip
                size="small"
                label={draft.suggestedUnitName.length > 14
                  ? draft.suggestedUnitName.slice(0, 14) + '…'
                  : draft.suggestedUnitName}
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: '#fff4e0',
                  color: '#a36400',
                  borderRadius: '4px',
                  '& .MuiChip-label': { px: 0.5 },
                  flexShrink: 0,
                  maxWidth: 120,
                }}
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          size="small"
          type="number"
          value={draft.cost}
          onChange={(e) => onPatch('cost', e.target.value)}
          fullWidth
          sx={baseInput}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          size="small"
          type="number"
          value={draft.price}
          onChange={(e) => onPatch('price', e.target.value)}
          fullWidth
          sx={baseInput}
          error={!draft.price}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          size="small"
          type="number"
          value={draft.wholesalePrice}
          onChange={(e) => onPatch('wholesalePrice', e.target.value)}
          fullWidth
          sx={baseInput}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <TextField
          size="small"
          type="number"
          value={draft.taxRate}
          onChange={(e) => onPatch('taxRate', e.target.value)}
          fullWidth
          sx={baseInput}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1 }}>
        <Stack direction="row" spacing={0} alignItems="center">
          {!isLast && (
            <Tooltip title="Merge with row below (fix split handwriting)">
              <IconButton
                size="small"
                onClick={onMergeDown}
                sx={{ color: brand.primary[600], p: 0.25 }}
              >
                <IconArrowMerge size={13} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Add empty row below (split item)">
            <IconButton
              size="small"
              onClick={onAddAfter}
              sx={{ color: brand.neutral[500], p: 0.25 }}
            >
              <IconPlus size={13} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove row">
            <IconButton size="small" onClick={onRemove} sx={{ color: brand.error.main, p: 0.25 }}>
              <IconTrash size={13} />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function ResultStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const map = {
    success: { bg: brand.success.light, fg: brand.success.dark },
    warning: { bg: '#fff4e0', fg: '#a36400' },
    neutral: { bg: brand.neutral[100], fg: brand.neutral[700] },
  }[tone];
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        borderRadius: '10px',
        bgcolor: map.bg,
        textAlign: 'center',
        minWidth: 100,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: map.fg, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: map.fg, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: string | number | null | undefined): number | undefined {
  if (v == null) return undefined;
  const s = String(v).replace(/[^\d.-]/g, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function generateCode(): string {
  return String(Math.floor(1e12 + Math.random() * 9e12));
}

/** Generate and download an Excel template file with proper headers + one sample row. */
function downloadTemplate() {
  const headers = [
    'Name', 'Code', 'Category', 'Brand', 'Unit',
    'Cost', 'Price', 'Wholesale Price', 'Tax %', 'Description', 'Barcode',
  ];
  const sampleRow = [
    'Example Product', '', 'Electronics', '', 'Pieces',
    5000, 10000, 9200, 18, 'A sample product for reference', '',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  // Set column widths for readability
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'smartpos_product_template.xlsx');
}

/**
 * Try multiple strategies to extract a plausible product name from row values.
 * Falls back to "Product N" only as absolute last resort.
 */
function bestEffortName(
  nameMatch: string | undefined,
  descMatch: string | undefined,
  values: Record<string, string>,
  matches: { fieldKey: string; headerIndex: number }[],
  rowIndex: number,
): string {
  // 1. Direct name match (non-empty)
  if (nameMatch && String(nameMatch).trim()) return String(nameMatch).trim();

  // 2. Use description as name (truncated)
  if (descMatch && String(descMatch).trim()) {
    const d = String(descMatch).trim();
    return d.length > 80 ? d.slice(0, 80) + '…' : d;
  }

  // 3. Find the best name-like cell among ALL values
  // Get indices matched to numeric/ID fields so we can deprioritize them
  const numericFieldKeys = new Set(['cost', 'price', 'wholesale', 'min', 'tax', 'stock', 'stockAlert']);
  const numericIndices = new Set(
    matches.filter((m) => numericFieldKeys.has(m.fieldKey)).map((m) => m.headerIndex),
  );

  let bestText = '';
  let bestScore = -1;

  for (const [header, val] of Object.entries(values)) {
    const text = String(val).trim();
    if (!text) continue;

    // Find this header's index
    const headerIdx = Object.keys(values).indexOf(header);

    // Score each cell for "name-likeness"
    let score = 0;

    // Skip purely numeric values
    if (/^[\d.,\s-]+$/.test(text)) continue;

    // Skip very short values (likely codes, not names)
    if (text.length < 3) continue;

    // Prefer longer text (product names tend to be descriptive)
    score += Math.min(text.length, 60);

    // Prefer values with letters AND spaces (real product names)
    if (/[a-zA-Z]/.test(text) && /\s/.test(text)) score += 20;

    // Prefer values with mixed case or non-ASCII (Swahili names etc.)
    if (/[a-z]/.test(text) && /[A-Z]/.test(text)) score += 10;

    // Penalize if this column is matched to a numeric/ID field
    if (numericIndices.has(headerIdx)) score -= 50;

    // Penalize if it looks like a barcode (all digits, long)
    if (/^\d{8,}$/.test(text)) score -= 40;

    // Penalize pure uppercase (likely codes)
    if (/^[A-Z0-9\s_-]+$/.test(text) && text.length < 10) score -= 20;

    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }

  if (bestText) return bestText;

  // 4. Absolute last resort
  return `Product ${rowIndex + 1}`;
}
