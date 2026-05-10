import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton,
  ListItemIcon, Menu, MenuItem,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
  type AlertColor,
} from '@mui/material';
import {
  IconAlertTriangle, IconCircleCheck, IconCurrencyDollar,
  IconDotsVertical, IconEdit, IconEye, IconLayoutList, IconLayoutRows,
  IconPlus, IconRotate, IconShoppingCart, IconTrash, IconTruckDelivery, IconX,
  IconFileStack,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  listPurchases, deletePurchase, cancelPurchase, receivePurchase, getPurchaseStats,
  type Purchase, type PurchaseStatus, type PaymentStatus, type PurchaseStats,
} from 'src/api/smartpos/sales';
import { listSuppliers } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import BulkGenerateDialog from 'src/components/smartpos/documents/BulkGenerateDialog';
import { useSelection } from 'src/components/smartpos/useSelection';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';
import { parseApiError } from 'src/utils/smartpos/apiErrors';
import IssuePurchaseReturnDialog from './IssuePurchaseReturnDialog';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const outstandingAmount = (purchase: Purchase) => Math.max(0, purchase.dueTotal);
const supplierCreditAmount = (purchase: Purchase) =>
  Math.max(0, purchase.paidTotal - purchase.grandTotal, -purchase.dueTotal);

type PageNotice = {
  message: string;
  severity: AlertColor;
};

const noticeFromError = (e: unknown, fallback: string): PageNotice => {
  const parsed = parseApiError(e);
  const message = parsed.message || fallback;
  const guidancePatterns = [
    'cannot cancel',
    'cannot delete',
    'received purchase',
    'issue a return',
    'already received',
    'is cancelled',
  ];
  const isGuidance = guidancePatterns.some((pattern) => message.toLowerCase().includes(pattern));
  return {
    message,
    severity: isGuidance ? 'warning' : 'error',
  };
};

const STATUS_TONE: Record<PurchaseStatus, { bg: string; fg: string; dot: string }> = {
  DRAFT:     { bg: brand.neutral[100], fg: brand.neutral[700], dot: brand.neutral[400] },
  ORDERED:   { bg: brand.info.light,    fg: brand.info.dark,    dot: brand.info.main },
  RECEIVED:  { bg: brand.success.light, fg: brand.success.dark, dot: brand.success.main },
  CANCELLED: { bg: brand.error.light,   fg: brand.error.dark,   dot: brand.error.main },
};

const PAY_TONE: Record<PaymentStatus, { bg: string; fg: string; dot: string }> = {
  UNPAID:   { bg: brand.error.light,   fg: brand.error.dark,   dot: brand.error.main },
  PARTIAL:  { bg: brand.warning.light, fg: brand.warning.dark, dot: brand.warning.main },
  PAID:     { bg: brand.success.light, fg: brand.success.dark, dot: brand.success.main },
  REFUNDED: { bg: brand.neutral[100],  fg: brand.neutral[700],  dot: brand.neutral[400] },
};

const actionBtnSx = {
  p: 0.5, borderRadius: '8px',
  color: brand.neutral[400],
  '&:hover': { color: brand.primary[600], bgcolor: brand.primary[50] },
};

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color, accentBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  accentBg: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 155,
        bgcolor: '#fff',
        borderRadius: '12px',
        border: `1px solid ${brand.neutral[200]}`,
        borderTop: `3px solid ${color}`,
        px: 2.5,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        cursor: 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: `0 1px 2px ${brand.neutral[900]}06`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 12px 28px -12px ${brand.neutral[900]}18, 0 0 0 1px ${brand.neutral[200]}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          variant="caption"
          sx={{
            color: brand.neutral[500],
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.68rem',
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: accentBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 900,
          color: brand.neutral[900],
          letterSpacing: '-0.3px',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PurchasesListPage() {
  useTranslation('smartpos');
  const { user } = useAuth();
  const nav = useNavigate();

  // Data
  const [rows, setRows] = useState<Purchase[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<PageNotice | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Filters & sort
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PurchaseStatus | ''>('');
  const [payStatus, setPayStatus] = useState<PaymentStatus | ''>('');
  const [supplierId, setSupplierId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dense, setDense] = useState(false);
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>({ id: 'date', desc: true });

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Global stats (filtered by date range — covers entire dataset, not just this page)
  const [globalStats, setGlobalStats] = useState<PurchaseStats | null>(null);

  // Selection
  const sel = useSelection(rows);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Row menu
  const [rowMenu, setRowMenu] = useState<{
    anchorPosition: { top: number; left: number };
    row: Purchase;
  } | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Issue-return dialog
  const [returnTarget, setReturnTarget] = useState<Purchase | null>(null);

  // Cancel confirmation
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [batchCancelOpen, setBatchCancelOpen] = useState(false);
  const [batchCancelling, setBatchCancelling] = useState(false);

  // ── Fetch suppliers ──────────────────────────────────────────────────────────

  useEffect(() => {
    listSuppliers({ size: 500, active: true })
      .then((p) => setSuppliers(p.content))
      .catch(() => {});
  }, [user?.tenantId]);

  // ── Fetch purchases ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      const sortParam = sort ? `${sort.id},${sort.desc ? 'desc' : 'asc'}` : 'date,desc';
      listPurchases({
        search: search || undefined,
        status: (status || undefined) as PurchaseStatus | undefined,
        paymentStatus: (payStatus || undefined) as PaymentStatus | undefined,
        supplierId: supplierId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        size: PAGE_SIZE,
        sort: sortParam,
      })
        .then((p) => {
          if (!cancelled) {
            setRows(p.content);
            setTotalPages(p.totalPages || 1);
            setTotalElements(p.totalElements || 0);
          }
        })
        .catch((e) => {
          if (!cancelled) setNotice(noticeFromError(e, 'Failed to load'));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, status, payStatus, supplierId, dateFrom, dateTo, page, refreshToken, sort, user?.tenantId]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  // Global totals (whole dataset for the active date range), fetched separately
  // from the page query so the cards don't lie about scope.

  useEffect(() => {
    let cancelled = false;
    getPurchaseStats({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((s) => { if (!cancelled) setGlobalStats(s); })
      .catch(() => { if (!cancelled) setGlobalStats(null); });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, refreshToken, user?.tenantId]);

  // Page-scoped received count (backend stats don't break down by status).
  const pageReceived = useMemo(
    () => rows.filter((p) => p.status === 'RECEIVED').length,
    [rows],
  );

  const financialSummary = useMemo(() => {
    const due = Math.max(0, globalStats?.due ?? 0);
    const credit = Math.max(0, -(globalStats?.due ?? 0), (globalStats?.paid ?? 0) - (globalStats?.gross ?? 0));
    return { due, credit };
  }, [globalStats]);

  // ── Row menu ─────────────────────────────────────────────────────────────────

  const closeRowMenu = useCallback(() => setRowMenu(null), []);

  const handleReceive = useCallback(async (id: string) => {
    try {
      await receivePurchase(id);
      setRefreshToken((n) => n + 1);
    } catch (e) {
      setNotice(noticeFromError(e, 'Failed to receive purchase'));
    }
  }, []);

  // ── Delete handlers ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePurchase(deleteTarget.id);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setNotice(noticeFromError(e, 'Delete failed'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      await Promise.all(Array.from(sel.selectedIds).map((id) => deletePurchase(id)));
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setNotice(noticeFromError(e, 'Batch delete failed'));
    } finally {
      setBatchDeleting(false);
      setBatchDeleteOpen(false);
    }
  };

  // ── Cancel handlers ──────────────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelPurchase(cancelTarget.id);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setNotice(noticeFromError(e, 'Cancel failed'));
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleBatchCancel = async () => {
    setBatchCancelling(true);
    try {
      await Promise.all(Array.from(sel.selectedIds).map((id) => cancelPurchase(id)));
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setNotice(noticeFromError(e, 'Batch cancel failed'));
    } finally {
      setBatchCancelling(false);
      setBatchCancelOpen(false);
    }
  };

  // ── Filters ──────────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setSearch('');
    setStatus('');
    setPayStatus('');
    setSupplierId('');
    setDateFrom('');
    setDateTo('');
    setDense(false);
    setPage(0);
  }, []);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (search.trim())
      out.push({ key: 'search', label: `Search: ${search.trim()}`, clear: () => { setSearch(''); setPage(0); } });
    if (status)
      out.push({ key: 'status', label: `Status: ${status}`, clear: () => { setStatus(''); setPage(0); } });
    if (payStatus)
      out.push({ key: 'pay', label: `Payment: ${payStatus}`, clear: () => { setPayStatus(''); setPage(0); } });
    if (supplierId) {
      const sn = suppliers.find((s) => s.id === supplierId)?.name ?? supplierId.slice(0, 8);
      out.push({ key: 'supplier', label: `Supplier: ${sn}`, clear: () => { setSupplierId(''); setPage(0); } });
    }
    if (dateFrom)
      out.push({ key: 'from', label: `From: ${dateFrom}`, clear: () => { setDateFrom(''); setPage(0); } });
    if (dateTo)
      out.push({ key: 'to', label: `To: ${dateTo}`, clear: () => { setDateTo(''); setPage(0); } });
    if (dense)
      out.push({ key: 'density', label: 'Compact table', clear: () => setDense(false) });
    return out;
  }, [search, status, payStatus, supplierId, dateFrom, dateTo, dense, suppliers]);

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns: Column<Purchase>[] = useMemo(() => [
    sel.selectionColumn(),
    {
      key: '_rowNum',
      label: '#',
      width: 48,
      align: 'center',
      enableHiding: false,
      sortable: false,
      exportValue: () => '',
      render: (_, idx) => (
        <Typography
          component="span"
          sx={{
            fontSize: '0.75rem', fontWeight: 700, color: brand.neutral[500],
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {page * PAGE_SIZE + idx + 1}
        </Typography>
      ),
    },
    {
      key: 'ref',
      label: 'Reference',
      width: 150,
      sortable: true,
      exportValue: (p) => p.ref,
      render: (p) => (
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.primary[700], fontSize: '0.8125rem' }}>
            {p.ref}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontSize: '0.7rem' }}>
            {new Date(p.date).toLocaleDateString()}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'supplier',
      label: 'Supplier',
      width: 190,
      sortable: false, // Purchase entity stores supplierId only — no joinable name column.
      exportValue: (p) => p.supplierName ?? '',
      render: (p) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: brand.accent[50], color: brand.accent[600],
              width: 30, height: 30, fontSize: 12, fontWeight: 700,
              border: `1px solid ${brand.neutral[200]}`,
              borderRadius: '8px',
              flexShrink: 0,
            }}
          >
            {(p.supplierName ?? '?').charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }} noWrap>
            {p.supplierName ?? '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      sortable: true,
      width: 120,
      exportValue: (p) => p.status,
      render: (p) => {
        const t = STATUS_TONE[p.status];
        return (
          <Chip
            label={p.status}
            size="small"
            sx={{
              bgcolor: t.bg, color: t.fg, fontWeight: 700,
              borderRadius: '6px', fontSize: '0.7rem', height: 24,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        );
      },
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      align: 'center',
      sortable: true,
      width: 120,
      exportValue: (p) => p.paymentStatus,
      render: (p) => {
        const credit = supplierCreditAmount(p);
        const t = credit > 0
          ? { bg: brand.info.light, fg: brand.info.dark, dot: brand.info.main }
          : PAY_TONE[p.paymentStatus];
        return (
          <Chip
            label={credit > 0 ? 'CREDIT' : p.paymentStatus}
            size="small"
            sx={{
              bgcolor: t.bg, color: t.fg, fontWeight: 700,
              borderRadius: '6px', fontSize: '0.7rem', height: 24,
              '& .MuiChip-label': { px: 1.25 },
            }}
          />
        );
      },
    },
    {
      key: 'grandTotal',
      label: 'Total',
      align: 'right',
      width: 118,
      sortable: true,
      exportValue: (p) => fmt(p.grandTotal),
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 800, color: brand.neutral[800], fontVariantNumeric: 'tabular-nums' }}>
          {fmt(p.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'paidTotal',
      label: 'Paid',
      align: 'right',
      width: 112,
      sortable: true,
      exportValue: (p) => fmt(p.paidTotal),
      render: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.success.dark, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(p.paidTotal)}
        </Typography>
      ),
    },
    {
      key: 'dueTotal',
      label: 'Due',
      align: 'right',
      width: 112,
      sortable: false, // dueTotal is derived (grandTotal - paidTotal), not a column.
      exportValue: (p) => {
        const outstanding = outstandingAmount(p);
        const credit = supplierCreditAmount(p);
        return credit > 0 ? `Credit ${fmt(credit)}` : fmt(outstanding);
      },
      render: (p) => {
        const outstanding = outstandingAmount(p);
        const credit = supplierCreditAmount(p);
        return (
          <Stack spacing={0.15} alignItems="flex-end">
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
              {outstanding > 0 && (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: brand.error.main, flexShrink: 0 }} />
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: outstanding > 0 ? brand.error.dark : credit > 0 ? brand.info.dark : brand.neutral[500],
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmt(outstanding)}
              </Typography>
            </Stack>
            {credit > 0 && (
              <Typography variant="caption" sx={{ color: brand.info.dark, fontWeight: 700, fontSize: '0.65rem' }}>
                Credit {fmt(credit)}
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'dueDate',
      label: 'Due date',
      width: 112,
      sortable: false, // dueDate is not persisted on Purchase.
      exportValue: (p) => p.dueDate ?? '',
      render: (p) => {
        // Compare date-only — p.dueDate ("YYYY-MM-DD") parses as midnight UTC, so
        // a purchase due today was previously flagged overdue from 03:00 local time
        // in TZ+3.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = p.dueDate ? new Date(p.dueDate) : null;
        if (due) due.setHours(0, 0, 0, 0);
        const overdue = !!due && due < today && outstandingAmount(p) > 0;
        return (
          <Stack direction="row" spacing={0.75} alignItems="center">
            {overdue && <IconAlertTriangle size={14} color={brand.error.main} style={{ flexShrink: 0 }} />}
            <Typography
              variant="caption"
              sx={{
                color: overdue ? brand.error.dark : brand.neutral[600],
                fontWeight: overdue ? 700 : 400,
              }}
            >
              {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
            </Typography>
          </Stack>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 180,
      enableHiding: false,
      exportValue: () => '',
      render: (p) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <DocumentActionsBar documentType="purchase-order" referenceType="purchase" referenceId={p.id} />
          <Tooltip title="More actions">
            <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setRowMenu({
                anchorPosition: {
                  top: e.clientY + 8,
                  left: Math.min(e.clientX, window.innerWidth - 12),
                },
                row: p,
              });
            }}
            sx={actionBtnSx}
            aria-haspopup="true"
          >
            <IconDotsVertical size={14} />
          </IconButton>
        </Tooltip>
        </Stack>
      ),
    },
  ], [page, sel]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Purchases"
        subtitle="Supplier orders, payments and receiving"
        breadcrumbs={[
          { label: 'Money' },
          { label: 'Purchases' },
        ]}
        badge={totalElements > 0 ? { label: `${totalElements.toLocaleString()} orders`, tone: 'neutral' } : undefined}
        metrics={globalStats ? [
          { label: 'Total', value: fmt(globalStats.gross) },
          { label: 'Paid', value: fmt(globalStats.paid) },
          financialSummary.credit > 0
            ? { label: 'Supplier credit', value: fmt(financialSummary.credit) }
            : { label: 'Outstanding', value: fmt(financialSummary.due) },
        ] : undefined}
        actions={[{
          label: 'New purchase',
          icon: <IconPlus size={18} />,
          onClick: () => nav('/smartpos/purchases/new'),
        }]}
      />

      {/* ── Stat cards ── */}
      {/* Cards 1-3 use globalStats from /purchases/stats so totals reflect the full
          dataset (filtered by date range). Card 4 is page-scoped and labeled as such
          since the backend stats endpoint doesn't break down by status. */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <StatCard
          icon={<IconShoppingCart size={18} color={brand.primary[600]} />}
          label="Total value"
          value={globalStats ? fmt(globalStats.gross) : '—'}
          color={brand.primary[500]}
          accentBg={`linear-gradient(135deg, ${brand.primary[50]}, ${brand.primary[100]})`}
        />
        <StatCard
          icon={<IconCurrencyDollar size={18} color={brand.success.dark} />}
          label="Paid"
          value={globalStats ? fmt(globalStats.paid) : '—'}
          color={brand.success.main}
          accentBg={`linear-gradient(135deg, ${brand.success.light}, #DCFCE7)`}
        />
        <StatCard
          icon={
            financialSummary.credit > 0
              ? <IconCircleCheck size={18} color={brand.info.dark} />
              : <IconAlertTriangle size={18} color={brand.error.dark} />
          }
          label={financialSummary.credit > 0 ? 'Supplier credit' : 'Outstanding'}
          value={globalStats ? fmt(financialSummary.credit > 0 ? financialSummary.credit : financialSummary.due) : '—'}
          color={financialSummary.credit > 0 ? brand.info.main : brand.error.main}
          accentBg={financialSummary.credit > 0
            ? `linear-gradient(135deg, ${brand.info.light}, #E0F2FE)`
            : `linear-gradient(135deg, ${brand.error.light}, #FEE2E2)`}
        />
        <StatCard
          icon={<IconTruckDelivery size={18} color={brand.accent[500]} />}
          label="Received (this page)"
          value={`${pageReceived}/${rows.length}`}
          color={brand.accent[500]}
          accentBg={`linear-gradient(135deg, ${brand.accent[50]}, ${brand.accent[100]})`}
        />
      </Stack>

      {/* ── Filter bar ── */}
      <FilterBar
        searchPlaceholder="Search by reference…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchAriaLabel="Search purchases"
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={clearAll}
      >
        <Typography
          variant="caption"
          sx={{ width: '100%', fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Filters
        </Typography>
        <TextField
          select
          size="small"
          value={status}
          label="Status"
          onChange={(e) => { setStatus(e.target.value as PurchaseStatus | ''); setPage(0); }}
          sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="ORDERED">Ordered</MenuItem>
          <MenuItem value="RECEIVED">Received</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          value={payStatus}
          label="Payment"
          onChange={(e) => { setPayStatus(e.target.value as PaymentStatus | ''); setPage(0); }}
          sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All payments</MenuItem>
          <MenuItem value="UNPAID">Unpaid</MenuItem>
          <MenuItem value="PARTIAL">Partial</MenuItem>
          <MenuItem value="PAID">Paid</MenuItem>
          <MenuItem value="REFUNDED">Refunded</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          value={supplierId}
          label="Supplier"
          onChange={(e) => { setSupplierId(e.target.value); setPage(0); }}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All suppliers</MenuItem>
          {suppliers.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label="From"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 145, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 145, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        />
        <Box sx={{ width: '100%', mt: 0.5 }} />
        <Typography
          variant="caption"
          sx={{ width: '100%', fontWeight: 700, color: brand.neutral[500], textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Table layout
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={dense ? 'compact' : 'cosy'}
          onChange={(_, v) => { if (v) setDense(v === 'compact'); }}
          sx={{
            '& .MuiToggleButton-root': {
              borderRadius: '10px !important', border: `1px solid ${brand.neutral[200]} !important`,
              px: 1.25, py: 0.5, color: brand.neutral[600], fontWeight: 600, textTransform: 'none',
              '&.Mui-selected': { bgcolor: brand.primary[50], color: brand.primary[700], borderColor: `${brand.primary[200]} !important` },
            },
          }}
        >
          <Tooltip title="Comfortable row height"><ToggleButton value="cosy"><IconLayoutRows size={16} style={{ marginRight: 6 }} /> Cosy</ToggleButton></Tooltip>
          <Tooltip title="More rows per screen"><ToggleButton value="compact"><IconLayoutList size={16} style={{ marginRight: 6 }} /> Compact</ToggleButton></Tooltip>
        </ToggleButtonGroup>
      </FilterBar>

      {/* ── Notice ── */}
      {notice && (
        <Alert
          severity={notice.severity}
          sx={{
            mb: 2,
            borderRadius: '12px',
            alignItems: 'center',
            fontWeight: 650,
            ...(notice.severity === 'warning' ? {
              bgcolor: '#FFF7ED',
              color: '#9A3412',
              border: '1px solid #FED7AA',
              '& .MuiAlert-icon': { color: '#EA580C' },
            } : {}),
          }}
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {/* ── Bulk action bar ── */}
      {sel.selectedIds.size > 0 && (
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="purchase">
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconFileStack size={14} />}
            onClick={() => setBulkOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Bulk Generate
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<IconX size={14} />}
            onClick={() => setBatchCancelOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Cancel
          </Button>
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
        </BulkActionBar>
      )}

      {/* ── Data table ── */}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No purchases in this view."
        emptyIcon={<IconShoppingCart size={32} />}
        emptyAction={{
          label: 'Create first purchase',
          onClick: () => nav('/smartpos/purchases/new'),
        }}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        itemLabel="purchases"
        onPageChange={setPage}
        getRowKey={(p) => p.id}
        onRowClick={(p) => nav(`/smartpos/purchases/${p.id}/edit`)}
        dense={dense}
        tableKey="purchases"
        toolbarTitle={totalElements > 0 ? `${totalElements.toLocaleString()} purchases` : undefined}
        enableSorting
        onSortChange={(s) => { setSort(s); setPage(0); }}
        enableColumnVisibility
        enableExport
        exportFileName={`purchases-${new Date().toISOString().slice(0, 10)}`}
      />

      {/* ── Row context menu ── */}
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={rowMenu?.anchorPosition}
        open={Boolean(rowMenu)}
        onClose={closeRowMenu}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            border: `1px solid ${brand.neutral[200]}`,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
            minWidth: 180,
          },
        }}
      >
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            nav(`/smartpos/purchases/${rowMenu.row.id}/edit`);
            closeRowMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <IconEye size={18} />
          </ListItemIcon>
          View details
        </MenuItem>
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            nav(`/smartpos/purchases/${rowMenu.row.id}/edit`);
            closeRowMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <IconEdit size={18} />
          </ListItemIcon>
          Edit
        </MenuItem>
        {rowMenu?.row.status === 'ORDERED' && (
          <MenuItem
            dense
            onClick={() => {
              if (!rowMenu) return;
              handleReceive(rowMenu.row.id);
              closeRowMenu();
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <IconCircleCheck size={18} color={brand.success.main} />
            </ListItemIcon>
            Receive
          </MenuItem>
        )}
        {rowMenu?.row.status === 'RECEIVED' && (
          <MenuItem
            dense
            onClick={() => {
              if (!rowMenu) return;
              setReturnTarget(rowMenu.row);
              closeRowMenu();
            }}
            sx={{ color: 'warning.dark' }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <IconRotate size={18} />
            </ListItemIcon>
            Return to supplier
          </MenuItem>
        )}
        {rowMenu && rowMenu.row.status !== 'CANCELLED' && (
          <MenuItem
            dense
            onClick={() => {
              if (!rowMenu) return;
              setCancelTarget(rowMenu.row);
              closeRowMenu();
            }}
            sx={{ color: 'warning.main' }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <IconX size={18} />
            </ListItemIcon>
            Cancel order
          </MenuItem>
        )}
        <MenuItem
          dense
          onClick={() => {
            if (!rowMenu) return;
            setDeleteTarget(rowMenu.row);
            closeRowMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <IconTrash size={18} />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {/* ── Single delete dialog ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete purchase?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.ref}</strong> will be permanently removed.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Batch delete dialog ── */}
      <Dialog open={batchDeleteOpen} onClose={() => !batchDeleting && setBatchDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delete {sel.selectedIds.size} {sel.selectedIds.size === 1 ? 'purchase' : 'purchases'}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            These purchases will be permanently removed. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchDeleteOpen(false)} disabled={batchDeleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBatchDelete} disabled={batchDeleting}>
            {batchDeleting ? 'Deleting…' : `Delete ${sel.selectedIds.size}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Single cancel dialog ── */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel purchase?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{cancelTarget?.ref}</strong> will be marked as cancelled.
            This may affect inventory reservations.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep</Button>
          <Button variant="contained" color="warning" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Batch cancel dialog ── */}
      <Dialog open={batchCancelOpen} onClose={() => !batchCancelling && setBatchCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Cancel {sel.selectedIds.size} {sel.selectedIds.size === 1 ? 'purchase' : 'purchases'}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            These purchases will be marked as cancelled. This may affect inventory reservations.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchCancelOpen(false)} disabled={batchCancelling}>Keep</Button>
          <Button variant="contained" color="warning" onClick={handleBatchCancel} disabled={batchCancelling}>
            {batchCancelling ? 'Cancelling…' : `Cancel ${sel.selectedIds.size}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Issue return dialog ── */}
      <IssuePurchaseReturnDialog
        open={!!returnTarget}
        purchase={returnTarget}
        onClose={() => setReturnTarget(null)}
        onSuccess={(ref) => {
          setNotice({ message: `Return ${ref} created. Stock removed from warehouse.`, severity: 'success' });
          setRefreshToken((n) => n + 1);
        }}
      />

      <BulkGenerateDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        referenceType="purchase"
        referenceIds={Array.from(sel.selectedIds)}
      />
    </Box>
  );
}
