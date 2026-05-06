/**
 * Payroll runs — list + lifecycle (Draft → Approved → Paid) using DataTable
 * with expandable rows for line-item detail.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';

import {
  approvePayroll, createPayroll, listEmployees, listPayrolls, payPayroll,
  type Employee, type PayrollRun, type PayrollStatus,
} from 'src/api/smartpos/hrm';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import EmptyStateGuide from 'src/components/smartpos/EmptyStateGuide';
import { useAuth } from 'src/context/smartpos/AuthContext';
import { brand, brandGradients } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const STATUS_COLOURS: Record<PayrollStatus, { bg: string; fg: string }> = {
  DRAFT:    { bg: brand.warning.light, fg: brand.warning.dark },
  APPROVED: { bg: brand.info.light,    fg: brand.info.dark },
  PAID:     { bg: brand.success.light, fg: brand.success.dark },
};

const fmt = formatMoney;

const actionBtnSx = {
  minHeight: 32,
  fontWeight: 700,
  borderRadius: '8px',
  textTransform: 'none' as const,
  fontSize: '0.75rem',
  px: 1.5,
};

export default function PayrollPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  }, [refreshToken, user?.tenantId]);

  const empName = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((e) => m.set(e.id, `${e.firstName} ${e.lastName ?? ''} (${e.code})`));
    return (id: string) => m.get(id) ?? id.slice(0, 8) + '…';
  }, [employees]);

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
        lines: employees.map((e) => ({ employeeId: e.id, baseSalary: e.baseSalary })),
      });
      setDialogOpen(false);
      setNewRun({ ref: '', periodStart: '', periodEnd: '', notes: '' });
      setRefreshToken((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const cols: Column<PayrollRun>[] = [
    {
      key: 'ref', label: 'Ref', width: 160,
      render: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>{r.ref}</span>,
    },
    {
      key: 'period', label: 'Period',
      render: (r) => (
        <Typography variant="body2" sx={{ color: brand.neutral[700], fontWeight: 500 }}>
          {r.periodStart} — {r.periodEnd}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center', width: 110,
      render: (r) => {
        const c = STATUS_COLOURS[r.status];
        return <Chip label={r.status} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600, borderRadius: '6px' }} />;
      },
    },
    {
      key: 'totalGross', label: 'Gross', align: 'right',
      render: (r) => <span style={{ fontWeight: 600 }}>{fmt(r.totalGross)}</span>,
    },
    {
      key: 'totalNet', label: 'Net', align: 'right',
      render: (r) => <span style={{ fontWeight: 700, color: brand.primary[700] }}>{fmt(r.totalNet)}</span>,
    },
    {
      key: 'actions', label: '', align: 'right', width: 130,
      render: (r) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {r.status === 'DRAFT' && (
            <Button size="small" variant="outlined" sx={actionBtnSx} onClick={async () => {
              try { await approvePayroll(r.id); setRefreshToken((x) => x + 1); }
              catch (e) { setError(e instanceof Error ? e.message : 'Approve failed'); }
            }}>Approve</Button>
          )}
          {r.status === 'APPROVED' && (
            <Button size="small" variant="contained"
              sx={{
                ...actionBtnSx,
                background: brandGradients.cta,
                boxShadow: `0 8px 20px -12px ${brand.primary[700]}`,
                '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
              }}
              onClick={async () => {
                try { await payPayroll(r.id); setRefreshToken((x) => x + 1); }
                catch (e) { setError(e instanceof Error ? e.message : 'Pay failed'); }
              }}
            >Pay</Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Payroll runs"
        subtitle="Draft → Approved → Paid"
        badge={{ label: `${rows.length} runs`, tone: 'neutral' }}
        action={{
          label: 'New run',
          icon: <IconPlus size={18} />,
          onClick: () => setDialogOpen(true),
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {!loading && rows.length === 0 && (
        <EmptyStateGuide
          title="No payroll runs yet"
          subtitle="Create your first payroll run to start processing employee salaries."
          icon={<IconPlus size={48} stroke={1.5} />}
          action={{ label: 'New run', onClick: () => setDialogOpen(true) }}
        />
      )}

      <DataTable
        columns={cols}
        rows={rows}
        loading={loading}
        getRowKey={(r) => r.id}
        tableKey="payroll-runs"
        enableSorting
        enableColumnVisibility
        enableExport
        exportFileName="payroll-runs"
        toolbarTitle="Payroll history"
        expandable
        renderExpanded={(run) => (
          <Box sx={{ px: 2.5, py: 2 }}>
            {run.notes && (
              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: brand.neutral[500] }}>
                Notes: {run.notes}
              </Typography>
            )}
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: brand.neutral[50] }}>
                  <TableCell sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Employee</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Base</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Allowances</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Overtime</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Deductions</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Tax</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: brand.neutral[800], fontSize: '0.82rem' }}>Net</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {run.lines.map((l) => (
                  <TableRow key={l.id} sx={{
                    '&:hover': { bgcolor: brand.primary[50] },
                    transition: 'background 0.14s ease',
                  }}>
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
          </Box>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
        <DialogTitle>New payroll run</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Ref" size="small" value={newRun.ref}
              onChange={(e) => setNewRun((s) => ({ ...s, ref: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            <Stack direction="row" spacing={2}>
              <TextField type="date" label="Period start" size="small" fullWidth
                value={newRun.periodStart} onChange={(e) => setNewRun((s) => ({ ...s, periodStart: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
              <TextField type="date" label="Period end" size="small" fullWidth
                value={newRun.periodEnd} onChange={(e) => setNewRun((s) => ({ ...s, periodEnd: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Stack>
            <TextField label="Notes" size="small" multiline minRows={2}
              value={newRun.notes} onChange={(e) => setNewRun((s) => ({ ...s, notes: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
              Lines will be seeded from {employees.length} active employees' base salaries.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: '8px', fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            sx={{
              borderRadius: '8px', fontWeight: 700,
              background: brandGradients.cta,
              '&:hover': { background: `linear-gradient(135deg, ${brand.primary[700]} 0%, ${brand.primary[800]} 100%)` },
            }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
