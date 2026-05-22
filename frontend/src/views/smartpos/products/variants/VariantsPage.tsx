import { useState, useCallback, useMemo, useEffect, useContext } from 'react';
import { useParams } from 'react-router';
import { Alert, Box, Button, IconButton, Snackbar, Stack, Tooltip } from '@mui/material';
import { IconLayoutGrid, IconList, IconPlus, IconSparkles, IconDeviceFloppy } from '@tabler/icons-react';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { useVariantState } from './useVariantState';
import { VariantCardGrid } from './VariantCardGrid';
import { VariantTableView } from './VariantTableView';
import { VariantGeneratorDialog } from './VariantGeneratorDialog';
import { VariantBulkEditDialog, type BulkField } from './VariantBulkEditDialog';
import { VariantSkeletonGrid } from './VariantSkeletonGrid';

type ViewMode = 'card' | 'table';

function loadViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem('smartpos:variants:viewMode');
    if (stored === 'card' || stored === 'table') return stored;
  } catch { /* ignore */ }
  return 'card';
}

function persistViewMode(mode: ViewMode) {
  try { localStorage.setItem('smartpos:variants:viewMode', mode); } catch { /* ignore */ }
}

export default function VariantsPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id!;
  const { activeMode } = useContext(CustomizerContext);
  void activeMode; // consumed by child components via context

  const {
    product,
    variants,
    loading,
    saving,
    error,
    isDirty,
    updateVariant,
    updateMany,
    addVariants,
    removeVariants,
    save,
  } = useVariantState(productId);

  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showGenerator, setShowGenerator] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Clear selection when switching views
  const switchView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    persistViewMode(mode);
    setSelectedIds(new Set());
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) save().then(() => setSavedToast(true));
      }
      if (e.key === 'Escape') setSelectedIds(new Set());
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDirty, save]);

  const handleDelete = useCallback(
    (variantId: string) => {
      removeVariants([variantId]);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    },
    [removeVariants],
  );

  const handleBulkDelete = useCallback(() => {
    removeVariants(Array.from(selectedIds));
    clearSelection();
  }, [selectedIds, removeVariants, clearSelection]);

  const handleBulkApply = useCallback(
    (field: BulkField, value: number) => {
      updateMany(Array.from(selectedIds), field, value);
      clearSelection();
    },
    [selectedIds, updateMany, clearSelection],
  );

  // Metrics
  const metrics = useMemo(() => {
    const prices = variants
      .map((v) => v.price)
      .filter((p): p is number => p != null);
    const priceRange =
      prices.length > 0
        ? `${formatMoney(Math.min(...prices))} – ${formatMoney(Math.max(...prices))}`
        : '—';
    const distinctAxes = new Set(
      variants.map((v) => v.name.split(' / ').length),
    );
    return [
      { label: 'Variants', value: variants.length },
      { label: 'Price range', value: priceRange },
      { label: 'Attributes', value: variants.length > 0 ? `${Math.max(...distinctAxes)}` : '—' },
    ];
  }, [variants]);

  const productName = product?.name ?? 'Product';

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <PageHeader
        title={`${productName} Variants`}
        subtitle="Manage product variations — each variant gets its own price, SKU, and image."
        breadcrumbs={[
          { label: 'Products', href: '/smartpos/products' },
          { label: productName, href: `/smartpos/products/${productId}` },
          { label: 'Variants' },
        ]}
        metrics={metrics}
        actions={[
          {
            label: 'Generate',
            icon: <IconSparkles size={18} />,
            onClick: () => setShowGenerator(true),
            variant: 'ghost',
          },
          {
            label: isDirty ? `Save Changes` : 'Saved',
            icon: <IconDeviceFloppy size={18} />,
            onClick: () => save().then(() => setSavedToast(true)),
            variant: isDirty ? 'accent' : 'ghost',
          },
        ]}
      />

      {/* View mode toggle */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          mb: 2,
          p: 0.5,
          borderRadius: '10px',
          bgcolor: isDark ? brand.neutral[800] : brand.neutral[100],
          display: 'inline-flex',
        }}
      >
        <Tooltip title="Card view">
          <IconButton
            size="small"
            onClick={() => switchView('card')}
            sx={{
              borderRadius: '8px',
              bgcolor: viewMode === 'card'
                ? isDark ? brand.neutral[700] : '#fff'
                : 'transparent',
              boxShadow: viewMode === 'card'
                ? `0 1px 3px ${isDark ? 'rgba(0,0,0,0.4)' : brand.neutral[300]}`
                : 'none',
              color: viewMode === 'card' ? brand.primary[500] : isDark ? brand.neutral[400] : brand.neutral[500],
              '&:hover': {
                bgcolor: viewMode === 'card'
                  ? isDark ? brand.neutral[700] : '#fff'
                  : isDark ? brand.neutral[700] : brand.neutral[200],
              },
            }}
          >
            <IconLayoutGrid size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Table view">
          <IconButton
            size="small"
            onClick={() => switchView('table')}
            sx={{
              borderRadius: '8px',
              bgcolor: viewMode === 'table'
                ? isDark ? brand.neutral[700] : '#fff'
                : 'transparent',
              boxShadow: viewMode === 'table'
                ? `0 1px 3px ${isDark ? 'rgba(0,0,0,0.4)' : brand.neutral[300]}`
                : 'none',
              color: viewMode === 'table' ? brand.primary[500] : isDark ? brand.neutral[400] : brand.neutral[500],
              '&:hover': {
                bgcolor: viewMode === 'table'
                  ? isDark ? brand.neutral[700] : '#fff'
                  : isDark ? brand.neutral[700] : brand.neutral[200],
              },
            }}
          >
            <IconList size={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Bulk action bar for card view */}
      {viewMode === 'card' && selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          itemLabel="variant"
        >
          <Button
            size="small"
            variant="text"
            onClick={() => setShowBulkEdit(true)}
            sx={{ fontWeight: 700, color: brand.primary[700], textTransform: 'none' }}
          >
            Bulk Set Price
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={handleBulkDelete}
            sx={{ fontWeight: 700, color: brand.error.main, textTransform: 'none' }}
          >
            Delete {selectedIds.size}
          </Button>
        </BulkActionBar>
      )}

      {/* Content */}
      {loading ? (
        <VariantSkeletonGrid />
      ) : variants.length === 0 ? (
        <EmptyStateGuide
          title="No variants yet"
          subtitle="This product is sold as a single SKU. Generate variants from attributes like size or colour to offer more options."
          icon={<IconPlus size={40} stroke={1.5} />}
          action={{ label: 'Generate Variants', onClick: () => setShowGenerator(true) }}
        />
      ) : viewMode === 'card' ? (
        <VariantCardGrid
          variants={variants}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onUpdate={updateVariant}
          onDelete={handleDelete}
        />
      ) : (
        <VariantTableView
          variants={variants}
          loading={saving}
          onDelete={handleDelete}
        />
      )}

      {/* Dialogs */}
      <VariantGeneratorDialog
        open={showGenerator}
        onClose={() => setShowGenerator(false)}
        onGenerate={(newVariants, merge) => {
          if (!merge) {
            // Replace all: clear existing then add generated
            removeVariants(variants.map((v) => v.id));
          }
          addVariants(newVariants);
        }}
        existingCount={variants.length}
      />

      <VariantBulkEditDialog
        open={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        onApply={handleBulkApply}
        selectedCount={selectedIds.size}
      />

      {/* Toast for save */}
      <Snackbar
        open={savedToast}
        autoHideDuration={2000}
        onClose={() => setSavedToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message="Variants saved"
      />
    </Box>
  );
}
