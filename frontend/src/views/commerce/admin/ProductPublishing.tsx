import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Switch, Drawer, TextField, Grid, Chip, CircularProgress, Alert,
} from '@mui/material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { PublishedProduct, PublishProductRequest } from '../../../types/commerce';

const ProductPublishing: React.FC = () => {
  const [published, setPublished] = useState<PublishedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PublishedProduct | null>(null);
  const [editForm, setEditForm] = useState<PublishProductRequest>({ productId: '' });

  const fetchPublished = () => {
    setLoading(true);
    commerceAdmin.listPublishedProducts()
      .then(data => setPublished(data.content || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPublished(); }, []);

  const handleTogglePublish = async (product: PublishedProduct) => {
    try {
      if (product.unpublishedAt) {
        await commerceAdmin.publishProduct({ productId: product.productId });
      } else {
        await commerceAdmin.unpublishProduct(product.productId);
      }
      fetchPublished();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    }
  };

  const handleEdit = (product: PublishedProduct) => {
    setEditingProduct(product);
    setEditForm({
      productId: product.productId,
      slug: product.slug,
      metaTitle: product.metaTitle || '',
      metaDescription: product.metaDescription || '',
      ogImageUrl: product.ogImageUrl || '',
      featured: product.isFeatured,
      displayOrder: product.displayOrder,
    });
    setDrawerOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await commerceAdmin.updatePublishedProduct(editingProduct.id, editForm);
      setDrawerOpen(false);
      fetchPublished();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    }
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Product Publishing</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product ID</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Featured</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Published</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {published.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No published products</TableCell></TableRow>
            ) : (
              published.map(pp => (
                <TableRow key={pp.id}>
                  <TableCell>{pp.productId}</TableCell>
                  <TableCell>{pp.slug}</TableCell>
                  <TableCell>{pp.isFeatured ? <Chip label="Featured" size="small" color="primary" /> : '—'}</TableCell>
                  <TableCell>{pp.unpublishedAt ? <Chip label="Offline" size="small" color="default" /> : <Chip label="Online" size="small" color="success" />}</TableCell>
                  <TableCell align="center">
                    <Switch checked={!pp.unpublishedAt} onChange={() => handleTogglePublish(pp)} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => handleEdit(pp)}>Edit SEO</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" gutterBottom>Edit Product Settings</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Slug" value={editForm.slug || ''} size="small"
                onChange={e => setEditForm(prev => ({ ...prev, slug: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Meta Title" value={editForm.metaTitle || ''} size="small"
                onChange={e => setEditForm(prev => ({ ...prev, metaTitle: e.target.value }))}
                helperText={`${(editForm.metaTitle || '').length}/70`} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Meta Description" value={editForm.metaDescription || ''} size="small" multiline rows={3}
                onChange={e => setEditForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                helperText={`${(editForm.metaDescription || '').length}/320`} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="OG Image URL" value={editForm.ogImageUrl || ''} size="small"
                onChange={e => setEditForm(prev => ({ ...prev, ogImageUrl: e.target.value }))} />
            </Grid>
          </Grid>
          <Box mt={3} display="flex" gap={1}>
            <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ProductPublishing;
