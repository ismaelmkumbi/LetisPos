import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Button, TextField, Grid,
  List, ListItem, ListItemButton, ListItemText, CircularProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';
import type { CustomerProfile } from '../../../types/commerce';

const CustomerAccountPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, logout, refreshProfile } = useStorefront();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate(`/store/${slug}/login`); return; }
    storefront.getProfile(slug!)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, isLoggedIn, navigate]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await storefront.updateProfile(slug!, profile);
      await refreshProfile();
      setMessage('Profile updated');
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(`/store/${slug}`);
  };

  if (loading) return <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Container>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>My Account</Typography>
          <List>
            <ListItem disablePadding>
              <ListItemButton selected onClick={() => navigate(`/store/${slug}/account`)}>
                <ListItemText primary="Profile" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => navigate(`/store/${slug}/account/orders`)}>
                <ListItemText primary="Orders" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => navigate(`/store/${slug}/account/addresses`)}>
                <ListItemText primary="Addresses" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Typography variant="h4" gutterBottom sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>
            Profile
          </Typography>
          {message && <Typography color={message.includes('Failed') ? 'error' : 'success'} sx={{ mb: 2 }}>{message}</Typography>}
          <TextField fullWidth label="First Name" value={profile?.firstName || ''}
            onChange={e => setProfile(prev => prev ? { ...prev, firstName: e.target.value } : null)}
            sx={{ mb: 2 }} />
          <TextField fullWidth label="Last Name" value={profile?.lastName || ''}
            onChange={e => setProfile(prev => prev ? { ...prev, lastName: e.target.value } : null)}
            sx={{ mb: 2 }} />
          <TextField fullWidth label="Email" value={profile?.email || ''} disabled sx={{ mb: 2 }} />
          <TextField fullWidth label="Phone" value={profile?.phone || ''}
            onChange={e => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
            sx={{ mb: 3 }} />
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: 'var(--commerce-primary, #1976d2)' }}>
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CustomerAccountPage;
