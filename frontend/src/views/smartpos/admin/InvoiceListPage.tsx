import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconCheck, IconFileInvoice } from '@tabler/icons-react';

import { fetchTenants, type Tenant } from 'src/api/smartpos/auth';
import { listInvoices, type Invoice } from 'src/api/smartpos/billing';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import DataTable, { type Column, StatusBadge } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

/* ── helpers ── */

const INV_STATUS_TONES: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  PAID: 'success',
  PENDING: 'warning',
  OVERDUE: 'error',
  CANCELLED: 'neutral',
  FAILED: 'error',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTzs(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ── Page ── */

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const tenantMap = useMemo(() => {
    const map = new Map<string, Tenant>();
    tenants.forEach((t) => map.set(t.id, t));
    return map;
  }, [tenants]);

  const fetch = useCallback(() => {
    setLoading(true);
    // Fetch invoices for each tenant (admin view)
    Promise.all([
      fetchTenants(),
      // We'll gather invoices from all tenants
      (async () => {
        const allTenants = await fetchTenants();
        setTenants(allTenants);
        const results = await Promise.allSettled(
          allTenants.map((t) => listInvoices(t.id).catch(() => []))
        );
        const allInvoices: Invoice[] = [];
        results.forEach((r) => {
          if (r.status === 'fulfilled') {
            allInvoices.push(...r.value);
          }
        });
        return allInvoices.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })(),
    ])
      .then(([, invoiceList]) => {
        setInvoices(invoiceList);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load invoices');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  /* ── Filtered rows ── */

  const filtered = useMemo(() => {
    return invoices
      .filter((inv) => (statusFilter ? inv.status === statusFilter : true))
      .filter((inv) => {
        if (!search) return true;
        const s = search.toLowerCase();
        const t = tenantMap.get(inv.tenantId);
        return (
          inv.invoiceNumber.toLowerCase().includes(s) ||
          (t?.name.toLowerCase().includes(s) ?? false)
        );
      });
  }, [invoices, statusFilter, search, tenantMap]);

  /* ── Columns ── */

  const columns: Column<Invoice>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        label: 'Invoice #',
        width: 150,
        sortable: true,
        exportValue: (inv) => inv.invoiceNumber,
        render: (inv) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'monospace' }}
          >
            {inv.invoiceNumber}
          </Typography>
        ),
      },
      {
        key: 'tenantName',
        label: 'Tenant',
        width: 200,
        sortable: true,
        exportValue: (inv) => tenantMap.get(inv.tenantId)?.name ?? inv.tenantId,
        render: (inv) => {
          const t = tenantMap.get(inv.tenantId);
          return (
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
              {t?.name ?? inv.tenantId}
            </Typography>
          );
        },
      },
      {
        key: 'amountTzs',
        label: 'Amount',
        width: 130,
        align: 'right',
        sortable: true,
        exportValue: (inv) => String(inv.amountTzs),
        render: (inv) => (
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
            {formatTzs(inv.amountTzs)}
          </Typography>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 120,
        align: 'center',
        sortable: true,
        exportValue: (inv) => inv.status,
        render: (inv) => (
          <StatusBadge label={inv.status} tone={INV_STATUS_TONES[inv.status] ?? 'neutral'} />
        ),
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        width: 130,
        sortable: true,
        exportValue: (inv) => inv.dueDate,
        render: (inv) => (
          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: brand.neutral[500] }}>
            {formatDate(inv.dueDate)}
          </Typography>
        ),
      },
      {
        key: 'actions',
        label: '',
        width: 50,
        align: 'right',
        enableHiding: false,
        render: (inv) =>
          inv.status === 'PENDING' ? (
            <Tooltip title="Mark as Paid">
              <IconButton
                size="small"
                sx={{ color: brand.success.main }}
              >
                <IconCheck size={16} />
              </IconButton>
            </Tooltip>
          ) : null,
      },
    ],
    [tenantMap],
  );

  return (
    <Box>
      <PageHeader
        title="All Invoices"
        subtitle="Complete invoice history across all tenants"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Filters */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="PAID">Paid</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="OVERDUE">Overdue</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Search invoice # or tenant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        {(statusFilter || search) && (
          <Button
            size="small"
            onClick={() => {
              setStatusFilter('');
              setSearch('');
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyText="No invoices found"
        emptyIcon={<IconFileInvoice size={32} />}
        getRowKey={(inv) => inv.id}
        tableKey="admin-invoices"
        toolbarTitle={filtered.length > 0 ? `${filtered.length} invoice${filtered.length !== 1 ? 's' : ''}` : undefined}
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName={`all-invoices-${new Date().toISOString().slice(0, 10)}`}
      />
    </Box>
  );
}
