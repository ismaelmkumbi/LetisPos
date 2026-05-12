import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel,
  List, ListItem, IconButton, Tabs, Tab, CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { NavigationItem } from '../../../types/commerce';

const NavigationBuilder: React.FC = () => {
  const [location, setLocation] = useState<'header' | 'footer'>('header');
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState<NavigationItem>({ label: '', type: 'link', url: '', order: 0 });

  const fetchMenu = (loc: string) => {
    setLoading(true);
    commerceAdmin.getNavigation(loc as 'header' | 'footer')
      .then(data => setItems(data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMenu(location); }, [location]);

  const handleAdd = () => {
    setItems(prev => [...prev, { ...newItem, order: prev.length }]);
    setNewItem({ label: '', type: 'link', url: '', order: 0 });
  };

  const handleRemove = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setItems(newItems);
  };

  const handleSave = async () => {
    await commerceAdmin.updateNavigation(location, items);
    fetchMenu(location);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Navigation Builder</Typography>

      <Tabs value={location} onChange={(_, v) => setLocation(v)} sx={{ mb: 3 }}>
        <Tab value="header" label="Header" />
        <Tab value="footer" label="Footer" />
      </Tabs>

      {loading ? <CircularProgress /> : (
        <>
          <List>
            {items.map((item, index) => (
              <ListItem key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box>
                    <IconButton size="small" disabled={index === 0} onClick={() => handleMove(index, -1)}><ArrowUpward /></IconButton>
                    <IconButton size="small" disabled={index === items.length - 1} onClick={() => handleMove(index, 1)}><ArrowDownward /></IconButton>
                  </Box>
                  <Typography sx={{ flexGrow: 1 }}>{item.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.type}</Typography>
                  <IconButton color="error" size="small" onClick={() => handleRemove(index)}><DeleteIcon /></IconButton>
                </Box>
              </ListItem>
            ))}
            {items.length === 0 && <Typography color="text.secondary">No menu items yet.</Typography>}
          </List>

          <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" label="Label" value={newItem.label}
              onChange={e => setNewItem(prev => ({ ...prev, label: e.target.value }))} />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select value={newItem.type} label="Type"
                onChange={e => setNewItem(prev => ({ ...prev, type: e.target.value as any }))}>
                <MenuItem value="link">Link</MenuItem>
                <MenuItem value="page">Page</MenuItem>
                <MenuItem value="category">Category</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="URL/Key" value={newItem.url || ''}
              onChange={e => setNewItem(prev => ({ ...prev, url: e.target.value }))} />
            <IconButton color="primary" onClick={handleAdd}><AddIcon /></IconButton>
          </Box>

          <Box mt={3}>
            <Button variant="contained" onClick={handleSave}>Save Menu</Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default NavigationBuilder;
