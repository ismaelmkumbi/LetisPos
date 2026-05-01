import { useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Chip, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconSearch, IconMail, IconPhone } from '@tabler/icons-react';

import { useTranslation } from 'react-i18next';

import { listCustomers } from 'src/api/smartpos/customers';
import type { Customer } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import CustomerEditDrawer from './CustomerEditDrawer';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function CustomersListPage() {
  const { t } = useTranslation('smartpos');
  const [rows, setRows] = useState<Customer[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  }, [search, page, refreshToken]);

  const columns: Column<Customer>[] = [
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
  ];

  return (
    <Box>
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
      />

      <CustomerEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setRefreshToken((n) => n + 1)}
      />
    </Box>
  );
}
