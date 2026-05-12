import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Card, CardContent, Grid,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { StorePage } from '../../../types/commerce';

const PageEditor: React.FC = () => {
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<StorePage>>({ key: '', title: '', body: '', isVisible: true });

  const fetchPages = () => {
    commerceAdmin.getPages().then(setPages).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPages(); }, []);

  const handleSave = async () => {
    if (editingPage.id) {
      await commerceAdmin.updatePage(editingPage.id, editingPage);
    } else {
      await commerceAdmin.createPage(editingPage as Omit<StorePage, 'id'>);
    }
    setDialogOpen(false);
    fetchPages();
  };

  const handleEdit = (page: StorePage) => {
    setEditingPage(page);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await commerceAdmin.deletePage(id);
    fetchPages();
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Pages</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditingPage({ key: '', title: '', body: '', isVisible: true }); setDialogOpen(true); }}>
          Add Page
        </Button>
      </Box>

      {pages.length === 0 ? (
        <Card><CardContent><Typography>No pages created yet. Create pages like About, Contact, FAQ, Terms, or Privacy.</Typography></CardContent></Card>
      ) : (
        pages.map(page => (
          <Card key={page.id} sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{page.title}</Typography>
                <Typography variant="body2" color="text.secondary">Key: {page.key} | Visible: {page.isVisible ? 'Yes' : 'No'}</Typography>
              </Box>
              <Box>
                <IconButton onClick={() => handleEdit(page)}><EditIcon /></IconButton>
                <IconButton color="error" onClick={() => handleDelete(page.id)}><DeleteIcon /></IconButton>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPage.id ? 'Edit Page' : 'Create Page'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Key" value={editingPage.key || ''} size="small"
                onChange={e => setEditingPage(prev => ({ ...prev, key: e.target.value }))}
                helperText="URL key, e.g. about, contact, faq" disabled={!!editingPage.id} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Title" value={editingPage.title || ''} size="small"
                onChange={e => setEditingPage(prev => ({ ...prev, title: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Content (HTML)" value={editingPage.body || ''} size="small"
                multiline rows={10} placeholder="<p>Your content here...</p>"
                onChange={e => setEditingPage(prev => ({ ...prev, body: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Meta Title" value={editingPage.metaTitle || ''} size="small"
                onChange={e => setEditingPage(prev => ({ ...prev, metaTitle: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Meta Description" value={editingPage.metaDescription || ''} size="small"
                onChange={e => setEditingPage(prev => ({ ...prev, metaDescription: e.target.value }))} />
            </Grid>
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

export default PageEditor;
