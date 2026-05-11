import { useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconSearch, IconMail, IconPhone, IconFileStack } from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import { listCustomers } from 'src/api/smartpos/customers';
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

  const sel = useSelection(rows);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listCustomers({ search, page, size: 20, sort: 'name,asc' })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search, page, refreshToken, user?.tenantId]);

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
      width: 120,
      enableHiding: false,
      render: (c) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <DocumentActionsBar documentType="customer-statement" referenceType="customer" referenceId={c.id} />
        </Box>
      ),
    },
  ];

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

      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, email, or phone…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        sx={{ mb: 2, maxWidth: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconSearch size={18} color={brand.neutral[500]} />
            </InputAdornment>
          ),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No customers yet."
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
    </Box>
  );
}
