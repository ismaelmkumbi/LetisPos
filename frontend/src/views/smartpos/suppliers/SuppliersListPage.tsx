import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { IconPlus, IconMail, IconPhone, IconUser, IconCurrencyDollar } from '@tabler/icons-react';

import { listSuppliers, toggleSupplierActive } from 'src/api/smartpos/suppliers';
import type { Supplier } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import SupplierEditDrawer from './SupplierEditDrawer';
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function SuppliersListPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listSuppliers({
        search: search || undefined,
        active: activeFilter ? activeFilter === 'true' : undefined,
        page,
        size: 20,
        sort: 'name,asc',
      })
        .then((p) => {
          if (!cancelled) {
            setRows(p.content);
            setTotalPages(p.totalPages || 1);
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
      clearTimeout(t);
    };
  }, [search, activeFilter, page, refreshToken, user?.tenantId]);

  const refresh = () => setRefreshToken((n) => n + 1);

  const handleToggleActive = async (s: Supplier) => {
    try {
      await toggleSupplierActive(s.id);
      refresh();
    } catch {
      /* swallow */
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((s) => s.active).length;
    const totalBalance = rows.reduce((sum, s) => sum + (s.balance ?? 0), 0);
    return { total, active, totalBalance };
  }, [rows]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (activeFilter)
      out.push({
        key: 'active',
        label: `Status: ${activeFilter === 'true' ? 'Active' : 'Inactive'}`,
        clear: () => {
          setActiveFilter('');
          setPage(0);
        },
      });
    return out;
  }, [activeFilter]);

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      label: 'Supplier',
      render: (s) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              bgcolor: brand.primary[50],
              color: brand.primary[700],
              width: 36,
              height: 36,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {s.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {s.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {s.code && (
                <Typography
                  variant="caption"
                  sx={{ color: brand.neutral[500], fontFamily: 'monospace' }}
                >
                  {s.code}
                </Typography>
              )}
              {s.contactPerson && (
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <IconUser size={11} color={brand.neutral[400]} />
                  <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                    {s.contactPerson}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (s) => (
        <Stack spacing={0.25}>
          {s.email && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconMail size={14} color={brand.neutral[500]} />
              <Typography variant="caption">{s.email}</Typography>
            </Stack>
          )}
          {s.phone && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconPhone size={14} color={brand.neutral[500]} />
              <Typography variant="caption">{s.phone}</Typography>
            </Stack>
          )}
          {!s.email && !s.phone && (
            <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
              —
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (s) => (
        <Typography variant="body2">
          {[s.city, s.country].filter(Boolean).join(', ') || '—'}
        </Typography>
      ),
    },
    {
      key: 'terms',
      label: 'Terms',
      render: (s) => (
        <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
          {s.paymentTermDays ? `Net ${s.paymentTermDays}d` : '—'}
        </Typography>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: (s) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: (s.balance ?? 0) > 0 ? brand.error.dark : brand.neutral[600],
          }}
        >
          {s.balance != null ? fmt(s.balance) : '—'}
        </Typography>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      align: 'center',
      render: (s) => (
        <Chip
          label={s.active ? 'Active' : 'Inactive'}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(s);
          }}
          sx={{
            bgcolor: s.active ? brand.success.light : brand.neutral[100],
            color: s.active ? brand.success.dark : brand.neutral[600],
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '6px',
          }}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      render: (s) => (
        <DocumentActionsBar documentType="supplier-rfq" referenceType="supplier" referenceId={s.id} />
      ),
    },
  ];

  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
  }) => (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${brand.neutral[200]}`,
        borderRadius: 3,
        px: 2.5,
        py: 1.5,
        flex: 1,
        minWidth: 150,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Suppliers"
        subtitle="Vendors you procure from"
        action={{
          label: 'New supplier',
          icon: <IconPlus size={18} />,
          onClick: () => {
            setEditing(null);
            setDrawerOpen(true);
          },
        }}
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <StatCard
          icon={<IconUser size={18} color={brand.primary[600]} />}
          label="Total suppliers"
          value={stats.total}
          color={brand.primary[600]}
        />
        <StatCard
          icon={<IconUser size={18} color={brand.success.main} />}
          label="Active"
          value={stats.active}
          color={brand.success.main}
        />
        <StatCard
          icon={<IconCurrencyDollar size={18} color={brand.error.main} />}
          label="Total payable"
          value={fmt(stats.totalBalance)}
          color={brand.error.main}
        />
      </Stack>

      <FilterBar
        searchPlaceholder="Search by name, code, or email…"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        searchAriaLabel="Search suppliers"
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={() => {
          setActiveFilter('');
          setPage(0);
        }}
      >
        <TextField
          select
          size="small"
          value={activeFilter}
          label="Status"
          onChange={(e) => {
            setActiveFilter(e.target.value as '' | 'true' | 'false');
            setPage(0);
          }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>
      </FilterBar>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="No suppliers yet."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        getRowKey={(s) => s.id}
        onRowClick={(s) => nav(`/smartpos/suppliers/${s.id}`)}
        tableKey="suppliers"
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName="suppliers"
        toolbarTitle="Supplier directory"
      />
      <SupplierEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => refresh()}
      />
    </Box>
  );
}
