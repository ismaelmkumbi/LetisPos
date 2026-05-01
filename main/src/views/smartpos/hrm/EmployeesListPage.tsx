import { useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconSearch } from '@tabler/icons-react';

import {
  listEmployees, type Employee, type EmployeeStatus,
} from 'src/api/smartpos/hrm';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import EmployeeEditDrawer from './EmployeeEditDrawer';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const STATUS_COLOURS: Record<EmployeeStatus, { bg: string; fg: string }> = {
  ACTIVE:     { bg: brand.success.light, fg: brand.success.dark },
  ON_LEAVE:   { bg: brand.warning.light, fg: brand.warning.dark },
  TERMINATED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

const fmt = formatMoney;

export default function EmployeesListPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmployeeStatus | ''>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      listEmployees({ search, status: status || undefined, page, size: 20 })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); } })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [search, status, page, refreshToken]);

  const cols: Column<Employee>[] = [
    {
      key: 'name', label: 'Employee',
      render: (e) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={e.imageUrl ?? undefined}
            sx={{ bgcolor: brand.primary[50], color: brand.primary[700], width: 36, height: 36, fontWeight: 700 }}
          >
            {e.firstName.charAt(0)}{e.lastName?.charAt(0) ?? ''}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {e.firstName} {e.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500] }} noWrap>
              {e.code}{e.email ? ` · ${e.email}` : ''}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    { key: 'phone', label: 'Phone', render: (e) => e.phone ?? '—' },
    { key: 'hireDate', label: 'Hired', render: (e) => e.hireDate },
    {
      key: 'baseSalary', label: 'Base salary', align: 'right',
      render: (e) => fmt(e.baseSalary, e.salaryCurrency),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (e) => {
        const c = STATUS_COLOURS[e.status];
        return <Chip label={e.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Workforce master list"
        action={{
          label: 'New employee',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small" placeholder="Search by name or code…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <IconSearch size={18} style={{ marginRight: 6 }} /> }}
        />
        <TextField
          select size="small" label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value as EmployeeStatus | ''); setPage(0); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {(['ACTIVE','ON_LEAVE','TERMINATED'] as EmployeeStatus[]).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(e) => { setEditing(e); setDrawerOpen(true); }}
        getRowKey={(e) => e.id}
      />

      <EmployeeEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />
    </>
  );
}
