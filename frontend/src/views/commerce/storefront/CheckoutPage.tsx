import React, { useState } from 'react';
import {
  Container, Typography, Box, Button, TextField, Grid,
  Stepper, Step, StepLabel, Radio, FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router';
import { storefront } from '../../../api/smartpos/commerce';
import { useStorefront } from '../../../context/CommerceContext';
import type { AddressInput, ShippingRate } from '../../../types/commerce';

const steps = ['Shipping', 'Payment', 'Review'];

const emptyAddress: AddressInput = {
  firstName: '', lastName: '', line1: '', line2: '',
  city: '', state: '', country: '', postalCode: '', phone: '',
};

const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { cart, cartItemCount, refreshCart } = useStorefront();

  const [activeStep, setActiveStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<AddressInput>(emptyAddress);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressInput>(emptyAddress);
  const [shippingMethod, setShippingMethod] = useState('');
  const [, setShippingRates] = useState<ShippingRate[]>([]);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!slug) return null;

  if (cartItemCount === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5">Your cart is empty</Typography>
        <Button onClick={() => navigate(`/store/${slug}`)} sx={{ mt: 2 }}>Continue Shopping</Button>
      </Container>
    );
  }

  const handleAddressChange = (field: keyof AddressInput, value: string, isBilling = false) => {
    if (isBilling) {
      setBillingAddress(prev => ({ ...prev, [field]: value }));
    } else {
      setShippingAddress(prev => ({ ...prev, [field]: value }));
    }
  };

  const fetchShippingRates = async () => {
    setLoading(true);
    try {
      const rates = await storefront.getShippingRates(slug, cart!.id, shippingAddress.country, shippingAddress.postalCode);
      setShippingRates(rates);
      if (rates.length > 0) setShippingMethod(rates[0].id);
    } catch {
      setShippingRates([{ id: 'standard', name: 'Standard Shipping', type: 'flat_rate', amount: 5, minDays: 3, maxDays: 7, currency: 'USD' }]);
      setShippingMethod('standard');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.country) {
        setError('Please fill in all required shipping fields');
        return;
      }
      await fetchShippingRates();
    }
    if (activeStep === 1) {
      if (!cardNumber || !cardExpiry || !cardCvc) {
        setError('Please fill in all card details');
        return;
      }
    }
    setError(null);
    setActiveStep(prev => prev + 1);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await storefront.checkout(slug, {
        cartId: cart!.id,
        shippingAddress,
        billingAddress: billingSameAsShipping ? shippingAddress : billingAddress,
        billingSameAsShipping,
        shippingMethod,
      });
      await refreshCart();
      navigate(`/store/${slug}/order-confirmed/${result.orderId}`, {
        state: { orderNumber: result.orderNumber, total: result.total },
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderShippingStep = () => (
    <Grid container spacing={2}>
      {(['firstName', 'lastName', 'line1', 'line2', 'city', 'state', 'country', 'postalCode', 'phone'] as const).map(field => (
        <Grid size={{ xs: 12, sm: field === 'firstName' || field === 'lastName' ? 6 : 12 }} key={field}>
          <TextField
            fullWidth
            label={field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
            value={shippingAddress[field] || ''}
            onChange={e => handleAddressChange(field, e.target.value)}
            required={['firstName', 'lastName', 'line1', 'city', 'country', 'postalCode'].includes(field)}
            size="small"
          />
        </Grid>
      ))}
    </Grid>
  );

  const renderPaymentStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Card Details</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TextField fullWidth label="Card Number" value={cardNumber}
            onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
            placeholder="4242 4242 4242 4242" size="small" />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth label="MM/YY" value={cardExpiry}
            onChange={e => setCardExpiry(e.target.value)} placeholder="12/28" size="small" />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth label="CVC" value={cardCvc}
            onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} size="small" />
        </Grid>
      </Grid>
      <FormControlLabel
        control={<Radio checked={billingSameAsShipping} onChange={e => setBillingSameAsShipping(e.target.checked)} />}
        label="Billing address same as shipping"
        sx={{ mt: 2 }}
      />
    </Box>
  );

  const renderReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Shipping To</Typography>
      <Typography>{shippingAddress.firstName} {shippingAddress.lastName}</Typography>
      <Typography>{shippingAddress.line1}</Typography>
      {shippingAddress.line2 && <Typography>{shippingAddress.line2}</Typography>}
      <Typography>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</Typography>
      <Typography>{shippingAddress.country}</Typography>

      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Payment</Typography>
      <Typography>Card ending in {cardNumber.slice(-4)}</Typography>
      <Typography>Expires {cardExpiry}</Typography>

      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Order Items</Typography>
      {cart?.items?.map(item => (
        <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #eee' }}>
          <Typography>{item.productName || item.productId} x {item.quantity}</Typography>
          <Typography>${(item.lineTotal || item.unitPrice * item.quantity).toFixed(2)}</Typography>
        </Box>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '2px solid #ccc' }}>
        <Typography variant="h6">Total</Typography>
        <Typography variant="h6" fontWeight="bold">${cart?.subtotal?.toFixed(2) || '0.00'}</Typography>
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom
        sx={{ fontFamily: 'var(--commerce-font-heading, inherit)' }}>
        Checkout
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map(label => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      {activeStep === 0 && renderShippingStep()}
      {activeStep === 1 && renderPaymentStep()}
      {activeStep === 2 && renderReviewStep()}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button disabled={activeStep === 0 || loading} onClick={() => setActiveStep(prev => prev - 1)}>
          Back
        </Button>
        {activeStep < 2 ? (
          <Button variant="contained" onClick={handleNext} disabled={loading}
            sx={{ bgcolor: 'var(--commerce-primary, #1976d2)' }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Next'}
          </Button>
        ) : (
          <Button variant="contained" onClick={handlePlaceOrder} disabled={loading}
            sx={{ bgcolor: 'var(--commerce-accent, #10b981)' }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Place Order'}
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default CheckoutPage;
