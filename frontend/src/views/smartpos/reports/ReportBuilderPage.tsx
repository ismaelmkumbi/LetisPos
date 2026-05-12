import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Stack, TextField, Typography } from '@mui/material';
import { IconPlus, IconTrash, IconLayoutDashboard } from '@tabler/icons-react';
import { ReportPageShell } from 'src/components/smartpos/reports';
import { listReportDashboards, createReportDashboard, deleteReportDashboard, type ReportDashboard } from 'src/api/smartpos/reports';
import { brand } from 'src/theme/smartpos/brand';

export default function ReportBuilderPage() {
  const [dashboards, setDashboards] = useState<ReportDashboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { listReportDashboards().then(setDashboards).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed')); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try { const c = await createReportDashboard({ name: name.trim() }); setDashboards(p => [...p, c]); setOpen(false); setName(''); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteReportDashboard(id); setDashboards(p => p.filter(d => d.id !== id)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
  };

  return (
    <ReportPageShell title="Report Builder" subtitle="Create and save custom report dashboards">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>New Dashboard</Button>
      </Box>
      <Grid container spacing={2}>
        {dashboards.map(d => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={d.id}>
            <Card elevation={0} sx={{ border: `1px solid ${brand.neutral[200]}`, borderRadius: '12px' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconLayoutDashboard size={18} color={brand.primary[600]} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.name}</Typography>
                  </Stack>
                  <IconButton size="small" onClick={() => handleDelete(d.id)}><IconTrash size={14} /></IconButton>
                </Stack>
                <Typography variant="caption" sx={{ color: brand.neutral[400], mt: 0.5, display: 'block' }}>{new Date(d.createdAt).toLocaleDateString()}</Typography>
                {d.shared && <Chip label="Shared" size="small" sx={{ mt: 1, bgcolor: brand.info.light, color: brand.info.dark, fontWeight: 600 }} />}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {dashboards.length === 0 && <Typography sx={{ textAlign: 'center', py: 4, color: brand.neutral[400] }}>No saved dashboards yet.</Typography>}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Dashboard</DialogTitle>
        <DialogContent><TextField autoFocus label="Name" fullWidth value={name} onChange={e => setName(e.target.value)} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !name.trim()}>{submitting ? 'Creating…' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </ReportPageShell>
  );
}
