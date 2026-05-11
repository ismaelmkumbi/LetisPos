import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconClock, IconTrash, IconPlayerPlay, IconEye } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  listSuspendedSales, resumeSuspendedSale, deleteSuspendedSale,
  purgeExpiredSuspendedSales,
  type SuspendedSale,
} from 'src/api/smartpos/sales';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import FilterBar from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import EditDrawer from 'src/components/smartpos/EditDrawer';
import { useSelection } from 'src/components/smartpos/useSelection';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;
const PAGE_SIZE = 20;

const RESUME_CART_KEY = 'smartpos.pos.resumeCart';

export default function SuspendedSalesPage() {
  const { t } = useTranslation('smartpos');
  const nav = useNavigate();
  const [rows, setRows] = useState<SuspendedSale[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const sel = useSelection(rows);

  const [detailTarget, setDetailTarget] = useState<SuspendedSale | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSuspendedSales({ search: search || undefined, page, size: PAGE_SIZE })
      .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, page, refreshToken]);

  const handleResume = async (s: SuspendedSale) => {
    try {
      const resumed = await resumeSuspendedSale(s.id);
      localStorage.setItem(RESUME_CART_KEY, resumed.lines);
      nav('/smartpos/sales/pos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSuspendedSale(id);
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleBatchDelete = async () => {
    try {
      await Promise.all(Array.from(sel.selectedIds).map((id) => deleteSuspendedSale(id)));
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch delete failed');
    }
  };

  const openCount = rows.filter((r) => r.status === 'OPEN').length;

  const columns: Column<SuspendedSale>[] = useMemo(() => [
    sel.selectionColumn(),
    {
      key: '_num', label: '#', width: 48, align: 'center', enableHiding: false, sortable: false,
      render: (_, i) => (
        <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: brand.neutral[400], fontFamily: "'DM Mono', 'Courier New', monospace" }}>
          {page * PAGE_SIZE + i + 1}
        </Typography>
      ),
    },
    {
      key: 'ref', label: 'Hold Ref', width: 160,
      render: (s) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.8rem', color: brand.neutral[800] }}>
          {s.ref}
        </Typography>
      ),
    },
    { key: 'totalItems', label: 'Items', width: 70, align: 'center', render: (s) => s.totalItems },
    {
      key: 'grandTotal', label: 'Total', width: 120, align: 'right',
      render: (s) => (
        <Typography sx={{ fontWeight: 700, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.82rem' }}>
          {fmt(s.grandTotal)}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', width: 100, align: 'center',
      render: (s) => (
        <Chip
          label={s.status}
          size="small"
          sx={{
            height: 22, fontWeight: 700, fontSize: '0.65rem',
            bgcolor: s.status === 'OPEN' ? brand.primary[50] : brand.neutral[100],
            color: s.status === 'OPEN' ? brand.primary[700] : brand.neutral[500],
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'createdAt', label: 'Created', width: 140,
      render: (s) => new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    },
    {
      key: 'expiresAt', label: 'Expires', width: 140,
      render: (s) => {
        const exp = new Date(s.expiresAt);
        const overdue = exp < new Date();
        return (
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
              {exp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Typography>
            {overdue && (
              <Typography variant="caption" sx={{ color: brand.operational.critical.text, fontWeight: 600 }}>
                Expired
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'actions', label: '', align: 'right', width: 200, enableHiding: false,
      render: (s) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Button size="small" startIcon={<IconPlayerPlay size={14} />}
            onClick={() => handleResume(s)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            Resume
          </Button>
          <Button size="small" startIcon={<IconEye size={14} />}
            onClick={() => setDetailTarget(s)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            View
          </Button>
          <Button size="small" color="error" startIcon={<IconTrash size={14} />}
            onClick={() => handleDelete(s.id)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
            Discard
          </Button>
        </Stack>
      ),
    },
  ], [page, sel]);

  return (
    <Box>
      <PageHeader
        title="Suspended Sales"
        subtitle="Carts on hold from POS terminals. Resume from any terminal."
        badge={openCount > 0 ? { label: `${openCount} open`, tone: 'info' } : undefined}
        actions={[
          { label: 'Purge expired', icon: <IconTrash size={18} />,
            onClick: async () => { await purgeExpiredSuspendedSales(); setRefreshToken((n) => n + 1); }
          },
        ]}
      />
      <FilterBar
        searchPlaceholder="Search by hold ref…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        activeFilters={search ? [{ key: 'search', label: `Search: ${search}`, clear: () => { setSearch(''); setPage(0); } }] : []}
        onClearAll={() => { setSearch(''); setPage(0); }}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {sel.selectedIds.size > 0 && (
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="hold">
          <Button size="small" variant="outlined" color="error" startIcon={<IconTrash size={14} />} onClick={handleBatchDelete}>
            Discard selected
          </Button>
        </BulkActionBar>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(s) => s.id}
        emptyText="No suspended sales"
        enableExport
        exportFileName="suspended-sales"
        toolbarTitle="Suspended sales"
      />
      <EditDrawer
        open={!!detailTarget}
        title={detailTarget ? `Hold ${detailTarget.ref}` : ''}
        subtitle={detailTarget ? new Date(detailTarget.createdAt).toLocaleString() : ''}
        onClose={() => setDetailTarget(null)}
      >
        {detailTarget && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>Items: {detailTarget.totalItems}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>Total: {fmt(detailTarget.grandTotal)}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>Status: {detailTarget.status}</Typography>
            <Typography variant="body2">Expires: {new Date(detailTarget.expiresAt).toLocaleString()}</Typography>
          </Box>
        )}
      </EditDrawer>
    </Box>
  );
}
