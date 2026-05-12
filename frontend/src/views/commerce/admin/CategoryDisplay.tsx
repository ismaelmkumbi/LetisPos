import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, List, ListItem, IconButton,
  TextField, Switch, CircularProgress, Alert, Card, CardContent,
} from '@mui/material';
import { ArrowUpward, ArrowDownward, Edit as EditIcon } from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';

interface CategoryItem {
  id?: string;
  categoryId: string;
  nameOverride?: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isVisible: boolean;
  parentId?: string;
  categoryName?: string; // from product-service
}

const CategoryDisplay: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CategoryItem>>({});

  const fetchCategories = () => {
    setLoading(true);
    commerceAdmin.getCategoryDisplay()
      .then((data: any) => setCategories(Array.isArray(data) ? data : data?.content || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleMove = async (index: number, direction: -1 | 1) => {
    const newCategories = [...categories];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newCategories.length) return;
    [newCategories[index], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[index]];
    newCategories[index].displayOrder = index;
    newCategories[swapIndex].displayOrder = swapIndex;
    setCategories(newCategories);
    await commerceAdmin.updateCategoryDisplay(newCategories as any);
    fetchCategories();
  };

  const handleToggleVisible = async (cat: CategoryItem) => {
    await commerceAdmin.updateCategoryDisplay(
      categories.map(c => c.categoryId === cat.categoryId ? { ...c, isVisible: !c.isVisible } : c) as any
    );
    fetchCategories();
  };

  const handleEdit = (cat: CategoryItem) => {
    setEditingId(cat.categoryId);
    setEditForm(cat);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await commerceAdmin.updateCategoryDisplay(
      categories.map(c => c.categoryId === editingId ? { ...c, ...editForm } : c) as any
    );
    setEditingId(null);
    fetchCategories();
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error" action={<Button onClick={fetchCategories}>Retry</Button>}>{error}</Alert></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Category Display</Typography>

      {categories.length === 0 ? (
        <Card><CardContent><Typography>No categories configured. Categories from your product catalog will appear here.</Typography></CardContent></Card>
      ) : (
        <List>
          {categories.map((cat, index) => (
            <ListItem key={cat.categoryId || cat.id || index}
              sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1, flexDirection: 'column', alignItems: 'stretch' }}>
              {editingId === cat.categoryId ? (
                <Box sx={{ p: 2 }}>
                  <TextField fullWidth label="Name Override" value={editForm.nameOverride || ''} size="small" sx={{ mb: 1 }}
                    onChange={e => setEditForm(prev => ({ ...prev, nameOverride: e.target.value }))} />
                  <TextField fullWidth label="Description" value={editForm.description || ''} size="small" sx={{ mb: 1 }}
                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
                  <TextField fullWidth label="Image URL" value={editForm.imageUrl || ''} size="small" sx={{ mb: 1 }}
                    onChange={e => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))} />
                  <Box display="flex" gap={1}>
                    <Button variant="contained" size="small" onClick={handleSaveEdit}>Save</Button>
                    <Button size="small" onClick={() => setEditingId(null)}>Cancel</Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box>
                      <IconButton size="small" disabled={index === 0} onClick={() => handleMove(index, -1)}><ArrowUpward /></IconButton>
                      <IconButton size="small" disabled={index === categories.length - 1} onClick={() => handleMove(index, 1)}><ArrowDownward /></IconButton>
                    </Box>
                    <Box>
                      <Typography fontWeight="bold">{cat.nameOverride || cat.categoryName || cat.categoryId}</Typography>
                      {cat.description && <Typography variant="body2" color="text.secondary">{cat.description}</Typography>}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch checked={cat.isVisible !== false} onChange={() => handleToggleVisible(cat)} size="small" />
                    <IconButton size="small" onClick={() => handleEdit(cat)}><EditIcon /></IconButton>
                  </Box>
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default CategoryDisplay;
