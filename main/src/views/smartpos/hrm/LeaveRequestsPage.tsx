/**
 * Leave requests — per-employee history with approve/reject inline.
 * Pick an employee to load their requests; "New request" creates one.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';

import {
  cancelLeaveRequest, createLeaveRequest, decideLeaveRequest, listEmployees,
  listLeaveForEmployee, orgApi,
  type Employee, type LeaveRequest, type LeaveStatus, type LeaveType,
} from 'src/api/smartpos/hrm';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';

const STATUS_COLOURS: Record<LeaveStatus, { bg: string; fg: string }> = {
  PENDING:   { bg: brand.warning.light, fg: brand.warning.dark },
  APPROVED:  { bg: brand.success.light, fg: brand.success.dark },
  REJECTED:  { bg: brand.error.light,   fg: brand.error.dark },
  CANCELLED: { bg: brand.neutral[100],  fg: brand.neutral[500] },
};

export default function LeaveRequestsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [picked, setPicked] = useState<Employee | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const [newReq, setNewReq] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    listEmployees({ size: 200, status: 'ACTIVE' }).then((p) => setEmployees(p.content)).catch(() => {});
    orgApi.listLeaveTypes().then(setLeaveTypes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!picked) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    listLeaveForEmployee(picked.id, 0, 50)
      .then((p) => !cancelled && setRows(p.content))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [picked, refreshToken]);

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
              <Button size="small" variant="outlined" onClick={async () => {
                try { await decideLeaveRequest(r.id, 'APPROVED', 'Approved'); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Approve failed'); }
              }}>Approve</Button>
              <Button size="small" variant="outlined" color="error" onClick={async () => {
                const note = window.prompt('Reason for rejection?') ?? 'Rejected';
                try { await decideLeaveRequest(r.id, 'REJECTED', note); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Reject failed'); }
              }}>Reject</Button>
              <Button size="small" onClick={async () => {
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
    <>
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

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Autocomplete
          sx={{ minWidth: 320 }}
          size="small"
          options={employees}
          value={picked}
          onChange={(_, v) => setPicked(v)}
          getOptionLabel={(e) => `${e.firstName} ${e.lastName ?? ''} (${e.code})`}
          renderInput={(p) => <TextField {...p} label="Employee" size="small" />}
        />
      </Stack>

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        getRowKey={(r) => r.id}
        emptyText={picked ? 'No leave requests' : 'Pick an employee to view requests'}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New leave request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select size="small" label="Leave type"
              value={newReq.leaveTypeId} onChange={(e) => setNewReq((s) => ({ ...s, leaveTypeId: e.target.value }))}>
              {leaveTypes.map((lt) => <MenuItem key={lt.id} value={lt.id}>{lt.name}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField type="date" label="Start" size="small" fullWidth
                value={newReq.startDate} onChange={(e) => setNewReq((s) => ({ ...s, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
              <TextField type="date" label="End" size="small" fullWidth
                value={newReq.endDate} onChange={(e) => setNewReq((s) => ({ ...s, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField label="Reason" size="small" multiline minRows={2}
              value={newReq.reason} onChange={(e) => setNewReq((s) => ({ ...s, reason: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
