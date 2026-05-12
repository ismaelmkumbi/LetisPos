import React, { useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Grid, CircularProgress, Alert, Card, CardContent,
} from '@mui/material';
import { useCommerceAdmin } from '../../../context/CommerceContext';

interface StoreFormData {
  name: string; contactEmail: string; contactPhone: string;
  addressLine1: string; addressLine2: string; city: string;
  state: string; country: string; postalCode: string;
  currency: string; timezone: string; taxDisplay: 'exclusive' | 'inclusive';
  socialFacebook: string; socialInstagram: string; socialTwitter: string;
  orderPrefix: string;
}

const StoreSettings: React.FC = () => {
  const { store, loading, error, refreshStore, updateStore } = useCommerceAdmin();
  const [form, setForm] = React.useState<StoreFormData>({
    name: '', contactEmail: '', contactPhone: '',
    addressLine1: '', addressLine2: '', city: '',
    state: '', country: '', postalCode: '',
    currency: 'USD', timezone: 'UTC', taxDisplay: 'exclusive',
    socialFacebook: '', socialInstagram: '', socialTwitter: '',
    orderPrefix: 'ONL-',
  });
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (store) setForm({
      name: store.name || '', contactEmail: store.contactEmail || '',
      contactPhone: store.contactPhone || '', addressLine1: store.addressLine1 || '',
      addressLine2: store.addressLine2 || '', city: store.city || '',
      state: store.state || '', country: store.country || '',
      postalCode: store.postalCode || '', currency: store.currency || 'USD',
      timezone: store.timezone || 'UTC', taxDisplay: store.taxDisplay || 'exclusive',
      socialFacebook: store.socialFacebook || '', socialInstagram: store.socialInstagram || '',
      socialTwitter: store.socialTwitter || '', orderPrefix: store.orderPrefix || 'ONL-',
    });
  }, [store]);

  const handleChange = (field: string, value: string) => {
    setForm((prev: StoreFormData) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateStore(form);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error" action={<Button onClick={refreshStore}>Retry</Button>}>{error.message}</Alert></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Store Settings</Typography>
      {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>General</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Store Name" value={form.name || ''}
                onChange={e => handleChange('name', e.target.value)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Order Prefix" value={form.orderPrefix || ''}
                onChange={e => handleChange('orderPrefix', e.target.value)} size="small" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Contact</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Email" type="email" value={form.contactEmail || ''}
                onChange={e => handleChange('contactEmail', e.target.value)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Phone" value={form.contactPhone || ''}
                onChange={e => handleChange('contactPhone', e.target.value)} size="small" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Address</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Address Line 1" value={form.addressLine1 || ''} onChange={e => handleChange('addressLine1', e.target.value)} size="small" /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Address Line 2" value={form.addressLine2 || ''} onChange={e => handleChange('addressLine2', e.target.value)} size="small" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="City" value={form.city || ''} onChange={e => handleChange('city', e.target.value)} size="small" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="State" value={form.state || ''} onChange={e => handleChange('state', e.target.value)} size="small" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Country" value={form.country || ''} onChange={e => handleChange('country', e.target.value)} size="small" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Postal Code" value={form.postalCode || ''} onChange={e => handleChange('postalCode', e.target.value)} size="small" /></Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Regional</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Currency" value={form.currency || ''}
                onChange={e => handleChange('currency', e.target.value)} size="small" helperText="e.g. USD, EUR, KES" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Timezone" value={form.timezone || ''}
                onChange={e => handleChange('timezone', e.target.value)} size="small" helperText="e.g. UTC, Africa/Nairobi" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Tax Display" value={form.taxDisplay || ''}
                onChange={e => handleChange('taxDisplay', e.target.value)} size="small" helperText="inclusive or exclusive" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Social Links</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Facebook" value={form.socialFacebook || ''}
                onChange={e => handleChange('socialFacebook', e.target.value)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Instagram" value={form.socialInstagram || ''}
                onChange={e => handleChange('socialInstagram', e.target.value)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Twitter" value={form.socialTwitter || ''}
                onChange={e => handleChange('socialTwitter', e.target.value)} size="small" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Button variant="contained" onClick={handleSave} disabled={saving}
        sx={{ bgcolor: 'var(--commerce-primary, #1976d2)' }}>
        {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Settings'}
      </Button>
    </Box>
  );
};

export default StoreSettings;
