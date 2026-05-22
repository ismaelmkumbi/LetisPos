import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconAlertTriangle,
  IconBoxMultiple,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconEyeOff,
  IconPlus,
  IconSparkles,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import {
  createProduct,
  listProducts,
  deleteProduct,
  updateProduct,
  listCategories,
  listBrands,
  type Product,
} from 'src/api/smartpos/products';
import ProductsImportDialog from 'src/views/smartpos/products/ProductsImportDialog';
import type { Category, Brand } from 'src/api/smartpos/types';
import {
  listStockLevels,
  listWarehouses,
  type StockLevel,
  type Warehouse,
} from 'src/api/smartpos/inventory';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

function dataQualityScore(p: Product): number {
  const checks = [
    !!p.imageUrl,
    !!p.description,
    !!p.categoryId,
    !!p.brandId,
    (p.barcodes?.length ?? 0) > 0,
    (p.price ?? 0) > 0,
    (p.cost ?? 0) > 0,
    p.wholesalePrice != null,
    (p.variants?.length ?? 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ProductsListPage() {
  const { t } = useTranslation('smartpos');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  // ── URL-synced state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    (searchParams.get('status') as 'all' | 'active' | 'inactive') ?? 'all',
  );
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') ?? '');
  const [brandFilter, setBrandFilter] = useState(searchParams.get('brand') ?? '');
  const [warehouseFilter, setWarehouseFilter] = useState(searchParams.get('warehouseId') ?? '');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockLevelMap, setStockLevelMap] = useState<Map<string, StockLevel>>(new Map());
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>(() => {
    const s = searchParams.get('sort');
    if (!s) return { id: 'name', desc: false };
    const [id, dir] = s.split(',');
    return { id, desc: dir === 'desc' };
  });
  const variantFilter = searchParams.get('variant') === 'true';

  // ── Sync state → URL (single effect, debounced) ────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const set = (k: string, v: string | undefined) => {
            if (v && v !== '' && v !== 'all') next.set(k, v);
            else next.delete(k);
          };
          set('search', search || undefined);
          set('status', statusFilter);
          set('category', categoryFilter || undefined);
          set('brand', brandFilter || undefined);
          set('warehouseId', warehouseFilter || undefined);
          if (page > 0) next.set('page', String(page));
          else next.delete('page');
          if (sort && !(sort.id === 'name' && !sort.desc))
            next.set('sort', `${sort.id},${sort.desc ? 'desc' : 'asc'}`);
          else next.delete('sort');
          return next;
        },
        { replace: true },
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [
    search,
    statusFilter,
    categoryFilter,
    brandFilter,
    warehouseFilter,
    page,
    sort,
    setSearchParams,
  ]);

  // ── Local state ─────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // ── Bulk selection ───────────────────────────────────────────────────────────
  const sel = useSelection(rows);

  // Clear selection when rows change (page change, filter, etc.)
  useEffect(() => {
    sel.clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalElements]);

  // ── Quick duplicate product ──────────────────────────────────────────────────
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const duplicateProduct = useCallback(async (p: Product) => {
    setCopyingId(p.id);
    try {
      await createProduct({
        code: p.code
          ? `${p.code}-copy-${Date.now()}`
          : `${p.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
        name: `${p.name} (Copy)`,
        description: p.description ?? undefined,
        categoryId: p.categoryId ?? undefined,
        brandId: p.brandId ?? undefined,
        unitId: p.unitId ?? undefined,
        cost: p.cost,
        price: p.price,
        wholesalePrice: p.wholesalePrice ?? undefined,
        minPrice: p.minPrice ?? undefined,
        stockAlert: p.stockAlert,
        type: p.type ?? undefined,
        status: p.status,
        sellable: p.sellable,
        featured: p.featured,
        imageUrl: p.imageUrl ?? undefined,
        warrantyMonths: p.warrantyMonths ?? undefined,
        guaranteeMonths: p.guaranteeMonths ?? undefined,
        lengthCm: p.lengthCm ?? undefined,
        widthCm: p.widthCm ?? undefined,
        heightCm: p.heightCm ?? undefined,
        weightGrams: p.weightGrams ?? undefined,
        trackSerial: p.trackSerial,
        trackImei: p.trackImei,
        barcodes: p.barcodes?.map((b) => ({
          barcode: b.barcode,
          barcodeType: b.barcodeType,
          primary: b.primary,
        })),
        variants: p.variants?.map((v) => ({
          name: v.name,
          code: v.code ?? undefined,
          price: v.price ?? undefined,
          cost: v.cost ?? undefined,
          wholesalePrice: v.wholesalePrice ?? undefined,
          minPrice: v.minPrice ?? undefined,
          imageUrl: v.imageUrl ?? undefined,
        })),
        comboItems: p.comboItems?.map((ci) => ({
          componentProductId: ci.componentProductId,
          qty: ci.qty,
          unitCost: ci.unitCost ?? undefined,
          unitPrice: ci.unitPrice ?? undefined,
          position: ci.position,
        })),
      });
      setRefreshToken((prev) => prev + 1);
      setToast({ message: `"${p.name}" copied`, severity: 'success' });
    } catch {
      setToast({ message: `Failed to copy "${p.name}"`, severity: 'error' });
    } finally {
      setCopyingId(null);
    }
  }, []);

  // ── Row action menu ──────────────────────────────────────────────────────────
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuProduct, setMenuProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // ── Quick-preview hover card ────────────────────────────────────────────────
  const [hoverProduct, setHoverProduct] = useState<Product | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const handleMouseEnter = useCallback((p: Product, el: HTMLElement) => {
    hoverTimer.current = setTimeout(() => {
      setHoverProduct(p);
      setAnchorEl(el);
    }, 400);
  }, []);
  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setHoverProduct(null);
    setAnchorEl(null);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape' && tag === 'INPUT') {
          (e.target as HTMLInputElement).blur();
          setSearch('');
          setPage(0);
        }
        return;
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        navigate('/smartpos/products/new');
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (sel.selectedIdsRef.current.size > 0) sel.clearSelection();
        else if (search) {
          setSearch('');
          setPage(0);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, search, sel]);

  // ── Fetch lookup data once ─────────────────────────────────────────────────
  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => {});
    listBrands()
      .then(setBrands)
      .catch(() => {});
    listWarehouses()
      .then((rows) => setWarehouses(rows.filter((r) => r.active)))
      .catch(() => {});
  }, []);

  // ── Fetch stock levels when warehouse filter is active ──────────────────────
  useEffect(() => {
    if (!warehouseFilter) {
      setStockLevelMap(new Map());
      return;
    }
    let cancelled = false;
    listStockLevels(warehouseFilter, 0, 1000)
      .then((page) => {
        if (!cancelled) {
          const map = new Map<string, StockLevel>();
          page.content.forEach((sl) => map.set(sl.productId, sl));
          setStockLevelMap(map);
        }
      })
      .catch(() => {
        if (!cancelled) setStockLevelMap(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseFilter]);

  // ── Fetch products ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      listProducts({
        search: search || undefined,
        page,
        size: 20,
        sort: sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : 'name,asc',
        status: statusFilter === 'all' ? undefined : statusFilter === 'active',
        categoryId: categoryFilter || undefined,
        brandId: brandFilter || undefined,
        variant: variantFilter || undefined,
      })
        .then((p) => {
          if (!cancelled) {
            setRows(p.content);
            setTotalPages(p.totalPages || 1);
            setTotalElements(p.totalElements || 0);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, page, refreshToken, statusFilter, categoryFilter, brandFilter, sort, variantFilter]);

  // ── Lookup helpers ─────────────────────────────────────────────────────────
  const catName = useCallback((id: string | null | undefined) =>
    id ? (categories.find((c) => c.id === id)?.name ?? null) : null, [categories]);
  const brandName = useCallback((id: string | null | undefined) =>
    id ? (brands.find((b) => b.id === id)?.name ?? null) : null, [brands]);

  // ── Batch dialogs ──────────────────────────────────────────────────────────
  const [batchCategoryOpen, setBatchCategoryOpen] = useState(false);
  const [batchCategoryValue, setBatchCategoryValue] = useState('');
  const [batchCategoryProcessing, setBatchCategoryProcessing] = useState(false);

  const [batchPriceOpen, setBatchPriceOpen] = useState(false);
  const [batchPriceMode, setBatchPriceMode] = useState<'fixed' | 'percent'>('fixed');
  const [batchPriceValue, setBatchPriceValue] = useState('');
  const [batchPriceProcessing, setBatchPriceProcessing] = useState(false);

  const [batchStockOpen, setBatchStockOpen] = useState(false);
  const [batchStockAlertValue, setBatchStockAlertValue] = useState('');
  const [batchStockProcessing, setBatchStockProcessing] = useState(false);

  // ── Batch delete ───────────────────────────────────────────────────────────
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      const results = await Promise.allSettled(
        Array.from(sel.selectedIds).map((id) => deleteProduct(id)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
      if (failed > 0) {
        setToast({ message: `${failed} product(s) failed to delete`, severity: 'error' });
      } else {
        setToast({ message: 'Products deleted', severity: 'success' });
      }
    } catch {
      setToast({ message: 'Batch delete failed', severity: 'error' });
    } finally {
      setBatchDeleting(false);
      setBatchDeleteOpen(false);
    }
  };

  // ── Batch category ─────────────────────────────────────────────────────────
  const handleBatchCategory = async () => {
    if (!batchCategoryValue) return;
    setBatchCategoryProcessing(true);
    try {
      const ids = Array.from(sel.selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) => updateProduct(id, { categoryId: batchCategoryValue })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) setError(`${failed} product(s) failed to update category`);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch category update failed');
    } finally {
      setBatchCategoryProcessing(false);
      setBatchCategoryOpen(false);
    }
  };

  // ── Batch price ────────────────────────────────────────────────────────────
  const handleBatchPrice = async () => {
    const raw = parseFloat(batchPriceValue);
    if (isNaN(raw) || raw <= 0) return;
    setBatchPriceProcessing(true);
    try {
      const ids = Array.from(sel.selectedIds);
      const updates = ids.map((id) => {
        const product = rows.find((r) => r.id === id);
        const currentPrice = product?.price ?? 0;
        const newPrice = batchPriceMode === 'fixed' ? raw : currentPrice * (1 + raw / 100);
        return updateProduct(id, { price: Math.round(newPrice * 100) / 100 });
      });
      const results = await Promise.allSettled(updates);
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) setError(`${failed} product(s) failed to update price`);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch price update failed');
    } finally {
      setBatchPriceProcessing(false);
      setBatchPriceOpen(false);
    }
  };

  // ── Batch stock ────────────────────────────────────────────────────────────
  const handleBatchStock = async () => {
    setBatchStockProcessing(true);
    try {
      const alertQty = parseInt(batchStockAlertValue, 10);
      if (isNaN(alertQty) || alertQty < 0) return;
      const ids = Array.from(sel.selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) => updateProduct(id, { stockAlert: alertQty })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) setError(`${failed} product(s) failed to update stock`);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch stock update failed');
    } finally {
      setBatchStockProcessing(false);
      setBatchStockOpen(false);
    }
  };
  const actionBtnSx = useMemo(() => ({
    p: 0.5,
    borderRadius: '8px',
    color: brand.neutral[400],
    '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
  }), []);

  const columns: Column<Product>[] = useMemo(
    () => [
      sel.selectionColumn(),
      {
        key: 'name',
        label: 'Product',
        width: 280,
        sortable: true,
        exportValue: (p) => `${p.name} (${p.code})`,
        render: (p) => (
          <Tooltip title={p.name} placement="bottom-start">
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0 }}
              onMouseEnter={(e) => handleMouseEnter(p, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
            >
              <Avatar
                src={p.imageUrl ?? undefined}
                variant="rounded"
                sx={{
                  bgcolor: brand.primary[50],
                  color: brand.primary[700],
                  width: 30,
                  height: 30,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1px solid ${brand.neutral[200]}`,
                  borderRadius: '8px',
                  flexShrink: 0,
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, lineHeight: 1.15 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}
                    noWrap
                  >
                    {p.name}
                  </Typography>
                  {p.featured && (
                    <Tooltip title="Featured">
                      <Box sx={{ display: 'flex', color: brand.accent[500], flexShrink: 0 }}>
                        <IconStar size={12} fill={brand.accent[500]} />
                      </Box>
                    </Tooltip>
                  )}
                  {p.sellable === false && (
                    <Tooltip title="Hidden from POS">
                      <Box sx={{ display: 'flex', color: brand.neutral[400], flexShrink: 0 }}>
                        <IconEyeOff size={12} />
                      </Box>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Tooltip>
        ),
      },
      {
        key: 'skuBarcode',
        label: 'SKU / Barcode',
        width: 160,
        sortable: true,
        exportValue: (p) => p.code,
        render: (p) => (
          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: '0.84rem', color: brand.neutral[700], fontWeight: 700 }}>
              {p.code}
            </Typography>
            <Typography
              sx={{ fontSize: '0.69rem', color: brand.neutral[500], letterSpacing: '0.06em' }}
            >
              ||||| |||| |||||
            </Typography>
          </Stack>
        ),
      },
      {
        key: 'categoryId',
        label: 'Category',
        width: 120,
        sortable: false,
        exportValue: (p) => catName(p.categoryId) ?? '',
        render: (p) => {
          const name = catName(p.categoryId);
          return name ? (
            <Tooltip title={name}>
              <Typography
                component="span"
                sx={{ color: brand.neutral[700], fontSize: '0.75rem' }}
                noWrap
              >
                {name}
              </Typography>
            </Tooltip>
          ) : (
            <Typography component="span" sx={{ color: brand.neutral[400], fontSize: '0.75rem' }}>
              —
            </Typography>
          );
        },
      },
      {
        key: 'brandId',
        label: 'Brand',
        width: 100,
        sortable: false,
        exportValue: (p) => brandName(p.brandId) ?? '',
        render: (p) => {
          const name = brandName(p.brandId);
          return name ? (
            <Tooltip title={name}>
              <Typography
                component="span"
                sx={{ color: brand.neutral[700], fontSize: '0.75rem' }}
                noWrap
              >
                {name}
              </Typography>
            </Tooltip>
          ) : (
            <Typography component="span" sx={{ color: brand.neutral[400], fontSize: '0.75rem' }}>
              —
            </Typography>
          );
        },
      },
      {
        key: 'price',
        label: 'Retail Price',
        align: 'right',
        width: 110,
        sortable: true,
        exportValue: (p) => p.price,
        render: (p) => (
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              color: brand.primary[700],
              fontVariantNumeric: 'tabular-nums',
              fontSize: '0.8125rem',
            }}
          >
            {fmt(p.price)}
          </Typography>
        ),
      },
      {
        key: 'wholesalePrice',
        label: 'Wholesale',
        align: 'right',
        width: 100,
        sortable: true,
        defaultHidden: true,
        exportValue: (p) => p.wholesalePrice ?? '',
        render: (p) =>
          p.wholesalePrice != null ? (
            <Typography
              component="span"
              sx={{
                color: brand.info.dark,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontSize: '0.75rem',
              }}
            >
              {fmt(p.wholesalePrice)}
            </Typography>
          ) : (
            <Typography component="span" sx={{ color: brand.neutral[300], fontSize: '0.75rem' }}>
              —
            </Typography>
          ),
      },
      {
        key: 'stockAlert',
        label: 'Reorder Level',
        align: 'center',
        width: 90,
        sortable: true,
        defaultHidden: true,
        exportValue: (p) => p.stockAlert,
        render: (p) => (
          <Tooltip title="Minimum stock before alert fires">
            <Typography
              component="span"
              sx={{ fontSize: '0.82rem', fontWeight: 700, color: brand.neutral[700] }}
            >
              {p.stockAlert} pcs
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'stockHealth',
        label: 'Stock',
        align: 'center',
        width: 80,
        sortable: false,
        exportValue: (p) => {
          const sl = stockLevelMap.get(p.id);
          return sl ? `${sl.onHand} on hand` : '—';
        },
        render: (p) => {
          const sl = stockLevelMap.get(p.id);
          if (!sl)
            return (
              <Typography component="span" sx={{ color: brand.neutral[300], fontSize: '0.75rem' }}>
                —
              </Typography>
            );
          const ratio = sl.stockAlertThreshold > 0 ? sl.onHand / sl.stockAlertThreshold : 2;
          const pct = Math.min(ratio / 2, 1) * 100;
          const barColor =
            ratio >= 1.5
              ? brand.success.dark
              : ratio >= 1
                ? brand.warning.dark
                : ratio >= 0.5
                  ? brand.warning.main
                  : brand.error.dark;
          const barBg =
            ratio >= 1.5 ? brand.success.light : ratio >= 1 ? brand.warning.light : '#FFF3E0';
          return (
            <Tooltip
              title={`${sl.onHand} on hand · ${sl.available} available · Alert at ${sl.stockAlertThreshold}`}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 6,
                    bgcolor: brand.neutral[100],
                    borderRadius: '3px',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: `${pct}%`,
                      height: '100%',
                      bgcolor: barColor,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: barColor,
                    bgcolor: barBg,
                    px: 0.5,
                    py: 0.1,
                    borderRadius: '4px',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sl.onHand}
                </Typography>
              </Box>
            </Tooltip>
          );
        },
      },
      {
        key: 'dataQuality',
        label: 'Quality',
        align: 'center',
        width: 72,
        sortable: true,
        defaultHidden: true,
        exportValue: (p) => `${dataQualityScore(p)}%`,
        render: (p) => {
          const score = dataQualityScore(p);
          const color =
            score >= 88
              ? brand.success.dark
              : score >= 66
                ? brand.warning.dark
                : score >= 33
                  ? brand.warning.main
                  : brand.error.dark;
          const bg =
            score >= 88
              ? brand.success.light
              : score >= 66
                ? brand.warning.light
                : score >= 33
                  ? '#FFF3E0'
                  : brand.error.light;
          return (
            <Tooltip title={`Data quality: ${score}%`}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
              >
                <Box
                  sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }}
                />
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color,
                    bgcolor: bg,
                    px: 0.6,
                    py: 0.1,
                    borderRadius: '4px',
                    lineHeight: 1.4,
                  }}
                >
                  {score}%
                </Typography>
              </Box>
            </Tooltip>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        width: 80,
        sortable: true,
        exportValue: (p) => (p.status ? 'Active' : 'Inactive'),
        render: (p) => (
          <StatusBadge
            label={p.status ? 'Active' : 'Inactive'}
            tone={p.status ? 'success' : 'neutral'}
          />
        ),
      },
      {
        key: 'actions',
        label: '',
        align: 'right',
        width: 90,
        enableHiding: false,
        render: (p) => (
          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={0.3}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Copy product">
              <IconButton
                size="small"
                disabled={copyingId === p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateProduct(p);
                }}
                sx={actionBtnSx}
              >
                {copyingId === p.id ? (
                  <CircularProgress size={13} sx={{ color: brand.primary[600] }} />
                ) : (
                  <IconCopy size={13} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="More actions">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor(e.currentTarget);
                  setMenuProduct(p);
                }}
                sx={actionBtnSx}
              >
                <IconDotsVertical size={14} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [
      actionBtnSx,
      brandName,
      catName,
      copyingId,
      duplicateProduct,
      handleMouseEnter,
      handleMouseLeave,
      sel,
      stockLevelMap,
    ],
  );

  const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id;

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (statusFilter !== 'all')
    activeFilters.push({
      key: 'status',
      label: `Status: ${statusFilter === 'active' ? 'Active' : 'Inactive'}`,
      clear: () => {
        setStatusFilter('all');
        setPage(0);
      },
    });
  if (categoryFilter)
    activeFilters.push({
      key: 'cat',
      label: `Category: ${catName(categoryFilter) ?? '…'}`,
      clear: () => {
        setCategoryFilter('');
        setPage(0);
      },
    });
  if (brandFilter)
    activeFilters.push({
      key: 'brand',
      label: `Brand: ${brandName(brandFilter) ?? '…'}`,
      clear: () => {
        setBrandFilter('');
        setPage(0);
      },
    });
  if (warehouseFilter)
    activeFilters.push({
      key: 'wh',
      label: `Warehouse: ${warehouseName(warehouseFilter)}`,
      clear: () => {
        setWarehouseFilter('');
        setPage(0);
      },
    });

  const clearAll = useCallback(() => {
    setStatusFilter('all');
    setCategoryFilter('');
    setBrandFilter('');
    setWarehouseFilter('');
    setSearch('');
    setPage(0);
  }, []);

  // ── Filter panel visibility ──────────────────────────────────────────────
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── AI Import dialog ──────────────────────────────────────────────────────
  const [aiImportOpen, setAiImportOpen] = useState(false);

  // Auto-open the AI Import dialog when arriving from the floating "Import CSV"
  // FAB (which navigates here with ?import=ai) or from onboarding empty state
  // (?onboarding=import). Strip the param after consuming so a refresh doesn't
  // re-open the dialog.
  useEffect(() => {
    if (searchParams.get('import') === 'ai' || searchParams.get('onboarding') === 'import') {
      setAiImportOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('import');
          next.delete('onboarding');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <PageHeader
        title={variantFilter ? 'Variants' : t('nav.products')}
        subtitle={variantFilter ? 'Products with size, colour, or other variations.' : 'Manage your inventory, pricing and stock in one place.'}
        actions={[
          {
            label: 'Smart import',
            icon: <IconSparkles size={18} />,
            onClick: () => setAiImportOpen(true),
          },
          {
            label: 'Add Product',
            icon: <IconPlus size={18} />,
            onClick: () => navigate('/smartpos/products/new'),
          },
        ]}
      />

      <FilterBar
        searchPlaceholder="Search product, SKU, barcode…"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        searchAriaLabel="Search products"
        searchInputRef={searchRef}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={clearAll}
      >
        <TextField
          select
          size="small"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(0);
          }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Filter by category' }}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories
            .filter((c) => !c.parentId)
            .map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
        </TextField>

        <TextField
          select
          size="small"
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.target.value);
            setPage(0);
          }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Filter by brand' }}
          sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All brands</MenuItem>
          {brands.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          value={warehouseFilter}
          onChange={(e) => {
            setWarehouseFilter(e.target.value);
            setPage(0);
          }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Filter by warehouse' }}
          sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All warehouses</MenuItem>
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
            setPage(0);
          }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Filter by status' }}
          sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </FilterBar>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Bulk action bar */}
      {sel.selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={sel.selectedIds.size}
          onClear={sel.clearSelection}
          itemLabel="product"
        >
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<IconTrash size={14} />}
            onClick={() => setBatchDeleteOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Delete
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setBatchCategoryValue('');
              setBatchCategoryOpen(true);
            }}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Change Category
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setBatchPriceMode('fixed');
              setBatchPriceValue('');
              setBatchPriceOpen(true);
            }}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Update Price
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setBatchStockOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Update Stock
          </Button>
        </BulkActionBar>
      )}

      {!loading && totalElements === 0 && !search && (
        <EmptyStateGuide
          title="No products yet"
          subtitle="Add your first product to start tracking inventory, prices, and sales."
          icon={<IconSparkles size={48} />}
          action={{ label: 'Smart Import', to: '/smartpos/products?onboarding=import' }}
          onboardingStep="Step 3 of 5"
        />
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No products match these filters."
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={20}
        onPageChange={setPage}
        getRowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/smartpos/products/${p.id}`)}
        dense={false}
        tableKey="products"
        enableSorting
        onSortChange={(s) => {
          setSort(s);
          setPage(0);
        }}
        enableColumnVisibility
        enableExport
        exportFileName="products-export"
        toolbarTitle={totalElements > 0 ? `${totalElements.toLocaleString()} products` : undefined}
        expandable
        renderExpanded={(p) => (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
            <Avatar
              src={p.imageUrl ?? undefined}
              variant="rounded"
              sx={{
                width: 80,
                height: 80,
                borderRadius: '10px',
                flexShrink: 0,
                bgcolor: brand.primary[50],
                color: brand.primary[700],
                fontWeight: 700,
                fontSize: 24,
              }}
            >
              {p.name.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography
                sx={{ fontWeight: 800, fontSize: '1rem', color: brand.neutral[800], mb: 1.5 }}
              >
                {p.name}
              </Typography>
              {p.description && (
                <Typography
                  sx={{ fontSize: '0.8rem', color: brand.neutral[500], mb: 1.5, lineHeight: 1.5 }}
                >
                  {p.description}
                </Typography>
              )}
              <Stack
                direction="row"
                spacing={0}
                useFlexGap
                flexWrap="wrap"
                sx={{
                  '& > *': {
                    flex: '0 0 33.33%',
                    py: 0.75,
                    borderBottom: `1px solid ${brand.neutral[100]}`,
                  },
                }}
              >
                {[
                  ['SKU', p.code],
                  ['Barcode', p.barcodes?.[0]?.barcode ?? '—'],
                  ['Category', catName(p.categoryId) ?? '—'],
                  ['Brand', brandName(p.brandId) ?? '—'],
                  ['Cost', p.cost != null ? fmt(p.cost) : '—'],
                  ['Retail Price', p.price != null ? fmt(p.price) : '—'],
                  ['Wholesale', p.wholesalePrice != null ? fmt(p.wholesalePrice) : '—'],
                  [
                    'Stock on Hand',
                    (() => {
                      const sl = stockLevelMap.get(p.id);
                      return sl ? `${sl.onHand} pcs (${sl.available} available)` : '—';
                    })(),
                  ],
                  ['Reorder Level', p.stockAlert != null ? `${p.stockAlert} pcs` : '—'],
                  ['Status', p.status ? 'Active' : 'Inactive'],
                ].map(([label, value]) => (
                  <Stack
                    key={label}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ px: 1.5 }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: brand.neutral[500],
                        minWidth: 90,
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.8rem', fontWeight: 700, color: brand.neutral[800] }}
                    >
                      {value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
              {p.featured && (
                <Chip
                  label="Featured"
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    bgcolor: brand.accent[50],
                    color: brand.accent[700],
                    borderRadius: '6px',
                  }}
                />
              )}
              {p.sellable === false && (
                <Chip
                  label="Hidden"
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    bgcolor: brand.neutral[100],
                    color: brand.neutral[600],
                    borderRadius: '6px',
                  }}
                />
              )}
              {p.trackSerial && (
                <Chip
                  label="Serialized"
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    bgcolor: brand.warning.light,
                    color: brand.warning.dark,
                    borderRadius: '6px',
                  }}
                />
              )}
              {p.trackImei && (
                <Chip
                  label="IMEI"
                  size="small"
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    bgcolor: brand.info.light,
                    color: brand.info.dark,
                    borderRadius: '6px',
                  }}
                />
              )}
            </Stack>
          </Stack>
        )}
      />

      {/* Batch delete confirm */}
      <Dialog
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delete {sel.selectedIds.size} {sel.selectedIds.size === 1 ? 'product' : 'products'}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            These products will be permanently removed from the catalog. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchDeleteOpen(false)} disabled={batchDeleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBatchDelete}
            disabled={batchDeleting}
          >
            {batchDeleting ? 'Deleting…' : `Delete ${sel.selectedIds.size}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch change category */}
      <Dialog
        open={batchCategoryOpen}
        onClose={() => !batchCategoryProcessing && setBatchCategoryOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Change Category ({sel.selectedIds.size} products)
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            size="small"
            label="New category"
            value={batchCategoryValue}
            onChange={(e) => setBatchCategoryValue(e.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          >
            <MenuItem value="">
              <em>Select a category</em>
            </MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchCategoryOpen(false)} disabled={batchCategoryProcessing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBatchCategory}
            disabled={!batchCategoryValue || batchCategoryProcessing}
          >
            {batchCategoryProcessing ? 'Updating…' : `Update ${sel.selectedIds.size} products`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch update price */}
      <Dialog
        open={batchPriceOpen}
        onClose={() => !batchPriceProcessing && setBatchPriceOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Update Price ({sel.selectedIds.size} products)
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1}>
              <Button
                variant={batchPriceMode === 'fixed' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setBatchPriceMode('fixed')}
                sx={{ borderRadius: '8px', fontWeight: 700, flex: 1 }}
              >
                Set fixed price
              </Button>
              <Button
                variant={batchPriceMode === 'percent' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setBatchPriceMode('percent')}
                sx={{ borderRadius: '8px', fontWeight: 700, flex: 1 }}
              >
                Adjust by %
              </Button>
            </Stack>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={
                batchPriceMode === 'fixed' ? 'New price' : 'Percentage change (e.g. 10 or -10)'
              }
              value={batchPriceValue}
              onChange={(e) => setBatchPriceValue(e.target.value)}
              inputProps={{ step: 'any' }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchPriceOpen(false)} disabled={batchPriceProcessing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBatchPrice}
            disabled={!batchPriceValue || batchPriceProcessing}
          >
            {batchPriceProcessing ? 'Updating…' : `Update ${sel.selectedIds.size} products`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch update stock alert */}
      <Dialog
        open={batchStockOpen}
        onClose={() =>
          !batchStockProcessing && (setBatchStockOpen(false), setBatchStockAlertValue(''))
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Update Stock Alert ({sel.selectedIds.size} products)
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Set the reorder alert level for all selected products.
          </DialogContentText>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Stock alert quantity"
            value={batchStockAlertValue}
            onChange={(e) => setBatchStockAlertValue(e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchStockOpen(false)} disabled={batchStockProcessing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleBatchStock}
            disabled={!batchStockAlertValue || batchStockProcessing}
          >
            {batchStockProcessing ? 'Updating…' : 'Set alert level'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick-preview hover card */}
      {hoverProduct && anchorEl && (
        <Box
          sx={{
            position: 'fixed',
            top: anchorEl.getBoundingClientRect().bottom + 6,
            left: anchorEl.getBoundingClientRect().left,
            zIndex: 1500,
            pointerEvents: 'none',
          }}
        >
          <Paper
            sx={{
              p: 1.5,
              minWidth: 240,
              maxWidth: 300,
              boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  src={hoverProduct.imageUrl ?? undefined}
                  variant="rounded"
                  sx={{
                    width: 40,
                    height: 40,
                    fontSize: 14,
                    fontWeight: 700,
                    bgcolor: brand.primary[50],
                    color: brand.primary[700],
                    borderRadius: '8px',
                    border: `1px solid ${brand.neutral[200]}`,
                  }}
                >
                  {hoverProduct.name.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontSize: '0.8125rem' }}
                    noWrap
                  >
                    {hoverProduct.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'ui-monospace', fontWeight: 600, color: brand.neutral[500] }}
                    noWrap
                  >
                    {hoverProduct.code}
                  </Typography>
                </Box>
              </Stack>
              <Stack spacing={0.5}>
                {[
                  ['Cost', fmt(hoverProduct.cost), brand.neutral[800]],
                  ['Retail', fmt(hoverProduct.price), brand.primary[700]],
                  ...(hoverProduct.wholesalePrice != null
                    ? [['Wholesale', fmt(hoverProduct.wholesalePrice), brand.info.dark]]
                    : []),
                  ['Category', catName(hoverProduct.categoryId) ?? '—', brand.neutral[800]],
                  ['Brand', brandName(hoverProduct.brandId) ?? '—', brand.neutral[800]],
                ].map(([label, value, color]) => (
                  <Stack key={label} direction="row" justifyContent="space-between">
                    <Typography
                      variant="caption"
                      sx={{ color: brand.neutral[500], fontWeight: 600 }}
                    >
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color }}>
                      {value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                {hoverProduct.featured && (
                  <Chip
                    label="Featured"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      bgcolor: brand.accent[50],
                      color: brand.accent[700],
                      borderRadius: '4px',
                    }}
                  />
                )}
                {hoverProduct.sellable === false && (
                  <Chip
                    label="Hidden"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      bgcolor: brand.neutral[100],
                      color: brand.neutral[600],
                      borderRadius: '4px',
                    }}
                  />
                )}
                {hoverProduct.variant && (
                  <Chip
                    label="Has variants"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      bgcolor: brand.info.light,
                      color: brand.info.dark,
                      borderRadius: '4px',
                    }}
                  />
                )}
                {hoverProduct.trackSerial && (
                  <Chip
                    label="Serialized"
                    size="small"
                    icon={<IconAlertTriangle size={10} />}
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      bgcolor: brand.warning.light,
                      color: brand.warning.dark,
                      borderRadius: '4px',
                    }}
                  />
                )}
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}

      <ProductsImportDialog
        open={aiImportOpen}
        onClose={() => setAiImportOpen(false)}
        onImported={() => {
          setAiImportOpen(false);
          setRefreshToken((n) => n + 1);
        }}
      />

      {/* Row action menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setMenuProduct(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { borderRadius: '12px', minWidth: 190, mt: 0.5 } } }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            if (menuProduct) navigate(`/smartpos/products/${menuProduct.id}/edit`);
          }}
          sx={{ borderRadius: '8px', mx: 0.5, fontWeight: 600, fontSize: '0.85rem' }}
        >
          <ListItemIcon><IconEdit size={18} /></ListItemIcon>
          Edit Product
        </MenuItem>
        {menuProduct?.variant && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              if (menuProduct) navigate(`/smartpos/products/${menuProduct.id}/variants`);
            }}
            sx={{ borderRadius: '8px', mx: 0.5, fontWeight: 600, fontSize: '0.85rem' }}
          >
            <ListItemIcon><IconBoxMultiple size={18} /></ListItemIcon>
            Manage Variants
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            if (menuProduct) setDeleteTarget(menuProduct);
          }}
          sx={{ borderRadius: '8px', mx: 0.5, fontWeight: 600, fontSize: '0.85rem', color: brand.error.main }}
        >
          <ListItemIcon sx={{ color: brand.error.main }}><IconTrash size={18} /></ListItemIcon>
          Delete Product
        </MenuItem>
      </Menu>

      {/* Single-item delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem' }}>Delete Product</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await deleteProduct(deleteTarget.id);
                setRefreshToken((prev) => prev + 1);
                setToast({ message: `"${deleteTarget.name}" deleted`, severity: 'success' });
              } catch {
                setToast({ message: `Failed to delete "${deleteTarget.name}"`, severity: 'error' });
              } finally {
                setDeleteTarget(null);
              }
            }}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 800,
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast feedback */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={toast?.message ?? ''}
        ContentProps={{
          sx: {
            borderRadius: '10px',
            fontWeight: 600,
            bgcolor: toast?.severity === 'error' ? brand.error.main : brand.success.main,
            color: '#fff',
          },
        }}
      />
    </Box>
  );
}
