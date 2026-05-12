import React from 'react';
import { Container, Typography, Button } from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router';

const OrderConfirmationPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { orderNumber?: string; total?: number } | null;

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <CheckIcon sx={{ fontSize: 64, color: 'var(--commerce-accent, #10b981)', mb: 2 }} />
      <Typography variant="h4" gutterBottom fontWeight="bold">Order Confirmed!</Typography>
      {state?.orderNumber && (
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Order #{state.orderNumber}
        </Typography>
      )}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Thank you for your purchase. You will receive a confirmation email shortly.
      </Typography>
      <Button variant="contained" onClick={() => navigate(`/store/${slug}`)}
        sx={{ bgcolor: 'var(--commerce-primary, #1976d2)', mr: 2 }}>
        Continue Shopping
      </Button>
      <Button variant="outlined" onClick={() => navigate(`/store/${slug}/account/orders`)}>
        View Orders
      </Button>
    </Container>
  );
};

export default OrderConfirmationPage;
