import React from 'react';
import {
  Drawer, Box, Typography, IconButton, Button, Divider,
} from '@mui/material';
import { Close as CloseIcon, Delete as DeleteIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useStorefront } from '../../context/CommerceContext';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ open, onClose }) => {
  const { slug, cart, cartItemCount, updateCartItem, removeCartItem } = useStorefront();
  const navigate = useNavigate();

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 400 }, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Cart ({cartItemCount})</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
        <Divider />
        {!cart?.items?.length ? (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Your cart is empty</Typography>
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 2 }}>
            {cart.items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2">{item.productName || item.productId}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <IconButton size="small" onClick={() => updateCartItem(item.id, Math.max(0, item.quantity - 1))}>
                      <RemoveIcon />
                    </IconButton>
                    <Typography>{item.quantity}</Typography>
                    <IconButton size="small" onClick={() => updateCartItem(item.id, item.quantity + 1)}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    ${(item.lineTotal || item.unitPrice * item.quantity).toFixed(2)}
                  </Typography>
                  <IconButton size="small" onClick={() => removeCartItem(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {((cart?.items?.length ?? 0) > 0) && (
          <Box sx={{ pt: 2 }}>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
              <Typography variant="subtitle1">Subtotal</Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                ${cart?.subtotal?.toFixed(2) || '0.00'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => { onClose(); navigate(`/store/${slug}/cart`); }}
              sx={{ mb: 1, bgcolor: 'var(--commerce-primary, #1976d2)' }}
            >
              View Cart
            </Button>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => { onClose(); navigate(`/store/${slug}/checkout`); }}
              sx={{ bgcolor: 'var(--commerce-accent, #10b981)' }}
            >
              Checkout
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default CartDrawer;
