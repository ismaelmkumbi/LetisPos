/**
 * Letis POS -- Tenant self-service billing page.
 *
 * Shows current plan, usage vs limits, invoice history, and payment methods.
 * NOT the admin billing dashboard — for tenant users managing their own subscription.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconArrowUp,
  IconCreditCard,
  IconPlus,
  IconReceipt,
  IconTrash,
} from '@tabler/icons-react';

import {
  createPaymentMethod,
  deletePaymentMethod,
  getSubscription,
  listInvoices,
  listPaymentMethods,
  listPlans,
  type Invoice,
  type PaymentMethod,
  type PlanDefinition,
  type Subscription,
} from 'src/api/smartpos/billing';
import { fetchTenants, type Tenant } from 'src/api/smartpos/auth';
import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  CARD: 'Credit / Debit Card',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
};

const INVOICE_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID: { bg: brand.success.light, color: brand.success.dark },
  PENDING: { bg: brand.warning.light, color: brand.warning.dark },
  OVERDUE: { bg: brand.error.light, color: brand.error.dark },
  CANCELLED: { bg: brand.neutral[100], color: brand.neutral[700] },
};

function formatTzs(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-TZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TenantBillingPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add payment method dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPaymentLabel, setNewPaymentLabel] = useState('');
  const [newPaymentType, setNewPaymentType] = useState('CARD');
  const [newPaymentIsDefault, setNewPaymentIsDefault] = useState(false);
  const [addDialogSubmitting, setAddDialogSubmitting] = useState(false);
  const [addDialogError, setAddDialogError] = useState<string | null>(null);

  const fetchTenantData = async () => {
    let t: Tenant | null = null;

    try {
      const [ts, p] = await Promise.all([
        fetchTenants(),
        listPlans(),
      ]);
      t = ts[0] ?? null;
      setTenant(t);
      setPlans(p);

      if (t) {
        try {
          const sub = await getSubscription(t.id);
          setSubscription(sub);
        } catch {
          /* no subscription yet — not an error */
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing data');
      return;
    }

    // Fetch invoices and payment methods
    if (t) {
      setInvoicesLoading(true);
      setPaymentsLoading(true);
      const [invResult, pmResult] = await Promise.allSettled([
        listInvoices(t.id),
        listPaymentMethods(t.id),
      ]);
      if (invResult.status === 'fulfilled') setInvoices(invResult.value);
      if (pmResult.status === 'fulfilled') setPaymentMethods(pmResult.value);
      setInvoicesLoading(false);
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await fetchTenantData();
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const handleAddPaymentMethod = async () => {
    if (!tenant) return;
    setAddDialogSubmitting(true);
    setAddDialogError(null);
    try {
      const created = await createPaymentMethod({
        tenantId: tenant.id,
        type: newPaymentType,
        label: newPaymentLabel || PAYMENT_TYPE_LABELS[newPaymentType] || newPaymentType,
        isDefault: newPaymentIsDefault,
      });
      setPaymentMethods((prev) => [...prev, created]);
      setAddDialogOpen(false);
      setNewPaymentLabel('');
      setNewPaymentType('CARD');
      setNewPaymentIsDefault(false);
    } catch (e) {
      setAddDialogError(e instanceof Error ? e.message : 'Failed to add payment method');
    } finally {
      setAddDialogSubmitting(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      await deletePaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
    } catch {
      setError('Failed to remove payment method');
    }
  };

  const currentPlan = plans.find(
    (p) => p.code === (subscription?.planCode ?? tenant?.billingPlan),
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={36} sx={{ color: brand.primary[600] }} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription, view invoices, and update payment methods"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Current Plan */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Current Plan
              </Typography>

              <Typography variant="h4" sx={{ fontWeight: 800, color: brand.neutral[900] }}>
                {currentPlan?.label ?? tenant?.billingPlan ?? 'Free'}
              </Typography>

              {currentPlan && currentPlan.monthlyPriceTzs > 0 && (
                <Typography variant="body2" sx={{ color: brand.neutral[500], mt: 0.5 }}>
                  {formatTzs(currentPlan.monthlyPriceTzs)}
                  {subscription?.billingCycle === 'ANNUAL' ? '/year' : '/month'}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                {subscription && (
                  <Chip
                    label={subscription.status}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      borderRadius: '6px',
                      ...(subscription.status === 'ACTIVE'
                        ? { bgcolor: brand.success.light, color: brand.success.dark }
                        : subscription.status === 'PAST_DUE'
                          ? { bgcolor: brand.warning.light, color: brand.warning.dark }
                          : { bgcolor: brand.neutral[100], color: brand.neutral[700] }),
                    }}
                  />
                )}
                {subscription && (
                  <Chip
                    label={subscription.billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      borderRadius: '6px',
                      borderColor: brand.neutral[200],
                      color: brand.neutral[600],
                    }}
                  />
                )}
              </Stack>

              {subscription?.currentPeriodEnd && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: brand.neutral[500] }}>
                  Next billing date:{' '}
                  <Box component="span" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                    {formatDate(subscription.currentPeriodEnd)}
                  </Box>
                </Typography>
              )}

              <Button
                variant="outlined"
                sx={{
                  mt: 2,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  borderColor: brand.primary[300],
                  color: brand.primary[700],
                  '&:hover': {
                    borderColor: brand.primary[500],
                    bgcolor: brand.primary[50],
                  },
                }}
                startIcon={<IconArrowUp size={16} />}
              >
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 2, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Usage
              </Typography>

              {tenant && currentPlan ? (
                <Stack spacing={2.5}>
                  {([
                    { key: 'maxUsers' as const, label: 'Users' },
                    { key: 'maxStores' as const, label: 'Stores' },
                    { key: 'maxProducts' as const, label: 'Products' },
                  ]).map(({ key, label }) => {
                    const limit = currentPlan[key];
                    const isUnlimited = limit >= 2147483647;
                    return (
                      <Box key={key}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: brand.neutral[600], fontWeight: 500 }}>
                            {label}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: brand.neutral[800] }}>
                            &mdash; / {isUnlimited ? 'Unlimited' : limit.toLocaleString()}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={0}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: brand.neutral[100],
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              bgcolor: brand.primary[500],
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: brand.neutral[500] }}>
                  No plan information available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice History */}
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <IconReceipt size={18} color={brand.neutral[600]} />
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Invoice History
                </Typography>
              </Stack>

              {invoicesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} sx={{ color: brand.primary[600] }} />
                </Box>
              ) : invoices.length === 0 ? (
                <Typography variant="body2" sx={{ color: brand.neutral[500], py: 2 }}>
                  No invoices yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Invoice #
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Date
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Amount
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Status
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Payment Method
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((inv) => {
                        const statusStyle = INVOICE_STATUS_COLORS[inv.status] ?? INVOICE_STATUS_COLORS.PENDING;
                        return (
                          <TableRow
                            key={inv.id}
                            sx={{ '&:last-child td': { borderBottom: 0 } }}
                          >
                            <TableCell sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}>
                              {inv.invoiceNumber}
                            </TableCell>
                            <TableCell sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }}>
                              {formatDate(inv.createdAt)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: brand.neutral[800], fontSize: '0.8125rem' }}>
                              {formatTzs(inv.amountTzs)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={inv.status}
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.65rem',
                                  borderRadius: '5px',
                                  bgcolor: statusStyle.bg,
                                  color: statusStyle.color,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: brand.neutral[600], fontSize: '0.8125rem' }}>
                              {inv.paymentMethod ?? '&mdash;'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Methods */}
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              borderRadius: '12px',
              border: `1px solid ${brand.neutral[200]}`,
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconCreditCard size={18} color={brand.neutral[600]} />
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: brand.neutral[500], fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    Payment Methods
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconPlus size={14} />}
                  onClick={() => setAddDialogOpen(true)}
                  sx={{
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderColor: brand.neutral[200],
                    color: brand.neutral[700],
                    '&:hover': { borderColor: brand.primary[400], color: brand.primary[700], bgcolor: brand.primary[50] },
                  }}
                >
                  Add Payment Method
                </Button>
              </Stack>

              {paymentsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} sx={{ color: brand.primary[600] }} />
                </Box>
              ) : paymentMethods.length === 0 ? (
                <Typography variant="body2" sx={{ color: brand.neutral[500], py: 2 }}>
                  No payment methods on file.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {paymentMethods.map((pm) => (
                    <Stack
                      key={pm.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: '10px',
                        border: `1px solid ${brand.neutral[100]}`,
                        bgcolor: brand.neutral[50],
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: brand.primary[50],
                            color: brand.primary[600],
                          }}
                        >
                          <IconCreditCard size={18} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: brand.neutral[800] }}>
                            {pm.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                            {PAYMENT_TYPE_LABELS[pm.type] ?? pm.type}
                            {pm.isDefault && ' -- Default'}
                          </Typography>
                        </Box>
                      </Stack>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePaymentMethod(pm.id)}
                        sx={{
                          color: brand.neutral[400],
                          '&:hover': { color: brand.error.main, bgcolor: brand.error.light },
                        }}
                      >
                        <IconTrash size={16} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Payment Method Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              border: `1px solid ${brand.neutral[200]}`,
              boxShadow: '0 24px 48px rgba(15,23,42,0.16)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '1.05rem' }}>
          Add Payment Method
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {addDialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddDialogError(null)}>
              {addDialogError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Label"
              placeholder="e.g. Business Visa"
              value={newPaymentLabel}
              onChange={(e) => setNewPaymentLabel(e.target.value)}
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '8px' },
              }}
            />
            <TextField
              select
              label="Type"
              value={newPaymentType}
              onChange={(e) => setNewPaymentType(e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                select: { native: true },
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '8px' },
              }}
            >
              {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={newPaymentIsDefault}
                  onChange={(e) => setNewPaymentIsDefault(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: brand.neutral[700] }}>
                  Set as default payment method
                </Typography>
              }
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setAddDialogOpen(false)}
            disabled={addDialogSubmitting}
            sx={{
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              textTransform: 'none',
              color: brand.neutral[600],
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddPaymentMethod}
            disabled={addDialogSubmitting}
            sx={{
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8125rem',
              textTransform: 'none',
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {addDialogSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
