import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';

import {
  listEmployees, updateEmployee, type Employee, type EmployeeStatus,
} from 'src/api/smartpos/hrm';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import BulkActionBar from 'src/components/smartpos/BulkActionBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useSelection } from 'src/components/smartpos/useSelection';
import EmployeeEditDrawer from './EmployeeEditDrawer';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const STATUS_COLOURS: Record<EmployeeStatus, { bg: string; fg: string }> = {
  ACTIVE:     { bg: brand.success.light, fg: brand.success.dark },
  ON_LEAVE:   { bg: brand.warning.light, fg: brand.warning.dark },
  TERMINATED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

const fmt = formatMoney;

const actionBtnSx = {
  borderRadius: '8px',
  fontWeight: 700,
  textTransform: 'none' as const,
  fontSize: '0.75rem',
};

export default function EmployeesListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Employee[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmployeeStatus | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // ── Bulk selection ───────────────────────────────────────────────────────
  const sel = useSelection(rows);
  const [bulkTerminateOpen, setBulkTerminateOpen] = useState(false);

  const handleBulkTerminate = useCallback(async () => {
    const ids = Array.from(sel.selectedIds);
    try {
      await Promise.all(ids.map((id) => updateEmployee(id, { status: 'TERMINATED', endDate: new Date().toISOString().slice(0, 10) })));
      setRefreshToken((n) => n + 1);
      sel.clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk action failed');
    } finally {
      setBulkTerminateOpen(false);
    }
  }, [sel]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape' && tag === 'INPUT') (e.target as HTMLInputElement).blur();
        return;
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setEditing(null); setDrawerOpen(true);
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (sel.selectedIds.size > 0) sel.clearSelection();
        else if (search) { setSearch(''); setPage(0); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search, sel]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      listEmployees({ search, status: status || undefined, page, size: 20 })
        .then((p) => { if (!cancelled) { setRows(p.content); setTotalPages(p.totalPages || 1); setTotalElements(p.totalElements || 0); } })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [search, status, page, refreshToken, user?.tenantId]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (status) out.push({ key: 'status', label: `Status: ${status}`, clear: () => { setStatus(''); setPage(0); } });
    return out;
  }, [status]);

  const cols: Column<Employee>[] = useMemo(() => [
    sel.selectionColumn(),
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
        return <Chip label={e.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600, borderRadius: '6px' }} />;
      },
    },
  ], [sel]);

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Employees"
        subtitle="Workforce master list"
        action={{
          label: 'New employee',
          icon: <IconPlus size={18} />,
          onClick: () => { setEditing(null); setDrawerOpen(true); },
        }}
      />

      <FilterBar
        searchPlaceholder="Search by name or code…"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchAriaLabel="Search employees"
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={() => { setStatus(''); setPage(0); }}
        searchInputRef={searchRef}
      >
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value as EmployeeStatus | ''); setPage(0); }}
          sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }}
        >
          <MenuItem value="">All</MenuItem>
          {(['ACTIVE','ON_LEAVE','TERMINATED'] as EmployeeStatus[]).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </FilterBar>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Bulk action bar */}
      {sel.selectedIds.size > 0 && (
        <BulkActionBar selectedCount={sel.selectedIds.size} onClear={sel.clearSelection} itemLabel="employee">
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<IconTrash size={14} />}
            onClick={() => setBulkTerminateOpen(true)}
            sx={actionBtnSx}
          >
            Terminate
          </Button>
        </BulkActionBar>
      )}

      {!loading && totalElements === 0 && !search && !status && (
        <EmptyStateGuide
          title="No employees yet"
          subtitle="Add your first employee to start managing your workforce."
          icon={<IconUsers size={48} stroke={1.5} />}
          action={{ label: 'Add employee', onClick: () => { setEditing(null); setDrawerOpen(true); } }}
          onboardingStep="Step 2 of 5"
        />
      )}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
        onRowClick={(e) => { setEditing(e); setDrawerOpen(true); }}
        getRowKey={(e) => e.id}
        tableKey="employees"
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName="employees"
        toolbarTitle="Workforce"
      />

      <EmployeeEditDrawer
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); setRefreshToken((x) => x + 1); }}
      />

      <Dialog open={bulkTerminateOpen} onClose={() => setBulkTerminateOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
        <DialogTitle>Terminate {sel.selectedIds.size} employee{sel.selectedIds.size > 1 ? 's' : ''}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: brand.neutral[600] }}>
            This will set their status to TERMINATED and record today as their end date.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkTerminateOpen(false)} sx={{ borderRadius: '8px', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleBulkTerminate}
            sx={{ borderRadius: '8px', fontWeight: 700 }}>
            Terminate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
