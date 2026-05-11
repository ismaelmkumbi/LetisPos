import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Grid, IconButton,
  InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import {
  IconPlus, IconSearch, IconMail, IconPhone, IconFileStack, IconTrash,
  IconUsers, IconUserCheck, IconCash, IconReceipt,
} from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import { deleteCustomer, listCustomers } from 'src/api/smartpos/customers';
import type { Customer } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import BulkGenerateDialog from 'src/components/smartpos/documents/BulkGenerateDialog';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import { useSelection } from 'src/components/smartpos/useSelection';
import CustomerEditDrawer from './CustomerEditDrawer';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

type StatusFilter = 'all' | 'active' | 'inactive';

/** Small stat card rendered above the table */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: `1px solid ${brand.neutral[200]}` }}>
      <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{
            p: 1, borderRadius: 2,
            bgcolor: brand.accent[50], color: brand.accent[600],
            display: 'flex', lineHeight: 0,
          }}>
            {icon}
          </Box>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function CustomersListPage() {
  const { t } = useTranslation('smartpos');
  const { user } = useAuth();
  const [rows, setRows] = useState<Customer[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- filters ---
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState('');
  const [creditMin, setCreditMin] = useState<number | ''>('');
  const [creditMax, setCreditMax] = useState<number | ''>('');

  // --- delete confirmation ---
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sel = useSelection(rows);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      setLoading(true);
      listCustomers({
        search,
        page,
        size: 20,
        sort: 'name,asc',
        active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        country: countryFilter || undefined,
        creditMin: creditMin !== '' ? creditMin : undefined,
        creditMax: creditMax !== '' ? creditMax : undefined,
      })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [search, page, refreshToken, user?.tenantId, statusFilter, countryFilter, creditMin, creditMax]);

  // --- client-side stats from current page ---
  const stats = useMemo(() => {
    const total = rows.length;
    const activeCount = rows.filter((c) => c.active).length;
    const totalCredit = rows.reduce((sum, c) => sum + (c.creditLimit ?? 0), 0);
    const avgCredit = total > 0 ? totalCredit / total : 0;
    return { total, activeCount, totalCredit, avgCredit };
  }, [rows]);

  // --- delete handler ---
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshToken((n) => n + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Customer>[] = [
    sel.selectionColumn(),
    {
      key: 'name', label: 'Customer',
      render: (c) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{
            bgcolor: brand.accent[50], color: brand.accent[700],
            width: 36, height: 36, fontSize: 14, fontWeight: 700,
          }}>
            {c.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
            {c.code && (
              <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{c.code}</Typography>
            )}
          </Box>
        </Stack>
      ),
    },
    {
      key: 'contact', label: 'Contact',
      render: (c) => (
        <Stack spacing={0.25}>
          {c.email && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconMail size={14} color={brand.neutral[500]} />
              <Typography variant="caption">{c.email}</Typography>
            </Stack>
          )}
          {c.phone && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconPhone size={14} color={brand.neutral[500]} />
              <Typography variant="caption">{c.phone}</Typography>
            </Stack>
          )}
          {!c.email && !c.phone && <Typography variant="caption" sx={{ color: brand.neutral[400] }}>—</Typography>}
        </Stack>
      ),
    },
    {
      key: 'location', label: 'Location',
      render: (c) => (
        <Typography variant="body2">
          {[c.city, c.country].filter(Boolean).join(', ') || '—'}
        </Typography>
      ),
    },
    {
      key: 'creditLimit', label: 'Credit limit', align: 'right',
      render: (c) => fmt(c.creditLimit),
    },
    {
      key: 'active', label: 'Status', align: 'center',
      render: (c) => (
        <Chip
          label={c.active ? 'Active' : 'Inactive'}
          size="small"
          sx={{
            bgcolor: c.active ? brand.success.light : brand.neutral[100],
            color:   c.active ? brand.success.dark  : brand.neutral[600],
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right' as const,
      width: 140,
      enableHiding: false,
      render: (c) => (
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end"
          onClick={(e) => e.stopPropagation()}>
          <DocumentActionsBar documentType="customer-statement" referenceType="customer" referenceId={c.id} />
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
            sx={{ color: brand.neutral[400], '&:hover': { color: brand.error.main } }}
          >
            <IconTrash size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  // --- empty state ---
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title={t('nav.customers')}
        subtitle={t('common.search') + ' / credit limits / contact'}
        action={{
          label: t('common.new') + ' ' + t('nav.customers').toLowerCase(),
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      {/* ---- Search + Filter bar ---- */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ maxWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} color={brand.neutral[500]} />
              </InputAdornment>
            ),
          }}
        />

        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          size="small"
          onChange={(_, v) => { if (v !== null) { setStatusFilter(v); setPage(0); } }}
          sx={{ '& .MuiToggleButton-root': { px: 2, textTransform: 'none', fontWeight: 600 } }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="inactive">Inactive</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          size="small"
          label="Country"
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); setPage(0); }}
          sx={{ width: 140 }}
        />

        <TextField
          size="small"
          label="Credit min"
          type="number"
          value={creditMin}
          onChange={(e) => { setCreditMin(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ width: 130 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">TZS</InputAdornment>,
          }}
        />

        <TextField
          size="small"
          label="Credit max"
          type="number"
          value={creditMax}
          onChange={(e) => { setCreditMax(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ width: 130 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">TZS</InputAdornment>,
          }}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ---- Stat cards ---- */}
      {!loading && !error && rows.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard icon={<IconUsers size={20} />} label="Total Customers" value={stats.total.toLocaleString()} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard icon={<IconUserCheck size={20} />} label="Active Customers" value={stats.activeCount.toLocaleString()} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard icon={<IconCash size={20} />} label="Total Credit Extended" value={fmt(stats.totalCredit)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard icon={<IconReceipt size={20} />} label="Avg Credit Limit" value={fmt(stats.avgCredit)} />
          </Grid>
        </Grid>
      )}

      {/* Bulk action bar */}
      {sel.selectedIds.size > 0 && (
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="customer">
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconFileStack size={14} />}
            onClick={() => setBulkOpen(true)}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          >
            Bulk Generate
          </Button>
        </BulkActionBar>
      )}

      {/* ---- Table or empty state ---- */}
      {showEmpty ? (
        <Box sx={{
          textAlign: 'center', py: 8, px: 2,
          border: `1px dashed ${brand.neutral[300]}`,
          borderRadius: 3,
          bgcolor: brand.neutral[50],
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: brand.neutral[600] }}>
            No customers yet
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[500], mb: 3, maxWidth: 400, mx: 'auto' }}>
            Start building your customer directory. Add your first customer to track sales, credit limits, and statements.
          </Typography>
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => { setEditing(null); setDrawerOpen(true); }}
            sx={{
              bgcolor: brand.accent[500],
              '&:hover': { bgcolor: brand.accent[600] },
              fontWeight: 700,
              borderRadius: '10px',
              px: 3,
            }}
          >
            Add Customer
          </Button>
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          emptyText="No customers match your filters."
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          getRowKey={(c) => c.id}
          onRowClick={(c) => { setEditing(c); setDrawerOpen(true); }}
          tableKey="customers"
          enableSorting
          enableColumnVisibility
          enableExport
          exportFileName="customers"
          toolbarTitle="Customer directory"
        />
      )}

      <CustomerEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setRefreshToken((n) => n + 1)}
      />

      <BulkGenerateDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        referenceType="customer"
        referenceIds={Array.from(sel.selectedIds)}
      />

      {/* ---- Delete confirmation dialog ---- */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Customer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            sx={{ fontWeight: 700 }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
