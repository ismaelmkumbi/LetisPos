import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { IconPlus, IconTrash, IconClock } from '@tabler/icons-react';
import { ReportPageShell } from 'src/components/smartpos/reports';
import { listScheduledReports, createScheduledReport, deleteScheduledReport, type ScheduledReport, type CreateScheduledReport } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';

const REPORT_OPTIONS = [
  { key: 'sales-summary', label: 'Sales Summary' }, { key: 'profit-loss', label: 'Profit & Loss' },
  { key: 'inventory-summary', label: 'Inventory Summary' }, { key: 'tax-summary', label: 'Tax Summary' },
  { key: 'purchases-summary', label: 'Purchase Summary' }, { key: 'payments-summary', label: 'Payment Summary' },
  { key: 'customers-summary', label: 'Customer Summary' },
];
const FREQ_OPTIONS = ['DAILY', 'WEEKLY', 'MONTHLY'];

export default function ReportSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateScheduledReport>({ reportKey: 'sales-summary', frequency: 'DAILY', recipients: '', format: 'PDF' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { listScheduledReports().then(setSchedules).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed')); }, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try { const c = await createScheduledReport(form); setSchedules(p => [...p, c]); setOpen(false); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteScheduledReport(id); setSchedules(p => p.filter(s => s.id !== id)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
  };

  return (
    <ReportPageShell title="Report Schedules" subtitle="Automated report delivery via email">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>New Schedule</Button>
      </Box>
      <Stack spacing={1.5}>
        {schedules.map(s => (
          <Box key={s.id} sx={{ p: 2, border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconClock size={20} color={brand.primary[600]} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{REPORT_OPTIONS.find(o => o.key === s.reportKey)?.label ?? s.reportKey}</Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>{s.frequency} · {s.format} · {s.recipients}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={s.active ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: s.active ? brand.success.light : brand.neutral[100], color: s.active ? brand.success.dark : brand.neutral[500], fontWeight: 600 }} />
              <IconButton size="small" onClick={() => handleDelete(s.id)}><IconTrash size={14} /></IconButton>
            </Stack>
          </Box>
        ))}
        {schedules.length === 0 && <Typography sx={{ textAlign: 'center', py: 4, color: brand.neutral[400] }}>No scheduled reports yet.</Typography>}
      </Stack>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Scheduled Report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Report" value={form.reportKey} onChange={e => setForm({...form, reportKey: e.target.value})}>
              {REPORT_OPTIONS.map(o => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select label="Frequency" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
              {FREQ_OPTIONS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </TextField>
            <TextField label="Recipients (comma-separated emails)" value={form.recipients} onChange={e => setForm({...form, recipients: e.target.value})} />
            <TextField select label="Format" value={form.format} onChange={e => setForm({...form, format: e.target.value})}>
              <MenuItem value="PDF">PDF</MenuItem><MenuItem value="XLSX">Excel</MenuItem><MenuItem value="CSV">CSV</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.recipients}>{submitting ? 'Creating…' : 'Create Schedule'}</Button>
        </DialogActions>
      </Dialog>
    </ReportPageShell>
  );
}
