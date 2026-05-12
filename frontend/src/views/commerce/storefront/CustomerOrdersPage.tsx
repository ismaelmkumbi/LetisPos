import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Grid, List, ListItem, ListItemButton, ListItemText,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, CircularProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

const CustomerOrdersPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useStorefront();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate(`/store/${slug}/login`); return; }
    storefront.getOrders(slug!)
      .then((data: any) => setOrders(Array.isArray(data) ? data : data?.content || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, isLoggedIn, navigate]);

  const handleLogout = () => { logout(); navigate(`/store/${slug}`); };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>My Account</Typography>
          <List>
            <ListItem disablePadding><ListItemButton onClick={() => navigate(`/store/${slug}/account`)}><ListItemText primary="Profile" /></ListItemButton></ListItem>
            <ListItem disablePadding><ListItemButton selected><ListItemText primary="Orders" /></ListItemButton></ListItem>
            <ListItem disablePadding><ListItemButton onClick={() => navigate(`/store/${slug}/account/addresses`)}><ListItemText primary="Addresses" /></ListItemButton></ListItem>
            <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemText primary="Logout" /></ListItemButton></ListItem>
          </List>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Typography variant="h4" gutterBottom sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>My Orders</Typography>
          {loading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : orders.length === 0 ? (
            <Typography color="text.secondary">No orders yet.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>{order.orderNumber || order.id}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={order.status} size="small"
                          color={order.status === 'CONFIRMED' ? 'success' : order.status === 'PENDING' ? 'warning' : 'default'} />
                      </TableCell>
                      <TableCell align="right">${order.total?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default CustomerOrdersPage;
