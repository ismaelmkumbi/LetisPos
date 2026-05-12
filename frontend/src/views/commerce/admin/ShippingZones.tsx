import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField,
  IconButton, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { ShippingZone } from '../../../types/commerce';

const ShippingZones: React.FC = () => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', countries: '', flatRate: '5.00' });

  const fetchZones = () => {
    setLoading(true);
    commerceAdmin.getShippingZones()
      .then(setZones)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchZones(); }, []);

  const handleCreate = async () => {
    await commerceAdmin.createShippingZone({
      name: form.name,
      countries: form.countries.split(',').map(s => s.trim()).filter(Boolean),
      rates: [{ type: 'flat_rate' as const, name: 'Standard', amount: parseFloat(form.flatRate), minDays: 3, maxDays: 7 }],
      isActive: true,
    });
    setDialogOpen(false);
    setForm({ name: '', countries: '', flatRate: '5.00' });
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    await commerceAdmin.deleteShippingZone(id);
    fetchZones();
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Shipping Zones</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Add Zone</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {zones.length === 0 ? (
        <Card><CardContent><Typography>No shipping zones configured.</Typography></CardContent></Card>
      ) : (
        zones.map(zone => (
          <Card key={zone.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{zone.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Countries: {zone.countries?.join(', ')} | Active: {zone.isActive ? 'Yes' : 'No'}
                  </Typography>
                  {zone.rates?.map((rate, i) => (
                    <Typography key={i} variant="body2">{rate.name}: ${rate.amount?.toFixed(2)} ({rate.minDays}-{rate.maxDays} days)</Typography>
                  ))}
                </Box>
                <IconButton color="error" onClick={() => handleDelete(zone.id)}><DeleteIcon /></IconButton>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add Shipping Zone</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Zone Name" value={form.name} sx={{ mb: 2, mt: 1 }}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} size="small" />
          <TextField fullWidth label="Countries (comma-separated ISO codes)" value={form.countries} sx={{ mb: 2 }}
            onChange={e => setForm(prev => ({ ...prev, countries: e.target.value }))} size="small"
            helperText="e.g. KE, UG, TZ, RW" />
          <TextField fullWidth label="Flat Rate ($)" type="number" value={form.flatRate}
            onChange={e => setForm(prev => ({ ...prev, flatRate: e.target.value }))} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShippingZones;
