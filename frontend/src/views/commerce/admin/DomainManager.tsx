import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, Chip, IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { commerceAdmin } from '../../../api/smartpos/commerce';
import type { CustomDomain } from '../../../types/commerce';

const DomainManager: React.FC = () => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const fetchDomains = () => {
    commerceAdmin.getDomains().then(setDomains).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDomains(); }, []);

  const handleAdd = async () => {
    await commerceAdmin.addDomain(newDomain);
    setDialogOpen(false);
    setNewDomain('');
    fetchDomains();
  };

  const handleVerify = async (id: string) => {
    await commerceAdmin.verifyDomain(id);
    fetchDomains();
  };

  const handleDelete = async (id: string) => {
    await commerceAdmin.deleteDomain(id);
    fetchDomains();
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Custom Domains</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Add Domain</Button>
      </Box>

      {domains.length === 0 ? (
        <Card><CardContent><Typography>No custom domains configured.</Typography></CardContent></Card>
      ) : (
        domains.map(d => (
          <Card key={d.id} sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{d.domain}</Typography>
                <Box display="flex" gap={1} mt={1}>
                  <Chip label={d.isVerified ? 'Verified' : 'Not Verified'} color={d.isVerified ? 'success' : 'warning'} size="small" />
                  <Chip label={d.sslStatus} size="small" color={d.sslStatus === 'active' ? 'success' : 'default'} />
                </Box>
              </Box>
              <Box>
                {!d.isVerified && <Button size="small" onClick={() => handleVerify(d.id)} sx={{ mr: 1 }}>Verify</Button>}
                <IconButton color="error" onClick={() => handleDelete(d.id)}><DeleteIcon /></IconButton>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add Custom Domain</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Domain" value={newDomain} sx={{ mt: 1 }}
            onChange={e => setNewDomain(e.target.value)} size="small"
            placeholder="shop.example.com"
            helperText="Add a CNAME record pointing to your Letis Commerce store" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DomainManager;
