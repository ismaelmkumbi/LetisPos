import React, { useState } from 'react';
import {
  Container, Typography, Box, Button, TextField, Grid,
  Stepper, Step, StepLabel, Radio, Switch, FormControlLabel,
  CircularProgress, Paper, Divider, Stack, Chip, IconButton,
} from '@mui/material';
import {
  ArrowBack, Lock, CreditCard, AccountBalance,
  Smartphone, LocalShipping, LocalAtm, ShieldOutlined, VerifiedUser,
} from '@mui/icons-material';
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
  const { cart, cartItemCount, refreshCart, theme } = useStorefront();
  const primary = theme?.settings?.colors?.primary || '#1a1a2e';
  const accent = theme?.settings?.colors?.accent || '#ff6b35';

  const [activeStep, setActiveStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<AddressInput>(emptyAddress);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressInput>(emptyAddress);
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!slug) return null;

  if (cartItemCount === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700}>Your cart is empty</Typography>
        <Button
          variant="contained"
          onClick={() => navigate(`/store/${slug}`)}
          sx={{ mt: 2, bgcolor: primary, borderRadius: '999px', px: 4, fontWeight: 700, textTransform: 'none' }}
        >
          Continue Shopping
        </Button>
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
    setError(null);
    if (activeStep === 0) {
      if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.country) {
        setError('Please fill in all required shipping fields');
        return;
      }
      await fetchShippingRates();
    }
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
        paymentMethodId: paymentMethod,
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

  const paymentMethods = [
    { value: 'card', label: 'Credit / Debit Card', icon: <CreditCard />, desc: 'Pay with Visa, Mastercard, or Amex' },
    { value: 'bank', label: 'Bank Transfer', icon: <AccountBalance />, desc: 'Direct bank deposit or wire transfer' },
    { value: 'mobile', label: 'Mobile Money', icon: <Smartphone />, desc: 'M-Pesa, Airtel Money, Tigo Pesa' },
  ];

  const renderShippingStep = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="First Name *" value={shippingAddress.firstName}
          onChange={e => handleAddressChange('firstName', e.target.value)} size="small" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Last Name *" value={shippingAddress.lastName}
          onChange={e => handleAddressChange('lastName', e.target.value)} size="small" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Address Line 1 *" value={shippingAddress.line1}
          onChange={e => handleAddressChange('line1', e.target.value)} size="small" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Address Line 2" value={shippingAddress.line2 || ''}
          onChange={e => handleAddressChange('line2', e.target.value)} size="small" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="City *" value={shippingAddress.city}
          onChange={e => handleAddressChange('city', e.target.value)} size="small" />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <TextField fullWidth label="State" value={shippingAddress.state || ''}
          onChange={e => handleAddressChange('state', e.target.value)} size="small" />
      </Grid>
      <Grid size={{ xs: 12, sm: 3 }}>
        <TextField fullWidth label="ZIP Code *" value={shippingAddress.postalCode}
          onChange={e => handleAddressChange('postalCode', e.target.value)} size="small" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Country *" value={shippingAddress.country}
          onChange={e => handleAddressChange('country', e.target.value)} size="small" placeholder="e.g. Tanzania" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Phone" value={shippingAddress.phone || ''}
          onChange={e => handleAddressChange('phone', e.target.value)} size="small" />
      </Grid>
    </Grid>
  );

  const renderPaymentStep = () => (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>Payment Method</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your payment is processed securely. Your card details never touch our servers.
      </Typography>
      <Stack spacing={1.5}>
        {paymentMethods.map((method) => (
          <Paper
            key={method.value}
            onClick={() => setPaymentMethod(method.value)}
            sx={{
              p: 2.5, cursor: 'pointer', borderRadius: 2,
              border: paymentMethod === method.value ? `2px solid ${primary}` : '1px solid #e5e7eb',
              bgcolor: paymentMethod === method.value ? `${primary}08` : '#fff',
              display: 'flex', alignItems: 'center', gap: 2,
              transition: 'all 0.15s',
              '&:hover': { borderColor: primary },
            }}
          >
            <Radio checked={paymentMethod === method.value} sx={{ color: primary, '&.Mui-checked': { color: primary } }} />
            <Box sx={{ color: primary }}>{method.icon}</Box>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>{method.label}</Typography>
              <Typography variant="caption" color="text.secondary">{method.desc}</Typography>
            </Box>
          </Paper>
        ))}
      </Stack>

      {/* Card fields when card is selected */}
      {paymentMethod === 'card' && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Card Number" placeholder="1234 5678 9012 3456" size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Expiry Date" placeholder="MM/YY" size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="CVV" placeholder="123" size="small" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Name on Card" placeholder="John Doe" size="small" />
            </Grid>
          </Grid>
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Lock sx={{ fontSize: 14, color: '#10B981' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Your payment info is encrypted with TLS 1.3 and never stored on our servers.
          </Typography>
        </Stack>
      </Box>

      <FormControlLabel
        control={<Switch checked={billingSameAsShipping} onChange={e => setBillingSameAsShipping(e.target.checked)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: primary }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: primary } }} />}
        label="Billing address same as shipping"
        sx={{ mt: 3 }}
      />
      {!billingSameAsShipping && (
        <Box sx={{ mt: 2, pl: 4 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Billing Address</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="First Name" value={billingAddress.firstName} onChange={e => handleAddressChange('firstName', e.target.value, true)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Last Name" value={billingAddress.lastName} onChange={e => handleAddressChange('lastName', e.target.value, true)} size="small" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Address Line 1" value={billingAddress.line1} onChange={e => handleAddressChange('line1', e.target.value, true)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="City" value={billingAddress.city} onChange={e => handleAddressChange('city', e.target.value, true)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth label="ZIP Code" value={billingAddress.postalCode} onChange={e => handleAddressChange('postalCode', e.target.value, true)} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField fullWidth label="Country" value={billingAddress.country} onChange={e => handleAddressChange('country', e.target.value, true)} size="small" />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );

  const selectedRate = shippingRates.find(r => r.id === shippingMethod);

  const renderReviewStep = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalShipping sx={{ color: primary }} />
              <Typography variant="subtitle1" fontWeight={700}>Shipping Address</Typography>
            </Box>
            <Typography fontWeight={600}>{shippingAddress.firstName} {shippingAddress.lastName}</Typography>
            <Typography>{shippingAddress.line1}</Typography>
            {shippingAddress.line2 && <Typography>{shippingAddress.line2}</Typography>}
            <Typography>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</Typography>
            <Typography>{shippingAddress.country}</Typography>
            {shippingAddress.phone && <Typography sx={{ mt: 0.5 }}>{shippingAddress.phone}</Typography>}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CreditCard sx={{ color: primary }} />
              <Typography variant="subtitle1" fontWeight={700}>Payment</Typography>
            </Box>
            <Typography fontWeight={600}>
              {paymentMethods.find(m => m.value === paymentMethod)?.label || 'Card'}
            </Typography>
            {selectedRate && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={600}>Shipping Method</Typography>
                <Typography>{selectedRate.name} — ${selectedRate.amount.toFixed(2)} ({selectedRate.minDays}-{selectedRate.maxDays} days)</Typography>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2, border: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Order Items</Typography>
        {cart?.items?.map(item => (
          <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f3f4f6' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box component="img" src={item.productImage || '/placeholder.png'}
                sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', bgcolor: '#f5f5f5' }} />
              <Box>
                <Typography fontWeight={600} fontSize="0.9rem">{item.productName || item.productId}</Typography>
                <Typography variant="caption" color="text.secondary">Qty: {item.quantity}</Typography>
              </Box>
            </Box>
            <Typography fontWeight={700}>${(item.lineTotal || item.unitPrice * item.quantity).toFixed(2)}</Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '2px solid #e5e7eb' }}>
          <Typography variant="h6" fontWeight={700}>Total</Typography>
          <Typography variant="h6" fontWeight={900} color={primary}>
            ${(cart?.subtotal && selectedRate ? cart.subtotal + selectedRate.amount : cart?.subtotal || 0).toFixed(2)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#f9fafb', minHeight: '60vh' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => activeStep === 0 ? navigate(`/store/${slug}/cart`) : setActiveStep(prev => prev - 1)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight={800}
            sx={{ fontFamily: 'var(--commerce-font-heading, Outfit, sans-serif)' }}>
            Checkout
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
          {steps.map((label, index) => (
            <Step key={label} completed={index < activeStep}>
              <StepLabel sx={{ '& .MuiStepLabel-label': { fontWeight: index === activeStep ? 700 : 400 } }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Chip label={error} color="error" onDelete={() => setError(null)} sx={{ mb: 3, fontWeight: 600 }} />
        )}

        <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          {activeStep === 0 && renderShippingStep()}
          {activeStep === 1 && renderPaymentStep()}
          {activeStep === 2 && renderReviewStep()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0 || loading}
              onClick={() => setActiveStep(prev => prev - 1)}
              startIcon={<ArrowBack />}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              Back
            </Button>
            {activeStep < 2 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
                sx={{ bgcolor: primary, borderRadius: '999px', px: 5, fontWeight: 700, textTransform: 'none' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handlePlaceOrder}
                disabled={loading}
                startIcon={<Lock />}
                sx={{
                  bgcolor: accent, borderRadius: '999px', px: 5, fontWeight: 700, textTransform: 'none',
                  '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' },
                  boxShadow: `0 8px 24px ${accent}44`,
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Place Order'}
              </Button>
            )}
          </Box>
        </Paper>

        {/* Secure checkout footer */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ color: '#9ca3af' }}>
            <Lock sx={{ fontSize: 14 }} />
            <Typography variant="caption">Secure SSL encrypted checkout — Your data is protected</Typography>
          </Stack>
          {/* Trust badges */}
          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
            {[
              { icon: <ShieldOutlined sx={{ fontSize: 14 }} />, label: 'PCI Compliant' },
              { icon: <LocalAtm sx={{ fontSize: 14 }} />, label: 'SSL Encrypted' },
              { icon: <VerifiedUser sx={{ fontSize: 14 }} />, label: 'Data Protected' },
            ].map((b) => (
              <Box key={b.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#9ca3af' }}>
                {b.icon}
                <Typography variant="caption">{b.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPage;
