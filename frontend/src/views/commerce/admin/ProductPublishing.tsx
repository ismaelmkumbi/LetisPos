import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Switch, Drawer, TextField, Grid, Chip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, InputAdornment, List, ListItemButton,
  ListItemText, ListItemIcon,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Inventory as InventoryIcon } from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import { listProducts } from '../../../api/smartpos/products';
import type { PublishedProduct, PublishProductRequest } from '../../../types/commerce';
import type { Product } from '../../../api/smartpos/types';

const ProductPublishing: React.FC = () => {
  const [published, setPublished] = useState<PublishedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PublishedProduct | null>(null);
  const [editForm, setEditForm] = useState<PublishProductRequest>({ productId: '' });

  // Product picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchPublished = () => {
    setLoading(true);
    commerceAdmin.listPublishedProducts()
      .then(data => setPublished(data.content || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPublished(); }, []);

  // Search products from inventory
  const handleSearchProducts = async (query: string) => {
    setProductSearch(query);
    if (query.length < 1) {
      setProducts([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const data = await listProducts({ search: query, size: 20 });
      setProducts(data.content || []);
    } catch {
      setError('Failed to search inventory products');
    } finally {
      setSearchingProducts(false);
    }
  };

  // Publish selected product
  const handlePublishSelected = async (product: Product) => {
    const alreadyPublished = published.find(p => p.productId === product.id);
    if (alreadyPublished) {
      setError(`"${product.name}" is already published`);
      return;
    }
    setPublishing(true);
    try {
      await commerceAdmin.publishProduct({
        productId: product.id,
        slug: product.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        featured: false,
        displayOrder: published.length + 1,
      });
      setPickerOpen(false);
      setProductSearch('');
      setProducts([]);
      fetchPublished();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to publish product');
    } finally {
      setPublishing(false);
    }
  };

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Product Publishing</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setPickerOpen(true)}
        >
          Add Product from Inventory
        </Button>
      </Box>

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
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No published products yet. Click "Add Product from Inventory" to publish your first product.
                </TableCell>
              </TableRow>
            ) : (
              published.map(pp => (
                <TableRow key={pp.id}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{pp.productId}</TableCell>
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

      {/* Product Picker Dialog */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Publish Product from Inventory</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            placeholder="Search products by name or SKU..."
            value={productSearch}
            onChange={e => handleSearchProducts(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              },
            }}
          />
          {searchingProducts ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : products.length > 0 ? (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {products.map(product => {
                const isPublished = published.some(p => p.productId === product.id);
                return (
                  <ListItemButton
                    key={product.id}
                    disabled={isPublished || publishing}
                    onClick={() => handlePublishSelected(product)}
                  >
                    <ListItemIcon>
                      <InventoryIcon color={isPublished ? 'disabled' : 'action'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={product.name}
                      secondary={isPublished ? 'Already published' : `SKU: ${product.code || '—'} | Price: ${product.price || '—'}`}
                    />
                    {isPublished ? (
                      <Chip label="Published" size="small" color="success" variant="outlined" />
                    ) : (
                      <Button size="small" variant="outlined" disabled={publishing}>
                        Publish
                      </Button>
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          ) : productSearch ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No products found matching "{productSearch}"
            </Typography>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Start typing to search your inventory
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* SEO Edit Drawer */}
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
