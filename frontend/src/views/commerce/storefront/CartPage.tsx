import React from 'react';
import {
  Container, Typography, Box, Button, IconButton, Divider, Grid,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../../context/CommerceContext';

const CartPage: React.FC = () => {
  const { slug, cart, cartItemCount, updateCartItem, removeCartItem } = useStorefront();
  const navigate = useNavigate();

  if (!cart?.items?.length) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Your cart is empty</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Looks like you haven't added anything yet.</Typography>
        <Button variant="contained" onClick={() => navigate(`/store/${slug}`)}
          sx={{ bgcolor: 'var(--commerce-primary, #1976d2)' }}>
          Start Shopping
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom
        sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>
        Shopping Cart ({cartItemCount} items)
      </Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          {cart.items.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">{item.productName || item.productId}</Typography>
                <Typography variant="body2" color="text.secondary">${item.unitPrice?.toFixed(2)} each</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton size="small" onClick={() => updateCartItem(item.id, Math.max(0, item.quantity - 1))}>
                  <RemoveIcon />
                </IconButton>
                <Typography sx={{ minWidth: 30, textAlign: 'center' }}>{item.quantity}</Typography>
                <IconButton size="small" onClick={() => updateCartItem(item.id, item.quantity + 1)}>
                  <AddIcon />
                </IconButton>
              </Box>
              <Typography fontWeight="bold" sx={{ minWidth: 80, textAlign: 'right' }}>
                ${(item.lineTotal || item.unitPrice * item.quantity).toFixed(2)}
              </Typography>
              <IconButton onClick={() => removeCartItem(item.id)} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ bgcolor: 'grey.50', p: 3, borderRadius: 2, position: 'sticky', top: 24 }}>
            <Typography variant="h6" gutterBottom>Order Summary</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal</Typography>
              <Typography>${cart.subtotal?.toFixed(2) || '0.00'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Shipping</Typography>
              <Typography color="text.secondary">Calculated at checkout</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" fontWeight="bold">${cart.subtotal?.toFixed(2) || '0.00'}</Typography>
            </Box>
            <Button variant="contained" fullWidth size="large"
              onClick={() => navigate(`/store/${slug}/checkout`)}
              sx={{ bgcolor: 'var(--commerce-accent, #10b981)', '&:hover': { bgcolor: '#059669' } }}>
              Proceed to Checkout
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate(`/store/${slug}`)}>
              Continue Shopping
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CartPage;
