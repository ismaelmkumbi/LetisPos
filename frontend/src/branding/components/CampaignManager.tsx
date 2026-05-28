import { useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import { IconCalendarEvent, IconPlus } from '@tabler/icons-react';
import { api } from 'src/api/smartpos/client';

export default function CampaignManager() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name || !startDate || !endDate) return;
    setSaving(true);
    try {
      await api.post('/api/v1/brand/campaigns', { name, startDate, endDate });
      setOpen(false);
      setName(''); setStartDate(''); setEndDate('');
    } catch { /* API unavailable — user can retry */ } finally { setSaving(false); }
  }, [name, startDate, endDate]);

  return (
    <>
      <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--bp-border-default, #E2E8F0)' }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconCalendarEvent size={18} color="var(--bp-color-primary, #16A34A)" />
            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
              Seasonal Campaigns
            </Typography>
          </Stack>
          <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />}
            onClick={() => setOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.68rem', borderRadius: '8px' }}>
            New Campaign
          </Button>
        </Stack>
        <Typography sx={{ fontSize: '0.65rem', color: 'var(--bp-text-secondary, #64748B)', mt: 0.75 }}>
          Schedule temporary brand overrides for holidays and promotions.
        </Typography>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '0.95rem' }}>New Campaign</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Campaign Name" size="small" fullWidth value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ramadan Sale, Holiday Special..." />
            <TextField label="Start Date" type="date" size="small" fullWidth
              value={startDate} onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" size="small" fullWidth
              value={endDate} onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <Button variant="contained" fullWidth onClick={handleSave} disabled={saving || !name || !startDate || !endDate}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px',
                bgcolor: 'var(--bp-color-primary, #16A34A)' }}>
              {saving ? 'Saving...' : 'Create Campaign'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
