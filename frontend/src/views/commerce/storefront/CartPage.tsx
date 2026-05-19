import React, { useState } from 'react';
import {
  Container, Typography, Box, Button, IconButton, Divider, Grid,
  Stack, Chip, Snackbar, Alert,
} from '@mui/material';
import {
  Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon,
  ArrowBack, LocalShipping, ShoppingBag, Lock,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../../context/CommerceContext';

const FREE_SHIPPING_THRESHOLD = 50;

const CartPage: React.FC = () => {
  const { slug, cart, cartItemCount, updateCartItem, removeCartItem, theme } = useStorefront();
  const navigate = useNavigate();
  const primary = theme?.settings?.colors?.primary || '#1a1a2e';
  const accent = theme?.settings?.colors?.accent || '#ff6b35';
  const [toast, setToast] = useState<string | null>(null);

  const subtotal = cart?.subtotal || 0;
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const qualifiesFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  const handleDecrement = (itemId: string, currentQty: number) => {
    const newQty = currentQty - 1;
    if (newQty <= 0) {
      removeCartItem(itemId);
      setToast('Item removed from cart');
    } else {
      updateCartItem(itemId, newQty);
    }
  };

  if (!cart?.items?.length) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <ShoppingBag sx={{ fontSize: 80, color: '#d1d5db', mb: 3 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Your cart is empty
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Looks like you haven&apos;t added anything yet. Discover great products!
        </Typography>
        <Button variant="contained" size="large" startIcon={<ArrowBack />}
          onClick={() => navigate(`/store/${slug}`)}
          sx={{ bgcolor: primary, borderRadius: '999px', px: 4, py: 1.5, fontWeight: 700, textTransform: 'none' }}>
          Start Shopping
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'var(--commerce-bg-muted, #f9fafb)', minHeight: '60vh' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton aria-label="Go back" onClick={() => navigate(`/store/${slug}`)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight={800}
            sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)' }}>
            Shopping Cart
          </Typography>
          <Chip label={`${cartItemCount} item${cartItemCount !== 1 ? 's' : ''}`} size="small" sx={{ fontWeight: 600 }} />
        </Box>

        <Grid container spacing={3}>
          {/* Cart Items */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: { xs: 2, md: 3 }, border: '1px solid var(--commerce-border, #e5e7eb)' }}>
              {/* Free shipping progress */}
              <Box sx={{ bgcolor: qualifiesFreeShipping ? '#f0fdf4' : '#eff6ff', p: 2, borderRadius: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: qualifiesFreeShipping ? 0 : 1 }}>
                  <LocalShipping sx={{ color: qualifiesFreeShipping ? '#16a34a' : primary }} />
                  <Typography variant="body2" fontWeight={600} sx={{ color: qualifiesFreeShipping ? '#166534' : '#1e40af' }}>
                    {qualifiesFreeShipping
                      ? 'You qualify for free shipping!'
                      : `Add $${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} more for free shipping`}
                  </Typography>
                </Box>
                {!qualifiesFreeShipping && (
                  <Box sx={{ mt: 1, height: 6, borderRadius: '999px', bgcolor: '#e5e7eb', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', borderRadius: '999px', bgcolor: primary, width: `${shippingProgress}%`, transition: 'width 0.3s' }} />
                  </Box>
                )}
              </Box>

              {cart.items.map((item, index) => (
                <Box key={item.id}>
                  {index > 0 && <Divider sx={{ my: 2 }} />}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box component="img" src={item.productImage || '/placeholder.png'}
                      alt={item.productName || item.productId}
                      sx={{ width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, objectFit: 'cover', borderRadius: 2, bgcolor: '#f5f5f5', flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap
                        sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)', cursor: 'pointer' }}
                        onClick={() => navigate(`/store/${slug}/products/${item.productId}`)}>
                        {item.productName || item.productId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        ${item.unitPrice?.toFixed(2)} each
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid var(--commerce-border, #e5e7eb)', borderRadius: '8px' }}>
                          <IconButton aria-label="Decrease quantity" size="small" onClick={() => handleDecrement(item.id, item.quantity)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</Typography>
                          <IconButton aria-label="Increase quantity" size="small" onClick={() => updateCartItem(item.id, item.quantity + 1)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <IconButton aria-label={`Remove ${item.productName || 'item'} from cart`}
                          onClick={() => { removeCartItem(item.id); setToast('Item removed from cart'); }}
                          size="small" sx={{ color: '#ef4444' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="h6" fontWeight={800} color={primary}
                      sx={{ flexShrink: 0, minWidth: 80, textAlign: 'right', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      ${(item.lineTotal || item.unitPrice * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Button onClick={() => navigate(`/store/${slug}`)} startIcon={<ArrowBack />}
              sx={{ mt: 2, fontWeight: 600, textTransform: 'none' }}>
              Continue Shopping
            </Button>
          </Grid>

          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: 'sticky', top: 100 }}>
              <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 3, border: '1px solid var(--commerce-border, #e5e7eb)' }}>
                <Typography variant="h6" fontWeight={800} gutterBottom>Order Summary</Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Subtotal ({cartItemCount} item{cartItemCount !== 1 ? 's' : ''})</Typography>
                    <Typography fontWeight={700}>${subtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Shipping</Typography>
                    <Typography fontWeight={600} color={qualifiesFreeShipping ? 'success.main' : 'text.secondary'}>
                      {qualifiesFreeShipping ? 'FREE' : 'Calculated at checkout'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Tax</Typography>
                    <Typography color="text.secondary">Calculated at checkout</Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" fontWeight={800}>Total</Typography>
                  <Typography variant="h6" fontWeight={900} color={primary}>${subtotal.toFixed(2)}</Typography>
                </Box>

                <Button variant="contained" fullWidth size="large"
                  onClick={() => navigate(`/store/${slug}/checkout`)}
                  sx={{ bgcolor: accent, borderRadius: '999px', fontWeight: 700, fontSize: '1rem', textTransform: 'none', py: 1.5, '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' }, boxShadow: `0 8px 24px ${accent}44` }}>
                  Proceed to Checkout
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 2 }}>
                  <Lock sx={{ fontSize: 14, color: '#9ca3af' }} />
                  <Typography variant="caption" color="text.secondary">Secure SSL encrypted checkout</Typography>
                </Box>
              </Box>

              {/* Payment methods */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 2 }}>
                {['Visa', 'Mastercard', 'Amex', 'PayPal'].map(m => (
                  <Box key={m} sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', bgcolor: '#f3f4f6', px: 1.5, py: 0.5, borderRadius: 1 }}>{m}</Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Toast */}
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="info" variant="filled" onClose={() => setToast(null)} sx={{ fontWeight: 600 }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CartPage;
