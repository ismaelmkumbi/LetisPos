/**
 * Attendance — daily roster with quick check-in / check-out and a date-range view.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, Stack, TextField,
} from '@mui/material';
import { IconLogin, IconLogout } from '@tabler/icons-react';

import {
  checkIn, checkOut, listAttendanceByDate, listEmployees,
  type Attendance, type AttendanceStatus, type Employee,
} from 'src/api/smartpos/hrm';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand, brandGradients } from 'src/theme/smartpos/brand';

const STATUS_COLOURS: Record<AttendanceStatus, { bg: string; fg: string }> = {
  PRESENT:   { bg: brand.success.light, fg: brand.success.dark },
  ABSENT:    { bg: brand.error.light,   fg: brand.error.dark },
  LATE:      { bg: brand.warning.light, fg: brand.warning.dark },
  HALF_DAY:  { bg: brand.warning.light, fg: brand.warning.dark },
  LEAVE:     { bg: brand.info.light,    fg: brand.info.dark },
  HOLIDAY:   { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const actionBtnSx = {
  minHeight: 36,
  fontWeight: 700,
  borderRadius: '8px',
  textTransform: 'none' as const,
  px: 2,
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(todayIso());
  const [to, setTo]     = useState(todayIso());
  const [rows, setRows] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [picked, setPicked] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    listEmployees({ size: 200, status: 'ACTIVE' }).then((p) => setEmployees(p.content)).catch(() => {});
  }, [user?.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAttendanceByDate(from, to)
      .then((items) => !cancelled && setRows(items))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [from, to, refreshToken, user?.tenantId]);

  const handleCheckIn = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await checkIn(picked.id);
      setRefreshToken((x) => x + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Check-in failed'); }
    finally { setBusy(false); }
  };
  const handleCheckOut = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await checkOut(picked.id);
      setRefreshToken((x) => x + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Check-out failed'); }
    finally { setBusy(false); }
  };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (picked) out.push({ key: 'employee', label: `Employee: ${picked.firstName} ${picked.lastName ?? ''}`, clear: () => setPicked(null) });
    return out;
  }, [picked]);

  const cols: Column<Attendance>[] = [
    {
      key: 'employee', label: 'Employee',
      render: (a) => {
        const emp = employees.find((e) => e.id === a.employeeId);
        return emp ? `${emp.firstName} ${emp.lastName ?? ''} (${emp.code})` : a.employeeId.slice(0, 8) + '…';
      },
    },
    { key: 'workDate', label: 'Date' },
    { key: 'checkIn',  label: 'In',  render: (a) => a.checkIn  ? new Date(a.checkIn).toLocaleTimeString()  : '—' },
    { key: 'checkOut', label: 'Out', render: (a) => a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—' },
    { key: 'hoursWorked', label: 'Hours', align: 'right', render: (a) => a.hoursWorked != null ? a.hoursWorked.toFixed(2) : '—' },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (a) => {
        const c = STATUS_COLOURS[a.status];
        return <Chip label={a.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader title="Attendance" subtitle="Daily check-in / check-out and roster" />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <FilterBar
        searchPlaceholder=""
        searchValue=""
        onSearchChange={() => {}}
        searchAriaLabel=""
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
        activeFilters={activeFilters}
        onClearAll={() => setPicked(null)}
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField size="small" type="date" label="From" value={from}
            onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }} />
          <TextField size="small" type="date" label="To" value={to}
            onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 42 } }} />

          <Autocomplete
            sx={{ minWidth: 280 }}
            size="small"
            options={employees}
            value={picked}
            onChange={(_, v) => setPicked(v)}
            getOptionLabel={(e) => `${e.firstName} ${e.lastName ?? ''} (${e.code})`}
            renderInput={(p) => <TextField {...p} label="Employee" size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />}
          />

          <Button variant="outlined" startIcon={<IconLogin size={16} />}
            disabled={!picked || busy} onClick={handleCheckIn}
            sx={actionBtnSx}>Check in</Button>
          <Button variant="contained" startIcon={<IconLogout size={16} />}
            disabled={!picked || busy} onClick={handleCheckOut}
            sx={{
              ...actionBtnSx,
              background: brandGradients.cta,
              boxShadow: `0 8px 20px -12px ${brand.primary[700]}`,
              '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
            }}>
            Check out
          </Button>
        </Stack>
      </FilterBar>

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        getRowKey={(a) => a.id}
        emptyText="No attendance for this date range"
        tableKey="attendance"
        enableColumnVisibility
        enableExport
        exportFileName="attendance"
        toolbarTitle="Daily roster"
      />
    </Box>
  );
}
