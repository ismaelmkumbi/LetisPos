import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, CircularProgress,
} from '@mui/material';
import { api } from '../../../api/smartpos/client';

interface Order {
  id: string; orderNumber: string; status: string; total: number;
  customerName?: string; createdAt: string; channel: string;
}

const CommerceOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/sales', { params: { channel: 'ONLINE', size: 50 } })
      .then(r => setOrders(Array.isArray(r.data?.content) ? r.data.content : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Online Orders</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No online orders yet.</TableCell></TableRow>
            ) : orders.map(o => (
              <TableRow key={o.id}>
                <TableCell>{o.orderNumber || o.id}</TableCell>
                <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{o.customerName || 'Guest'}</TableCell>
                <TableCell><Chip label={o.status} size="small"
                  color={o.status === 'CONFIRMED' ? 'success' : o.status === 'PENDING' ? 'warning' : 'default'} /></TableCell>
                <TableCell align="right">${o.total?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CommerceOrders;
