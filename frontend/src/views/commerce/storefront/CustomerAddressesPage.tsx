import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Grid, List, ListItem, ListItemButton, ListItemText,
  Button, TextField, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';
import type { CustomerAddress, AddressInput } from '../../../types/commerce';

const emptyAddress: AddressInput & { label: string } = {
  label: 'Home', firstName: '', lastName: '', line1: '', line2: '',
  city: '', state: '', country: '', postalCode: '', phone: '',
};

const CustomerAddressesPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useStorefront();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<typeof emptyAddress>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAddresses = () => {
    storefront.getAddresses(slug!)
      .then(setAddresses)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoggedIn) { navigate(`/store/${slug}/login`); return; }
    fetchAddresses();
  }, [slug, isLoggedIn, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await storefront.updateAddress(slug!, editingId, editingAddress);
      } else {
        await storefront.createAddress(slug!, editingAddress);
      }
      setDialogOpen(false);
      fetchAddresses();
    } catch {} finally { setSaving(false); }
  };

  const handleEdit = (addr: CustomerAddress) => {
    setEditingId(addr.id);
    setEditingAddress({
      label: addr.label, firstName: addr.firstName, lastName: addr.lastName,
      line1: addr.line1, line2: addr.line2 || '', city: addr.city,
      state: addr.state, country: addr.country, postalCode: addr.postalCode, phone: addr.phone || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await storefront.deleteAddress(slug!, id);
    fetchAddresses();
  };

  const handleLogout = () => { logout(); navigate(`/store/${slug}`); };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>My Account</Typography>
          <List>
            <ListItem disablePadding><ListItemButton onClick={() => navigate(`/store/${slug}/account`)}><ListItemText primary="Profile" /></ListItemButton></ListItem>
            <ListItem disablePadding><ListItemButton onClick={() => navigate(`/store/${slug}/account/orders`)}><ListItemText primary="Orders" /></ListItemButton></ListItem>
            <ListItem disablePadding><ListItemButton selected><ListItemText primary="Addresses" /></ListItemButton></ListItem>
            <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="Logout" /></ListItemButton></ListItem>
          </List>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>My Addresses</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingId(null); setEditingAddress(emptyAddress); setDialogOpen(true); }}
              sx={{ bgcolor: 'var(--commerce-primary, #1976d2)' }}>
              Add Address
            </Button>
          </Box>
          {loading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : addresses.length === 0 ? (
            <Typography color="text.secondary">No saved addresses.</Typography>
          ) : (
            <Grid container spacing={2}>
              {addresses.map(addr => (
                <Grid size={{ xs: 12, sm: 6 }} key={addr.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">{addr.label}{addr.isDefault ? ' (Default)' : ''}</Typography>
                      <Typography fontWeight="bold">{addr.firstName} {addr.lastName}</Typography>
                      <Typography>{addr.line1}</Typography>
                      {addr.line2 && <Typography>{addr.line2}</Typography>}
                      <Typography>{addr.city}, {addr.state} {addr.postalCode}</Typography>
                      <Typography>{addr.country}</Typography>
                      {addr.phone && <Typography>{addr.phone}</Typography>}
                      <Box sx={{ mt: 1 }}>
                        <IconButton size="small" onClick={() => handleEdit(addr)}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(addr.id)} color="error"><DeleteIcon /></IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Address' : 'Add Address'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {(['label', 'firstName', 'lastName', 'line1', 'line2', 'city', 'state', 'country', 'postalCode', 'phone'] as const).map(field => (
              <Grid size={{ xs: 12, sm: field === 'firstName' || field === 'lastName' ? 6 : 12 }} key={field}>
                <TextField fullWidth label={field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  value={editingAddress[field]} size="small"
                  onChange={e => setEditingAddress(prev => ({ ...prev, [field]: e.target.value }))}
                  required={['firstName', 'lastName', 'line1', 'city', 'country', 'postalCode', 'label'].includes(field)} />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: 'var(--commerce-primary, #1976d2)' }}>
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomerAddressesPage;
