import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import { IconPlus, IconCash, IconWallet } from '@tabler/icons-react';

import {
  addStoreCredit, getCustomerBalance, listStoreCreditTransactions,
  redeemStoreCredit,
  type AddCreditRequest, type CustomerBalance, type RedeemCreditRequest,
  type StoreCreditTransaction,
} from 'src/api/smartpos/storeCredit';
import { listCustomers } from 'src/api/smartpos/customers';
import type { Customer } from 'src/api/smartpos/types';
import PageHeader from 'src/components/smartpos/PageHeader';
import DataTable, { type Column } from 'src/components/smartpos/DataTable';
import { brand } from 'src/theme/smartpos/brand';
import { formatMoney } from 'src/utils/smartpos/currency';

const fmt = formatMoney;

const TYPE_COLORS: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
  DEPOSIT: 'success',
  RETURN_CREDIT: 'info',
  REDEMPTION: 'error',
  ADJUSTMENT: 'warning',
};

export default function StoreCreditPage() {
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const [balance, setBalance] = useState<CustomerBalance | null>(null);
  const [transactions, setTransactions] = useState<StoreCreditTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add credit dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddCreditRequest>({ customerId: '', amount: 0 });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Redeem dialog
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemForm, setRedeemForm] = useState<RedeemCreditRequest>({ customerId: '', amount: 0 });
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Search customers
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return; }
    const timeout = setTimeout(() => {
      listCustomers({ search: customerSearch, size: 10 })
        .then((p) => setCustomers(p.content))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  // Load transactions and balance when customer is selected
  useEffect(() => {
    if (!customerId) {
      setBalance(null);
      setTransactions([]);
      return;
    }
    setLoading(true);
    Promise.all([
      listStoreCreditTransactions(customerId, page, 50),
      getCustomerBalance(customerId),
    ])
      .then(([txPage, bal]) => {
        setTransactions(txPage.content);
        setTotalPages(txPage.totalPages || 1);
        setBalance(bal);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => {
        setLoading(false);
      });
  }, [customerId, page]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  const handleAddCredit = async () => {
    if (!addForm.amount || addForm.amount <= 0) {
      setAddError('Amount must be positive.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await addStoreCredit({ ...addForm, customerId });
      setAddOpen(false);
      // Refresh
      const [txPage, bal] = await Promise.all([
        listStoreCreditTransactions(customerId, page, 50),
        getCustomerBalance(customerId),
      ]);
      setTransactions(txPage.content);
      setTotalPages(txPage.totalPages || 1);
      setBalance(bal);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Add credit failed');
    } finally {
      setAdding(false);
    }
  };

  const handleRedeem = async () => {
    if (!redeemForm.amount || redeemForm.amount <= 0) {
      setRedeemError('Amount must be positive.');
      return;
    }
    if (balance && redeemForm.amount > balance.balance) {
      setRedeemError('Amount exceeds available balance.');
      return;
    }
    setRedeeming(true);
    setRedeemError(null);
    try {
      await redeemStoreCredit({ ...redeemForm, customerId });
      setRedeemOpen(false);
      // Refresh
      const [txPage, bal] = await Promise.all([
        listStoreCreditTransactions(customerId, page, 50),
        getCustomerBalance(customerId),
      ]);
      setTransactions(txPage.content);
      setTotalPages(txPage.totalPages || 1);
      setBalance(bal);
    } catch (e: unknown) {
      setRedeemError(e instanceof Error ? e.message : 'Redeem failed');
    } finally {
      setRedeeming(false);
    }
  };

  const openAdd = () => {
    setAddForm({ customerId, amount: 0 });
    setAddError(null);
    setAddOpen(true);
  };

  const openRedeem = () => {
    setRedeemForm({ customerId, amount: 0 });
    setRedeemError(null);
    setRedeemOpen(true);
  };

  const columns: Column<StoreCreditTransaction>[] = [
    {
      key: 'createdAt',
      label: 'Date',
      render: (t) => (
        <Typography variant="body2">
          {new Date(t.createdAt).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </Typography>
      ),
      width: 140,
    },
    {
      key: 'type',
      label: 'Type',
      align: 'center',
      render: (t) => (
        <Chip
          label={t.type.replace('_', ' ')}
          size="small"
          color={TYPE_COLORS[t.type] || 'default'}
          sx={{ fontWeight: 600 }}
        />
      ),
      width: 140,
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (t) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: t.amount >= 0 ? brand.success.dark : brand.error.main,
          }}
        >
          {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
        </Typography>
      ),
    },
    {
      key: 'reference',
      label: 'Reference',
      render: (t) => (
        <Typography variant="body2">{t.reference || '—'}</Typography>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (t) => (
        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.notes || '—'}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', pb: 3 }}>
      <PageHeader
        title="Store Credit"
        subtitle="Manage customer store credit balances and transactions"
        action={customerId ? {
          label: 'Add Credit',
          icon: <IconPlus size={18} />,
          onClick: openAdd,
        } : undefined}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Customer selector */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          size="small"
          label="Search customer"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          sx={{ width: 300 }}
        />
        {customers.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {customers.map((c) => (
              <Chip
                key={c.id}
                label={`${c.name}${c.code ? ` (${c.code})` : ''}`}
                onClick={() => { setCustomerId(c.id); setCustomerSearch(''); setCustomers([]); }}
                variant={c.id === customerId ? 'filled' : 'outlined'}
                color={c.id === customerId ? 'primary' : undefined}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        )}
        {selectedCustomer && (
          <Chip
            label={selectedCustomer.name}
            onDelete={() => setCustomerId('')}
            color="primary"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Stack>

      {customerId && balance && (
        <>
          {/* Balance card */}
          <Card sx={{
            mb: 2, borderRadius: 3, boxShadow: 'none',
            border: `1px solid ${brand.neutral[200]}`,
            bgcolor: balance.balance >= 0 ? brand.success.light : brand.error.light,
          }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{
                  p: 1.5, borderRadius: 3,
                  bgcolor: 'white', display: 'flex',
                }}>
                  <IconWallet size={24} color={brand.accent[600]} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: brand.neutral[600] }}>
                    Available Store Credit
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {fmt(balance.balance)}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<IconPlus size={16} />}
                  onClick={openAdd}
                  sx={{ bgcolor: brand.success.main, '&:hover': { bgcolor: brand.success.dark }, fontWeight: 700, borderRadius: '8px' }}
                >
                  Add Credit
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<IconCash size={16} />}
                  onClick={openRedeem}
                  disabled={balance.balance <= 0}
                  sx={{ bgcolor: brand.accent[500], '&:hover': { bgcolor: brand.accent[600] }, fontWeight: 700, borderRadius: '8px' }}
                >
                  Redeem
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Transactions table */}
          <DataTable
            columns={columns}
            rows={transactions}
            loading={loading}
            emptyText="No store credit transactions found for this customer."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            getRowKey={(t) => t.id}
            tableKey="store-credit-transactions"
            enableSorting
            toolbarTitle="Transaction history"
          />
        </>
      )}

      {!customerId && (
        <Box sx={{
          textAlign: 'center', py: 8, px: 2,
          border: `1px dashed ${brand.neutral[300]}`,
          borderRadius: 3,
          bgcolor: brand.neutral[50],
        }}>
          <IconWallet size={48} color={brand.neutral[400]} style={{ marginBottom: 16 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: brand.neutral[600] }}>
            Select a customer
          </Typography>
          <Typography variant="body2" sx={{ color: brand.neutral[500], maxWidth: 400, mx: 'auto' }}>
            Search for a customer above to view their store credit balance and transaction history.
          </Typography>
        </Box>
      )}

      {/* Add Credit dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Store Credit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            <Typography variant="body2">
              Customer: <strong>{selectedCustomer?.name}</strong>
            </Typography>
            <TextField
              label="Amount"
              type="number"
              value={addForm.amount}
              onChange={(e) => setAddForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              size="small"
              required
              fullWidth
            />
            <TextField
              label="Reference"
              value={addForm.reference ?? ''}
              onChange={(e) => setAddForm((f) => ({ ...f, reference: e.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Notes"
              value={addForm.notes ?? ''}
              onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
              size="small"
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setAddOpen(false)} disabled={adding}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddCredit}
            disabled={adding}
            sx={{ fontWeight: 700 }}
          >
            {adding ? 'Adding…' : 'Add Credit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Redeem dialog */}
      <Dialog open={redeemOpen} onClose={() => setRedeemOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Redeem Store Credit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {redeemError && <Alert severity="error">{redeemError}</Alert>}
            <Typography variant="body2">
              Customer: <strong>{selectedCustomer?.name}</strong>
            </Typography>
            <Typography variant="body2">
              Available balance: <strong>{balance ? fmt(balance.balance) : '...'}</strong>
            </Typography>
            <TextField
              label="Amount"
              type="number"
              value={redeemForm.amount}
              onChange={(e) => setRedeemForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              size="small"
              required
              fullWidth
            />
            <TextField
              label="POS Reference"
              value={redeemForm.posReference ?? ''}
              onChange={(e) => setRedeemForm((f) => ({ ...f, posReference: e.target.value }))}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setRedeemOpen(false)} disabled={redeeming}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRedeem}
            disabled={redeeming}
            sx={{ fontWeight: 700 }}
          >
            {redeeming ? 'Redeeming…' : 'Redeem'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
