# Mobile POS & Credit Sales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add credit sales ("Pay Later") to the POS terminal with customer debt tracking, collection flows, and debt reporting — all on existing Sale/Payment/Customer entities.

**Architecture:** Shared payment zone component replaces hardcoded Pay button across layouts. CustomerChip component adds debt badge to layout headers. New pages for collections and credit accounts. Everything reuses existing MUI, brand tokens, and API patterns. No backend changes needed.

**Tech Stack:** React 18, TypeScript, MUI v5, existing `brand.ts` tokens, existing API client (`api` from `client.ts`)

---

## File Map

| File | Create/Modify | Responsibility |
|------|:---:|------|
| `frontend/src/api/smartpos/credit.ts` | Create | Credit-specific API helpers: customer balance, debt listing |
| `frontend/src/components/smartpos/CustomerChip.tsx` | Create | Customer selector with debt badge, credit status indicator |
| `frontend/src/components/smartpos/CreditPaymentZone.tsx` | Create | Payment method selector: Cash, Card, Pay Later, Split |
| `frontend/src/components/smartpos/WalkInPaymentModal.tsx` | Create | Modal for recording debt payments (no purchase) |
| `frontend/src/components/smartpos/DebtorsSheet.tsx` | Create | Bottom sheet listing all debtors from POS header |
| `frontend/src/views/smartpos/pos/CreditAccountPage.tsx` | Create | Full customer ledger: balance, aging, transaction history |
| `frontend/src/views/smartpos/pos/CollectionsRunPage.tsx` | Create | Mobile-optimized collection round view |
| `frontend/src/components/smartpos/PaymentSuccessOverlay.tsx` | Modify | Add credit sale confirmation variant |
| `frontend/src/components/smartpos/Receipt.tsx` | Modify | Show previous balance + new balance on credit receipts |
| `frontend/src/components/smartpos/PosLayouts/SplitLayout.tsx` | Modify | Integrate CustomerChip + CreditPaymentZone |
| `frontend/src/views/smartpos/pos/PosTerminalPage.tsx` | Modify | Add credit state, payment allocation, debt tracking |
| `frontend/src/routes/Router.tsx` | Modify | Add routes for CreditAccountPage, CollectionsRunPage |

---

### Task 1: Credit API Helpers

**Files:**
- Create: `frontend/src/api/smartpos/credit.ts`

- [ ] **Step 1: Write the credit API module**

```typescript
/**
 * Credit / debt API helpers.
 *
 * All data is derived from existing Sale + Payment + Customer endpoints.
 * No new backend controllers required.
 */
import { api } from './client';
import { listSales, type Sale } from './sales';
import { listPayments, type Payment } from './payments';
import { getCustomerBalance, type CustomerBalance } from './storeCredit';
import type { UUID, Customer, Page } from './types';

export interface CustomerDebt {
  customerId: UUID;
  customerName: string;
  outstanding: number;
  creditLimit: number;
  available: number;
  lastPaymentDate: string | null;
  overdue: boolean;
  saleCount: number;
}

export interface DebtAging {
  current: number;   // < 30 days
  days30to60: number;
  days60to90: number;
  days90plus: number;
}

/** Aggregate unpaid sales grouped by customer. */
export async function listDebtors(params?: {
  overdueOnly?: boolean;
  search?: string;
}): Promise<CustomerDebt[]> {
  const [salesPage, customersPage] = await Promise.all([
    listSales({ paymentStatus: 'UNPAID', size: 500 }),
    // Also fetch PARTIAL sales — they still have outstanding debt
    listSales({ paymentStatus: 'PARTIAL', size: 500 }),
  ]);

  const unpaidSales = [...salesPage.content, ...customersPage.content];

  // Group by customerId
  const byCustomer = new Map<UUID, Sale[]>();
  for (const sale of unpaidSales) {
    if (!sale.customerId) continue;
    const existing = byCustomer.get(sale.customerId) || [];
    existing.push(sale);
    byCustomer.set(sale.customerId, existing);
  }

  // Build debtor list
  const results: CustomerDebt[] = [];
  for (const [customerId, sales] of byCustomer) {
    const outstanding = sales.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
    const oldest = sales.reduce((min, s) =>
      s.createdAt < min ? s.createdAt : min, sales[0].createdAt);

    const now = Date.now();
    const overdue = new Date(oldest).getTime() < now - 30 * 24 * 60 * 60 * 1000;

    results.push({
      customerId,
      customerName: '', // populated below
      outstanding,
      creditLimit: 0,
      available: 0,
      lastPaymentDate: null,
      overdue,
      saleCount: sales.length,
    });
  }

  // Fetch customer names and credit limits in parallel
  const customerFetches = results.map(async (d) => {
    try {
      const { data: customer } = await api.get<Customer>(`/api/v1/customers/${d.customerId}`);
      d.customerName = customer.name;
      d.creditLimit = customer.creditLimit;
      d.available = Math.max(0, customer.creditLimit - d.outstanding);
    } catch {
      d.customerName = d.customerId.slice(0, 8);
    }
  });
  await Promise.all(customerFetches);

  // Filter overdue
  let filtered = results.filter((d) => d.outstanding > 0);
  if (params?.overdueOnly) filtered = filtered.filter((d) => d.overdue);
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((d) => d.customerName.toLowerCase().includes(q));
  }

  // Sort: highest outstanding first
  filtered.sort((a, b) => b.outstanding - a.outstanding);
  return filtered;
}

/** Get debt breakdown for one customer. */
export async function getCustomerDebt(customerId: UUID): Promise<{
  customer: Customer;
  balance: number;
  creditLimit: number;
  available: number;
  aging: DebtAging;
  sales: Sale[];
  payments: Payment[];
}> {
  const { data: customer } = await api.get<Customer>(`/api/v1/customers/${customerId}`);
  const salesPage = await listSales({ customerId, paymentStatus: 'UNPAID', size: 200 });
  const partialPage = await listSales({ customerId, paymentStatus: 'PARTIAL', size: 200 });
  const paidPage = await listSales({ customerId, paymentStatus: 'PAID', size: 200 });

  const allSales = [...salesPage.content, ...partialPage.content, ...paidPage.content];
  const unpaidSales = [...salesPage.content, ...partialPage.content];

  const balance = unpaidSales.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);

  // Compute aging buckets
  const now = Date.now();
  const aging: DebtAging = { current: 0, days30to60: 0, days60to90: 0, days90plus: 0 };
  for (const sale of unpaidSales) {
    const age = now - new Date(sale.createdAt).getTime();
    const days = age / (24 * 60 * 60 * 1000);
    const due = sale.dueTotal || sale.grandTotal;
    if (days < 30) aging.current += due;
    else if (days < 60) aging.days30to60 += due;
    else if (days < 90) aging.days60to90 += due;
    else aging.days90plus += due;
  }

  // Get payments for this customer's sales
  const payments: Payment[] = [];
  for (const sale of allSales) {
    try {
      const { data } = await api.get<Page<Payment>>('/api/v1/payments', {
        params: { referenceType: 'SALE', referenceId: sale.id, size: 50 },
      });
      payments.push(...data.content);
    } catch { /* skip */ }
  }

  return {
    customer,
    balance,
    creditLimit: customer.creditLimit,
    available: Math.max(0, customer.creditLimit - balance),
    aging,
    sales: allSales,
    payments,
  };
}

/** Get total outstanding debt for dashboard widget. */
export async function getTotalOutstanding(): Promise<{
  total: number;
  overdueTotal: number;
  debtorCount: number;
  collectedThisMonth: number;
}> {
  const [unpaidPage, partialPage] = await Promise.all([
    listSales({ paymentStatus: 'UNPAID', size: 500 }),
    listSales({ paymentStatus: 'PARTIAL', size: 500 }),
  ]);

  const allUnpaid = [...unpaidPage.content, ...partialPage.content];
  const customerIds = new Set(allUnpaid.map((s) => s.customerId).filter(Boolean));
  const now = Date.now();
  const thirtyDays = now - 30 * 24 * 60 * 60 * 1000;

  let total = 0;
  let overdueTotal = 0;
  for (const sale of allUnpaid) {
    const due = sale.dueTotal || sale.grandTotal;
    total += due;
    if (new Date(sale.createdAt).getTime() < thirtyDays) {
      overdueTotal += due;
    }
  }

  // Collected this month: sum of payments this month for SALE reference type
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  let collectedThisMonth = 0;
  try {
    const { data } = await api.get<Page<Payment>>('/api/v1/payments', {
      params: { referenceType: 'SALE', dateFrom: monthStart, size: 500 },
    });
    collectedThisMonth = data.content.reduce((sum, p) => sum + p.amount, 0);
  } catch { /* skip */ }

  return {
    total,
    overdueTotal,
    debtorCount: customerIds.size,
    collectedThisMonth,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/credit.ts
git commit -m "feat: add credit API helpers — customer balance, debtors list, aging"
```

---

### Task 2: CustomerChip Component

**Files:**
- Create: `frontend/src/components/smartpos/CustomerChip.tsx`

- [ ] **Step 1: Write the CustomerChip component**

```typescript
/**
 * CustomerChip — customer selector with debt context badge.
 *
 * States:
 *  - Walk-in: neutral chip, no badge
 *  - Known, no debt: green border, customer name
 *  - Known, has debt: amber border, "Owes $X" badge
 *  - Known, over limit: red border, blocked indicator
 */
import { useState, useEffect } from 'react';
import {
  Badge,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconChevronDown,
  IconUser,
  IconAlertTriangle,
} from '@tabler/icons-react';
import type { Customer } from 'src/api/smartpos/types';
import type { UUID } from 'src/api/smartpos/types';
import { listCustomers } from 'src/api/smartpos/customers';
import { listSales } from 'src/api/smartpos/sales';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export interface CustomerChipProps {
  customerId: string | null;
  customers: Customer[];
  onCustomerChange: (id: string | null) => void;
  onCustomerCreated: (customer: Customer) => void;
  onViewAccount?: (customerId: string) => void;
}

export default function CustomerChip({
  customerId,
  customers,
  onCustomerChange,
  onCustomerCreated,
  onViewAccount,
}: CustomerChipProps) {
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId) || null;

  // Fetch balance when customer changes
  useEffect(() => {
    if (!customerId || customerId === '__walkin__') {
      setCustomerBalance(null);
      return;
    }
    setLoading(true);
    listSales({ customerId, paymentStatus: 'UNPAID', size: 200 })
      .then((unpaid) => {
        return listSales({ customerId, paymentStatus: 'PARTIAL', size: 200 })
          .then((partial) => {
            const all = [...unpaid.content, ...partial.content];
            const balance = all.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
            setCustomerBalance(balance);
          });
      })
      .catch(() => setCustomerBalance(null))
      .finally(() => setLoading(false));
  }, [customerId]);

  const hasDebt = customerBalance !== null && customerBalance > 0;
  const overLimit = selectedCustomer && customerBalance !== null
    && customerBalance >= selectedCustomer.creditLimit;
  const available = selectedCustomer
    ? Math.max(0, selectedCustomer.creditLimit - (customerBalance || 0))
    : null;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        icon={<IconUser size={14} />}
        label={selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
        deleteIcon={<IconChevronDown size={14} />}
        onDelete={() => {}} // triggers the click to open selector
        onClick={() => {}} // handled by parent
        variant={selectedCustomer ? 'filled' : 'outlined'}
        sx={{
          fontWeight: 700,
          fontSize: '0.82rem',
          borderRadius: '10px',
          height: 36,
          borderColor: overLimit
            ? brand.error.main
            : hasDebt
              ? brand.warning.main
              : selectedCustomer
                ? brand.primary[300]
                : brand.neutral[300],
          bgcolor: overLimit
            ? brand.error.light
            : hasDebt
              ? brand.warning.light
              : selectedCustomer
                ? brand.primary[50]
                : 'transparent',
          color: overLimit
            ? brand.error.dark
            : hasDebt
              ? brand.warning.dark
              : selectedCustomer
                ? brand.primary[700]
                : brand.neutral[600],
        }}
      />

      {loading && <CircularProgress size={14} />}

      {hasDebt && (
        <Tooltip title={`Credit limit: ${fmt(selectedCustomer?.creditLimit || 0)} · Available: ${fmt(available || 0)}`}>
          <Chip
            label={`Owes ${fmt(customerBalance!)}`}
            size="small"
            icon={overLimit ? <IconAlertTriangle size={12} /> : undefined}
            onClick={() => onViewAccount?.(customerId!)}
            sx={{
              height: 28,
              fontWeight: 800,
              fontSize: '0.72rem',
              borderRadius: '8px',
              bgcolor: overLimit ? brand.error.light : brand.warning.light,
              color: overLimit ? brand.error.dark : brand.warning.dark,
              cursor: 'pointer',
            }}
          />
        </Tooltip>
      )}

      {selectedCustomer && !hasDebt && selectedCustomer.creditLimit > 0 && (
        <Typography variant="caption" sx={{ color: brand.success.dark, fontWeight: 600 }}>
          Clear · Limit {fmt(selectedCustomer.creditLimit)}
        </Typography>
      )}
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/CustomerChip.tsx
git commit -m "feat: add CustomerChip component with debt badge states"
```

---

### Task 3: CreditPaymentZone Component

**Files:**
- Create: `frontend/src/components/smartpos/CreditPaymentZone.tsx`

- [ ] **Step 1: Write the CreditPaymentZone component**

```typescript
/**
 * CreditPaymentZone — payment method selector with Pay Later support.
 *
 * Replaces the hardcoded "Pay ${total}" button in layout footers.
 * Shows Cash, Card, Pay Later (when customer has credit), and Split options.
 */
import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconCash,
  IconCreditCard,
  IconReceipt,
  IconArrowsSplit,
  IconCheck,
} from '@tabler/icons-react';
import type { Customer } from 'src/api/smartpos/types';
import type { UUID } from 'src/api/smartpos/types';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export type CreditPaymentMethod = 'CASH' | 'CARD' | 'CREDIT' | 'SPLIT';

export interface SplitAllocation {
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
}

export interface CreditPaymentZoneProps {
  /** Grand total to pay */
  total: number;
  currency?: string;
  /** Selected customer */
  customerId: string | null;
  customers: Customer[];
  /** Customer's current outstanding balance (null = loading or walk-in) */
  customerBalance: number | null;
  /** Whether credit is available for this customer */
  creditAvailable: boolean;
  /** Credit limit */
  creditLimit: number;
  /** Submitting state */
  submitting: boolean;
  /** Whether checkout is allowed */
  canCheckout: boolean;
  /** Callback with selected payment method and split/credit details */
  onCheckout: (method: CreditPaymentMethod, split?: SplitAllocation) => void;
}

export default function CreditPaymentZone({
  total,
  currency,
  customerId,
  customerBalance,
  creditAvailable,
  creditLimit,
  submitting,
  canCheckout,
  onCheckout,
}: CreditPaymentZoneProps) {
  const [selectedMethod, setSelectedMethod] = useState<CreditPaymentMethod>('CASH');
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitCredit, setSplitCredit] = useState('');

  const newBalance = customerBalance !== null
    ? customerBalance + (selectedMethod === 'CREDIT' ? total : 0)
    : null;

  const wouldExceedLimit = creditLimit > 0 && newBalance !== null && newBalance > creditLimit;

  const methods: { key: CreditPaymentMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'CASH', label: 'Cash', icon: <IconCash size={18} /> },
    { key: 'CARD', label: 'Card', icon: <IconCreditCard size={18} /> },
  ];

  if (creditAvailable) {
    methods.push({ key: 'CREDIT', label: 'Pay Later', icon: <IconReceipt size={18} /> });
  }
  methods.push({ key: 'SPLIT', label: 'Split', icon: <IconArrowsSplit size={18} /> });

  const handleSplitConfirm = () => {
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    const credit = parseFloat(splitCredit) || 0;
    onCheckout('SPLIT', { cashAmount: cash, cardAmount: card, creditAmount: credit });
    setSplitOpen(false);
  };

  return (
    <Box>
      {/* Method selector */}
      <Stack spacing={1} sx={{ mb: 1.5 }}>
        {methods.map((m) => {
          const active = selectedMethod === m.key;
          const isCredit = m.key === 'CREDIT';
          const isBlocked = isCredit && wouldExceedLimit;

          return (
            <Button
              key={m.key}
              variant={active ? 'contained' : 'outlined'}
              startIcon={m.icon}
              disabled={isBlocked}
              onClick={() => setSelectedMethod(m.key)}
              sx={{
                textTransform: 'none',
                fontWeight: active ? 800 : 600,
                borderRadius: '12px',
                py: 1.2,
                justifyContent: 'flex-start',
                borderColor: active ? 'transparent' : brand.neutral[200],
                bgcolor: active
                  ? isCredit
                    ? brand.primary[600]
                    : brand.neutral[800]
                  : 'transparent',
                color: active ? '#fff' : isCredit ? brand.primary[600] : brand.neutral[800],
                '&:hover': {
                  bgcolor: active
                    ? isCredit
                      ? brand.primary[700]
                      : brand.neutral[900]
                    : isCredit
                      ? brand.primary[50]
                      : brand.neutral[50],
                },
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography sx={{ fontWeight: 'inherit', fontSize: '0.85rem' }}>
                  {m.label}
                </Typography>
                {isCredit && newBalance !== null && (
                  <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
                    New balance: {fmt(newBalance)}
                  </Typography>
                )}
                {isBlocked && (
                  <Typography variant="caption" sx={{ color: brand.error.main, fontWeight: 700 }}>
                    Would exceed credit limit ({fmt(creditLimit)})
                  </Typography>
                )}
              </Box>
              {active && <IconCheck size={18} />}
            </Button>
          );
        })}
      </Stack>

      {/* Pay button */}
      <Button
        fullWidth
        variant="contained"
        disabled={!canCheckout || submitting}
        onClick={() => {
          if (selectedMethod === 'SPLIT') {
            // Pre-fill split: cash = total, credit = 0
            setSplitCash(total.toString());
            setSplitCard('0');
            setSplitCredit('0');
            setSplitOpen(true);
          } else {
            onCheckout(selectedMethod);
          }
        }}
        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <IconCheck size={18} />}
        sx={{
          textTransform: 'none',
          fontWeight: 800,
          borderRadius: '12px',
          py: 1.5,
          fontSize: '0.95rem',
          bgcolor: brand.primary[600],
          '&:hover': { bgcolor: brand.primary[700] },
          boxShadow: `0 12px 28px -14px ${brand.primary[600]}bb`,
        }}
      >
        {submitting
          ? 'Processing…'
          : selectedMethod === 'CREDIT'
            ? `Add to Tab — ${fmt(total, currency)}`
            : `Pay ${fmt(total, currency)}`}
      </Button>

      {/* Split modal */}
      <Dialog open={splitOpen} onClose={() => setSplitOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Split Payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Cash"
              type="number"
              value={splitCash}
              onChange={(e) => setSplitCash(e.target.value)}
              InputProps={{ startAdornment: <IconCash size={16} style={{ marginRight: 8 }} /> }}
              fullWidth
            />
            <TextField
              label="Card"
              type="number"
              value={splitCard}
              onChange={(e) => setSplitCard(e.target.value)}
              InputProps={{ startAdornment: <IconCreditCard size={16} style={{ marginRight: 8 }} /> }}
              fullWidth
            />
            {creditAvailable && (
              <TextField
                label="Pay Later (add to tab)"
                type="number"
                value={splitCredit}
                onChange={(e) => setSplitCredit(e.target.value)}
                InputProps={{ startAdornment: <IconReceipt size={16} style={{ marginRight: 8 }} /> }}
                fullWidth
              />
            )}
            <Typography variant="body2" sx={{ fontWeight: 700, color: brand.neutral[600] }}>
              Total: {fmt(total)} · Remaining: {fmt(total - (parseFloat(splitCash) || 0) - (parseFloat(splitCard) || 0) - (parseFloat(splitCredit) || 0))}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSplitConfirm} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Confirm Split
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/CreditPaymentZone.tsx
git commit -m "feat: add CreditPaymentZone — Cash, Card, Pay Later, Split payments"
```

---

### Task 4: Integrate CustomerChip + CreditPaymentZone into SplitLayout

**Files:**
- Modify: `frontend/src/components/smartpos/PosLayouts/SplitLayout.tsx`
- Modify: `frontend/src/components/smartpos/PosLayouts/PosLayoutProps.ts`

- [ ] **Step 1: Read PosLayoutProps to understand existing interface**

Read `frontend/src/components/smartpos/PosLayouts/PosLayoutProps.ts` and `shared.tsx`.

- [ ] **Step 2: Add credit-related props to PosLayoutProps**

In `frontend/src/components/smartpos/PosLayouts/PosLayoutProps.ts`, add these fields to the `PosLayoutProps` interface:

```typescript
// Credit sales additions
customerBalance: number | null;
creditAvailable: boolean;
onViewCreditAccount?: (customerId: string) => void;
onCheckoutWithMethod: (method: 'CASH' | 'CARD' | 'CREDIT' | 'SPLIT', split?: { cashAmount: number; cardAmount: number; creditAmount: number }) => void;
```

- [ ] **Step 3: Update SplitLayout's cart footer**

In `frontend/src/components/smartpos/PosLayouts/SplitLayout.tsx`:

**Add imports at top (line 8-30):**
```typescript
import CustomerChip from 'src/components/smartpos/CustomerChip';
import CreditPaymentZone from 'src/components/smartpos/CreditPaymentZone';
```

**Add CustomerChip in the cart header** (replace the static "Cart" title around line 86-88). Inside `renderCartContent()`, change the header stack to:

```typescript
<Stack direction="row" alignItems="center" justifyContent="space-between"
  sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${brand.neutral[100]}`, flexShrink: 0 }}>
  <Stack direction="row" alignItems="center" spacing={1}>
    <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Cart</Typography>
    <Chip label={`${itemCount}`} size="small"
      sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', bgcolor: brand.primary[50], color: brand.primary[700], borderRadius: '8px' }} />
  </Stack>
  <Stack direction="row" spacing={0.5}>
    {props.lines.length > 0 && (
      <>
        <Button size="small" onClick={props.onClearCart}
          sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: brand.error.main }}>Clear</Button>
        <Button size="small" onClick={props.onSuspendCart}
          sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: brand.primary[600] }}>Suspend</Button>
      </>
    )}
    {isMobile && <IconButton onClick={() => setCartOpen(false)} size="small"><IconX size={18} /></IconButton>}
  </Stack>
</Stack>

{/* Add CustomerChip in cart — visible on desktop */}
{!isMobile && (
  <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${brand.neutral[100]}` }}>
    <CustomerChip
      customerId={props.customerId}
      customers={props.customers}
      onCustomerChange={(id) => props.onCustomerChange(id ?? null)}
      onCustomerCreated={props.onCustomerCreated}
      onViewAccount={props.onViewCreditAccount}
    />
  </Box>
)}
```

**Replace the hardcoded Pay button** (around line 148-155) with CreditPaymentZone:

```typescript
{props.lines.length > 0 && (
  <Box sx={{ borderTop: `1px solid ${brand.neutral[200]}`, px: 2, pt: 1.5, pb: isMobile ? 'calc(16px + env(safe-area-inset-bottom, 8px))' : 2, flexShrink: 0 }}>
    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
      <TotalRow label="Subtotal" value={fmt(totals.subtotal)} size="small" />
      <TotalRow label="Tax" value={fmt(totals.tax)} size="small" />
      {totals.disc > 0 && <TotalRow label="Discount" value={`-${fmt(totals.disc)}`} size="small" />}
      <TotalRow label="Total" value={fmt(totals.grand)} valueWeight={900} size="medium" />
    </Stack>
    <CreditPaymentZone
      total={totals.grand}
      customerId={props.customerId}
      customers={props.customers}
      customerBalance={props.customerBalance}
      creditAvailable={props.creditAvailable}
      creditLimit={props.customers.find(c => c.id === props.customerId)?.creditLimit || 0}
      submitting={props.submitting}
      canCheckout={props.canCheckout}
      onCheckout={(method, split) => {
        setCartOpen(false);
        props.onCheckoutWithMethod(method, split);
      }}
    />
  </Box>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/smartpos/PosLayouts/SplitLayout.tsx frontend/src/components/smartpos/PosLayouts/PosLayoutProps.ts
git commit -m "feat: integrate CustomerChip and CreditPaymentZone into SplitLayout"
```

---

### Task 5: Credit-Aware Receipt

**Files:**
- Modify: `frontend/src/components/smartpos/Receipt.tsx`

- [ ] **Step 1: Add credit balance fields to ReceiptLookups and PrintReceiptOptions**

In `Receipt.tsx`, add to the `ReceiptLookups` interface:

```typescript
export interface ReceiptLookups {
  sellerName?: string;
  customerName?: string;
  warehouseName?: string;
  productNames?: Record<UUID, string>;
  /** Previous balance before this credit sale */
  previousBalance?: number;
  /** New balance after this credit sale */
  newBalance?: number;
}
```

- [ ] **Step 2: Add credit balance section to ThermalReceipt totals**

In the `ThermalReceipt` function, after the existing Paid/Due rows and before the payment table, add:

```typescript
{lookups?.newBalance !== undefined && (
  <>
    <tr>
      <td className="label" style={{ color: '#B45309' }}>Previous Balance</td>
      <td className="value" style={{ color: '#B45309' }}>{fmtSummary(lookups.previousBalance || 0)}</td>
    </tr>
    <tr>
      <td className="label" style={{ fontWeight: 900, color: '#B91C1C' }}>NEW BALANCE</td>
      <td className="value" style={{ fontWeight: 900, color: '#B91C1C' }}>
        {fmtSummary(lookups.newBalance)}
      </td>
    </tr>
  </>
)}
```

- [ ] **Step 3: Add same to A4Receipt summary section**

In the `A4Receipt` function, add to the `a4-summary` div after the Due row:

```typescript
{lookups?.newBalance !== undefined && (
  <>
    <div className="row">
      <span style={{ color: '#B45309' }}>Previous Balance</span>
      <span style={{ color: '#B45309' }}>{fmt(lookups.previousBalance || 0, sale.currency)}</span>
    </div>
    <div className="row grand bold" style={{ background: '#FEF3C7', color: '#B91C1C' }}>
      <span>NEW BALANCE</span>
      <span>{fmt(lookups.newBalance, sale.currency)}</span>
    </div>
  </>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/smartpos/Receipt.tsx
git commit -m "feat: add previous/new balance to credit sale receipts"
```

---

### Task 6: Credit Sale Confirmation Overlay

**Files:**
- Modify: `frontend/src/components/smartpos/PaymentSuccessOverlay.tsx`

- [ ] **Step 1: Add credit sale variant to PaymentSuccessOverlay**

In `PaymentSuccessOverlay.tsx`, update the component to handle credit sales. Add a `saleType` prop:

```typescript
interface PaymentSuccessOverlayProps {
  open: boolean;
  sale: Sale | null;
  paymentMethod: string;
  change: number;
  // Credit sale additions
  saleType?: 'CASH' | 'CREDIT' | 'SPLIT';
  newBalance?: number;
  onNewSale: () => void;
  onPrint: (sale: Sale) => void;
  onPreview?: (sale: Sale) => void;
  onClose: () => void;
  onRecordPayment?: () => void;
}
```

Add credit-specific content in the success banner area (replace "Payment Successful" when credit):

```typescript
{/* Credit sale variant */}
{saleType === 'CREDIT' && (
  <Box sx={{ textAlign: 'center', py: 2 }}>
    <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
      Added to Tab
    </Typography>
    <Typography sx={{ fontWeight: 600, opacity: 0.85, mt: 0.3 }}>
      {lookups?.customerName || 'Customer'}'s balance updated
    </Typography>
    {newBalance !== undefined && (
      <Chip
        label={`New Balance: ${fmt(newBalance)}`}
        sx={{
          mt: 1.5,
          fontWeight: 800,
          fontSize: '0.9rem',
          bgcolor: 'rgba(255,255,255,0.2)',
          color: '#fff',
          borderRadius: '10px',
          height: 36,
        }}
      />
    )}
  </Box>
)}
```

Add "Record Payment" button alongside existing action buttons for credit sales:

```typescript
{saleType === 'CREDIT' && onRecordPayment && (
  <Button
    variant="outlined"
    startIcon={<IconReceipt size={18} />}
    onClick={onRecordPayment}
    sx={{
      flex: 1,
      py: 1.2,
      borderRadius: '12px',
      textTransform: 'none',
      fontWeight: 800,
      color: brand.warning.dark,
      borderColor: brand.warning.main,
      '&:hover': { borderColor: brand.warning.dark, bgcolor: brand.warning.light },
    }}
  >
    Record Payment
  </Button>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/PaymentSuccessOverlay.tsx
git commit -m "feat: add credit sale confirmation variant to PaymentSuccessOverlay"
```

---

### Task 7: Update PosTerminalPage for Credit State

**Files:**
- Modify: `frontend/src/views/smartpos/pos/PosTerminalPage.tsx`

- [ ] **Step 1: Add credit state and handlers**

In `PosTerminalPage.tsx`, add credit-related state after the existing state declarations (around line 100):

```typescript
// ── Credit sales state ─────────────────────────────────────────────────────
const [customerBalance, setCustomerBalance] = useState<number | null>(null);
const [creditAvailable, setCreditAvailable] = useState(false);

// Recompute when customerId changes
useEffect(() => {
  if (!customerId || customerId === '__walkin__') {
    setCustomerBalance(null);
    setCreditAvailable(false);
    return;
  }
  const customer = customers.find((c) => c.id === customerId);
  if (!customer || customer.creditLimit <= 0) {
    setCustomerBalance(null);
    setCreditAvailable(false);
    return;
  }
  // Fetch balance
  listSales({ customerId, paymentStatus: 'UNPAID', size: 200 })
    .then((unpaid) =>
      listSales({ customerId, paymentStatus: 'PARTIAL', size: 200 })
        .then((partial) => {
          const all = [...unpaid.content, ...partial.content];
          const bal = all.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
          setCustomerBalance(bal);
          setCreditAvailable(bal < customer.creditLimit);
        })
    )
    .catch(() => {
      setCustomerBalance(null);
      setCreditAvailable(false);
    });
}, [customerId, customers]);
```

- [ ] **Step 2: Add checkoutWithMethod handler**

Add after the existing `checkout` function:

```typescript
const checkoutWithMethod = async (
  method: 'CASH' | 'CARD' | 'CREDIT' | 'SPLIT',
  split?: { cashAmount: number; cardAmount: number; creditAmount: number },
) => {
  if (!canCheckout) return;
  setSubmitting(true);
  setBanner(null);
  try {
    const body: CreateSaleBody = {
      warehouseId,
      customerId: customerId || undefined,
      isPos: true,
      discount: discount > 0 ? discount : undefined,
      taxMethod: posSettings?.defaultTaxMethod || undefined,
      currency: posSettings?.currencyCode || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        unitPrice: l.unitPrice,
        qty: l.qty,
        taxRate: l.taxRate,
        taxMethod: posSettings?.defaultTaxMethod || undefined,
      })),
    };

    if (!online) {
      if (!linkedTerminalId) {
        throw new Error("You're offline — pair a terminal first to queue this sale.");
      }
      await enqueue(body);
      setBanner({
        kind: 'success',
        text: `Queued offline — will sync when back online (${queueSize + 1} pending).`,
      });
      clear();
      return;
    }

    const sale = await posCheckout(body);

    // Record payments based on method
    if (method === 'CASH' || method === 'CARD') {
      // Full payment — record immediately via recordPayment (optimistic)
      try {
        await recordPayment({
          referenceType: 'SALE',
          referenceId: sale.id,
          accountId: '', // default cash account — handled by backend
          amount: sale.grandTotal,
          method,
        });
      } catch { /* non-blocking */ }
    }

    if (method === 'SPLIT' && split) {
      // Record partial payments
      const paymentPromises: Promise<unknown>[] = [];
      if (split.cashAmount > 0) {
        paymentPromises.push(
          recordPayment({ referenceType: 'SALE', referenceId: sale.id, accountId: '', amount: split.cashAmount, method: 'CASH' }).catch(() => {})
        );
      }
      if (split.cardAmount > 0) {
        paymentPromises.push(
          recordPayment({ referenceType: 'SALE', referenceId: sale.id, accountId: '', amount: split.cardAmount, method: 'CARD' }).catch(() => {})
        );
      }
      await Promise.all(paymentPromises);
    }

    setLastSale(sale);

    if (method === 'CREDIT' || (method === 'SPLIT' && split && split.creditAmount > 0)) {
      // Credit sale — show credit confirmation
      const prevBalance = customerBalance || 0;
      const newBalance = prevBalance + (method === 'CREDIT' ? sale.grandTotal : (split?.creditAmount || 0));
      playPosSuccessSound();
      setSuccessOverlay(true);
      // The overlay handles credit variant via saleType prop
    } else {
      playPosSuccessSound();
      const rc = getReceiptConfig();
      if (rc.autoPrint) {
        setReceiptPreview({ sale, paymentMethod: method });
        clear();
      } else {
        setSuccessOverlay(true);
      }
    }
  } catch (e: unknown) {
    const { message } = parseApiError(e);
    setBanner({ kind: 'error', text: message });
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 3: Update layoutProps to include credit props**

Add to the `layoutProps` object (around line 572):

```typescript
// Credit sales
customerBalance,
creditAvailable,
onViewCreditAccount: (id: string) => navigate(`/pos/credit/${id}`),
onCheckoutWithMethod: checkoutWithMethod,
```

- [ ] **Step 4: Update buildReceiptLookups for credit receipts**

Add previous/new balance to receipt lookups when sale is on credit:

```typescript
const buildReceiptLookups = (sale: Sale) => {
  // ... existing code ...
  return {
    sellerName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : undefined,
    customerName: customers.find((c) => c.id === sale.customerId)?.name,
    warehouseName: warehouses.find((w) => w.id === sale.warehouseId)?.name,
    productNames,
    // Credit balance info
    previousBalance: sale.paymentStatus === 'UNPAID' ? (customerBalance ?? undefined) : undefined,
    newBalance: sale.paymentStatus === 'UNPAID' ? ((customerBalance || 0) + sale.grandTotal) : undefined,
  };
};
```

- [ ] **Step 5: Add import for useNavigate and recordPayment**

```typescript
import { useNavigate } from 'react-router';
import { recordPayment } from 'src/api/smartpos/payments';
```

Add `const navigate = useNavigate();` at the top of the component body.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/smartpos/pos/PosTerminalPage.tsx
git commit -m "feat: add credit sale state, checkout handler, and navigation to PosTerminalPage"
```

---

### Task 8: Walk-In Payment Modal

**Files:**
- Create: `frontend/src/components/smartpos/WalkInPaymentModal.tsx`

- [ ] **Step 1: Write the WalkInPaymentModal**

```typescript
/**
 * WalkInPaymentModal — record a debt payment without a purchase.
 *
 * Customer comes to the shop just to pay their outstanding balance.
 */
import { useState, useEffect } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconCash, IconCreditCard, IconDeviceMobile } from '@tabler/icons-react';
import type { Customer } from 'src/api/smartpos/types';
import type { UUID } from 'src/api/smartpos/types';
import { listCustomers } from 'src/api/smartpos/customers';
import { listSales } from 'src/api/smartpos/sales';
import { recordPayment } from 'src/api/smartpos/payments';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface WalkInPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onPaid: (customerId: string, amount: number, newBalance: number) => void;
  preselectedCustomerId?: string | null;
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <IconCash size={16} />,
  CARD: <IconCreditCard size={16} />,
  MOBILE_MONEY: <IconDeviceMobile size={16} />,
};

export default function WalkInPaymentModal({
  open,
  onClose,
  onPaid,
  preselectedCustomerId,
}: WalkInPaymentModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listCustomers({ size: 200 }).then((c) => setCustomers(c.content)).catch(() => {});
  }, [open]);

  // Pre-select customer if provided
  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      const found = customers.find((c) => c.id === preselectedCustomerId);
      if (found) setSelectedCustomer(found);
    }
  }, [preselectedCustomerId, customers]);

  // Fetch balance when customer selected
  useEffect(() => {
    if (!selectedCustomer) { setBalance(0); return; }
    Promise.all([
      listSales({ customerId: selectedCustomer.id, paymentStatus: 'UNPAID', size: 200 }),
      listSales({ customerId: selectedCustomer.id, paymentStatus: 'PARTIAL', size: 200 }),
    ]).then(([unpaid, partial]) => {
      const all = [...unpaid.content, ...partial.content];
      const bal = all.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0);
      setBalance(bal);
      setAmount(bal > 0 ? bal.toFixed(2) : '');
    }).catch(() => setBalance(0));
  }, [selectedCustomer]);

  const handleSubmit = async () => {
    if (!selectedCustomer || !amount) return;
    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) { setError('Enter an amount greater than 0'); return; }

    setSubmitting(true);
    setError(null);
    try {
      // Record payment against the oldest unpaid sale (FIFO)
      const unpaidSales = await listSales({
        customerId: selectedCustomer.id,
        paymentStatus: 'UNPAID',
        size: 200,
      });
      const sale = unpaidSales.content[0];
      if (sale) {
        await recordPayment({
          referenceType: 'SALE',
          referenceId: sale.id,
          accountId: '', // default
          amount: paymentAmount,
          method,
        });
      }
      const newBalance = Math.max(0, balance - paymentAmount);
      onPaid(selectedCustomer.id, paymentAmount, newBalance);
      setAmount('');
      onClose();
    } catch (e: unknown) {
      setError('Payment failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Record Payment
        {selectedCustomer && balance > 0 && (
          <Typography variant="body2" sx={{ color: brand.warning.dark, fontWeight: 700, mt: 0.5 }}>
            Outstanding: {fmt(balance)} · Limit: {fmt(selectedCustomer.creditLimit)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Autocomplete
            options={customers}
            value={selectedCustomer}
            onChange={(_, v) => setSelectedCustomer(v)}
            getOptionLabel={(c) => c.name}
            renderInput={(params) => (
              <TextField {...params} label="Customer" placeholder="Search customer…" />
            )}
            fullWidth
          />

          {balance > 0 && (
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Typography sx={{ mr: 1, fontWeight: 700, color: brand.primary[600] }}>
                    {selectedCustomer?.creditLimit ? 'TZS' : ''}
                  </Typography>
                ),
              }}
              helperText={`Max: ${fmt(balance)}`}
              fullWidth
            />
          )}

          <Stack direction="row" spacing={1}>
            {['CASH', 'CARD', 'MOBILE_MONEY'].map((m) => (
              <Button
                key={m}
                variant={method === m ? 'contained' : 'outlined'}
                size="small"
                startIcon={METHOD_ICONS[m]}
                onClick={() => setMethod(m)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '8px',
                  flex: 1,
                }}
              >
                {m.replace('_', ' ')}
              </Button>
            ))}
          </Stack>

          {error && (
            <Typography variant="body2" sx={{ color: brand.error.main, fontWeight: 700 }}>
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!selectedCustomer || !amount || submitting}
          onClick={handleSubmit}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
        >
          {submitting ? 'Processing…' : `Record ${fmt(parseFloat(amount) || 0)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/WalkInPaymentModal.tsx
git commit -m "feat: add WalkInPaymentModal for debt payment without purchase"
```

---

### Task 9: DebtorsSheet Component

**Files:**
- Create: `frontend/src/components/smartpos/DebtorsSheet.tsx`

- [ ] **Step 1: Write the DebtorsSheet**

```typescript
/**
 * DebtorsSheet — mobile bottom sheet listing all customers with outstanding debt.
 * Accessible from POS header via debt badge tap.
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { IconX, IconSearch, IconChevronRight } from '@tabler/icons-react';
import { listDebtors, type CustomerDebt } from 'src/api/smartpos/credit';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

interface DebtorsSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectDebtor: (customerId: string) => void;
  onRecordPayment: (customerId: string) => void;
}

export default function DebtorsSheet({
  open,
  onClose,
  onSelectDebtor,
  onRecordPayment,
}: DebtorsSheetProps) {
  const [debtors, setDebtors] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listDebtors({ overdueOnly: filter === 'overdue' })
      .then(setDebtors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, filter]);

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.outstanding, 0);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          maxHeight: '85dvh',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${brand.neutral[200]}`, flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Outstanding Debt</Typography>
          <IconButton onClick={onClose} size="small">
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontWeight: 900, fontSize: '1.3rem', color: brand.error.main }}>
            {fmt(totalOutstanding)}
          </Typography>
          <Chip
            label={`${debtors.length} debtor${debtors.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: brand.error.light, color: brand.error.dark }}
          />
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
          <Chip
            label="All"
            size="small"
            onClick={() => setFilter('all')}
            sx={{
              fontWeight: filter === 'all' ? 700 : 500,
              bgcolor: filter === 'all' ? brand.primary[600] : brand.neutral[100],
              color: filter === 'all' ? '#fff' : brand.neutral[600],
            }}
          />
          <Chip
            label="Overdue"
            size="small"
            onClick={() => setFilter('overdue')}
            sx={{
              fontWeight: filter === 'overdue' ? 700 : 500,
              bgcolor: filter === 'overdue' ? brand.warning.main : brand.neutral[100],
              color: filter === 'overdue' ? '#fff' : brand.neutral[600],
            }}
          />
        </Stack>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : debtors.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontWeight: 700, color: brand.neutral[500] }}>
              No outstanding debt
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
              All customers are paid up
            </Typography>
          </Box>
        ) : (
          debtors.map((d) => (
            <Box
              key={d.customerId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                borderBottom: `1px solid ${brand.neutral[100]}`,
                cursor: 'pointer',
                '&:active': { bgcolor: brand.neutral[50] },
              }}
              onClick={() => onSelectDebtor(d.customerId)}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {d.customerName}
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                  {d.saleCount} sale{d.saleCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Stack direction="column" alignItems="flex-end" spacing={0.5} sx={{ mr: 1 }}>
                <Typography sx={{ fontWeight: 800, color: d.overdue ? brand.error.main : brand.warning.dark }}>
                  {fmt(d.outstanding)}
                </Typography>
                <Chip
                  label={d.overdue ? 'Overdue' : 'Current'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    bgcolor: d.overdue ? brand.error.light : brand.success.light,
                    color: d.overdue ? brand.error.dark : brand.success.dark,
                  }}
                />
              </Stack>
              <IconChevronRight size={16} color={brand.neutral[400]} />
            </Box>
          ))
        )}
      </Box>
    </Drawer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/DebtorsSheet.tsx
git commit -m "feat: add DebtorsSheet — mobile bottom sheet for all debtors"
```

---

### Task 10: CreditAccountPage

**Files:**
- Create: `frontend/src/views/smartpos/pos/CreditAccountPage.tsx`

- [ ] **Step 1: Write CreditAccountPage**

```typescript
/**
 * CreditAccountPage — full financial picture of one customer.
 *
 * Shows outstanding balance, available credit, aging breakdown,
 * transaction ledger (sales + payments mixed), and quick actions.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconFileDescription,
  IconReceipt,
} from '@tabler/icons-react';
import { getCustomerDebt, type DebtAging } from 'src/api/smartpos/credit';
import type { Sale, SaleLine } from 'src/api/smartpos/sales';
import type { Payment } from 'src/api/smartpos/payments';
import type { Customer } from 'src/api/smartpos/types';
import WalkInPaymentModal from 'src/components/smartpos/WalkInPaymentModal';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <IconCash size={14} />,
  CARD: <IconCreditCard size={14} />,
  MOBILE_MONEY: <IconDeviceMobile size={14} />,
  TRANSFER: <IconCreditCard size={14} />,
};

type LedgerEntry = {
  type: 'sale' | 'payment';
  id: string;
  date: string;
  description: string;
  amount: number; // positive = debt increase, negative = debt decrease
  ref: string;
};

export default function CreditAccountPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [balance, setBalance] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [available, setAvailable] = useState(0);
  const [aging, setAging] = useState<DebtAging>({ current: 0, days30to60: 0, days60to90: 0, days90plus: 0 });
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getCustomerDebt(customerId)
      .then((data) => {
        setCustomer(data.customer);
        setBalance(data.balance);
        setCreditLimit(data.creditLimit);
        setAvailable(data.available);
        setAging(data.aging);

        // Build mixed ledger
        const entries: LedgerEntry[] = [];
        for (const sale of data.sales) {
          entries.push({
            type: 'sale',
            id: sale.id,
            date: sale.createdAt,
            description: sale.lines.map((l) => l.productName).join(', '),
            amount: sale.dueTotal || sale.grandTotal,
            ref: sale.ref,
          });
        }
        for (const p of data.payments) {
          entries.push({
            type: 'payment',
            id: p.id,
            date: p.date,
            description: `${p.method}${p.notes ? ` — ${p.notes}` : ''}`,
            amount: -p.amount,
            ref: p.ref,
          });
        }
        // Sort newest first
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLedger(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Customer not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: brand.neutral[50], pb: 8 }}>
      {/* Header — Letis Green gradient */}
      <Box sx={{ background: `linear-gradient(135deg, ${brand.primary[600]} 0%, ${brand.primary[700]} 100%)`, color: '#fff', p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#fff' }}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>{customer.name}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Credit limit: {fmt(creditLimit)}
            </Typography>
          </Box>
          <Chip
            label={customer.active ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '8px',
            }}
          />
        </Stack>
      </Box>

      {/* Balance Cards */}
      <Box sx={{ display: 'flex', gap: 1.5, px: 2, mt: -1.5, position: 'relative', zIndex: 1 }}>
        <Box sx={{ flex: 1, bgcolor: '#fff', borderRadius: '12px', p: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: brand.warning.dark }}>
            {fmt(balance)}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 700 }}>
            Outstanding
          </Typography>
        </Box>
        <Box sx={{ flex: 1, bgcolor: '#fff', borderRadius: '12px', p: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: brand.success.dark }}>
            {fmt(available)}
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 700 }}>
            Available
          </Typography>
        </Box>
      </Box>

      {/* Aging */}
      {balance > 0 && (
        <Box sx={{ px: 2, mt: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>Debt Aging</Typography>
          <Stack direction="row" spacing={1}>
            {[
              { label: '<30d', value: aging.current, bg: brand.success.light, color: brand.success.dark },
              { label: '30-60d', value: aging.days30to60, bg: brand.warning.light, color: brand.warning.dark },
              { label: '60-90d', value: aging.days60to90, bg: brand.error.light, color: brand.error.dark },
              { label: '90d+', value: aging.days90plus, bg: brand.neutral[200], color: brand.neutral[600] },
            ].map((bucket) => (
              <Box
                key={bucket.label}
                sx={{
                  flex: 1,
                  bgcolor: bucket.bg,
                  borderRadius: '8px',
                  p: 1,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: bucket.color }}>
                  {fmt(bucket.value)}
                </Typography>
                <Typography variant="caption" sx={{ color: bucket.color, fontWeight: 600 }}>
                  {bucket.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Quick Actions */}
      <Stack direction="row" spacing={1.5} sx={{ px: 2, mt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => setPaymentOpen(true)}
          disabled={balance <= 0}
          startIcon={<IconCash size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: '10px',
            py: 1.2,
            bgcolor: brand.primary[600],
            '&:hover': { bgcolor: brand.primary[700] },
          }}
        >
          Record Payment
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate('/pos/terminal')}
          startIcon={<IconReceipt size={18} />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px',
            py: 1.2,
            borderColor: brand.neutral[200],
            color: brand.neutral[700],
          }}
        >
          New Sale
        </Button>
      </Stack>

      {/* Transaction Ledger */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1.5 }}>
          Transaction Ledger
        </Typography>
        {ledger.length === 0 ? (
          <Typography variant="body2" sx={{ color: brand.neutral[500], fontWeight: 600, textAlign: 'center', py: 4 }}>
            No transactions yet
          </Typography>
        ) : (
          ledger.map((entry) => (
            <Stack
              key={`${entry.type}-${entry.id}`}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ py: 1.25, borderBottom: `1px solid ${brand.neutral[100]}` }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: entry.type === 'sale' ? brand.error.light : brand.success.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {entry.type === 'sale'
                  ? <IconFileDescription size={16} color={brand.error.dark} />
                  : (METHOD_ICONS[(ledger.find((e) => e.type === 'payment') as any)?.ref] || <IconCash size={16} color={brand.success.dark} />)
                }
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.84rem' }} noWrap>
                  {entry.type === 'sale' ? `Sale ${entry.ref}` : `Payment — ${entry.description}`}
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                  {new Date(entry.date).toLocaleDateString()}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: entry.amount >= 0 ? brand.error.main : brand.success.main,
                }}
              >
                {entry.amount >= 0 ? '+' : ''}{fmt(Math.abs(entry.amount))}
              </Typography>
            </Stack>
          ))
        )}
      </Box>

      {/* Walk-in Payment Modal */}
      <WalkInPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onPaid={(_, amount, newBal) => {
          setBalance(newBal);
          setAvailable(Math.max(0, creditLimit - newBal));
          setPaymentOpen(false);
        }}
        preselectedCustomerId={customerId}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/pos/CreditAccountPage.tsx
git commit -m "feat: add CreditAccountPage — customer ledger with aging and transaction history"
```

---

### Task 11: CollectionsRunPage

**Files:**
- Create: `frontend/src/views/smartpos/pos/CollectionsRunPage.tsx`

- [ ] **Step 1: Write CollectionsRunPage**

```typescript
/**
 * CollectionsRunPage — mobile-optimized debt collection round view.
 *
 * Lists all debtors. Tapping one opens a quick-collect screen:
 * big amount input, method toggle, "Record & Next" flow.
 * Works offline via useOfflineSyncQueue.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconCash,
  IconCheck,
  IconChevronRight,
  IconCreditCard,
  IconDeviceMobile,
} from '@tabler/icons-react';
import { listDebtors, type CustomerDebt } from 'src/api/smartpos/credit';
import { recordPayment } from 'src/api/smartpos/payments';
import { listSales } from 'src/api/smartpos/sales';
import { useOnlineStatus } from 'src/components/smartpos/OfflineBanner';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

export default function CollectionsRunPage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [debtors, setDebtors] = useState<CustomerDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listDebtors()
      .then(setDebtors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedDebtor = selectedIndex !== null ? debtors[selectedIndex] : null;

  const handleRecordAndNext = async () => {
    if (!selectedDebtor) return;
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) return;

    setSubmitting(true);
    try {
      const unpaidSales = await listSales({
        customerId: selectedDebtor.customerId,
        paymentStatus: 'UNPAID',
        size: 1,
      });
      if (unpaidSales.content[0]) {
        await recordPayment({
          referenceType: 'SALE',
          referenceId: unpaidSales.content[0].id,
          accountId: '',
          amount,
          method: paymentMethod,
        });
      }
      // Update local state
      const updated = [...debtors];
      updated[selectedIndex!] = {
        ...selectedDebtor,
        outstanding: selectedDebtor.outstanding - amount,
      };
      setDebtors(updated.filter((d) => d.outstanding > 0));
      setPaymentAmount('');
      // Auto-advance to next debtor
      if (selectedIndex! < updated.length - 1) {
        setSelectedIndex(selectedIndex! + 1);
      } else {
        setSelectedIndex(null);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  // Collection detail view
  if (selectedDebtor) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: brand.neutral[50] }}>
        <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: `1px solid ${brand.neutral[200]}` }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <IconButton onClick={() => setSelectedIndex(null)}>
              <IconArrowLeft size={20} />
            </IconButton>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
              {selectedDebtor.customerName}
            </Typography>
          </Stack>
          <Typography sx={{ fontWeight: 500, color: brand.neutral[500] }}>
            Outstanding: <span style={{ fontWeight: 800, color: brand.error.main }}>{fmt(selectedDebtor.outstanding)}</span>
          </Typography>
          {!online && (
            <Chip label="Offline" size="small" sx={{ mt: 1, bgcolor: brand.warning.light, color: brand.warning.dark, fontWeight: 700 }} />
          )}
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Amount Collected</Typography>
          <TextField
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            InputProps={{
              sx: { fontSize: '1.5rem', fontWeight: 800 },
            }}
            fullWidth
          />

          <Typography sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>Method</Typography>
          <ToggleButtonGroup
            value={paymentMethod}
            exclusive
            onChange={(_, v) => v && setPaymentMethod(v)}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="CASH" sx={{ textTransform: 'none', fontWeight: 700, py: 1.2 }}>
              <IconCash size={18} style={{ marginRight: 6 }} /> Cash
            </ToggleButton>
            <ToggleButton value="MOBILE_MONEY" sx={{ textTransform: 'none', fontWeight: 700, py: 1.2 }}>
              <IconDeviceMobile size={18} style={{ marginRight: 6 }} /> Mobile
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            fullWidth
            variant="contained"
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || submitting}
            onClick={handleRecordAndNext}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: '12px',
              py: 1.8,
              fontSize: '1rem',
              bgcolor: brand.primary[600],
              '&:hover': { bgcolor: brand.primary[700] },
            }}
          >
            {submitting ? 'Recording…' : `Record ${fmt(parseFloat(paymentAmount) || 0)} & Next`}
          </Button>
        </Box>
      </Box>
    );
  }

  // Debtor list view
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: brand.neutral[50], pb: 4 }}>
      <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: `1px solid ${brand.neutral[200]}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate(-1)}>
            <IconArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>Collections</Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
              {debtors.length} debtor{debtors.length !== 1 ? 's' : ''} · {online ? 'Online' : 'Offline'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : debtors.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontWeight: 700, color: brand.neutral[500] }}>
            All caught up
          </Typography>
          <Typography variant="caption" sx={{ color: brand.neutral[400] }}>
            No outstanding debt to collect
          </Typography>
        </Box>
      ) : (
        debtors.map((d, i) => (
          <Box
            key={d.customerId}
            onClick={() => { setSelectedIndex(i); setPaymentAmount(d.outstanding.toFixed(2)); }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 2.5,
              bgcolor: '#fff',
              borderBottom: `1px solid ${brand.neutral[100]}`,
              cursor: 'pointer',
              '&:active': { bgcolor: brand.neutral[50] },
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{d.customerName}</Typography>
              <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 600 }}>
                {d.saleCount} sale{d.saleCount !== 1 ? 's' : ''}
                {d.overdue && ' · Overdue'}
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 800, color: brand.error.main }}>
                {fmt(d.outstanding)}
              </Typography>
              <IconChevronRight size={16} color={brand.neutral[400]} />
            </Stack>
          </Box>
        ))
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/smartpos/pos/CollectionsRunPage.tsx
git commit -m "feat: add CollectionsRunPage — mobile debt collection rounds"
```

---

### Task 12: Router Updates + PosTerminalPage Integration

**Files:**
- Modify: `frontend/src/routes/Router.tsx`
- Modify: `frontend/src/views/smartpos/pos/PosTerminalPage.tsx`

- [ ] **Step 1: Add new routes**

In `Router.tsx`, add the new lazy imports near the existing POS imports:

```typescript
const SmartPosCreditAccount = Loadable(
  lazy(() => import('../views/smartpos/pos/CreditAccountPage')),
);
const SmartPosCollections = Loadable(
  lazy(() => import('../views/smartpos/pos/CollectionsRunPage')),
);
```

Add routes inside the smartpos children array:

```typescript
{
  path: 'pos/credit/:customerId',
  element: (
    <RequireAuth>
      <SmartPosCreditAccount />
    </RequireAuth>
  ),
},
{
  path: 'pos/collections',
  element: (
    <RequireAuth>
      <SmartPosCollections />
    </RequireAuth>
  ),
},
```

- [ ] **Step 2: Add WalkInPayment + DebtorsSheet + Collections buttons to PosTerminalPage**

Add state for the new modals/sheets in `PosTerminalPage.tsx`:

```typescript
const [walkInPaymentOpen, setWalkInPaymentOpen] = useState(false);
const [walkInPreselectedCustomer, setWalkInPreselectedCustomer] = useState<string | null>(null);
const [debtorsSheetOpen, setDebtorsSheetOpen] = useState(false);
const [saleType, setSaleType] = useState<'CASH' | 'CREDIT' | 'SPLIT'>('CASH');
const [newCreditBalance, setNewCreditBalance] = useState<number | undefined>(undefined);
```

Add the imports:

```typescript
import WalkInPaymentModal from 'src/components/smartpos/WalkInPaymentModal';
import DebtorsSheet from 'src/components/smartpos/DebtorsSheet';
import { recordPayment } from 'src/api/smartpos/payments';
```

Add a "Receive Payment" button in the layout toolbar area (add to `layoutProps`):

```typescript
onReceivePayment: (customerId?: string) => {
  setWalkInPreselectedCustomer(customerId || null);
  setWalkInPaymentOpen(true);
},
onOpenDebtors: () => setDebtorsSheetOpen(true),
onOpenCollections: () => navigate('/pos/collections'),
```

Render the new modals alongside existing ones (add before closing `</Box>` of main render):

```typescript
<WalkInPaymentModal
  open={walkInPaymentOpen}
  onClose={() => setWalkInPaymentOpen(false)}
  onPaid={() => {
    setWalkInPaymentOpen(false);
    // Refresh customer balance
    if (customerId) {
      listSales({ customerId, paymentStatus: 'UNPAID', size: 200 })
        .then((unpaid) =>
          listSales({ customerId, paymentStatus: 'PARTIAL', size: 200 })
            .then((partial) => {
              const all = [...unpaid.content, ...partial.content];
              setCustomerBalance(all.reduce((sum, s) => sum + (s.dueTotal || s.grandTotal), 0));
            })
        );
    }
  }}
  preselectedCustomerId={walkInPreselectedCustomer}
/>

<DebtorsSheet
  open={debtorsSheetOpen}
  onClose={() => setDebtorsSheetOpen(false)}
  onSelectDebtor={(id) => {
    setDebtorsSheetOpen(false);
    navigate(`/pos/credit/${id}`);
  }}
  onRecordPayment={(id) => {
    setDebtorsSheetOpen(false);
    setWalkInPreselectedCustomer(id);
    setWalkInPaymentOpen(true);
  }}
/>
```

Update PaymentSuccessOverlay to pass saleType and onRecordPayment:

```typescript
<PaymentSuccessOverlay
  open={successOverlay}
  sale={lastSale}
  paymentMethod={paymentMethod}
  change={totals.change}
  saleType={saleType}
  newBalance={newCreditBalance}
  onNewSale={() => {
    setSuccessOverlay(false);
    clear();
  }}
  onPrint={(sale) => {
    try { printReceipt(sale, { paymentMethod, lookups: buildReceiptLookups(sale) }); } catch { }
  }}
  onPreview={(sale) => {
    if (sale) setReceiptPreview({ sale, paymentMethod });
  }}
  onClose={() => setSuccessOverlay(false)}
  onRecordPayment={() => {
    setSuccessOverlay(false);
    setWalkInPreselectedCustomer(lastSale?.customerId || null);
    setWalkInPaymentOpen(true);
  }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx frontend/src/views/smartpos/pos/PosTerminalPage.tsx
git commit -m "feat: add credit routes, WalkInPayment, DebtorsSheet, and Collections to POS"
```

---

### Task 13: End-to-End Test & Polish

- [ ] **Step 1: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new type errors from our changes.

- [ ] **Step 2: Verify the build**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Manual smoke test checklist**

1. Open POS terminal → select a customer with credit limit
2. Add items → "Pay Later" option appears
3. Tap "Pay Later" → sale completes, credit confirmation shows
4. Check receipt shows previous/new balance
5. Open debtors sheet → customer appears with outstanding balance
6. Tap debtor → navigates to CreditAccountPage
7. CreditAccountPage shows balance, aging, ledger
8. Record payment from CreditAccountPage
9. Open CollectionsRunPage → debtors listed
10. Tap debtor → quick collect → Record & Next

- [ ] **Step 4: Commit any fixes**

```bash
git add . && git commit -m "fix: polish credit sales flow — type fixes and edge cases"
```
