/**
 * Payroll runs — list + lifecycle (Draft → Approved → Paid).
 * The "New run" dialog seeds lines from active employees' base salaries.
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { IconChevronDown, IconChevronRight, IconPlus } from '@tabler/icons-react';

import {
  approvePayroll, createPayroll, listEmployees, listPayrolls, payPayroll,
  type Employee, type PayrollRun, type PayrollStatus,
} from 'src/api/smartpos/hrm';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const STATUS_COLOURS: Record<PayrollStatus, { bg: string; fg: string }> = {
  DRAFT:    { bg: brand.warning.light, fg: brand.warning.dark },
  APPROVED: { bg: brand.info.light,    fg: brand.info.dark },
  PAID:     { bg: brand.success.light, fg: brand.success.dark },
};

const fmt = formatMoney;

export default function PayrollPage() {
  const [rows, setRows] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRun, setNewRun] = useState({ ref: '', periodStart: '', periodEnd: '', notes: '' });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listPayrolls(), listEmployees({ size: 200, status: 'ACTIVE' })])
      .then(([runs, emps]) => {
        if (cancelled) return;
        setRows(runs);
        setEmployees(emps.content);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [refreshToken]);

  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName ?? ''} (${e.code})` : id.slice(0, 8) + '…';
  };

  const handleCreate = async () => {
    if (!newRun.ref.trim() || !newRun.periodStart || !newRun.periodEnd) {
      setError('Ref, period start and end are required.');
      return;
    }
    try {
      await createPayroll({
        ref: newRun.ref,
        periodStart: newRun.periodStart,
        periodEnd: newRun.periodEnd,
        notes: newRun.notes || undefined,
        // Seed lines from active employees' base salary; user can edit per row later.
        lines: employees.map((e) => ({ employeeId: e.id, baseSalary: e.baseSalary })),
      });
      setDialogOpen(false);
      setNewRun({ ref: '', periodStart: '', periodEnd: '', notes: '' });
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const toggle = (id: string) =>
    setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      <PageHeader
        title="Payroll runs"
        subtitle="Draft → Approved → Paid"
        action={{
          label: 'New run',
          icon: <IconPlus size={18} />,
          onClick: () => setDialogOpen(true),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {loading && <Typography variant="caption">Loading…</Typography>}

      <Stack spacing={2}>
        {rows.map((run) => {
          const c = STATUS_COLOURS[run.status];
          const expanded = open.has(run.id);
          return (
            <Stack key={run.id} sx={{
              border: `1px solid ${brand.neutral[200]}`, borderRadius: 3, overflow: 'hidden',
            }}>
              <Stack direction="row" alignItems="center" spacing={2}
                sx={{ px: 2, py: 1.5, bgcolor: brand.neutral[50], cursor: 'pointer' }}
                onClick={() => toggle(run.id)}>
                <IconButton size="small">
                  {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </IconButton>
                <Stack direction="row" spacing={3} alignItems="center" sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{run.ref}</Typography>
                  <Typography variant="body2">{run.periodStart} — {run.periodEnd}</Typography>
                  <Chip label={run.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />
                  <Typography variant="body2" sx={{ ml: 'auto', color: brand.neutral[600] }}>
                    Gross {fmt(run.totalGross)} · Net {fmt(run.totalNet)}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                  {run.status === 'DRAFT' && (
                    <Button size="small" variant="outlined" onClick={async () => {
                      try { await approvePayroll(run.id); setRefreshToken((x) => x + 1); }
                      catch (e) { setError(e instanceof Error ? e.message : 'Approve failed'); }
                    }}>Approve</Button>
                  )}
                  {run.status === 'APPROVED' && (
                    <Button size="small" variant="contained" onClick={async () => {
                      try { await payPayroll(run.id); setRefreshToken((x) => x + 1); }
                      catch (e) { setError(e instanceof Error ? e.message : 'Pay failed'); }
                    }} sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] } }}>
                      Pay
                    </Button>
                  )}
                </Stack>
              </Stack>
              {expanded && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell>
                      <TableCell align="right">Base</TableCell>
                      <TableCell align="right">Allowances</TableCell>
                      <TableCell align="right">Overtime</TableCell>
                      <TableCell align="right">Deductions</TableCell>
                      <TableCell align="right">Tax</TableCell>
                      <TableCell align="right">Net</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {run.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{empName(l.employeeId)}</TableCell>
                        <TableCell align="right">{fmt(l.baseSalary)}</TableCell>
                        <TableCell align="right">{fmt(l.allowances)}</TableCell>
                        <TableCell align="right">{fmt(l.overtime)}</TableCell>
                        <TableCell align="right">{fmt(l.deductions)}</TableCell>
                        <TableCell align="right">{fmt(l.tax)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(l.netPay)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          );
        })}
        {!loading && rows.length === 0 && (
          <Typography variant="body2" sx={{ color: brand.neutral[500] }}>No payroll runs yet.</Typography>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New payroll run</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Ref" size="small" value={newRun.ref}
              onChange={(e) => setNewRun((s) => ({ ...s, ref: e.target.value }))} />
            <Stack direction="row" spacing={2}>
              <TextField type="date" label="Period start" size="small" fullWidth
                value={newRun.periodStart} onChange={(e) => setNewRun((s) => ({ ...s, periodStart: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
              <TextField type="date" label="Period end" size="small" fullWidth
                value={newRun.periodEnd} onChange={(e) => setNewRun((s) => ({ ...s, periodEnd: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField label="Notes" size="small" multiline minRows={2}
              value={newRun.notes} onChange={(e) => setNewRun((s) => ({ ...s, notes: e.target.value }))} />
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Lines will be seeded from {employees.length} active employees' base salaries.
            </Typography>
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
