import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Card, CardContent, Grid,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { MarketingBanner } from '../../../types/commerce';

const emptyBanner: Partial<MarketingBanner> = {
  name: '', location: 'hero', contentHtml: '', imageUrl: '', linkUrl: '',
  backgroundColor: '#000000', isActive: false,
};

const BannerManager: React.FC = () => {
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<MarketingBanner>>(emptyBanner);

  const fetchBanners = () => {
    commerceAdmin.getBanners().then(setBanners).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleSave = async () => {
    if (form.id) {
      await commerceAdmin.updateBanner(form.id, form);
    } else {
      await commerceAdmin.createBanner(form as Omit<MarketingBanner, 'id'>);
    }
    setDialogOpen(false);
    fetchBanners();
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Banners</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setForm(emptyBanner); setDialogOpen(true); }}>
          Add Banner
        </Button>
      </Box>

      {banners.length === 0 ? (
        <Card><CardContent><Typography>No banners created yet.</Typography></CardContent></Card>
      ) : (
        banners.map(b => (
          <Card key={b.id} sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{b.name}</Typography>
                <Box display="flex" gap={1} mt={1}>
                  <Chip label={b.location} size="small" />
                  <Chip label={b.isActive ? 'Active' : 'Inactive'} color={b.isActive ? 'success' : 'default'} size="small" />
                </Box>
              </Box>
              <Box>
                <IconButton onClick={() => { setForm(b); setDialogOpen(true); }}><EditIcon /></IconButton>
                <IconButton color="error" onClick={() => commerceAdmin.deleteBanner(b.id).then(fetchBanners)}><DeleteIcon /></IconButton>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Name" value={form.name || ''} size="small"
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small"><InputLabel>Location</InputLabel>
                <Select value={form.location || 'hero'} label="Location"
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value as MarketingBanner['location'] }))}>
                  <MenuItem value="hero">Hero</MenuItem>
                  <MenuItem value="announcement_bar">Announcement Bar</MenuItem>
                  <MenuItem value="promo_grid">Promo Grid</MenuItem>
                  <MenuItem value="product_page">Product Page</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Background Color" value={form.backgroundColor || ''} size="small"
              onChange={e => setForm(prev => ({ ...prev, backgroundColor: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Image URL" value={form.imageUrl || ''} size="small"
              onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Link URL" value={form.linkUrl || ''} size="small"
              onChange={e => setForm(prev => ({ ...prev, linkUrl: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Content (HTML)" value={form.contentHtml || ''} size="small" multiline rows={3}
              onChange={e => setForm(prev => ({ ...prev, contentHtml: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BannerManager;
