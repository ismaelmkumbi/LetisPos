/**
 * Leave requests — per-employee history with approve/reject inline.
 * Pick an employee to load their requests; "New request" creates one.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';

import {
  cancelLeaveRequest, createLeaveRequest, decideLeaveRequest, listEmployees,
  listLeaveForEmployee, orgApi,
  type Employee, type LeaveRequest, type LeaveStatus, type LeaveType,
} from 'src/api/smartpos/hrm';
import PageHeader from 'src/components/smartpos/PageHeader';
import FilterBar, { type ActiveFilter } from 'src/components/smartpos/FilterBar';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand, brandGradients } from 'src/theme/smartpos/brand';

const STATUS_COLOURS: Record<LeaveStatus, { bg: string; fg: string }> = {
  PENDING:   { bg: brand.warning.light, fg: brand.warning.dark },
  APPROVED:  { bg: brand.success.light, fg: brand.success.dark },
  REJECTED:  { bg: brand.error.light,   fg: brand.error.dark },
  CANCELLED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

const inlineBtnSx = {
  minHeight: 32,
  fontWeight: 700,
  borderRadius: '8px',
  textTransform: 'none' as const,
  fontSize: '0.75rem',
  px: 1.25,
};

export default function LeaveRequestsPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [picked, setPicked] = useState<Employee | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const [newReq, setNewReq] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    listEmployees({ size: 200, status: 'ACTIVE' }).then((p) => setEmployees(p.content)).catch(() => {});
    orgApi.listLeaveTypes().then(setLeaveTypes).catch(() => {});
  }, [user?.tenantId]);

  useEffect(() => {
    if (!picked) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    listLeaveForEmployee(picked.id, 0, 50)
      .then((p) => !cancelled && setRows(p.content))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [picked, refreshToken, user?.tenantId]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const out: ActiveFilter[] = [];
    if (picked) out.push({ key: 'employee', label: `Employee: ${picked.firstName} ${picked.lastName ?? ''}`, clear: () => setPicked(null) });
    return out;
  }, [picked]);

  const cols: Column<LeaveRequest>[] = [
    {
      key: 'leaveTypeId', label: 'Type',
      render: (r) => leaveTypes.find((lt) => lt.id === r.leaveTypeId)?.name ?? r.leaveTypeId.slice(0, 8),
    },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate',   label: 'End' },
    { key: 'days',      label: 'Days', align: 'right', render: (r) => r.days.toString() },
    { key: 'reason',    label: 'Reason', render: (r) => r.reason ?? '—' },
    {
      key: 'status', label: 'Status', align: 'center',
      render: (r) => {
        const c = STATUS_COLOURS[r.status];
        return <Chip label={r.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />;
      },
    },
    {
      key: 'actions', label: '', align: 'right',
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {r.status === 'PENDING' && (
            <>
              <Button size="small" variant="outlined" sx={inlineBtnSx} onClick={async () => {
                try { await decideLeaveRequest(r.id, 'APPROVED', 'Approved'); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Approve failed'); }
              }}>Approve</Button>
              <Button size="small" variant="outlined" color="error" sx={inlineBtnSx} onClick={async () => {
                const note = window.prompt('Reason for rejection?') ?? 'Rejected';
                try { await decideLeaveRequest(r.id, 'REJECTED', note); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Reject failed'); }
              }}>Reject</Button>
              <Button size="small" sx={inlineBtnSx} onClick={async () => {
                try { await cancelLeaveRequest(r.id); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Cancel failed'); }
              }}>Cancel</Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  const handleCreate = async () => {
    if (!picked || !newReq.leaveTypeId || !newReq.startDate || !newReq.endDate) {
      setError('Pick an employee, leave type, and date range.');
      return;
    }
    try {
      await createLeaveRequest({
        employeeId: picked.id,
        leaveTypeId: newReq.leaveTypeId,
        startDate: newReq.startDate,
        endDate:   newReq.endDate,
        reason: newReq.reason || undefined,
      });
      setDialogOpen(false);
      setNewReq({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Leave requests"
        subtitle="Approve, reject, or cancel time-off requests"
        action={picked ? {
          label: 'New request',
          icon: <IconPlus size={18} />,
          onClick: () => setDialogOpen(true),
        } : undefined}
      />

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
        <Autocomplete
          sx={{ minWidth: 320 }}
          size="small"
          options={employees}
          value={picked}
          onChange={(_, v) => setPicked(v)}
          getOptionLabel={(e) => `${e.firstName} ${e.lastName ?? ''} (${e.code})`}
          renderInput={(p) => <TextField {...p} label="Employee" size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />}
        />
      </FilterBar>

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        getRowKey={(r) => r.id}
        emptyText={picked ? 'No leave requests' : 'Pick an employee to view requests'}
        tableKey="leave-requests"
        enableColumnVisibility
        enableExport
        exportFileName="leave-requests"
        toolbarTitle="Time-off requests"
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
        <DialogTitle>New leave request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select size="small" label="Leave type"
              value={newReq.leaveTypeId} onChange={(e) => setNewReq((s) => ({ ...s, leaveTypeId: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              {leaveTypes.map((lt) => <MenuItem key={lt.id} value={lt.id}>{lt.name}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField type="date" label="Start" size="small" fullWidth
                value={newReq.startDate} onChange={(e) => setNewReq((s) => ({ ...s, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
              <TextField type="date" label="End" size="small" fullWidth
                value={newReq.endDate} onChange={(e) => setNewReq((s) => ({ ...s, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Stack>
            <TextField label="Reason" size="small" multiline minRows={2}
              value={newReq.reason} onChange={(e) => setNewReq((s) => ({ ...s, reason: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: '8px', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            sx={{
              borderRadius: '8px',
              fontWeight: 700,
              background: brandGradients.cta,
              '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
            }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
